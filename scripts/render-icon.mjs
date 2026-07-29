import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'node:fs';
const svg = readFileSync('./app-icon.svg', 'utf8');
const r = new Resvg(svg, { fitTo: { mode: 'width', value: 1024 } });
writeFileSync('/tmp/stash-icon.png', r.render().asPng());
console.log('wrote /tmp/stash-icon.png');
