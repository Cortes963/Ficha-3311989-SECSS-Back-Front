<?php
declare(strict_types=1);

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Dotenv\Dotenv;
use Secss\AuthModel;
use Secss\CenterModel;
use Secss\Database;
use Secss\UserModel;
use Secss\VehicleModel;

require dirname(__DIR__).'/vendor/autoload.php';
if (is_file(dirname(__DIR__).'/.env')) Dotenv::createImmutable(dirname(__DIR__))->safeLoad();

$origins = array_filter(array_map('trim', explode(',', $_ENV['CORS_ORIGINS'] ?? '')));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $origins, true)) header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS');
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

function response(array $body, int $status=200): never { http_response_code($status); echo json_encode($body, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES); exit; }
function fail(string $message, int $status=400): never { response(['ok'=>false,'mensaje'=>$message], $status); }
function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : $_POST;
}
function requireFields(array $data, array $fields): void {
    foreach ($fields as $field) if (!isset($data[$field]) || $data[$field] === '') fail("Falta el campo obligatorio: $field.");
}
function authUser(): array {
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) fail('Token requerido.', 401);
    try {
        if (strlen((string)($_ENV['JWT_SECRET'] ?? '')) < 32) fail('JWT_SECRET debe tener al menos 32 caracteres.', 500);
        return (array)JWT::decode($m[1], new Key((string)$_ENV['JWT_SECRET'], 'HS256'));
    }
    catch (Throwable) { fail('Token inválido o expirado.', 401); }
}
function saveUpload(string $field, int $userId): ?string {
    if (!isset($_FILES[$field]) || $_FILES[$field]['error'] !== UPLOAD_ERR_OK) return null;
    $dir = dirname(__DIR__).'/'.($_ENV['STORAGE_PATH'] ?? 'storage').'/'.$userId;
    if (!is_dir($dir)) mkdir($dir, 0775, true);
    $name = bin2hex(random_bytes(12)).'-'.preg_replace('/[^a-zA-Z0-9._-]/', '_', basename($_FILES[$field]['name']));
    if (!move_uploaded_file($_FILES[$field]['tmp_name'], "$dir/$name")) fail("No se pudo guardar el archivo: $field.", 500);
    return "$userId/$name";
}

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$prefix = '/api/mobile/v1';
if (str_starts_with($path, $prefix)) $path = substr($path, strlen($prefix)) ?: '/';
$method = $_SERVER['REQUEST_METHOD'];
$db = null;
try {
    if ($method === 'GET' && $path === '/core/health') {
        Database::connection()->query('SELECT 1'); response(['ok'=>true,'estado'=>'operational']);
    }
    if ($method === 'GET' && $path === '/core/centros-publicos') response(['ok'=>true,'datos'=>(new CenterModel(Database::connection()))->all()]);
    if ($method === 'POST' && $path === '/auth/storeAuthLogin') {
        $data=body(); requireFields($data,['numero_documento','password']);
        $auth=new AuthModel(Database::connection()); $account=$auth->accountByDocument((string)$data['numero_documento']);
        if (!$account || !(bool)$account['estado'] || !(bool)$account['usuario_estado'] || !password_verify((string)$data['password'], $account['password_hash'])) fail('Credenciales inválidas.',401);
        $roles=$auth->roles((int)$account['id_usuario']); $ttl=max(60,(int)($_ENV['JWT_EXPIRES_IN']??28800));
        $token=JWT::encode(['id'=>(int)$account['id_usuario'],'roles'=>$roles,'iat'=>time(),'exp'=>time()+$ttl],(string)$_ENV['JWT_SECRET'],'HS256');
        response(['ok'=>true,'token'=>$token,'usuario'=>['id'=>(int)$account['id_usuario'],'nombre'=>trim($account['primer_nombre'].' '.$account['primer_apellido']),'correo'=>$account['correo'],'roles'=>$roles]]);
    }
    if ($method === 'GET' && $path === '/users/me') {
        $user=authUser(); $profile=(new UserModel(Database::connection()))->profile((int)$user['id']);
        if (!$profile) fail('Usuario no encontrado.',404); response(['ok'=>true,'datos'=>$profile]);
    }
    if ($method === 'PATCH' && $path === '/users/me') {
        $user=authUser(); (new UserModel(Database::connection()))->update((int)$user['id'],body()); response(['ok'=>true,'mensaje'=>'Perfil actualizado.']);
    }
    if ($method === 'GET' && $path === '/vehicle/me') {
        $user=authUser(); response(['ok'=>true,'datos'=>(new VehicleModel(Database::connection()))->mine((int)$user['id'])]);
    }
    if (preg_match('#^/vehicle/(\d+)$#', $path, $match) && $method === 'GET') {
        $user=authUser(); $vehicle=(new VehicleModel(Database::connection()))->one((int)$user['id'],(int)$match[1]);
        if (!$vehicle) fail('Vehículo no encontrado.',404); response(['ok'=>true,'datos'=>$vehicle]);
    }
    if (preg_match('#^/vehicle/(\d+)$#', $path, $match) && $method === 'PATCH') {
        $user=authUser(); $data=body();
        foreach (['detalles','detalle_moto','detalle_bicicleta'] as $key) if (isset($data[$key]) && is_string($data[$key])) $data += json_decode($data[$key],true) ?: [];
        foreach (['imagen_url_tarjeta_propiedad','imagen_url_identificacion_vehiculo','imagen_url_vehiculo','imagen_url_soat','imagen_url_tecnomecanica_vigente'] as $field) if ($saved=saveUpload($field,(int)$user['id'])) $data[$field]=$saved;
        if (!(new VehicleModel(Database::connection()))->update((int)$user['id'],(int)$match[1],$data)) fail('Vehículo no encontrado.',404);
        response(['ok'=>true,'mensaje'=>'Vehículo actualizado; cupo pendiente de revisión.']);
    }
    if ($method === 'POST' && $path === '/vehicle') {
        $user=authUser(); $data=body();
        foreach (['detalles','detalle_moto','detalle_bicicleta'] as $key) if (isset($data[$key]) && is_string($data[$key])) $data += json_decode($data[$key],true) ?: [];
        foreach (['imagen_url_tarjeta_propiedad','imagen_url_identificacion_vehiculo','imagen_url_vehiculo','imagen_url_soat','imagen_url_tecnomecanica_vigente'] as $field) if ($saved=saveUpload($field,(int)$user['id'])) $data[$field]=$saved;
        $id=(new VehicleModel(Database::connection()))->create((int)$user['id'],$data);
        response(['ok'=>true,'id_vehiculo'=>$id,'mensaje'=>'Vehículo registrado; cupo pendiente de aprobación.'],201);
    }
    if (preg_match('#^/vehicle/(\d+)/inactivar$#', $path, $match) && $method === 'PATCH') {
        $user=authUser(); if (!(new VehicleModel(Database::connection()))->deactivate((int)$user['id'],(int)$match[1])) fail('Vehículo no encontrado o ya estaba inactivo.',404);
        response(['ok'=>true,'mensaje'=>'Vehículo inactivado.']);
    }
    if ($method === 'POST' && $path === '/auth/storeAuthRegister') {
        $data=body(); requireFields($data,['tipo_documento','numero_documento','primer_nombre','primer_apellido','n_celular','correo','password','nombre_rol']);
        if ($data['nombre_rol'] !== 'APRENDIZ') fail('El registro público solo permite APRENDIZ.',403);
        if (strlen((string)$data['password']) < 10) fail('La contraseña debe tener al menos 10 caracteres.');
        $detail=is_array($data['detalle_aprendiz']??null)?$data['detalle_aprendiz']:[];
        foreach ($data as $key=>$value) if (str_starts_with($key,'detalle_aprendiz[')) $detail[trim(substr($key,17),']')]=$value;
        requireFields($detail,['id_centro','ficha','direccion','fecha_vinculacion']);
        foreach (['imagen_url_aprendiz','imagen_url_identificacion','imagen_url_carnet_sena'] as $field) if ($saved=saveUpload($field,0)) $detail[$field]=$saved;
        $data['detalle_aprendiz']=$detail; $id=(new AuthModel(Database::connection()))->register($data);
        response(['ok'=>true,'mensaje'=>'Usuario registrado.','id_usuario'=>$id],201);
    }
    fail('Ruta no encontrada.',404);
} catch (InvalidArgumentException $e) { fail($e->getMessage(),400);
} catch (PDOException $e) { error_log((string)$e); fail('Error de base de datos.',500);
} catch (Throwable $e) { error_log((string)$e); fail('Error interno del servidor.',500); }
