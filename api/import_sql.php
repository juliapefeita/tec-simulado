<?php
require_once 'db_connect.php';

try {
    $sql = file_get_contents('../import_questions.sql');
    if (!$sql) {
        die("Error: Could not read import_questions.sql");
    }

    // Split by semicolon to execute multiple statements if PDO doesn't support batch well directly (it does mostly, but safer loop)
    // Actually PDO->exec supports multiple lines usually.
    $pdo->exec($sql);

    echo "Importacao concluida com sucesso! Questoes adicionadas.";
} catch (Exception $e) {
    echo "Erro na importacao: " . $e->getMessage();
}
?>