<?php
require_once 'db_connect.php';

try {
    $sql = "
    CREATE TABLE IF NOT EXISTS user_answers_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        question_id INT NOT NULL,
        user_option VARCHAR(5),
        is_correct TINYINT(1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_question (user_id, question_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
    ";

    $pdo->exec($sql);
    echo "Migration Successful: user_answers_history table created.";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
?>