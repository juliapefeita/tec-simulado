<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

session_start();
$user_id = $_SESSION['user_id'] ?? 0;

try {
    // Fetch questions + User History Status
    // We join on user_answers_history to see if THIS user answered THIS question
    // Mode Logic: Private (User's Questions) vs Challenge (Global Questions)
    $mode = $_GET['mode'] ?? 'private';

    // Base SQL
    $sql = "
        SELECT 
            q.id, q.statement, q.option_a, q.option_b, q.option_c, q.option_d, q.option_e, q.pdf_page_ref,
            h.user_option as locked_option,
            h.is_correct as locked_is_correct,
            CASE WHEN h.id IS NOT NULL THEN 1 ELSE 0 END as is_locked
        FROM questions q
        LEFT JOIN user_answers_history h ON q.id = h.question_id AND h.user_id = ?
        WHERE 1=1
    ";

    // Filter Logic: STRICT
    if ($mode === 'challenge') {
        // Challenge: Global Only (owner_id IS NULL)
        $sql .= " AND q.owner_id IS NULL";
        $params = [$user_id]; // just for history join
    } else {
        // Private: My Questions Only
        $sql .= " AND q.owner_id = ?";
        $params = [$user_id, $user_id]; // history join + owner check
    }

    $sql .= " ORDER BY q.id ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    $questions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Sanitize UTF-8 to prevent JSON errors
    array_walk_recursive($questions, function (&$item, $key) {
        if (is_string($item)) {
            $item = mb_convert_encoding($item, 'UTF-8', 'UTF-8');
        }
    });

    echo json_encode([
        'success' => true,
        'data' => $questions,
        'debug' => [
            'mode' => $mode,
            'user_id' => $user_id,
            'count' => count($questions)
        ]
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>