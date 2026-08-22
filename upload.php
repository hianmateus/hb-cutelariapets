<?php

header('Content-Type: application/json; charset=utf-8');

/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES
|--------------------------------------------------------------------------
*/

$firebaseApiKey = "AIzaSyBJjLLf0XxnyT0lwE9WwYepaXGnnWprUpc";

$uploadDir = __DIR__ . "/imgs/Products/";
$publicDir = "./imgs/Products/";

/*
|--------------------------------------------------------------------------
| FUNÇÃO DE RESPOSTA
|--------------------------------------------------------------------------
*/

function resposta($sucesso, $dados = [], $status = 200) {
    http_response_code($status);

    echo json_encode([
        "success" => $sucesso,
        ...$dados
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

/*
|--------------------------------------------------------------------------
| VERIFICAR MÉTODO
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    resposta(false, [
        "error" => "Método não permitido."
    ], 405);
}

/*
|--------------------------------------------------------------------------
| PEGAR TOKEN DO FIREBASE
|--------------------------------------------------------------------------
*/

$headers = function_exists('getallheaders')
    ? getallheaders()
    : [];

$authorization = '';

foreach ($headers as $key => $value) {
    if (strtolower($key) === 'authorization') {
        $authorization = trim($value);
        break;
    }
}

if (!$authorization || !preg_match('/Bearer\s+(.+)/i', $authorization, $matches)) {
    resposta(false, [
        "error" => "Usuário não autenticado."
    ], 401);
}

$idToken = trim($matches[1]);

/*
|--------------------------------------------------------------------------
| VALIDAR TOKEN NO FIREBASE
|--------------------------------------------------------------------------
*/

$url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" . urlencode($firebaseApiKey);

$postData = json_encode([
    "idToken" => $idToken
]);

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $postData,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "Content-Length: " . strlen($postData)
    ],
    CURLOPT_TIMEOUT => 15
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

if ($response === false || $httpCode !== 200) {
    resposta(false, [
        "error" => "Sessão do Firebase inválida ou expirada."
    ], 401);
}

$firebaseResponse = json_decode($response, true);

if (
    !isset($firebaseResponse['users']) ||
    !is_array($firebaseResponse['users']) ||
    count($firebaseResponse['users']) === 0
) {
    resposta(false, [
        "error" => "Usuário não autenticado."
    ], 401);
}

/*
|--------------------------------------------------------------------------
| VERIFICAR ARQUIVO
|--------------------------------------------------------------------------
*/

if (!isset($_FILES['imagem'])) {
    resposta(false, [
        "error" => "Nenhuma imagem foi enviada."
    ], 400);
}

$file = $_FILES['imagem'];

if ($file['error'] !== UPLOAD_ERR_OK) {

    $erros = [
        UPLOAD_ERR_INI_SIZE   => "A imagem excede o limite permitido pelo servidor.",
        UPLOAD_ERR_FORM_SIZE  => "A imagem excede o limite permitido.",
        UPLOAD_ERR_PARTIAL    => "O upload foi enviado apenas parcialmente.",
        UPLOAD_ERR_NO_FILE    => "Nenhum arquivo foi enviado.",
        UPLOAD_ERR_NO_TMP_DIR => "Pasta temporária do servidor não encontrada.",
        UPLOAD_ERR_CANT_WRITE => "Não foi possível gravar o arquivo.",
        UPLOAD_ERR_EXTENSION  => "O upload foi bloqueado pelo servidor."
    ];

    resposta(false, [
        "error" => $erros[$file['error']] ?? "Erro desconhecido no upload."
    ], 400);
}

/*
|--------------------------------------------------------------------------
| TAMANHO MÁXIMO
|--------------------------------------------------------------------------
|
| 10 MB por imagem
|
*/

$maxSize = 10 * 1024 * 1024;

if ($file['size'] > $maxSize) {
    resposta(false, [
        "error" => "A imagem é muito grande. O limite é de 10 MB."
    ], 400);
}

/*
|--------------------------------------------------------------------------
| VERIFICAR MIME REAL
|--------------------------------------------------------------------------
*/

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$tiposPermitidos = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
    'image/gif'  => 'gif'
];

if (!isset($tiposPermitidos[$mime])) {
    resposta(false, [
        "error" => "Formato de imagem não permitido. Use JPG, PNG, WEBP ou GIF."
    ], 400);
}

$extensao = $tiposPermitidos[$mime];

/*
|--------------------------------------------------------------------------
| CRIAR PASTA
|--------------------------------------------------------------------------
*/

if (!is_dir($uploadDir)) {

    if (!mkdir($uploadDir, 0755, true)) {
        resposta(false, [
            "error" => "Não foi possível criar a pasta de imagens."
        ], 500);
    }
}

/*
|--------------------------------------------------------------------------
| GERAR NOME SEGURO
|--------------------------------------------------------------------------
*/

$nomeOriginal = pathinfo($file['name'], PATHINFO_FILENAME);

$nomeOriginal = iconv(
    'UTF-8',
    'ASCII//TRANSLIT//IGNORE',
    $nomeOriginal
);

$nomeOriginal = preg_replace('/[^a-zA-Z0-9_-]/', '-', $nomeOriginal);
$nomeOriginal = preg_replace('/-+/', '-', $nomeOriginal);
$nomeOriginal = trim($nomeOriginal, '-_');

if (!$nomeOriginal) {
    $nomeOriginal = "produto";
}

$nomeFinal = $nomeOriginal . "-" . uniqid() . "." . $extensao;

$caminhoCompleto = $uploadDir . $nomeFinal;
$caminhoPublico = $publicDir . $nomeFinal;

/*
|--------------------------------------------------------------------------
| MOVER ARQUIVO
|--------------------------------------------------------------------------
*/

if (!move_uploaded_file($file['tmp_name'], $caminhoCompleto)) {
    resposta(false, [
        "error" => "Não foi possível salvar a imagem."
    ], 500);
}

/*
|--------------------------------------------------------------------------
| SUCESSO
|--------------------------------------------------------------------------
*/

resposta(true, [
    "url" => $caminhoPublico,
    "filename" => $nomeFinal
]);