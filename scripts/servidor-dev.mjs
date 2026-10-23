/*
 * Servidor de desarrollo.
 *
 *   bun run dev                     http://127.0.0.1:8080/pages/
 *
 * Configuración en .env (Bun lo carga solo; ver .env.example): DEV_PORT,
 * DEV_PHP_PORT y PHP_BIN. La base de datos la toma config.php del mismo .env.
 *
 * - Sirve los estáticos con los mismos Cache-Control que el .htaccess (HTML
 *   no-cache, CSS/JS con ?v= immutable) y resuelve las rutas limpias (/pages/home).
 * - Reenvía los .php a un `php -S` interno que se levanta solo y se reinicia si
 *   se cae. Necesita config.php en la raíz, igual que con XAMPP.
 * - Modo desarrollo: PHP recibe NEXUS_DEV=1, así login.php no pide el segundo
 *   factor (ver segModoDesarrolloLocal en seguridad/bootstrap.php). Por eso el
 *   servidor escucha solo en 127.0.0.1: nadie de la red puede usarlo.
 * - Inyecta en cada página el panel de llamadas a la API (scripts/dev/panel-api.js,
 *   Alt+Shift+A) y muestra cada llamada en esta terminal.
 */
import { existsSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUERTO = Number(process.env.DEV_PORT || 8080);
const PUERTO_PHP = Number(process.env.DEV_PHP_PORT || PUERTO + 1);
const PANEL_API = join(RAIZ, 'scripts', 'dev', 'panel-api.js');
const RUTA_PANEL = '/__dev/panel-api.js';

// Mismos bloqueos que el .htaccess: no servir secretos ni internos.
const PROHIBIDO =
  /(^|\/)\.|\.(sql|md|log|bak|old|orig|swp|ini|conf|ps1|bat|sh|lock)$|^\/(config(\.example)?\.php|pages\/test-api\.html)$|^\/(seguridad|node_modules|scripts|containers|deploy)(\/|$)/i;

const COLOR = {
  ok: '\x1b[36m',
  aviso: '\x1b[33m',
  error: '\x1b[31m',
  tenue: '\x1b[2m',
  fin: '\x1b[0m',
};

function binarioPhp() {
  if (process.env.PHP_BIN) return process.env.PHP_BIN;
  const xampp = 'C:/xampp/php/php.exe';
  if (process.platform === 'win32' && existsSync(xampp)) return xampp;
  return 'php';
}

let php = null;
function levantarPhp() {
  try {
    php = Bun.spawn([binarioPhp(), '-S', `127.0.0.1:${PUERTO_PHP}`, '-t', RAIZ], {
      cwd: RAIZ,
      env: { ...process.env, NEXUS_DEV: '1' },
      stdout: 'ignore',
      stderr: 'ignore',
      onExit(_proceso, codigo) {
        php = null;
        console.warn(`[dev] php -S terminó (código ${codigo}); se reinicia en 1 s`);
        setTimeout(levantarPhp, 1000);
      },
    });
  } catch (error) {
    php = null;
    console.warn(`[dev] No se pudo ejecutar PHP (${binarioPhp()}): ${error.message}`);
    console.warn('[dev] Definí PHP_BIN con la ruta a php. Las páginas cargan, la API no.');
  }
}

function cacheControl(ruta, url) {
  if (/\.(css|js)$/i.test(ruta)) {
    return url.searchParams.has('v')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=3600, must-revalidate';
  }
  if (/\.html?$/i.test(ruta)) return 'no-cache';
  return 'public, max-age=604800, stale-while-revalidate=86400';
}

function registrarLlamada(metodo, ruta, estado, inicio, bytes) {
  const color =
    estado >= 500 || estado === 0 ? COLOR.error : estado >= 400 ? COLOR.aviso : COLOR.ok;
  const ms = String(Math.round(performance.now() - inicio)).padStart(4);
  const kb = bytes == null ? '' : `${(bytes / 1024).toFixed(1)} KB`;
  console.log(
    `${COLOR.tenue}[api]${COLOR.fin} ${metodo.padEnd(6)} ${color}${estado || 'ERR'}${COLOR.fin} ${ms} ms  ${ruta} ${COLOR.tenue}${kb}${COLOR.fin}`,
  );
}

async function reenviarAPhp(req, url) {
  const inicio = performance.now();
  const ruta = url.pathname + url.search;
  if (!php) {
    registrarLlamada(req.method, ruta, 503, inicio);
    return Response.json(
      {
        status: 'error',
        message: 'PHP no está disponible en el servidor de desarrollo.',
        data: null,
      },
      { status: 503 },
    );
  }
  try {
    const respuesta = await fetch(`http://127.0.0.1:${PUERTO_PHP}${ruta}`, {
      method: req.method,
      headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
      redirect: 'manual',
    });
    const cuerpo = await respuesta.arrayBuffer();
    registrarLlamada(req.method, ruta, respuesta.status, inicio, cuerpo.byteLength);
    // fetch ya descomprimió el cuerpo: no reenviar cabeceras de la versión comprimida.
    const cabeceras = new Headers(respuesta.headers);
    cabeceras.delete('content-encoding');
    cabeceras.delete('content-length');
    return new Response(cuerpo, { status: respuesta.status, headers: cabeceras });
  } catch {
    registrarLlamada(req.method, ruta, 0, inicio);
    return Response.json(
      { status: 'error', message: 'PHP se está reiniciando, reintentá en un momento.', data: null },
      { status: 502 },
    );
  }
}

levantarPhp();

Bun.serve({
  // Solo loopback: el modo desarrollo omite el 2FA.
  hostname: '127.0.0.1',
  port: PUERTO,
  async fetch(req) {
    const url = new URL(req.url);
    let ruta = decodeURIComponent(url.pathname);

    if (ruta === RUTA_PANEL) {
      return new Response(Bun.file(PANEL_API), {
        headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' },
      });
    }
    if (PROHIBIDO.test(ruta)) return new Response('Prohibido', { status: 403 });
    if (ruta.endsWith('.php')) return reenviarAPhp(req, url);

    // Rutas limpias, igual que el .htaccess y nginx.
    if (ruta === '/') ruta = '/index.html';
    else if (/^\/pages\/?$/.test(ruta)) ruta = '/pages/index.html';
    else if (/^\/pages\/[a-z0-9-]+\/?$/.test(ruta)) ruta = ruta.replace(/\/$/, '') + '.html';

    const archivo = join(RAIZ, normalize(ruta));
    if (!archivo.startsWith(RAIZ + sep)) return new Response('Prohibido', { status: 403 });
    const recurso = Bun.file(archivo);
    if (!(await recurso.exists())) return new Response('No encontrado', { status: 404 });

    const cabeceras = {
      'Cache-Control': cacheControl(ruta, url),
      'X-Content-Type-Options': 'nosniff',
    };
    if (/\.html?$/i.test(ruta)) {
      // El panel va antes de </head> para envolver fetch antes de que corra api.js.
      const html = (await recurso.text()).replace(
        /<\/head>/i,
        `<script src="${RUTA_PANEL}"></script>\n</head>`,
      );
      return new Response(html, {
        headers: { ...cabeceras, 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response(recurso, { headers: cabeceras });
  },
});

console.log(`[dev] NEXUS en http://127.0.0.1:${PUERTO}/pages/  (PHP interno en :${PUERTO_PHP})`);
console.log('[dev] Sin 2FA en el login. Panel de API en cada página: botón "API" o Alt+Shift+A.');
