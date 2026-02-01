<?php
require 'db_connect.php';

header('Content-Type: application/json');

session_start();
$uid = $_SESSION['user_id'] ?? 0;

$mode = $_GET['mode'] ?? 'private';

try {
    if ($mode === 'challenge') {
        // Challenge Mode: Global
        // Might restrict to admin? For now, allow user to trigger global clear as requested.

        $pdo->exec("DELETE h FROM user_answers_history h JOIN questions q ON h.question_id = q.id WHERE q.owner_id IS NULL");
        $pdo->exec("DELETE FROM questions WHERE owner_id IS NULL");
        echo json_encode(['success' => true, 'message' => "Desafio GERAL foi limpo."]);

    } else {
        // Private Mode: User specific
        if ($uid === 0) {
            echo json_encode(['success' => false, 'message' => "Não autorizado."]);
            exit;
        }

        // Delete history for THIS user's questions
        $stmtHistory = $pdo->prepare("DELETE h FROM user_answers_history h JOIN questions q ON h.question_id = q.id WHERE q.owner_id = ?");
        $stmtHistory->execute([$uid]);

        // Delete Questions
        $stmt = $pdo->prepare("DELETE FROM questions WHERE owner_id = ?");
        $stmt->execute([$uid]);

        echo json_encode(['success' => true, 'message' => "Seu simulado privado foi limpo."]);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => "Erro: " . $e->getMessage()]);
}
?>