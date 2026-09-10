[CmdletBinding()]
param(
  [switch]$OmitirSemillas
)

$ErrorActionPreference = 'Stop'
$raizRepositorio = Split-Path -Parent $PSScriptRoot
$archivoEntorno = Join-Path $raizRepositorio '.env'
$ejemploEntorno = Join-Path $raizRepositorio '.env.example'
$archivoCompose = Join-Path $raizRepositorio 'compose.staging.yml'

function Crear-SecretoLocal {
  return ([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))
}

function Establecer-VariableEntorno {
  param(
    [Parameter(Mandatory)]
    [string]$Nombre,
    [Parameter(Mandatory)]
    [string]$Valor,
    [switch]$SoloSiEsMarcador
  )

  $lineas = [System.Collections.Generic.List[string]](Get-Content -LiteralPath $archivoEntorno)
  $indice = -1
  for ($i = 0; $i -lt $lineas.Count; $i++) {
    if ($lineas[$i] -match "^$([Regex]::Escape($Nombre))=") {
      $indice = $i
      break
    }
  }

  if ($indice -ge 0) {
    $valorActual = ($lineas[$indice] -split '=', 2)[1]
    if ($SoloSiEsMarcador -and $valorActual -notmatch '^REEMPLAZAR') {
      return
    }
    $lineas[$indice] = "$Nombre=$Valor"
  }
  else {
    $lineas.Add("$Nombre=$Valor")
  }

  $utf8SinBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($archivoEntorno, $lineas, $utf8SinBom)
}

function Invocar-Compose {
  & docker compose --project-directory $raizRepositorio -f $archivoCompose @args
  if ($LASTEXITCODE -ne 0) {
    throw "Docker Compose termino con el codigo $LASTEXITCODE."
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'Docker no esta instalado o no esta disponible en PATH. Instala Docker Desktop y vuelve a ejecutar el script.'
}

& docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw 'Docker esta instalado, pero el servicio no esta activo. Inicia Docker Desktop y vuelve a ejecutar el script.'
}

if (-not (Test-Path -LiteralPath $archivoEntorno)) {
  Copy-Item -LiteralPath $ejemploEntorno -Destination $archivoEntorno
  Write-Host 'Se creo .env a partir de .env.example.'
}

Establecer-VariableEntorno -Nombre 'STORAGE' -Valor 'mysql'
Establecer-VariableEntorno -Nombre 'DATABASE_PASSWORD' -Valor (Crear-SecretoLocal) -SoloSiEsMarcador
Establecer-VariableEntorno -Nombre 'DATABASE_ROOT_PASSWORD' -Valor (Crear-SecretoLocal) -SoloSiEsMarcador
Establecer-VariableEntorno -Nombre 'JWT_SECRET' -Valor (Crear-SecretoLocal) -SoloSiEsMarcador

Push-Location $raizRepositorio
try {
  Write-Host 'Iniciando MySQL 8...'
  Invocar-Compose up -d --wait db

  Write-Host 'Construyendo la imagen de migraciones...'
  Invocar-Compose build api

  Write-Host 'Aplicando migraciones versionadas...'
  Invocar-Compose run --rm --no-deps api npm run migrate --workspace '@simce/api'

  if (-not $OmitirSemillas) {
    Write-Host 'Cargando datos semilla de Fase 0...'
    Invocar-Compose run --rm --no-deps api npm run seed --workspace '@simce/api'
  }

  Write-Host 'Verificando las tablas creadas...'
  Invocar-Compose exec -T db sh -c 'mysql --user="$MYSQL_USER" --password="$MYSQL_PASSWORD" "$MYSQL_DATABASE" --execute="SHOW TABLES;"'

  Write-Host 'Base de datos local creada y verificada.'
}
finally {
  Pop-Location
}
