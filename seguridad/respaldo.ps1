<#
  F-09 (ransomware): respaldo diario de la base de datos y de las fotos de perfil.

  - Volcado completo con mysqldump (--single-transaction, sin bloquear la app).
  - Comprime BD + uploads en un .zip; si hay 7-Zip y una clave, lo cifra con AES-256.
  - Verifica el respaldo (hash SHA-256 guardado al lado).
  - Copia a un SEGUNDO destino (disco externo / carpeta de red) que el servidor web no usa.
  - Rota: conserva los ultimos N dias.

  Programarlo (como administrador, una sola vez):
    schtasks /Create /SC DAILY /ST 02:00 /TN "SGRSI Respaldo" /RU SYSTEM `
      /TR "powershell -NoProfile -ExecutionPolicy Bypass -File \"C:\xampp\htdocs\proyecto 2da entrega 4.0\seguridad\respaldo.ps1\""

  Restaurar:
    1. Descomprimir el .zip (7-Zip pide la clave si esta cifrado).
    2. C:\xampp\mysql\bin\mysql.exe -u root -p proyecto < proyecto.sql
    3. Copiar la carpeta perfiles\ a uploads\perfiles\
#>
param(
    [string]$Destino = 'C:\RespaldosSGRSI',
    [string]$DestinoSecundario = '',          # p.ej. 'E:\SGRSI' o '\\NAS\respaldos\SGRSI'
    [int]$DiasRetencion = 14,
    [string]$Base = 'nexus_test_20',
    # Usuario solo de lectura para respaldos (no root). Crearlo una vez:
    #   CREATE USER 'sgrsi_respaldo'@'localhost' IDENTIFIED BY '...';
    #   GRANT SELECT, SHOW VIEW, TRIGGER, LOCK TABLES, EVENT ON proyecto.* TO 'sgrsi_respaldo'@'localhost';
    [string]$UsuarioBd = $(if ($env:SGRSI_BD_USUARIO) { $env:SGRSI_BD_USUARIO } else { 'sgrsi_respaldo' }),
    [int]$PuertoBd = 3307,
    [string]$XamppDir = 'C:\xampp'
)

$ErrorActionPreference = 'Stop'
$proyecto = Split-Path -Parent $PSScriptRoot
$marca = Get-Date -Format 'yyyy-MM-dd_HHmm'
$trabajo = Join-Path $env:TEMP "sgrsi_$marca"
$opciones = $null
New-Item -ItemType Directory -Force -Path $trabajo, $Destino | Out-Null

try {
    # La clave de BD se toma de una variable de entorno, nunca del script, y se pasa a mysqldump
    # en un archivo de opciones temporal (solo legible por la cuenta actual): en la linea de
    # comando quedaria visible en la lista de procesos de Windows.
    $argumentos = @('--single-transaction', '--routines', '--triggers', '--default-character-set=utf8mb4',
                    "-h127.0.0.1", "-P$PuertoBd", "-u$UsuarioBd", "--result-file=$trabajo\$Base.sql", $Base)
    if ($env:SGRSI_BD_CLAVE) {
        $opciones = Join-Path $trabajo 'mysqldump.cnf'
        New-Item -ItemType File -Path $opciones -Force | Out-Null
        $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
        icacls $opciones /inheritance:r /grant:r "*${sid}:F" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw 'No se pudieron restringir los permisos del archivo de opciones.' }
        $clave = $env:SGRSI_BD_CLAVE.Replace('\', '\\').Replace('"', '\"')
        [System.IO.File]::WriteAllText($opciones, "[client]`r`npassword=`"$clave`"`r`n", (New-Object System.Text.UTF8Encoding $false))
        # --defaults-extra-file tiene que ser el primer argumento.
        $argumentos = @("--defaults-extra-file=$opciones") + $argumentos
    }
    & "$XamppDir\mysql\bin\mysqldump.exe" @argumentos
    $codigoDump = $LASTEXITCODE
    if ($opciones) { Remove-Item -Force $opciones }  # que la clave no termine dentro del respaldo
    if ($codigoDump -ne 0) { throw "mysqldump fallo con codigo $codigoDump" }

    Copy-Item -Recurse -Path (Join-Path $proyecto 'uploads\perfiles') -Destination (Join-Path $trabajo 'perfiles')

    $sieteZip = 'C:\Program Files\7-Zip\7z.exe'
    if ((Test-Path $sieteZip) -and $env:SGRSI_RESPALDO_CLAVE) {
        $archivo = Join-Path $Destino "sgrsi_$marca.7z"
        & $sieteZip a -t7z -mhe=on "-p$($env:SGRSI_RESPALDO_CLAVE)" $archivo "$trabajo\*" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "7-Zip fallo con codigo $LASTEXITCODE" }
    } else {
        $archivo = Join-Path $Destino "sgrsi_$marca.zip"
        Compress-Archive -Path "$trabajo\*" -DestinationPath $archivo
        Write-Warning 'Respaldo SIN cifrar: instala 7-Zip y define SGRSI_RESPALDO_CLAVE para cifrarlo.'
    }

    $hash = (Get-FileHash -Algorithm SHA256 $archivo).Hash
    Set-Content -Path "$archivo.sha256" -Value "$hash  $(Split-Path -Leaf $archivo)"

    if ($DestinoSecundario) {
        New-Item -ItemType Directory -Force -Path $DestinoSecundario | Out-Null
        Copy-Item $archivo, "$archivo.sha256" -Destination $DestinoSecundario
        $copia = Join-Path $DestinoSecundario (Split-Path -Leaf $archivo)
        if ((Get-FileHash -Algorithm SHA256 $copia).Hash -ne $hash) { throw 'La copia secundaria no coincide con el original.' }
    }

    $limite = (Get-Date).AddDays(-$DiasRetencion)
    foreach ($carpeta in @($Destino, $DestinoSecundario) | Where-Object { $_ }) {
        Get-ChildItem $carpeta -File -Filter 'sgrsi_*' | Where-Object { $_.LastWriteTime -lt $limite } | Remove-Item -Force
    }

    Write-Output "Respaldo OK: $archivo ($hash)"
}
finally {
    Remove-Item -Recurse -Force $trabajo -ErrorAction SilentlyContinue
}
