<?php
require 'db_connect.php';
header('Content-Type: text/plain');

$stmt = $pdo->query("SELECT owner_id, COUNT(*) as c FROM questions GROUP BY owner_id");
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Total Groups: " . count($rows) . "\n";
foreach ($rows as $r) {
    if ($r['owner_id'] === null)
        $oid = "NULL";
    else
        $oid = $r['owner_id'];

    echo "Owner [$oid]: " . $r['c'] . " questions\n";
}
?>