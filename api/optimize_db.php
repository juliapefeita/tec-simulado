<?php
require 'db_connect.php';

echo "Optimizing Database...\n";

try {
    // 1. Index on user_attempts for Ranking Performance
    // Query: ORDER BY total_score DESC
    $pdo->exec("ALTER TABLE user_attempts ADD INDEX IF NOT EXISTS idx_score (score)");

    // Query: ORDER BY last_attempt DESC (date_taken)
    $pdo->exec("ALTER TABLE user_attempts ADD INDEX IF NOT EXISTS idx_date (date_taken)");

    // Query: JOIN users ON user_id
    $pdo->exec("ALTER TABLE user_attempts ADD INDEX IF NOT EXISTS idx_user (user_id)");

    echo "Indexes added to 'user_attempts'.\n";

    // 2. Ensure questions owner_id index (Verification)
    $pdo->exec("ALTER TABLE questions ADD INDEX IF NOT EXISTS idx_owner (owner_id)");
    echo "Verified 'questions' indexes.\n";

    echo "Optimization Complete.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>