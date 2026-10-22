<#
  F-10 (3ra entrega): DDoS volumetrico. Cuando el sitio se publica detras de Cloudflare (plan gratuito),
  el trafico de un ataque lo absorbe Cloudflare. Pero si el servidor sigue aceptando conexiones directas,
  el atacante lo ataca por su IP y se saltea la proteccion. Este script deja entrar a los puertos 80/443
  SOLO desde los servidores de Cloudflare (y opcionalmente desde la red local del liceo).

  Uso (PowerShell como administrador):
    .\firewall-cloudflare.ps1                                  # aplica las reglas
    .\firewall-cloudflare.ps1 -RedLocal '192.168.1.0/24'       # ademas permite la red interna
    .\firewall-cloudflare.ps1 -Deshacer                        # vuelve todo como estaba

  Requisitos previos:
    1. El dominio ya apunta a Cloudflare con el proxy activado (nube naranja).
    2. En .htaccess se descomento "SetEnv SGRSI_DETRAS_DE_CLOUDFLARE 1" (para que los limites usen la IP real).
  Las conexiones desde el mismo servidor (localhost) no pasan por el firewall y siguen funcionando.
#>
param(
    [string[]]$RedLocal = @(),
    [switch]$Deshacer
)

$ErrorActionPreference = 'Stop'
$grupo = 'SGRSI Cloudflare'
$puertos = @('80', '443')

$esAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $esAdmin) { throw 'Ejecuta PowerShell como administrador.' }

# Reglas de entrada que hoy dejan pasar trafico web desde cualquier lado (las de XAMPP/Apache).
function Get-ReglasWebAbiertas {
    Get-NetFirewallRule -Direction Inbound -Action Allow -Enabled True |
        Where-Object { $_.Group -ne $grupo } |
        Where-Object {
            $app = ($_ | Get-NetFirewallApplicationFilter).Program
            $pto = ($_ | Get-NetFirewallPortFilter).LocalPort
            ($app -match 'httpd\.exe$') -or (@($pto) | Where-Object { $puertos -contains $_ })
        }
}

if ($Deshacer) {
    Get-NetFirewallRule -Group $grupo -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    Get-NetFirewallRule -Direction Inbound -Enabled False |
        Where-Object { $_.Description -like '*desactivada por SGRSI*' } |
        ForEach-Object {
            $_ | Set-NetFirewallRule -Enabled True -Description ($_.Description -replace ' \(desactivada por SGRSI\)', '')
        }
    Write-Output 'Listo: reglas de Cloudflare quitadas y reglas originales reactivadas.'
    return
}

# Rangos oficiales actualizados; si no hay conexion se usa la lista conocida.
$rangos = @()
try {
    $rangos += (Invoke-RestMethod -UseBasicParsing 'https://www.cloudflare.com/ips-v4' -TimeoutSec 15) -split "`n" | Where-Object { $_.Trim() }
    $rangos += (Invoke-RestMethod -UseBasicParsing 'https://www.cloudflare.com/ips-v6' -TimeoutSec 15) -split "`n" | Where-Object { $_.Trim() }
} catch {
    Write-Warning 'No se pudo descargar la lista de Cloudflare: se usa la lista incluida en el script.'
    $rangos = @()
}
if ($rangos.Count -lt 10) {
    $rangos = @(
        '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18',
        '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17',
        '162.158.0.0/15', '104.16.0.0/13', '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
        '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32',
        '2a06:98c0::/29', '2c0f:f248::/32'
    )
}
$rangos = @($rangos | ForEach-Object { $_.Trim() }) + $RedLocal

# 1) Primero se crea la regla nueva (asi nunca queda el sitio sin ninguna regla de entrada).
Get-NetFirewallRule -Group $grupo -ErrorAction SilentlyContinue | Remove-NetFirewallRule
New-NetFirewallRule -DisplayName 'SGRSI - Web solo desde Cloudflare' -Group $grupo -Direction Inbound `
    -Action Allow -Protocol TCP -LocalPort $puertos -RemoteAddress $rangos -Profile Any | Out-Null

# 2) Despues se desactivan (no se borran) las reglas que abrian la web a todo Internet.
$abiertas = @(Get-ReglasWebAbiertas)
foreach ($regla in $abiertas) {
    $regla | Set-NetFirewallRule -Enabled False -Description (($regla.Description + ' (desactivada por SGRSI)').Trim())
    Write-Output "Desactivada: $($regla.DisplayName)"
}

Write-Output "Listo: los puertos 80/443 solo aceptan conexiones de $($rangos.Count) rangos (Cloudflare + red local)."
Write-Output 'Para volver atras: .\firewall-cloudflare.ps1 -Deshacer'
