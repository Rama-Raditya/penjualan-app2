<?php
// api/orders.php - Menangani operasi orders
require 'db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

session_start();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'create':
        createOrder($conn);
        break;
    case 'get_user_orders':
        getUserOrders($conn);
        break;
    case 'get_all_orders':
        getAllOrders($conn);
        break;
    case 'get_order':
        getOrder($conn);
        break;
    case 'update_order_status':
        updateOrderStatus($conn);
        break;
    case 'get_order_stats':
        getOrderStats($conn);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Action tidak valid']);
        break;
}

function createOrder($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method tidak diizinkan']);
        return;
    }

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Harus login terlebih dahulu']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (empty($data['items']) || empty($data['subtotal']) || empty($data['total'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Data order tidak lengkap']);
        return;
    }

    $user_id = $_SESSION['user_id'];
    $order_id = 'ORD-' . time() . '-' . rand(1000, 9999);
    $subtotal = floatval($data['subtotal']);
    $shipping_cost = floatval($data['shipping_cost'] ?? 0);
    $tax = floatval($data['tax'] ?? 0);
    $total = floatval($data['total']);
    $shipping_method = htmlspecialchars(strip_tags($data['shipping_method'] ?? ''));
    $customer_name = htmlspecialchars(strip_tags($data['customer_name'] ?? ''));
    $customer_phone = htmlspecialchars(strip_tags($data['customer_phone'] ?? ''));
    $customer_address = htmlspecialchars(strip_tags($data['customer_address'] ?? ''));
    $notes = htmlspecialchars(strip_tags($data['notes'] ?? ''));

    // Begin transaction
    $conn->begin_transaction();

    try {
        // Insert order
        $stmt = $conn->prepare("INSERT INTO orders (order_id, user_id, subtotal, shipping_cost, tax, total, shipping_method, customer_name, customer_phone, customer_address, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')");
        
        $stmt->bind_param(
            "siidddssss",
            $order_id,
            $user_id,
            $subtotal,
            $shipping_cost,
            $tax,
            $total,
            $shipping_method,
            $customer_name,
            $customer_phone,
            $customer_address,
            $notes
        );

        if (!$stmt->execute()) {
            throw new Exception('Gagal membuat order');
        }

        $order_db_id = $conn->insert_id;
        $stmt->close();

        // Insert order items
        $items = $data['items'];
        foreach ($items as $item) {
            $product_id = intval($item['id']);
            $product_title = htmlspecialchars(strip_tags($item['title']));
            $price = floatval($item['price']);
            $quantity = intval($item['qty']);
            $item_subtotal = $price * $quantity;

            $stmt = $conn->prepare("INSERT INTO order_items (order_id, product_id, product_title, price, quantity, subtotal) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isidid", $order_db_id, $product_id, $product_title, $price, $quantity, $item_subtotal);

            if (!$stmt->execute()) {
                throw new Exception('Gagal menambahkan item order');
            }
            $stmt->close();
        }

        $conn->commit();

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Order berhasil dibuat',
            'order_id' => $order_id,
            'order_db_id' => $order_db_id
        ]);

    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

function getUserOrders($conn) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Harus login terlebih dahulu']);
        return;
    }

    $user_id = $_SESSION['user_id'];
    $sql = "SELECT id, order_id, subtotal, shipping_cost, tax, total, status, shipping_method, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $orders = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $orders[] = $row;
        }
    }

    $stmt->close();
    echo json_encode($orders);
}

function getAllOrders($conn) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Harus login terlebih dahulu']);
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

    $sql = "SELECT o.id, o.order_id, o.user_id, o.subtotal, o.shipping_cost, o.tax, o.total, o.status, o.shipping_method, o.customer_name, o.customer_phone, o.created_at, u.username, u.email FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC";
    
    $result = $conn->query($sql);
    $orders = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $orders[] = $row;
        }
    }

    echo json_encode($orders);
}

function getOrder($conn) {
    if (!isset($_GET['id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'ID order harus diisi']);
        return;
    }

    $order_id = intval($_GET['id']);

    // Get order details
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $order = $result->fetch_assoc();
    $stmt->close();

    if (!$order) {
        http_response_code(404);
        echo json_encode(['error' => 'Order tidak ditemukan']);
        return;
    }

    // Get order items
    $stmt = $conn->prepare("SELECT * FROM order_items WHERE order_id = ?");
    $stmt->bind_param("i", $order_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $items = [];

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
    }
    $stmt->close();

    $order['items'] = $items;
    echo json_encode($order);
}

function updateOrderStatus($conn) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method tidak diizinkan']);
        return;
    }

    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Harus login terlebih dahulu']);
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
        echo json_encode(['error' => 'Hanya admin yang dapat mengubah status']);
        return;
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (empty($data['order_id']) || empty($data['status'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Order ID dan status harus diisi']);
        return;
    }

    $order_id = intval($data['order_id']);
    $status = in_array($data['status'], ['pending', 'processing', 'shipped', 'delivered', 'cancelled']) ? $data['status'] : 'pending';

    $stmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ?");
    $stmt->bind_param("si", $status, $order_id);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Status order berhasil diubah']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Gagal mengubah status']);
    }
    $stmt->close();
}

function getOrderStats($conn) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Harus login terlebih dahulu']);
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

    $stats = [];

    // Total orders
    $result = $conn->query("SELECT COUNT(*) as total FROM orders");
    $stats['total_orders'] = $result->fetch_assoc()['total'];

    // Orders by status
    $result = $conn->query("SELECT status, COUNT(*) as count FROM orders GROUP BY status");
    $stats['orders_by_status'] = [];
    while ($row = $result->fetch_assoc()) {
        $stats['orders_by_status'][$row['status']] = $row['count'];
    }

    // Total revenue
    $result = $conn->query("SELECT SUM(total) as total FROM orders WHERE status IN ('processing', 'shipped', 'delivered')");
    $stats['revenue'] = floatval($result->fetch_assoc()['total'] ?? 0);

    echo json_encode($stats);
}

$conn->close();
?>