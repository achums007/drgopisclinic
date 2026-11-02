<?php
/**
 * Dr. Gopi's Clinic (drgopiclinic.com) - PHP / MySQL REST API Bridge
 * 
 * Handles binary LONGBLOB data, CRUD operations for Products, Books, Articles, and Testimonials,
 * CORS headers for GitHub Pages, and secure admin token validation.
 */

require_once __DIR__ . '/config.php';

// Set response header to JSON for all API calls (except file download)
header('Content-Type: application/json; charset=utf-8');

// Disable any caching of API responses across all browsers and proxies
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');

// Disable error display in output to prevent JSON corruption; log errors instead
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Increase memory and upload limits if allowed by server
@ini_set('memory_limit', '256M');
@ini_set('post_max_size', '64M');
@ini_set('upload_max_filesize', '64M');

// ------------------------------------------------------------------------
// 1. Database Connection (PDO)
// ------------------------------------------------------------------------
function getDbConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error'   => 'Database connection failed: ' . $e->getMessage(),
                'hint'    => 'Please verify DB credentials in backend/config.php'
            ]);
            exit;
        }
    }
    return $pdo;
}

// ------------------------------------------------------------------------
// 2. Helper Functions
// ------------------------------------------------------------------------

// Extract Admin Token from Headers or Request
function getAdminToken() {
    $headers = getallheaders();
    if (!empty($headers['X-Admin-Token'])) {
        return trim($headers['X-Admin-Token']);
    }
    if (!empty($headers['x-admin-token'])) {
        return trim($headers['x-admin-token']);
    }
    if (!empty($headers['Authorization'])) {
        if (preg_match('/Bearer\s+(.*)$/i', $headers['Authorization'], $matches)) {
            return trim($matches[1]);
        }
    }
    if (!empty($_REQUEST['admin_token'])) {
        return trim($_REQUEST['admin_token']);
    }
    return null;
}

// Check Admin Authentication
function isAdminAuthenticated() {
    $token = getAdminToken();
    if (empty($token)) {
        return false;
    }
    return hash_equals(ADMIN_SECRET_TOKEN, $token);
}

// Require Admin Authentication
function requireAdmin() {
    if (!isAdminAuthenticated()) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'error'   => 'Unauthorized. Valid Admin Token required.'
        ]);
        exit;
    }
}

// Get JSON Request Body or Multipart POST
function getRequestData() {
    $contentType = isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        return is_array($json) ? $json : [];
    }
    // If sent via standard POST/PUT form
    return $_POST;
}

// Parse Base64 Data URI into [mime, binary_data]
function parseBase64Binary($dataUri, $defaultMime = 'image/jpeg') {
    if (empty($dataUri)) {
        return [null, null];
    }
    // Matches data:image/png;base64,iVBORw0KGgo...
    if (preg_match('/^data:([^;]+);base64,(.+)$/', $dataUri, $matches)) {
        $mime = $matches[1];
        $binary = base64_decode($matches[2]);
        return [$mime, $binary];
    }
    // If already raw base64 string
    $binary = base64_decode($dataUri, true);
    if ($binary !== false) {
        return [$defaultMime, $binary];
    }
    return [$defaultMime, $dataUri];
}

// Format Binary LONGBLOB to Base64 Data URI
function formatBlobToDataUri($binaryData, $mimeType) {
    if (empty($binaryData)) {
        return null;
    }
    $mime = !empty($mimeType) ? $mimeType : 'image/jpeg';
    return 'data:' . $mime . ';base64,' . base64_encode($binaryData);
}

// ------------------------------------------------------------------------
// 3. Routing
// ------------------------------------------------------------------------
$action = isset($_GET['action']) ? strtolower(trim($_GET['action'])) : '';
$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : 'GET';
$id     = isset($_GET['id']) ? intval($_GET['id']) : 0;

try {
    $pdo = getDbConnection();

    switch ($action) {
        // ----------------------------------------------------------------
        // AUTH / LOGIN
        // ----------------------------------------------------------------
        case 'login':
            if ($method !== 'POST') {
                http_response_code(405);
                echo json_encode(['success' => false, 'error' => 'Method Not Allowed']);
                exit;
            }
            $data = getRequestData();
            $passcode = isset($data['passcode']) ? trim($data['passcode']) : '';
            if (hash_equals(ADMIN_SECRET_TOKEN, $passcode)) {
                echo json_encode([
                    'success' => true,
                    'token'   => ADMIN_SECRET_TOKEN,
                    'message' => 'Admin authentication successful.'
                ]);
            } else {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error'   => 'Invalid Admin Passcode.'
                ]);
            }
            break;

        // ----------------------------------------------------------------
        // STATS (Dashboard Overview)
        // ----------------------------------------------------------------
        case 'stats':
            $productsCount = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
            $booksCount    = $pdo->query("SELECT COUNT(*) FROM books")->fetchColumn();
            $articlesCount = $pdo->query("SELECT COUNT(*) FROM articles")->fetchColumn();
            $reviewsTotal  = $pdo->query("SELECT COUNT(*) FROM testimonials")->fetchColumn();
            $reviewsPub    = $pdo->query("SELECT COUNT(*) FROM testimonials WHERE is_published = 1")->fetchColumn();
            $reviewsPend   = $pdo->query("SELECT COUNT(*) FROM testimonials WHERE is_published = 0")->fetchColumn();

            echo json_encode([
                'success' => true,
                'stats' => [
                    'products'     => (int)$productsCount,
                    'books'        => (int)$booksCount,
                    'articles'     => (int)$articlesCount,
                    'testimonials' => [
                        'total'     => (int)$reviewsTotal,
                        'published' => (int)$reviewsPub,
                        'pending'   => (int)$reviewsPend
                    ]
                ]
            ]);
            break;

        // ----------------------------------------------------------------
        // DOWNLOAD PREVIEW PDF (Direct Streaming)
        // ----------------------------------------------------------------
        case 'download_preview':
            if ($id <= 0) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid book ID']);
                exit;
            }
            $stmt = $pdo->prepare("SELECT title, preview_file_data, preview_mime_type FROM books WHERE id = ?");
            $stmt->execute([$id]);
            $book = $stmt->fetch();
            if (!$book || empty($book['preview_file_data'])) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'No preview file available for this book']);
                exit;
            }
            $mime = !empty($book['preview_mime_type']) ? $book['preview_mime_type'] : 'application/pdf';
            $safeTitle = preg_replace('/[^a-zA-Z0-9_-]/', '_', $book['title']);
            
            header_remove('Content-Type');
            header("Content-Type: " . $mime);
            header("Content-Disposition: inline; filename=\"sample_preview_" . $safeTitle . ".pdf\"");
            header("Content-Length: " . strlen($book['preview_file_data']));
            echo $book['preview_file_data'];
            exit;

        // ----------------------------------------------------------------
        // MODULE A: PRODUCTS
        // ----------------------------------------------------------------
        case 'products':
            if ($method === 'GET') {
                if ($id > 0) {
                    $stmt = $pdo->prepare("SELECT id, title, category, price, description, image_data, image_mime_type, created_at FROM products WHERE id = ?");
                    $stmt->execute([$id]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $row['image_data'] = formatBlobToDataUri($row['image_data'], $row['image_mime_type']);
                        echo json_encode(['success' => true, 'data' => $row]);
                    } else {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Product not found']);
                    }
                } else {
                    $stmt = $pdo->query("SELECT id, title, category, price, description, image_data, image_mime_type, created_at FROM products ORDER BY id DESC");
                    $products = $stmt->fetchAll();
                    foreach ($products as &$p) {
                        $p['image_data'] = formatBlobToDataUri($p['image_data'], $p['image_mime_type']);
                    }
                    echo json_encode(['success' => true, 'data' => $products]);
                }
            } elseif ($method === 'POST') {
                requireAdmin();
                $data = getRequestData();
                $title       = trim($data['title'] ?? '');
                $category    = trim($data['category'] ?? 'General');
                $price       = floatval($data['price'] ?? 0);
                $description = trim($data['description'] ?? '');
                $imageUri    = $data['image_data'] ?? null;
                $mimeType    = $data['image_mime_type'] ?? 'image/jpeg';

                if (empty($title)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Product title is required.']);
                    exit;
                }

                $imageBinary = null;
                if (!empty($imageUri)) {
                    list($parsedMime, $parsedBin) = parseBase64Binary($imageUri, $mimeType);
                    $mimeType = $parsedMime ?: $mimeType;
                    $imageBinary = $parsedBin;
                }

                $stmt = $pdo->prepare("INSERT INTO products (title, category, price, description, image_data, image_mime_type) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->bindParam(1, $title);
                $stmt->bindParam(2, $category);
                $stmt->bindParam(3, $price);
                $stmt->bindParam(4, $description);
                $stmt->bindParam(5, $imageBinary, PDO::PARAM_LOB);
                $stmt->bindParam(6, $mimeType);
                $stmt->execute();

                $newId = $pdo->lastInsertId();
                echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Product created successfully.']);
            } elseif ($method === 'PUT') {
                requireAdmin();
                if ($id <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid Product ID.']);
                    exit;
                }
                $data = getRequestData();
                $title       = trim($data['title'] ?? '');
                $category    = trim($data['category'] ?? 'General');
                $price       = floatval($data['price'] ?? 0);
                $description = trim($data['description'] ?? '');
                $imageUri    = $data['image_data'] ?? null;
                $mimeType    = $data['image_mime_type'] ?? null;

                if (!empty($imageUri)) {
                    list($parsedMime, $parsedBin) = parseBase64Binary($imageUri, $mimeType ?: 'image/jpeg');
                    $mimeType = $parsedMime ?: $mimeType;
                    $stmt = $pdo->prepare("UPDATE products SET title = ?, category = ?, price = ?, description = ?, image_data = ?, image_mime_type = ? WHERE id = ?");
                    $stmt->bindParam(1, $title);
                    $stmt->bindParam(2, $category);
                    $stmt->bindParam(3, $price);
                    $stmt->bindParam(4, $description);
                    $stmt->bindParam(5, $parsedBin, PDO::PARAM_LOB);
                    $stmt->bindParam(6, $mimeType);
                    $stmt->bindParam(7, $id, PDO::PARAM_INT);
                    $stmt->execute();
                } else {
                    $stmt = $pdo->prepare("UPDATE products SET title = ?, category = ?, price = ?, description = ? WHERE id = ?");
                    $stmt->execute([$title, $category, $price, $description, $id]);
                }

                echo json_encode(['success' => true, 'message' => 'Product updated successfully.']);
            } elseif ($method === 'DELETE') {
                requireAdmin();
                if ($id <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid Product ID.']);
                    exit;
                }
                $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true, 'message' => 'Product deleted successfully.']);
            }
            break;

        // ----------------------------------------------------------------
        // MODULE B: BOOKS
        // ----------------------------------------------------------------
        case 'books':
            if ($method === 'GET') {
                if ($id > 0) {
                    $stmt = $pdo->prepare("SELECT id, title, price, summary, cover_image_data, cover_mime_type, preview_mime_type, (preview_file_data IS NOT NULL AND LENGTH(preview_file_data) > 0) AS has_preview, created_at FROM books WHERE id = ?");
                    $stmt->execute([$id]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $row['cover_image_data'] = formatBlobToDataUri($row['cover_image_data'], $row['cover_mime_type']);
                        $row['preview_download_url'] = 'api.php?action=download_preview&id=' . $row['id'];
                        echo json_encode(['success' => true, 'data' => $row]);
                    } else {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Book not found']);
                    }
                } else {
                    $stmt = $pdo->query("SELECT id, title, price, summary, cover_image_data, cover_mime_type, preview_mime_type, (preview_file_data IS NOT NULL AND LENGTH(preview_file_data) > 0) AS has_preview, created_at FROM books ORDER BY id ASC");
                    $books = $stmt->fetchAll();
                    foreach ($books as &$b) {
                        $b['cover_image_data'] = formatBlobToDataUri($b['cover_image_data'], $b['cover_mime_type']);
                        $b['has_preview'] = (bool)$b['has_preview'];
                        $b['preview_download_url'] = 'api.php?action=download_preview&id=' . $b['id'];
                    }
                    echo json_encode(['success' => true, 'data' => $books]);
                }
            } elseif ($method === 'POST') {
                requireAdmin();
                $data = getRequestData();
                $title    = trim($data['title'] ?? '');
                $price    = floatval($data['price'] ?? 0);
                $summary  = trim($data['summary'] ?? '');
                $coverUri = $data['cover_image_data'] ?? null;
                $coverMime= $data['cover_mime_type'] ?? 'image/jpeg';
                $prevUri  = $data['preview_file_data'] ?? null;
                $prevMime = $data['preview_mime_type'] ?? 'application/pdf';

                if (empty($title)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Book title is required.']);
                    exit;
                }

                $coverBin = null;
                if (!empty($coverUri)) {
                    list($cMime, $cBin) = parseBase64Binary($coverUri, $coverMime);
                    $coverMime = $cMime ?: $coverMime;
                    $coverBin = $cBin;
                }

                $prevBin = null;
                if (!empty($prevUri)) {
                    list($pMime, $pBin) = parseBase64Binary($prevUri, $prevMime);
                    $prevMime = $pMime ?: $prevMime;
                    $prevBin = $pBin;
                }

                $stmt = $pdo->prepare("INSERT INTO books (title, price, summary, cover_image_data, cover_mime_type, preview_file_data, preview_mime_type) VALUES (?, ?, ?, ?, ?, ?, ?)");
                $stmt->bindParam(1, $title);
                $stmt->bindParam(2, $price);
                $stmt->bindParam(3, $summary);
                $stmt->bindParam(4, $coverBin, PDO::PARAM_LOB);
                $stmt->bindParam(5, $coverMime);
                $stmt->bindParam(6, $prevBin, PDO::PARAM_LOB);
                $stmt->bindParam(7, $prevMime);
                $stmt->execute();

                $newId = $pdo->lastInsertId();
                echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Book added successfully.']);
            } elseif ($method === 'PUT') {
                requireAdmin();
                if ($id <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid Book ID.']);
                    exit;
                }
                $data = getRequestData();
                $title    = trim($data['title'] ?? '');
                $price    = floatval($data['price'] ?? 0);
                $summary  = trim($data['summary'] ?? '');
                $coverUri = $data['cover_image_data'] ?? null;
                $prevUri  = $data['preview_file_data'] ?? null;

                // Base update
                $stmt = $pdo->prepare("UPDATE books SET title = ?, price = ?, summary = ? WHERE id = ?");
                $stmt->execute([$title, $price, $summary, $id]);

                // Update Cover if provided
                if (!empty($coverUri)) {
                    list($cMime, $cBin) = parseBase64Binary($coverUri, 'image/jpeg');
                    $stmtC = $pdo->prepare("UPDATE books SET cover_image_data = ?, cover_mime_type = ? WHERE id = ?");
                    $stmtC->bindParam(1, $cBin, PDO::PARAM_LOB);
                    $stmtC->bindParam(2, $cMime);
                    $stmtC->bindParam(3, $id, PDO::PARAM_INT);
                    $stmtC->execute();
                }

                // Update Preview PDF if provided
                if (!empty($prevUri)) {
                    list($pMime, $pBin) = parseBase64Binary($prevUri, 'application/pdf');
                    $stmtP = $pdo->prepare("UPDATE books SET preview_file_data = ?, preview_mime_type = ? WHERE id = ?");
                    $stmtP->bindParam(1, $pBin, PDO::PARAM_LOB);
                    $stmtP->bindParam(2, $pMime);
                    $stmtP->bindParam(3, $id, PDO::PARAM_INT);
                    $stmtP->execute();
                }

                echo json_encode(['success' => true, 'message' => 'Book updated successfully.']);
            } elseif ($method === 'DELETE') {
                requireAdmin();
                if ($id <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid Book ID.']);
                    exit;
                }
                $stmt = $pdo->prepare("DELETE FROM books WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true, 'message' => 'Book deleted successfully.']);
            }
            break;

        // ----------------------------------------------------------------
        // MODULE C: ARTICLES
        // ----------------------------------------------------------------
        case 'articles':
            if ($method === 'GET') {
                if ($id > 0) {
                    $stmt = $pdo->prepare("SELECT id, title, category, content, thumbnail_data, thumbnail_mime_type, created_at FROM articles WHERE id = ?");
                    $stmt->execute([$id]);
                    $row = $stmt->fetch();
                    if ($row) {
                        $row['thumbnail_data'] = formatBlobToDataUri($row['thumbnail_data'], $row['thumbnail_mime_type']);
                        echo json_encode(['success' => true, 'data' => $row]);
                    } else {
                        http_response_code(404);
                        echo json_encode(['success' => false, 'error' => 'Article not found']);
                    }
                } else {
                    $stmt = $pdo->query("SELECT id, title, category, content, thumbnail_data, thumbnail_mime_type, created_at FROM articles ORDER BY id DESC");
                    $articles = $stmt->fetchAll();
                    foreach ($articles as &$a) {
                        $a['thumbnail_data'] = formatBlobToDataUri($a['thumbnail_data'], $a['thumbnail_mime_type']);
                    }
                    echo json_encode(['success' => true, 'data' => $articles]);
                }
            } elseif ($method === 'POST') {
                requireAdmin();
                $data = getRequestData();
                $title    = trim($data['title'] ?? '');
                $category = trim($data['category'] ?? 'General Health');
                $content  = trim($data['content'] ?? '');
                $thumbUri = $data['thumbnail_data'] ?? null;
                $thumbMime= $data['thumbnail_mime_type'] ?? 'image/jpeg';

                if (empty($title)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Article title is required.']);
                    exit;
                }

                $thumbBin = null;
                if (!empty($thumbUri)) {
                    list($tMime, $tBin) = parseBase64Binary($thumbUri, $thumbMime);
                    $thumbMime = $tMime ?: $thumbMime;
                    $thumbBin = $tBin;
                }

                $stmt = $pdo->prepare("INSERT INTO articles (title, category, content, thumbnail_data, thumbnail_mime_type) VALUES (?, ?, ?, ?, ?)");
                $stmt->bindParam(1, $title);
                $stmt->bindParam(2, $category);
                $stmt->bindParam(3, $content);
                $stmt->bindParam(4, $thumbBin, PDO::PARAM_LOB);
                $stmt->bindParam(5, $thumbMime);
                $stmt->execute();

                $newId = $pdo->lastInsertId();
                echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Article published successfully.']);
            } elseif ($method === 'PUT') {
                requireAdmin();
                if ($id <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid Article ID.']);
                    exit;
                }
                $data = getRequestData();
                $title    = trim($data['title'] ?? '');
                $category = trim($data['category'] ?? 'General Health');
                $content  = trim($data['content'] ?? '');
                $thumbUri = $data['thumbnail_data'] ?? null;

                if (!empty($thumbUri)) {
                    list($tMime, $tBin) = parseBase64Binary($thumbUri, 'image/jpeg');
                    $stmt = $pdo->prepare("UPDATE articles SET title = ?, category = ?, content = ?, thumbnail_data = ?, thumbnail_mime_type = ? WHERE id = ?");
                    $stmt->bindParam(1, $title);
                    $stmt->bindParam(2, $category);
                    $stmt->bindParam(3, $content);
                    $stmt->bindParam(4, $tBin, PDO::PARAM_LOB);
                    $stmt->bindParam(5, $tMime);
                    $stmt->bindParam(6, $id, PDO::PARAM_INT);
                    $stmt->execute();
                } else {
                    $stmt = $pdo->prepare("UPDATE articles SET title = ?, category = ?, content = ? WHERE id = ?");
                    $stmt->execute([$title, $category, $content, $id]);
                }

                echo json_encode(['success' => true, 'message' => 'Article updated successfully.']);
            } elseif ($method === 'DELETE') {
                requireAdmin();
                if ($id <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid Article ID.']);
                    exit;
                }
                $stmt = $pdo->prepare("DELETE FROM articles WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true, 'message' => 'Article deleted successfully.']);
            }
            break;

        // ----------------------------------------------------------------
        // MODULE D: TESTIMONIALS & WHATSAPP REVIEWS
        // ----------------------------------------------------------------
        case 'testimonials':
            if ($method === 'GET') {
                // If admin token provided, return all; otherwise return only published
                $isAdmin = isAdminAuthenticated();
                $sql = "SELECT id, patient_name, location, condition_treated, review_text, is_published, created_at FROM testimonials";
                if (!$isAdmin && empty($_GET['all'])) {
                    $sql .= " WHERE is_published = 1";
                }
                $sql .= " ORDER BY id DESC";

                $stmt = $pdo->query($sql);
                $reviews = $stmt->fetchAll();
                foreach ($reviews as &$r) {
                    $r['is_published'] = (bool)$r['is_published'];
                }
                echo json_encode(['success' => true, 'data' => $reviews]);
            } elseif ($method === 'POST') {
                requireAdmin();
                $data = getRequestData();

                // Check if this is a quick toggle action
                if (isset($_GET['toggle']) || isset($data['action']) && $data['action'] === 'toggle') {
                    $tId = $id > 0 ? $id : intval($data['id'] ?? 0);
                    if ($tId <= 0) {
                        http_response_code(400);
                        echo json_encode(['success' => false, 'error' => 'Invalid testimonial ID']);
                        exit;
                    }
                    $stmt = $pdo->prepare("UPDATE testimonials SET is_published = NOT is_published WHERE id = ?");
                    $stmt->execute([$tId]);
                    $stmtCheck = $pdo->prepare("SELECT is_published FROM testimonials WHERE id = ?");
                    $stmtCheck->execute([$tId]);
                    $newStatus = (bool)$stmtCheck->fetchColumn();
                    echo json_encode([
                        'success'      => true,
                        'is_published' => $newStatus,
                        'message'      => 'Testimonial status updated to ' . ($newStatus ? 'Published' : 'Hidden')
                    ]);
                    exit;
                }

                $patient_name      = trim($data['patient_name'] ?? '');
                $location          = trim($data['location'] ?? '');
                $condition_treated = trim($data['condition_treated'] ?? '');
                $review_text       = trim($data['review_text'] ?? '');
                $is_published      = isset($data['is_published']) ? (int)(bool)$data['is_published'] : 1;

                if (empty($patient_name) || empty($review_text)) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Patient name and review text are required.']);
                    exit;
                }

                $stmt = $pdo->prepare("INSERT INTO testimonials (patient_name, location, condition_treated, review_text, is_published) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$patient_name, $location, $condition_treated, $review_text, $is_published]);
                $newId = $pdo->lastInsertId();

                echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Review imported/saved successfully.']);
            } elseif ($method === 'PUT') {
                requireAdmin();
                if ($id <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid Testimonial ID.']);
                    exit;
                }
                $data = getRequestData();
                $patient_name      = trim($data['patient_name'] ?? '');
                $location          = trim($data['location'] ?? '');
                $condition_treated = trim($data['condition_treated'] ?? '');
                $review_text       = trim($data['review_text'] ?? '');
                $is_published      = isset($data['is_published']) ? (int)(bool)$data['is_published'] : 1;

                $stmt = $pdo->prepare("UPDATE testimonials SET patient_name = ?, location = ?, condition_treated = ?, review_text = ?, is_published = ? WHERE id = ?");
                $stmt->execute([$patient_name, $location, $condition_treated, $review_text, $is_published, $id]);

                echo json_encode(['success' => true, 'message' => 'Testimonial updated successfully.']);
            } elseif ($method === 'DELETE') {
                requireAdmin();
                if ($id <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'error' => 'Invalid Testimonial ID.']);
                    exit;
                }
                $stmt = $pdo->prepare("DELETE FROM testimonials WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode(['success' => true, 'message' => 'Testimonial deleted successfully.']);
            }
            break;

        // ----------------------------------------------------------------
        // ONE-CLICK SETUP & SEED
        // ----------------------------------------------------------------
        case 'setup':
            requireAdmin();
            $schemaFile = __DIR__ . '/schema.sql';
            if (!file_exists($schemaFile)) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'schema.sql file not found']);
                exit;
            }
            $sql = file_get_contents($schemaFile);
            $pdo->exec($sql);
            echo json_encode([
                'success' => true,
                'message' => 'Database tables and starter records initialized successfully.'
            ]);
            break;

        // ----------------------------------------------------------------
        // PING / HEALTH CHECK
        // ----------------------------------------------------------------
        case 'ping':
        default:
            echo json_encode([
                'success' => true,
                'status'  => 'online',
                'service' => "Dr. Gopi's Clinic API Bridge",
                'version' => '2.0.0',
                'time'    => date('Y-m-d H:i:s'),
                'endpoints' => [
                    'products'     => 'api.php?action=products',
                    'books'        => 'api.php?action=books',
                    'articles'     => 'api.php?action=articles',
                    'testimonials' => 'api.php?action=testimonials',
                    'stats'        => 'api.php?action=stats',
                    'login'        => 'api.php?action=login'
                ]
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}
