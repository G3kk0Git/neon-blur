// Erzeugt aus chordwave/ eine verschleierte Fassung: Kommentare weg, Namen unkenntlich, Texte verschlüsselt.
// Aufruf: node tools/build-web.mjs <Zielordner>
import fs from 'node:fs';
import path from 'node:path';
import { minify } from 'terser';
import JavaScriptObfuscator from 'javascript-obfuscator';

const src = path.resolve('chordwave'), out = path.resolve(process.argv[2] || 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(src, out, { recursive: true });

const file = path.join(out, 'index.html');
let html = fs.readFileSync(file, 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('Kein <script> in index.html gefunden');

const min = await minify(m[1], {
  ecma: 2020, toplevel: true,
  compress: { passes: 2, drop_console: false },
  mangle: { toplevel: true },
  format: { comments: false }
});
const obf = JavaScriptObfuscator.obfuscate(min.code, {
  compact: true,
  target: 'browser',
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true, stringArrayEncoding: ['base64'], stringArrayThreshold: 0.6,
  stringArrayRotate: true, stringArrayShuffle: true, splitStrings: false,
  controlFlowFlattening: false, deadCodeInjection: false,   // aus: würden die Audio-Zeitsteuerung bremsen
  selfDefending: false, debugProtection: false, numbersToExpressions: false,
  transformObjectKeys: false, unicodeEscapeSequence: false
}).getObfuscatedCode();

html = html.slice(0, m.index) + '<script>' + obf + '</script>' + html.slice(m.index + m[0].length);
html = html.replace(/<!--[\s\S]*?-->/g, '');                       // HTML-Kommentare entfernen
html = html.replace(/<style>([\s\S]*?)<\/style>/, (_, css) =>     // CSS: Kommentare und Leerraum weg
  '<style>' + css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '') + '</style>');
fs.writeFileSync(file, html);

const sw = path.join(out, 'sw.js');
if (fs.existsSync(sw)){ const r = await minify(fs.readFileSync(sw, 'utf8'), { format: { comments: false } }); fs.writeFileSync(sw, r.code); }
console.log(`Fertig: ${out} (index.html ${(fs.statSync(file).size / 1024).toFixed(0)} KB, vorher ${(fs.statSync(path.join(src, 'index.html')).size / 1024).toFixed(0)} KB)`);
