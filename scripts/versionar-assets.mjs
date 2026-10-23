/*
 * Versiona los assets por contenido.
 *
 *   bun run assets:version   reescribe ?v= en pages/*.html
 *   bun run assets:check     falla si algún ?v= no coincide (lo corre la CI)
 *
 * La versión es un hash corto de todo css/ y js/. router.js propaga su ?v= a
 * cada módulo que carga, así que con un único valor alcanza. Como la URL cambia
 * apenas cambia un byte, el servidor puede cachear CSS y JS versionados como
 * `immutable` durante un año sin riesgo de servir una versión vieja.
 *
 * Los saltos de línea se normalizan antes de hashear para que Windows (CRLF) y
 * la CI (LF) calculen lo mismo.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOLO_VERIFICAR = process.argv.includes('--check');
const ASSET_VERSIONADO =
  /(\.\.\/(?:css\/global\.css|css\/fuentes\.css|js\/router\.js))(\?v=[^"'\s>]*)?(?=["'\s>])/g;
const TEXTO = /\.(css|js|mjs|json|txt|svg)$/i;

function listar(carpeta) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name);
    return entrada.isDirectory() ? listar(ruta) : [ruta];
  });
}

const hash = createHash('sha256');
const archivos = [...listar(join(RAIZ, 'css')), ...listar(join(RAIZ, 'js'))]
  .map((ruta) => relative(RAIZ, ruta).replaceAll('\\', '/'))
  .toSorted();
for (const archivo of archivos) {
  hash.update(archivo + '\0');
  // Binarios (fuentes) tal cual; texto con saltos de línea normalizados.
  const contenido = readFileSync(join(RAIZ, archivo));
  hash.update(
    TEXTO.test(archivo) ? contenido.toString('utf8').replaceAll('\r\n', '\n') : contenido,
  );
  hash.update('\0');
}
const version = hash.digest('hex').slice(0, 10);

const desactualizadas = [];
const paginas = readdirSync(join(RAIZ, 'pages')).filter((nombre) => nombre.endsWith('.html'));
for (const nombre of paginas) {
  const ruta = join(RAIZ, 'pages', nombre);
  const original = readFileSync(ruta, 'utf8');
  const versionada = original.replace(ASSET_VERSIONADO, `$1?v=${version}`);
  if (versionada === original) {
    continue;
  }
  desactualizadas.push(nombre);
  if (!SOLO_VERIFICAR) {
    writeFileSync(ruta, versionada);
  }
}

if (SOLO_VERIFICAR && desactualizadas.length > 0) {
  console.error(`Assets sin versionar (esperado ?v=${version}): ${desactualizadas.join(', ')}`);
  console.error('Corré `bun run assets:version` y commiteá las páginas.');
  process.exit(1);
}
console.log(
  SOLO_VERIFICAR
    ? `Assets versionados con ?v=${version}`
    : `?v=${version} en ${desactualizadas.length} página(s) actualizada(s)`,
);
