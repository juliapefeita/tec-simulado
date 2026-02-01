<?php
$conn = new mysqli('localhost', 'root', '123456', 'exam_platform');
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
echo "Connected successfully.\n";

// Add owner_id column
$sql = "ALTER TABLE questions ADD COLUMN owner_id INT NULL DEFAULT NULL";
try {
    if ($conn->query($sql) === TRUE) {
        echo "Column 'owner_id' added successfully.\n";
    } else {
        echo "Error adding column (might already exist): " . $conn->error . "\n";
    }
} catch (Exception $e) {
    echo "Exception adding column: " . $e->getMessage() . "\n";
}

// Add index for performance
$sql = "CREATE INDEX idx_owner ON questions(owner_id)";
try {
    if ($conn->query($sql) === TRUE) {
        echo "Index 'idx_owner' added successfully.\n";
    } else {
        echo "Error adding index: " . $conn->error . "\n";
    }
} catch (Exception $e) {
    echo "Exception adding index: " . $e->getMessage() . "\n";
}

$conn->close();
?>