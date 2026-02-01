<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h1>Teste de Conexão com Banco de Dados</h1>";

echo "<p>Testando conexão...</p>";

try {
    require 'db_connect.php';
    echo "<p style='color: green;'><strong>Sucesso!</strong> Conectado ao banco 'exam_platform'.</p>";

    // Check if table users exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'users'");
    if ($stmt->rowCount() > 0) {
        echo "<p style='color: green;'>Tabela 'users' encontrada.</p>";
    } else {
        echo "<p style='color: red;'>ERRO: Tabela 'users' NÃO encontrada. Execute o script sql_setup.sql.</p>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'><strong>Erro Fatal:</strong> " . $e->getMessage() . "</p>";
    echo "<p>Verifique se:</p>";
    echo "<ul>";
    echo "<li>O XAMPP (MySQL) está rodando.</li>";
    echo "<li>Você criou o banco de dados 'exam_platform'.</li>";
    echo "<li>A senha do root está vazia (padrão XAMPP).</li>";
    echo "</ul>";
}
?>