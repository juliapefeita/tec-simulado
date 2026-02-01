<?php
require 'db_connect.php';
header('Content-Type: application/json');

session_start();
$uid = $_SESSION['user_id'] ?? 0;

try {
    // Count total questions
    $stmtTotal = $pdo->query("SELECT COUNT(*) FROM questions");
    $total = $stmtTotal->fetchColumn();

    // Count Private (My ID)
    $stmtPrivate = $pdo->prepare("SELECT COUNT(*) FROM questions WHERE owner_id = ?");
    $stmtPrivate->execute([$uid]);
    $privateCount = $stmtPrivate->fetchColumn();

    // Count Challenge (NULL)
    $stmtChallenge = $pdo->query("SELECT COUNT(*) FROM questions WHERE owner_id IS NULL");
    $challengeCount = $stmtChallenge->fetchColumn();

    // Check last few questions to see if owner_id is set
    $stmtLast = $pdo->query("SELECT id, owner_id, LEFT(statement, 50) as txt FROM questions ORDER BY id DESC LIMIT 5");
    $lastQuestions = $stmtLast->fetchAll(PDO::FETCH_ASSOC);

    $json = json_encode([
        'total_questions' => $total,
        'my_private_count' => $privateCount,
        'challenge_count' => $challengeCount,
        'my_user_id' => $uid,
        'recent_questions' => $lastQuestions
    ], JSON_PRETTY_PRINT);

    echo $json;
    file_put_contents('debug_log.txt', $json);

} catch (PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>