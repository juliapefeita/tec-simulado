<?php
header('Content-Type: text/plain');
$output = shell_exec("python --version 2>&1");
echo "Python Check:\n" . $output;

$testFile = __DIR__ . '/../parse_questions.py';
if (file_exists($testFile)) {
    echo "\nScript found.";
} else {
    echo "\nScript NOT found.";
}
?>