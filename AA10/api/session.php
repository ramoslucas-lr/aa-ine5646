<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!empty($_SESSION['email'])) {
    echo json_encode([
        'logged' => true,
        'email'  => $_SESSION['email'],
        'nome'   => $_SESSION['nome'] ?? $_SESSION['email'],
    ]);
} else {
    http_response_code(401);
    echo json_encode(['logged' => false]);
}