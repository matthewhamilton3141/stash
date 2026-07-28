import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync('./app-tray.svg', 'utf8');
const r = new Resvg(svg, { fitTo: { mode: 'width', value: 44 } });
writeFileSync('./src-tauri/icons/tray-icon.png', r.render().asPng());
console.log('wrote src-tauri/icons/tray-icon.png');
