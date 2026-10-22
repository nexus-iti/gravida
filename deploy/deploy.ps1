<#
.SYNOPSIS
  Lanza deploy/deploy.sh en el servidor de la UTU por SSH, desde Windows.
.EXAMPLE
  .\deploy\deploy.ps1 -Server usuario@servidor-utu -Command check
  .\deploy\deploy.ps1 -Server usuario@servidor-utu              # deploy de la rama configurada
  .\deploy\deploy.ps1 -Server usuario@servidor-utu -Command rollback
.NOTES
  Manda el deploy.sh LOCAL por stdin (`bash -s`): no hace falta tenerlo instalado en el servidor.
  El servidor necesita ~/.config/nexus/deploy.env (ver deploy/deploy.env.example).
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)] [string] $Server,
    [ValidateSet('check', 'deploy', 'rollback', 'status', 'start', 'stop', 'autostart')] [string] $Command = 'deploy',
    [string] $Ref,
    [ValidateSet('auto', 'native', 'user', 'podman')] [string] $Mode,
    [switch] $Seed,
    [switch] $DryRun,
    [int] $Port = 22,
    [string] $Key
)
$ErrorActionPreference = 'Stop'

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw 'No hay cliente ssh. Instalar "OpenSSH Client" (Configuracion > Aplicaciones > Caracteristicas opcionales).'
}
$script = Join-Path $PSScriptRoot 'deploy.sh'
if (-not (Test-Path $script)) { throw "No existe $script" }
if ($Ref -and $Ref -notmatch '^[A-Za-z0-9._/-]+$') { throw 'Ref invalida' }

$remoteArgs = @($Command)
if ($Ref)    { $remoteArgs += '--ref', $Ref }
if ($Mode)   { $remoteArgs += '--mode', $Mode }
if ($Seed)   { $remoteArgs += '--seed' }
if ($DryRun) { $remoteArgs += '--dry-run' }

$sshArgs = @('-p', $Port)
if ($Key) { $sshArgs += '-i', "`"$Key`"" }
$sshLine = 'ssh ' + ($sshArgs -join ' ') + ' ' + $Server + ' bash -s -- ' + ($remoteArgs -join ' ')

# cmd /c hace la redireccion de archivo a stdin con los bytes tal cual (LF), sin pasar por el pipeline de PowerShell.
Write-Host "-> $Server : deploy.sh $($remoteArgs -join ' ')"
cmd /c "$sshLine < `"$script`""
if ($LASTEXITCODE -ne 0) { throw "deploy.sh termino con codigo $LASTEXITCODE" }
