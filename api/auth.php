<?php
// api/auth.php - Menangani registrasi, login, dan user management
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'register':
        register($conn);
        break;
    case 'login':
        login($conn);
        break;
    case 'logout':
        logout();
        break;
    case 'get_user':
        getUser($conn);
        break;
    case 'update_profile':
        updateProfile($conn);
        break;
    case 'get_all_users':
        getAllUsers($conn);
        break;
    case 'delete_user':
        deleteUser($conn);
        break;
    case 'change_user_role':
        changeUserRole($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Action tidak valid']);
        break;
}

function register($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method tidak diizinkan']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['username']) || empty($data['email']) || empty($data['password']) || empty($data['full_name'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Semua field harus diisi']);
        return;
    }

    $username = htmlspecialchars(strip_tags($data['username']));
    $email = filter_var($data['email'], FILTER_SANITIZE_EMAIL);
    $password = $data['password'];
    $full_name = htmlspecialchars(strip_tags($data['full_name']));
    $phone = isset($data['phone']) ? htmlspecialchars(strip_tags($data['phone'])) : '';
    $address = isset($data['address']) ? htmlspecialchars(strip_tags($data['address'])) : '';

    // Validasi format email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Format email tidak valid']);
        return;
    }

    // Hash password
    $hashed_password = password_hash($password, PASSWORD_BCRYPT);

    // Check apakah username atau email sudah terdaftar
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->bind_param("ss", $username, $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Username atau email sudah terdaftar']);
        $stmt->close();
        return;
    }
    $stmt->close();

    // Insert user baru
    $stmt = $conn->prepare("INSERT INTO users (username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, 'user')");
    $stmt->bind_param("ssssss", $username, $email, $hashed_password, $full_name, $phone, $address);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Registrasi berhasil! Silakan login.',
            'user_id' => $conn->insert_id
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Gagal mendaftar', 'details' => $stmt->error]);
    }
    $stmt->close();
}

function login($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method tidak diizinkan']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['username']) || empty($data['password'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Username dan password harus diisi']);
        return;
    }

    $username = htmlspecialchars(strip_tags($data['username']));
    $password = $data['password'];

    $stmt = $conn->prepare("SELECT id, username, email, full_name, role, password FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(401);
        echo json_encode(['error' => 'Username atau password salah']);
        $stmt->close();
        return;
    }

    $user = $result->fetch_assoc();
    $stmt->close();

    if (!password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Username atau password salah']);
        return;
    }

    // Set session atau token (untuk demo menggunakan localStorage di frontend)
    session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['role'] = $user['role'];

    echo json_encode([
        'success' => true,
        'message' => 'Login berhasil',
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'full_name' => $user['full_name'],
            'role' => $user['role']
        ]
    ]);
}

function logout() {
    session_start();
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logout berhasil']);
}

function getUser($conn) {
    session_start();
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Tidak terautentikasi']);
        return;
    }

    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT id, username, email, full_name, phone, address, role, created_at FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if ($user) {
        echo json_encode($user);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'User tidak ditemukan']);
    }
}

function updateProfile($conn) {
    session_start();
    if (!isset($_SESSION['user_id']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(401);
        echo json_encode(['error' => 'Tidak terautentikasi']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    $user_id = $_SESSION['user_id'];

    $full_name = isset($data['full_name']) ? htmlspecialchars(strip_tags($data['full_name'])) : '';
    $phone = isset($data['phone']) ? htmlspecialchars(strip_tags($data['phone'])) : '';
    $address = isset($data['address']) ? htmlspecialchars(strip_tags($data['address'])) : '';

    $stmt = $conn->prepare("UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?");
    $stmt->bind_param("sssi", $full_name, $phone, $address, $user_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Profil berhasil diperbarui']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Gagal memperbarui profil']);
    }
    $stmt->close();
}

function getAllUsers($conn) {
    session_start();
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Tidak terautentikasi']);
        return;
    }

    // Check if admin
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Hanya admin yang dapat mengakses']);
        return;
    }

    $sql = "SELECT id, username, email, full_name, phone, role, created_at FROM users ORDER BY created_at DESC";
    $result = $conn->query($sql);
    $users = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $users[] = $row;
        }
    }

    echo json_encode($users);
}

function deleteUser($conn) {
    session_start();
    if (!isset($_SESSION['user_id']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(401);
        echo json_encode(['error' => 'Tidak terautentikasi']);
        return;
    }

    // Check if admin
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Hanya admin yang dapat menghapus user']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID user harus diisi']);
        return;
    }

    $delete_id = intval($data['id']);
    if ($delete_id === $user_id) {
        http_response_code(400);
        echo json_encode(['error' => 'Tidak dapat menghapus akun sendiri']);
        return;
    }

    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $delete_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'User berhasil dihapus']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Gagal menghapus user']);
    }
    $stmt->close();
}

function changeUserRole($conn) {
    session_start();
    if (!isset($_SESSION['user_id']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(401);
        echo json_encode(['error' => 'Tidak terautentikasi']);
        return;
    }

    // Check if admin
    $user_id = $_SESSION['user_id'];
    $stmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if ($user['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Hanya admin yang dapat mengubah role']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['id']) || empty($data['role'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID dan role harus diisi']);
        return;
    }

    $target_id = intval($data['id']);
    $role = in_array($data['role'], ['admin', 'user']) ? $data['role'] : 'user';

    $stmt = $conn->prepare("UPDATE users SET role = ? WHERE id = ?");
    $stmt->bind_param("si", $role, $target_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Role berhasil diubah']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Gagal mengubah role']);
    }
    $stmt->close();
}

$conn->close();
?>