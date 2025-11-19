<?php
header("Access-Control-Allow-Origin: *"); // Izinkan akses dari mana saja (untuk pengembangan)

$host = 'localhost';
$user = 'root'; // User default XAMPP
$pass = '';     // Password default XAMPP
$db   = 'penjualan_db'; // Nama database yang Anda buat

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}
// Set charset ke utf8mb4 untuk mendukung karakter yang lebih luas
$conn->set_charset("utf8mb4");
?>
