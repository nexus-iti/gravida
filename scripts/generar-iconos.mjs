/*
 * Genera js/shared/vendor/lucide-iconos.min.js: solo los íconos de Lucide que
 * aparecen en pages/ y js/, en lugar de los ~1.500 del paquete completo.
 *
 *   bun run iconos
 *
 * Busca cualquier cadena con forma de nombre de ícono ('trash-2', "user") y se
 * queda con las que existen en Lucide, así también entran los nombres que el JS
 * arma en tiempo de ejecución (icono: 'monitor'). Si igual falta alguno, ui.js
 * carga el paquete completo (lucide-<versión>.min.js) como respaldo.
 *
 * Correrlo después de agregar un ícono nuevo y antes de `bun run assets:version`.
 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const LUCIDE = join(RAIZ, 'node_modules', 'lucide');
const VENDOR = join(RAIZ, 'js', 'shared', 'vendor');
const SALIDA = join(VENDOR, 'lucide-iconos.min.js');

const { version } = JSON.parse(readFileSync(join(LUCIDE, 'package.json'), 'utf8'));

// Mismo algoritmo que usa Lucide para resolver data-lucide="kebab-case".
const aPascal = (nombre) =>
  nombre.replace(
    /(\w)(\w*)(_|-|\s*)/g,
    (_, inicial, resto) => inicial.toUpperCase() + resto.toLowerCase(),
  );

// Nombre de componente (incluidos los alias) -> archivo del ícono.
const indice = new Map();
const exportaciones = readFileSync(join(LUCIDE, 'dist', 'esm', 'iconsAndAliases.js'), 'utf8');
for (const [, nombres, archivo] of exportaciones.matchAll(
  /export \{([^}]+)\} from '\.\/icons\/([^']+)';/g,
)) {
  for (const [, nombre] of nombres.matchAll(/default as (\w+)/g)) {
    indice.set(nombre, archivo);
  }
}

function archivosFuente(carpeta, extensiones) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name);
    if (entrada.isDirectory()) {
      return entrada.name === 'vendor' ? [] : archivosFuente(ruta, extensiones);
    }
    return extensiones.some((ext) => entrada.name.endsWith(ext)) ? [ruta] : [];
  });
}

const usados = new Map();
const fuentes = [
  ...archivosFuente(join(RAIZ, 'pages'), ['.html']),
  ...archivosFuente(join(RAIZ, 'js'), ['.js']),
];
for (const archivo of fuentes) {
  const texto = readFileSync(archivo, 'utf8');
  for (const [, nombre] of texto.matchAll(/["'`]([a-z][a-z0-9]*(?:-[a-z0-9]+)*)["'`]/g)) {
    const componente = aPascal(nombre);
    if (indice.has(componente)) {
      usados.set(componente, indice.get(componente));
    }
  }
}

const componentes = [...usados.keys()].toSorted();
const entrada = join(RAIZ, 'node_modules', '.cache', 'nexus-iconos', 'entrada.js');
mkdirSync(dirname(entrada), { recursive: true });
const rutaEsm = (archivo) => join(LUCIDE, 'dist', 'esm', archivo).replaceAll('\\', '/');
writeFileSync(
  entrada,
  [
    `import replaceElement from '${rutaEsm('replaceElement.js')}';`,
    ...componentes.map(
      (nombre) => `import ${nombre} from '${rutaEsm(`icons/${usados.get(nombre)}`)}';`,
    ),
    `const icons = { ${componentes.join(', ')} };`,
    // Misma API que el UMD: createIcons() sin argumentos usa los íconos incluidos.
    'function createIcons({ icons: extra = {}, nameAttr = "data-lucide", attrs = {} } = {}) {',
    '  const todos = Object.assign({}, icons, extra);',
    '  document.querySelectorAll("[" + nameAttr + "]").forEach((el) => replaceElement(el, { nameAttr, icons: todos, attrs }));',
    '}',
    `window.lucide = { icons, createIcons, version: '${version}', subconjunto: true };`,
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
const codigo = await resultado.outputs[0].text();
writeFileSync(
  SALIDA,
  `/*! lucide v${version} (ISC) - subconjunto generado por scripts/generar-iconos.mjs: ${componentes.length} íconos */\n${codigo}`,
);
rmSync(dirname(entrada), { recursive: true, force: true });

// Respaldo completo, versionado en el nombre para que nunca choque en caché.
const respaldo = join(VENDOR, `lucide-${version}.min.js`);
copyFileSync(join(LUCIDE, 'dist', 'umd', 'lucide.min.js'), respaldo);

console.log(`${componentes.length} íconos -> ${relative(RAIZ, SALIDA)} (${codigo.length} bytes)`);
console.log(`respaldo completo -> ${relative(RAIZ, respaldo)}`);
