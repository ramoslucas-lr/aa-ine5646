<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Dados inválidos']);
    exit;
}

$email = strtolower(trim($input['email'] ?? ''));
$senha = $input['senha'] ?? '';

if ($email === '' || $senha === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Preencha e-mail e senha']);
    exit;
}

$dataFile = __DIR__ . '/data/users.json';
if (!file_exists($dataFile)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'E-mail ou senha inválidos']);
    exit;
}

$bd = json_decode(file_get_contents($dataFile), true);
$usuario = null;
foreach (($bd['usuarios'] ?? []) as $u) {
    if (strtolower($u['email']) === $email) { $usuario = $u; break; }
}

if (!$usuario || !password_verify($senha, $usuario['senha'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'E-mail ou senha inválidos']);
    exit;
}

$_SESSION['email'] = $usuario['email'];
$_SESSION['nome']  = $usuario['nome'];

echo json_encode([
    'success' => true,
    'message' => 'Login realizado',
    'nome'    => $usuario['nome'],
    'email'   => $usuario['email'],
]);