/*
 * Genera lo que el portal necesita de Motion (https://motion.dev):
 *
 *   1. js/shared/vendor/motion-<versión>.min.js: solo animate, spring, stagger,
 *      press e inView, expuestos como window.Motion (los scripts del portal son
 *      clásicos, sin bundler).
 *   2. Las curvas CSS de los resortes en css/global.css, entre los marcadores
 *      "@generado:resortes". Así las transiciones CSS (hover, foco, menús) y las
 *      animaciones JS siguen exactamente la misma física.
 *
 *   bun run movimiento
 *
 * Política (guía de movimiento de Apple): todo es un resorte crítico, sin rebote
 * (bounce 0, el preset "smooth" de SwiftUI). Arranca con velocidad, frena de
 * forma continua y llega sin pasarse; se mide por duración percibida
 * (visualDuration), no por tiempo total.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spring } from 'motion';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(
  readFileSync(join(RAIZ, 'node_modules', 'motion', 'package.json'), 'utf8'),
);

// Misma tabla que js/shared/movimiento.js: si cambia una, cambia la otra.
const RESORTES = {
  suave: 0.5, // paneles, diálogos, entrada de página (SwiftUI .smooth)
  rapida: 0.3, // hover, presión, menús desplegables
};

/* ---------- 1. Subconjunto de Motion ---------- */
const entrada = join(RAIZ, 'node_modules', '.cache', 'nexus-motion', 'entrada.js');
mkdirSync(dirname(entrada), { recursive: true });
writeFileSync(
  entrada,
  [
    "import { animate } from 'motion/mini'; import { spring, stagger, press, inView } from 'motion';",
    `window.Motion = { animate, spring, stagger, press, inView, version: '${version}' };`,
  ].join('\n'),
);
const resultado = await Bun.build({
  entrypoints: [entrada],
  minify: true,
  format: 'iife',
  target: 'browser',
});
if (!resultado.success) {
  console.error(resultado.logs.join('\n'));
  process.exit(1);
}
const salidaJs = join(RAIZ, 'js', 'shared', 'vendor', `motion-${version}.min.js`);
const codigo = await resultado.outputs[0].text();
writeFileSync(
  salidaJs,
  `/*! motion v${version} (MIT, https://motion.dev) - subconjunto generado por scripts/generar-movimiento.mjs */\n${codigo}`,
);
rmSync(dirname(entrada), { recursive: true, force: true });

/* ---------- 2. Curvas CSS ---------- */
const lineas = [];
for (const [nombre, duracionVisual] of Object.entries(RESORTES)) {
  // "900ms linear(0, 0.04, ...)": duración real + curva muestreada del resorte.
  const [duracion, ...curva] = String(spring(duracionVisual, 0)).split(' ');
  lineas.push(`  --duracion-${nombre}: ${duracion};`);
  lineas.push(`  --curva-${nombre}: ${curva.join(' ')};`);
}
const bloque =
  '/* @generado:resortes (bun run movimiento) */\n' +
  ':root {\n' +
  lineas.join('\n') +
  '\n}\n/* @fin:resortes */';

const rutaCss = join(RAIZ, 'css', 'global.css');
const css = readFileSync(rutaCss, 'utf8');
const crlf = css.includes('\r\n');
const normalizado = css.replaceAll('\r\n', '\n');
const marcador = /\/\* @generado:resortes[\s\S]*?\/\* @fin:resortes \*\//;
if (!marcador.test(normalizado)) {
  console.error(
    'Falta el bloque "/* @generado:resortes */ ... /* @fin:resortes */" en css/global.css',
  );
  process.exit(1);
}
const nuevo = normalizado.replace(marcador, bloque);
writeFileSync(rutaCss, crlf ? nuevo.replaceAll('\n', '\r\n') : nuevo);

console.log(
  `motion ${version} -> ${relative(RAIZ, salidaJs)} (${(codigo.length / 1024).toFixed(1)} KB)`,
);
console.log(`curvas: ${Object.keys(RESORTES).join(', ')} -> css/global.css`);
