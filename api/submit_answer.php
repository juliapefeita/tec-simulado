<?php
require_once 'db_connect.php';
session_start();
header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$answers = $input['answers'] ?? []; // Format: { "question_id": "A", "2": "B" }

if (empty($answers)) {
    echo json_encode(['success' => false, 'message' => 'No answers submitted']);
    exit;
}

$score = 0;
$total = 0;

// Fetch all correct answers
// --- Lazy Migration: Ensure History Table Exists ---
$pdo->exec("
    CREATE TABLE IF NOT EXISTS user_answers_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        question_id INT NOT NULL,
        user_option VARCHAR(5),
        is_correct TINYINT(1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_question (user_id, question_id)
    )
");

// Fetch all questions with details
$mode = $input['mode'] ?? 'private';

// Fetch all questions with details filtered by Mode
if ($mode === 'challenge') {
    $stmt = $pdo->query("SELECT id, statement, correct_option FROM questions WHERE owner_id IS NULL");
} else {
    // Private Mode
    $stmt = $pdo->prepare("SELECT id, statement, correct_option FROM questions WHERE owner_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
}

$questions_db = [];
while ($row = $stmt->fetch()) {
    $questions_db[$row['id']] = $row;
}

$details = [];
$total = count($questions_db);

// --- Fetch Existing History to prevent farming ---
$histCheck = $pdo->prepare("SELECT question_id FROM user_answers_history WHERE user_id = ?");
$histCheck->execute([$_SESSION['user_id']]);
$answered_ids = $histCheck->fetchAll(PDO::FETCH_COLUMN);
$answered_map = array_flip($answered_ids);

foreach ($questions_db as $q_id => $q_data) {
    if (!isset($answers[$q_id]))
        continue; // Only process answered ones

    $user_ans = $answers[$q_id];
    $correct_ans = $q_data['correct_option'];
    $is_correct = ($user_ans === $correct_ans);

    // CRITICAL: Only score if NOT previously answered
    $is_new_score = false;
    if (!isset($answered_map[$q_id])) {
        if ($is_correct) {
            $score++;
            $is_new_score = true;
        }

        // Persist to History only if new
        $histStmt = $pdo->prepare("
            INSERT IGNORE INTO user_answers_history (user_id, question_id, user_option, is_correct)
            VALUES (?, ?, ?, ?)
        ");
        $histStmt->execute([$_SESSION['user_id'], $q_id, $user_ans, $is_correct ? 1 : 0]);

        // Update local map locally so potential duplicates in same request don't count? 
        // (Unlikely with array iteration, but good practice)
        $answered_map[$q_id] = true;
    } else {
        // If already answered, we do NOT increment score.
        // We also do not update history (locked).
    }

    // Add to details
    $details[] = [
        'id' => $q_id,
        'statement' => mb_substr(strip_tags($q_data['statement']), 0, 100) . '...',
        'user_answer' => $user_ans,
        'correct_answer' => $correct_ans,
        'is_correct' => $is_correct
    ];
}

// Check for newly locked questions to calculate accurate score
// Actually, the score logic might need to be "Total Lifetime Correct Answers", but for this specific "Submit" request, 
// we usually just show what happened in THIS session. 
// However, the XP (Ranking) is SUM(score), so inserting into `user_attempts` is duplicate logic if we have `user_answers_history`.
// But to avoid breaking the Ranking, we keep `user_attempts` as a "Session Log".

// Save attempt
$stmt = $pdo->prepare("INSERT INTO user_attempts (user_id, score, total_questions) VALUES (?, ?, ?)");
$stmt->execute([$_SESSION['user_id'], $score, $total]);

echo json_encode([
    'success' => true,
    'score' => $score,
    'total' => $total,
    'details' => $details, // Only sends details for THIS session's answers
    'message' => "You scored $score out of $total"
]);
?>