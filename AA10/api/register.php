<?php
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

$nome      = trim($input['nome']  ?? '');
$sobrenome = trim($input['sobrenome'] ?? '');
$cpf       = trim($input['cpf'] ?? '');
$email     = strtolower(trim($input['email'] ?? ''));
$senha     = $input['senha'] ?? '';

if ($nome === '' || $email === '' || $senha === '' || $cpf === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Preencha todos os campos obrigatórios.']);
    exit;
}

if (strlen($cpf) !== 11) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'CPF inválido.']);
    exit;
}

$endereco = [
    'cep'        => trim($input['cep']        ?? ''),
    'logradouro' => trim($input['logradouro'] ?? ''),
    'bairro'     => trim($input['bairro']     ?? ''),
    'cidade'     => trim($input['cidade']     ?? ''),
    'estado'     => trim($input['estado']     ?? ''),
];

$dataDir  = __DIR__ . '/data';
$dataFile = $dataDir . '/users.json';

if (!is_dir($dataDir))           @mkdir($dataDir, 0755, true);
if (!file_exists($dataFile))     @file_put_contents($dataFile, json_encode(['usuarios' => []]));

$fp = @fopen($dataFile, 'c+');
if (!$fp) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Erro ao acessar base de dados']);
    exit;
}
flock($fp, LOCK_EX);

$conteudo = stream_get_contents($fp);
$bd = json_decode($conteudo, true);
if (!is_array($bd) || !isset($bd['usuarios'])) $bd = ['usuarios' => []];

foreach ($bd['usuarios'] as $u) {
    if (isset($u['email']) && strtolower($u['email']) === $email) {
        flock($fp, LOCK_UN); fclose($fp);
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Já existe um usuário com este e-mail.']);
        exit;
    }
}

$bd['usuarios'][] = [
    'nome'      => $nome,
    'sobrenome' => $sobrenome,
    'cpf'       => $cpf,
    'email'     => $email,
    'senha'     => password_hash($senha, PASSWORD_DEFAULT),
    'endereco'  => $endereco,
    'criado_em' => date('c'),
];

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($bd, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['success' => true, 'message' => 'Cadastro realizado com sucesso']);