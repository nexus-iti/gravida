#!/usr/bin/env bash
# Bateria de ataques F-01..F-11 contra una instalacion LOCAL de prueba (necesita las cuentas 57324099 y 57847417, que database.sql ya no trae: crearlas antes o adaptar el script al seed de containers/seed).
# Incluye las defensas de la 3ra entrega: verificacion en dos pasos, cuenta robada, proxy, modo de ataque y bloqueo de IP.
# Uso (Git Bash):  bash seguridad/pruebas_ataques.sh
# ATENCION: solo contra una base de PRUEBA. Bloquea 15 min la cuenta 57324099, activa el segundo factor de 57847417
# y borra los contadores de intentos y de limites para poder repetirse.
B="${SGRSI_URL:-http://localhost/NEXUS/proyecto%203ra%20entrega}"
UA="Mozilla/5.0 prueba"
J="$(mktemp -d)"
mkdir -p $J; rm -f $J/*
M="/c/xampp/mysql/bin/mysql.exe -uroot -h127.0.0.1 -P${SGRSI_BD_PUERTO:-3306} proyecto -N -e"
pass=0; fail=0
# Reinicio: la bateria se puede repetir sin esperar a que venzan los bloqueos de la corrida anterior.
$M "delete from seguridad_intentos_login; update usuario set totp_secreto = NULL, totp_ultimo_paso = NULL where cedula = '57847417'; delete from usuario where cedula like '8765432_'"
rm -f "$(dirname "$0")/almacen/limites/"* "$(dirname "$0")/almacen/modo-ataque"
check() { # nombre esperado obtenido
  if [ "$2" = "$3" ]; then echo "  OK   $1 ($3)"; pass=$((pass+1)); else echo "  FAIL $1 esperado=$2 obtenido=$3"; fail=$((fail+1)); fi
}
code() { curl -s -o /tmp/r.json -w '%{http_code}' -A "$UA" "$@"; }
csrf() { curl -s -A "$UA" -b $J/$1 -c $J/$1 $B/login.php | sed -E 's/.*"csrf":"([a-f0-9]+)".*/\1/'; }
login() { # jar identificador clave
  local t; t=$(csrf $1)
  code -b $J/$1 -c $J/$1 -H "X-CSRF-Token: $t" --data-urlencode "identificador=$2" --data-urlencode "contrasena=$3" $B/login.php
}
tok() { csrf $1; }

echo "F-02 acceso sin sesion"
check "GET usuarios sin sesion" 401 $(code $B/api/usuarios.php)
check "GET prestamos sin sesion" 401 $(code $B/api/prestamos.php)
check "PATCH estado sin sesion" 403 $(code -X PATCH -d '{"accion":"estado","cedula":"57324099","estado":"Inactivo"}' $B/api/usuarios.php)

echo "F-04 CSRF"
curl -s -A "$UA" -c $J/x $B/login.php >/dev/null
check "login sin token CSRF" 403 $(code -b $J/x --data "identificador=a&contrasena=b" $B/login.php)
check "login con Origin ajeno" 403 $(code -b $J/x -H "Origin: https://evil.example" -H "X-CSRF-Token: $(csrf x)" --data "identificador=a&contrasena=b" $B/login.php)

echo "F-05 inyeccion SQL en login"
check "identificador ' OR 1=1 -- " 401 $(login sqli "' OR '1'='1' -- " "x")

echo "F-03 / login de solicitante (contrasena en texto plano heredada)"
check "login solicitante" 200 $(login sol 12345678 'Hola123*')
check "hash migrado al ingresar" '$argon2id$' "$($M "select left(contrasena,10) from usuario where cedula='12345678'")"

echo "F-02 escalada / IDOR como solicitante"
T=$(tok sol)
check "GET solicitudes_registro" 403 $(code -b $J/sol $B/api/solicitudes_registro.php)
check "GET historial" 403 $(code -b $J/sol $B/api/historial.php)
check "POST equipo" 403 $(code -b $J/sol -H "X-CSRF-Token: $T" -d '{"nombre":"x","seccionId":1}' $B/api/equipos.php)
check "desactivar admin" 403 $(code -b $J/sol -H "X-CSRF-Token: $T" -X PATCH -d '{"accion":"estado","cedula":"57324099","estado":"Inactivo"}' $B/api/usuarios.php)
check "editar perfil ajeno" 403 $(code -b $J/sol -H "X-CSRF-Token: $T" -X PATCH -d '{"accion":"actualizar_perfil","cedula":"57324099","nombreCompleto":"Hack Er","correo":"h@x.com"}' $B/api/usuarios.php)
check "crear prestamo a nombre de otro" 403 $(code -b $J/sol -H "X-CSRF-Token: $T" -d '{"cedula":"57324099","fecha":"2026-12-01","recursos":[{"idEquipo":1,"nombre":"x","cantidad":1}]}' $B/api/prestamos.php)
check "aprobar registro" 403 $(code -b $J/sol -H "X-CSRF-Token: $T" -X PATCH -d '{"id":1,"estado":"Aprobado","administradorCedula":"57324099"}' $B/api/solicitudes_registro.php)
code -b $J/sol $B/api/usuarios.php >/dev/null
check "lista de usuarios sin correos ajenos" 0 "$(grep -o '"correo":"[^"]\+' /tmp/r.json | grep -vc prueba1)"
code -b $J/sol $B/api/prestamos.php >/dev/null
check "prestamos solo propios" 0 "$(grep -o '"solicitanteId":"[0-9]*"' /tmp/r.json | grep -vc 12345678)"

echo "F-02 autoregistro como administrador"
T=$(tok anon)
code -b $J/anon -c $J/anon -H "X-CSRF-Token: $T" -d '{"cedula":"87654321","nombreCompleto":"Mal Actor","correo":"mal@x.com","contrasena":"Segura123","rol":"Usuario administrativo"}' $B/api/usuarios.php >/dev/null
check "rol forzado a Solicitante" Solicitante "$($M "select rol from usuario where cedula='87654321'")"
check "contrasena guardada con hash" '$argon2id$' "$($M "select left(contrasena,10) from usuario where cedula='87654321'")"
T=$(tok anon2)
check "pedir rol admin por solicitudes_registro" 403 $(code -b $J/anon2 -c $J/anon2 -H "X-CSRF-Token: $T" -d '{"cedula":"87654322","nombreCompleto":"Mal Actor","correo":"mal2@x.com","contrasena":"Segura123","rol":"Usuario administrativo"}' $B/api/solicitudes_registro.php)
T=$(tok anon3)
check "contrasena debil rechazada" 400 $(code -b $J/anon3 -H "X-CSRF-Token: $T" -d '{"cedula":"87654323","nombreCompleto":"A B","correo":"ab@x.com","contrasena":"abc","rol":"Usuario solicitante"}' $B/api/usuarios.php)

echo "F-04 sesion"
check "cookie HttpOnly + SameSite=Strict" 1 "$(curl -s -D - -o /dev/null -A "$UA" $B/login.php | grep -ic 'set-cookie:.*httponly.*samesite=strict')"
check "cookie robada usada desde otro navegador" 401 $(curl -s -o /dev/null -w '%{http_code}' -A "OtroNavegador" -b $J/sol $B/api/prestamos.php)
check "cookie sigue valida en su navegador?" 401 $(code -b $J/sol $B/api/prestamos.php)
login sol 12345678 'Hola123*' >/dev/null
T=$(tok sol)
check "logout" 200 $(code -b $J/sol -c $J/sol -H "X-CSRF-Token: $T" -d '{"accion":"salir"}' -H "Content-Type: application/json" $B/login.php)
check "API tras logout" 401 $(code -b $J/sol $B/api/prestamos.php)

echo "F-01 fuerza bruta"
for i in 1 2 3 4 5; do login bf 57324099 "Mala$i" >/dev/null; done
check "6to intento bloqueado" 429 $(login bf 57324099 "Mala6")
check "ni con la clave correcta durante el bloqueo" 429 $(login bf 57324099 'Hola123*')
check "mensaje no revela si la cuenta existe" 401 $(login bf2 99999999 "x")

echo "F-11 / F-03 migracion masiva"
/c/xampp/php/php.exe "$(dirname "$0")/migrar_contrasenas.php"
check "sin contrasenas en texto plano" 0 "$($M "select count(*) from usuario where contrasena not like '\$argon2id\$%' and contrasena not like '\$2y\$%'")"

echo "F-10 limite de peticiones"
login rl 12345678 'Hola123*' >/dev/null
last=0; for i in $(seq 1 130); do last=$(curl -s -o /dev/null -w '%{http_code}' -A "$UA" -b $J/rl $B/api/equipos.php); done
check "rafaga de 130 GET por minuto" 429 $last

rm -f "$(dirname "$0")/almacen/limites/"*  # cada bloque arranca con los contadores de limite en cero
echo "F-08 phishing: verificacion en dos pasos (3ra entrega)"
PHP=/c/xampp/php/php.exe
TOTP="$(dirname "$0")/totp.php"
codigo2fa() { $PHP -r 'require $argv[1]; echo totpCodigo($argv[2], intdiv(time(), 30) + (int) $argv[3]);' "$TOTP" "$1" "${2:-0}"; }
verificar() { # jar codigo
  code -b $J/$1 -c $J/$1 -H "X-CSRF-Token: $(tok $1)" --data-urlencode "accion=verificar_2fa" --data-urlencode "codigo=$2" $B/login.php
}
check "admin con contrasena correcta: aun sin sesion" 200 $(login adm 57847417 'Sixseven67')
check "  se le exige activar el segundo factor" activar_2fa "$(sed -E 's/.*"paso":"([a-z_0-9]+)".*/\1/' /tmp/r.json)"
SECRETO=$(sed -E 's/.*"secreto":"([A-Z2-7]+)".*/\1/' /tmp/r.json)
check "  la contrasena sola no abre la API" 401 $(code -b $J/adm $B/api/usuarios.php)
check "  codigo incorrecto rechazado" 401 $(verificar adm 000000)
C1=$(codigo2fa $SECRETO 0)
check "  codigo correcto abre la sesion" 200 $(verificar adm $C1)
check "  API con sesion completa" 200 $(code -b $J/adm $B/api/usuarios.php)
check "  secreto guardado en la BD" 1 "$($M "select count(*) from usuario where cedula='57847417' and totp_secreto is not null")"
login adm2 57847417 'Sixseven67' >/dev/null
check "segundo ingreso pide el codigo" codigo_2fa "$(sed -E 's/.*"paso":"([a-z_0-9]+)".*/\1/' /tmp/r.json)"
check "  codigo ya usado (capturado por phishing) no sirve" 401 $(verificar adm2 $C1)
for i in 1 2 3 4; do verificar adm2 111111 >/dev/null; done
check "  tras 5 codigos malos hay que volver a la contrasena" pre2fa "$(sed -E 's/.*"codigo":"([a-z0-9]+)".*/\1/' /tmp/r.json)"
$M "delete from seguridad_intentos_login where exito = 0"  # que los codigos malos no bloqueen el resto de la bateria
login adm3 57847417 'Sixseven67' >/dev/null
check "  codigo nuevo funciona" 200 $(verificar adm3 $(codigo2fa $SECRETO 1))
T=$(tok adm3)
check "admin no puede desactivar su segundo factor" 403 $(code -b $J/adm3 -H "X-CSRF-Token: $T" -d '{"accion":"desactivar_2fa","contrasena":"Sixseven67","codigo":"123456"}' $B/api/seguridad_cuenta.php)

echo "F-08 phishing: cuenta robada (3ra entrega)"
login victima 12345678 'Hola123*' >/dev/null
login ladron 12345678 'Hola123*' >/dev/null
check "el atacante entra con la clave robada" 200 $(code -b $J/ladron $B/api/prestamos.php)
code -b $J/victima $B/api/seguridad_cuenta.php >/dev/null
check "la victima ve los accesos en su actividad" 1 "$(grep -c '"tipo":"login_ok"' /tmp/r.json)"
T=$(tok victima)
check "la victima cierra todas las sesiones" 200 $(code -b $J/victima -c $J/victima -H "X-CSRF-Token: $T" -d '{"accion":"cerrar_sesiones"}' $B/api/seguridad_cuenta.php)
check "  el atacante queda afuera" 401 $(code -b $J/ladron $B/api/prestamos.php)
check "  la victima sigue adentro" 200 $(code -b $J/victima $B/api/prestamos.php)
T=$(tok victima)
check "cambiar contrasena con la actual incorrecta" 403 $(code -b $J/victima -c $J/victima -H "X-CSRF-Token: $T" -d '{"accion":"cambiar_contrasena","actual":"Otra999x","nueva":"Nueva2026x"}' $B/api/seguridad_cuenta.php)
check "cambiar contrasena" 200 $(code -b $J/victima -c $J/victima -H "X-CSRF-Token: $T" -d '{"accion":"cambiar_contrasena","actual":"Hola123*","nueva":"Nueva2026x"}' $B/api/seguridad_cuenta.php)
check "  la contrasena robada ya no sirve" 401 $(login ladron2 12345678 'Hola123*')
check "  la nueva si" 200 $(login victima2 12345678 'Nueva2026x')
T=$(tok sol)
check "solicitante no puede restablecer el 2FA de otro" 403 $(code -b $J/victima2 -H "X-CSRF-Token: $(tok victima2)" -d '{"accion":"restablecer_2fa","cedula":"57847417"}' $B/api/seguridad_cuenta.php)
$M "update usuario set contrasena='Hola123*' where cedula='12345678'"

rm -f "$(dirname "$0")/almacen/limites/"*
echo "F-10 DDoS: proxy, modo de ataque y bloqueo de IP (3ra entrega)"
ipcon() { # REMOTE_ADDR CF-Connecting-IP detras_de_cloudflare
  $PHP -r '$_SERVER["REMOTE_ADDR"]=$argv[2]; $_SERVER["HTTP_CF_CONNECTING_IP"]=$argv[3]; if ($argv[4]==="1") { $_SERVER["SGRSI_DETRAS_DE_CLOUDFLARE"]="1"; } require $argv[1]; echo segIp();' "$(dirname "$0")/bootstrap.php" "$1" "$2" "$3"
}
check "sin proxy configurado se ignora CF-Connecting-IP" 104.16.0.5 "$(ipcon 104.16.0.5 1.2.3.4 0)"
check "detras de Cloudflare se usa la IP real" 1.2.3.4 "$(ipcon 104.16.0.5 1.2.3.4 1)"
check "encabezado falso desde fuera de Cloudflare" 8.8.8.8 "$(ipcon 8.8.8.8 1.2.3.4 1)"
check "Cloudflare por IPv6" 1.2.3.4 "$(ipcon 2606:4700::1 1.2.3.4 1)"

$PHP "$(dirname "$0")/modo_ataque.php" activar >/dev/null
check "modo de ataque cierra el registro publico" 503 $(code -b $J/anon4 -c $J/anon4 -H "X-CSRF-Token: $(tok anon4)" -d '{"cedula":"87654329","nombreCompleto":"A B","correo":"ab9@x.com","contrasena":"Segura123","rol":"Usuario solicitante"}' $B/api/usuarios.php)
$PHP "$(dirname "$0")/modo_ataque.php" desactivar >/dev/null

# Tres grupos de limite excedidos (API por usuario, login, acciones de cuenta) = 3 faltas -> IP bloqueada
login ddos 12345678 'Hola123*' >/dev/null
T=$(tok ddos)
for i in $(seq 1 12); do curl -s -o /dev/null -A "$UA" -b $J/ddos -c $J/ddos -H "X-CSRF-Token: $T" -d '{"accion":"cerrar_sesiones"}' $B/api/seguridad_cuenta.php; done
T=$(tok bot)
for i in $(seq 1 32); do curl -s -o /dev/null -A "$UA" -b $J/bot -H "X-CSRF-Token: $T" --data "identificador=&contrasena=" $B/login.php; done
for i in $(seq 1 125); do curl -s -o /dev/null -A "$UA" -b $J/ddos -c $J/ddos $B/api/equipos.php; done
code $B/login.php >/dev/null
check "IP bloqueada tras excesos repetidos" bloqueada "$(sed -E 's/.*"codigo":"([a-z]+)".*/\1/' /tmp/r.json)"
CONFIG="$(dirname "$0")/../config.php"
mv "$CONFIG" "$CONFIG.bak"
check "  se rechaza sin tocar la base de datos" 429 $(code $B/api/equipos.php)
mv "$CONFIG.bak" "$CONFIG"
$PHP "$(dirname "$0")/modo_ataque.php" desbloquear >/dev/null
check "  desbloquear la IP" 200 $(code $B/login.php)

echo "Eventos de seguridad registrados:"
$M "select tipo, count(*) from seguridad_eventos group by tipo"
echo "RESULTADO: $pass OK, $fail FAIL"
