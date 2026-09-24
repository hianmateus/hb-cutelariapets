<?php

header('Content-Type: application/json; charset=utf-8');

$firebaseApiKey = "AIzaSyDL8GFIduURC2ET6DMgLrn1Ul0IMn1XN_4";

$uploadDir = __DIR__ . "/imgs/Products/";

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
| Somente POST
|--------------------------------------------------------------------------
*/

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    resposta(false, [
        "error" => "Método não permitido."
    ], 405);
}


/*
|--------------------------------------------------------------------------
| Recupera Authorization
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

if (
    !$authorization ||
    !preg_match('/Bearer\s+(.+)/i', $authorization, $matches)
) {
    resposta(false, [
        "error" => "Usuário não autenticado."
    ], 401);
}

$idToken = trim($matches[1]);


/*
|--------------------------------------------------------------------------
| Validação do Firebase
|--------------------------------------------------------------------------
*/

$url = "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="
    . urlencode($firebaseApiKey);

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
| Recebe as imagens
|--------------------------------------------------------------------------
*/

$input = json_decode(file_get_contents('php://input'), true);

if (
    !is_array($input) ||
    !isset($input['imagens']) ||
    !is_array($input['imagens'])
) {
    resposta(false, [
        "error" => "Nenhuma imagem foi informada."
    ], 400);
}


/*
|--------------------------------------------------------------------------
| Verifica se a pasta existe
|--------------------------------------------------------------------------
*/

if (!is_dir($uploadDir)) {
    resposta(false, [
        "error" => "Pasta de imagens não encontrada."
    ], 500);
}


/*
|--------------------------------------------------------------------------
| Exclusão
|--------------------------------------------------------------------------
*/

$excluidas = [];
$naoEncontradas = [];
$ignoradas = [];
$erros = [];

foreach ($input['imagens'] as $imagem) {

    if (!is_string($imagem)) {
        continue;
    }

    $imagem = trim($imagem);

    if (!$imagem) {
        continue;
    }


    /*
    |--------------------------------------------------------------------------
    | Aceitamos somente caminhos da nossa pasta de produtos
    |--------------------------------------------------------------------------
    */

    $prefixosPermitidos = [
        './imgs/Products/',
        'imgs/Products/',
        '/imgs/Products/'
    ];

    $ehCaminhoPermitido = false;

    foreach ($prefixosPermitidos as $prefixo) {
        if (strpos($imagem, $prefixo) === 0) {
            $ehCaminhoPermitido = true;
            break;
        }
    }

    /*
    | Se não for uma imagem hospedada no nosso servidor,
    | simplesmente ignoramos.
    |
    | Isso evita tentar apagar URLs externas, por exemplo:
    | https://site.com/imagem.jpg
    */

    if (!$ehCaminhoPermitido) {
        $ignoradas[] = $imagem;
        continue;
    }


    /*
    |--------------------------------------------------------------------------
    | Pega somente o nome do arquivo
    |--------------------------------------------------------------------------
    */

    $nomeArquivo = basename(parse_url($imagem, PHP_URL_PATH));


    if (!$nomeArquivo) {
        $ignoradas[] = $imagem;
        continue;
    }


    /*
    |--------------------------------------------------------------------------
    | Proteção contra nomes perigosos
    |--------------------------------------------------------------------------
    */

    if (
        $nomeArquivo === '.' ||
        $nomeArquivo === '..' ||
        strpos($nomeArquivo, '/') !== false ||
        strpos($nomeArquivo, '\\') !== false
    ) {
        $ignoradas[] = $imagem;
        continue;
    }


    /*
    |--------------------------------------------------------------------------
    | Caminho final
    |--------------------------------------------------------------------------
    */

    $caminhoCompleto = $uploadDir . $nomeArquivo;

    /*
    | Garante que o arquivo realmente está dentro
    | da pasta Products.
    */

    $realUploadDir = realpath($uploadDir);

    if ($realUploadDir === false) {
        $erros[] = [
            "imagem" => $imagem,
            "erro" => "Não foi possível verificar a pasta de imagens."
        ];
        continue;
    }

    $realArquivo = realpath($caminhoCompleto);

    /*
    |--------------------------------------------------------------------------
    | Arquivo não existe
    |--------------------------------------------------------------------------
    */

    if ($realArquivo === false || !is_file($realArquivo)) {
        $naoEncontradas[] = $imagem;
        continue;
    }


    /*
    |--------------------------------------------------------------------------
    | Confirma que o arquivo está dentro de /imgs/Products/
    |--------------------------------------------------------------------------
    */

    $prefixoSeguro = rtrim($realUploadDir, DIRECTORY_SEPARATOR)
        . DIRECTORY_SEPARATOR;

    if (strpos($realArquivo, $prefixoSeguro) !== 0) {
        $ignoradas[] = $imagem;
        continue;
    }


    /*
    |--------------------------------------------------------------------------
    | Exclui
    |--------------------------------------------------------------------------
    */

    if (unlink($realArquivo)) {

        $excluidas[] = $imagem;

    } else {

        $erros[] = [
            "imagem" => $imagem,
            "erro" => "Não foi possível excluir o arquivo."
        ];
    }
}


/*
|--------------------------------------------------------------------------
| Resultado
|--------------------------------------------------------------------------
*/

resposta(true, [
    "excluidas" => $excluidas,
    "naoEncontradas" => $naoEncontradas,
    "ignoradas" => $ignoradas,
    "erros" => $erros
]);