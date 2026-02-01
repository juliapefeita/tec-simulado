<?php
require 'db_connect.php';
header('Content-Type: application/json');

$output = [];

// 1. Check Total Questions
$stmt = $pdo->query("SELECT COUNT(*) as total FROM questions");
$output['total_questions'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];

// 2. Check Owner Distribution
$stmt = $pdo->query("SELECT owner_id, COUNT(*) as c FROM questions GROUP BY owner_id");
$output['owners'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 3. Test the SELECT Logic (Simulate user_id=6)
$uid = 6; // Assuming Main User
$sql = "
    SELECT q.id, q.owner_id 
    FROM questions q
    LEFT JOIN user_answers_history h ON q.id = h.question_id AND h.user_id = ?
    WHERE 1=1 AND (q.owner_id = ? OR q.owner_id IS NULL)
    ORDER BY q.id ASC LIMIT 5
";
$stmt = $pdo->prepare($sql);
$stmt->execute([$uid, $uid]);
$output['query_test_user_6'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 4. Test SELECT with User ID 0 (Logged out / Session fail)
$uid = 0;
$stmt->execute([$uid, $uid]);
$output['query_test_user_0'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode($output, JSON_PRETTY_PRINT);
?>