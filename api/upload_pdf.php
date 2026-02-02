<?php
ob_start();
ini_set('display_errors', 0);
error_reporting(0);

header('Content-Type: application/json');
session_start();

function send_json($payload) {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    echo json_encode($payload);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json(['success' => false, 'message' => 'Method not allowed']);
}

if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
    send_json(['success' => false, 'message' => 'Upload failed']);
}

$file = $_FILES['pdf'];
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if ($ext !== 'pdf') {
    send_json(['success' => false, 'message' => 'Only PDF files allowed']);
}

// Ensure directory exists
$uploadDir = '../assets/uploads/';
if (!is_dir($uploadDir))
    mkdir($uploadDir, 0777, true);

$targetPath = $uploadDir . 'exam.pdf';

if (move_uploaded_file($file['tmp_name'], $targetPath)) {

    // Connect to DB
    $host = 'localhost';
    $db = 'exam_platform';
    $user = 'root';
    $pass = '123456';

    $conn = new mysqli($host, $user, $pass, $db);
    if ($conn->connect_error) {
        send_json(['success' => false, 'message' => 'DB Connection failed: ' . $conn->connect_error]);
    }

    // Security: Get User ID
    $uid = $_SESSION['user_id'] ?? 0;
    if ($uid === 0) {
        send_json(['success' => false, 'message' => 'Unauthorized']);
    }

    // 1. Get Max ID (to track new questions)
    $resMax = $conn->query("SELECT MAX(id) as max_id FROM questions");
    $rowMax = $resMax->fetch_assoc();
    $lastId = $rowMax['max_id'] ?? 0;

    // 2. PARSE PDF
    $scriptPath = __DIR__ . '/../parse_questions.py';
    $cmd = "python " . escapeshellarg($scriptPath) . " 2>&1";
    $output = shell_exec($cmd);

    // 3. EXECUTE SQL
    $sqlFile = __DIR__ . '/../import_questions.sql';
    if (file_exists($sqlFile)) {
        $sql = file_get_contents($sqlFile);
        $sql = str_replace("TRUNCATE TABLE questions;", "", $sql);

        if ($conn->multi_query($sql)) {
            do {
                if ($r = $conn->store_result())
                    $r->free();
            } while ($conn->more_results() && $conn->next_result());

            // 4. Update Owner (If Private)
            // If Challenge, we leave it as NULL (Public)
            $mode = $_POST['mode'] ?? 'private';

            if ($mode !== 'challenge') {
                // Must restart connection for Prepared Statement after multi_query sometimes
                $conn->close();
                $conn = new mysqli($host, $user, $pass, $db);

                $stmt = $conn->prepare("UPDATE questions SET owner_id = ? WHERE id > ?");
                if ($stmt) {
                    $stmt->bind_param("ii", $uid, $lastId);
                    $stmt->execute();
                    $stmt->close();
                }
            }

            $conn->close();
            send_json(['success' => true, 'message' => "Importação Concluída! Mode: $mode"]);
        } else {
            $safeOutput = mb_convert_encoding($conn->error, 'UTF-8', 'UTF-8');
            $conn->close();
            send_json(['success' => false, 'message' => "Erro SQL: " . $safeOutput]);
        }
    } else {
        $safeOutput = mb_convert_encoding($output, 'UTF-8', 'UTF-8');
        $conn->close();
        send_json(['success' => false, 'message' => "Erro: SQL não gerado. Log: " . $safeOutput]);
    }

} else {
    send_json(['success' => false, 'message' => 'Falha ao mover arquivo enviado']);
}
?>
