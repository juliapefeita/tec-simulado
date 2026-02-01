<?php
require_once 'db_connect.php';
header('Content-Type: application/json');

try {
    // Get top score per user (subquery to get max score per user, then join)
    // Or just simple ranking of all attempts? User usually wants "Best Score" per user.
    // Let's do simple: Highest Score of each user

    // Calculate Ranking based on CORRECT answers in CHALLENGE mode (owner_id IS NULL)
    // Source of Truth: user_answers_history + questions table

    // Calculate Ranking based on User Attempts (Legacy/Session View)
    // The user prefers to see this data as verified in the DB.

    $sql = "
        SELECT u.username, SUM(ua.score) as total_score, MAX(ua.date_taken) as last_attempt
        FROM user_attempts ua
        JOIN users u ON ua.user_id = u.id
        GROUP BY u.id
        ORDER BY total_score DESC, last_attempt DESC
        LIMIT 50
    ";

    $stmt = $pdo->query($sql);
    $ranking = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(['success' => true, 'data' => $ranking]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>