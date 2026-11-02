<?php
/**
 * Dr. Gopi's Clinic - MySQL & API Configuration
 * 
 * SECURITY BEST PRACTICE:
 * Database credentials should NEVER be hardcoded into files committed to GitHub.
 * 
 * This file dynamically loads credentials from:
 * 1. Server Environment Variables (cPanel / Apache SetEnv / getenv())
 * 2. An uncommitted .env file (backend/.env, excluded via .gitignore)
 * 3. An uncommitted local config (backend/config.local.php, excluded via .gitignore)
 * 4. Or an external config file located above the public web root (e.g., /home/user/clinic_creds.php)
 */

// ------------------------------------------------------------------------
// 1. Lightweight .env Loader (No Composer dependencies needed)
// ------------------------------------------------------------------------
function loadEnvFile($path) {
    if (!file_exists($path) || !is_readable($path)) {
        return false;
    }
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            // Strip surrounding quotes if present
            $value = preg_replace('/^([\'"])(.*)\1$/', '$2', $value);
            if (!empty($key)) {
                putenv("{$key}={$value}");
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
            }
        }
    }
    return true;
}

// Search for uncommitted .env files in order of security:
// 1) One level above web root (e.g. /home/username/.clinic.env)
// 2) Current backend directory (backend/.env)
$envPaths = [
    dirname(__DIR__, 2) . '/.clinic.env',
    __DIR__ . '/.env',
    dirname(__DIR__) . '/.env'
];

foreach ($envPaths as $envPath) {
    if (loadEnvFile($envPath)) {
        break;
    }
}

// Also check for optional uncommitted local PHP config (backend/config.local.php)
if (file_exists(__DIR__ . '/config.local.php')) {
    require_once __DIR__ . '/config.local.php';
}

// Helper to get configuration value with fallback
function getSetting($key, $default = '') {
    if (defined($key)) {
        return constant($key);
    }
    $val = getenv($key);
    if ($val !== false && $val !== '') {
        return $val;
    }
    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return $_ENV[$key];
    }
    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return $_SERVER[$key];
    }
    return $default;
}

// ------------------------------------------------------------------------
// 2. Define Database Constants from Environment
// ------------------------------------------------------------------------
define('DB_HOST', getSetting('DB_HOST', 'localhost'));
define('DB_NAME', getSetting('DB_NAME', 'drgopi_clinic_db'));
define('DB_USER', getSetting('DB_USER', 'drgopi_user'));
define('DB_PASS', getSetting('DB_PASS', ''));
define('DB_CHARSET', getSetting('DB_CHARSET', 'utf8mb4'));

// Admin Secret Passcode for CMS Dashboard Gate
define('ADMIN_SECRET_TOKEN', getSetting('ADMIN_SECRET_TOKEN', 'DrGopi@Clinic#Admin2026!'));

// ------------------------------------------------------------------------
// 3. CORS Configuration
// ------------------------------------------------------------------------
$allowed_origins = [
    'https://drgopiclinic.com',
    'https://www.drgopiclinic.com',
    'https://drgopisclinic.in',
    'https://www.drgopisclinic.in',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5500',
    'http://localhost',
    'null' // For local file:// testing
];

$http_origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$origin_allowed = false;

if (in_array($http_origin, $allowed_origins)) {
    $origin_allowed = true;
} elseif (preg_match('/^https:\/\/[a-zA-Z0-9-]+\.github\.io$/', $http_origin)) {
    // Dynamically allow any user/repo GitHub Pages host
    $origin_allowed = true;
}

if ($origin_allowed) {
    header("Access-Control-Allow-Origin: " . $http_origin);
} else {
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Admin-Token, X-Requested-With");
header("Access-Control-Max-Age: 86400"); // Cache preflight for 24 hours

// Handle preflight OPTIONS request immediately
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
