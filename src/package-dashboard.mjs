import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const assetsDirectory = new URL('../assets/', import.meta.url);
const outputDirectory = new URL('../dist/', import.meta.url);
const photosDirectory = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2]) + sep)
  : new URL('photos/', assetsDirectory);
const template = await readFile(new URL('dashboard.html', import.meta.url), 'utf8');
const { views } = JSON.parse(await readFile(new URL('photo-viewpoints.json', assetsDirectory), 'utf8'));
const photos = await Promise.all(views.map(async ({ photo }) => {
  const bytes = await readFile(new URL(photo, photosDirectory));
  return 'data:image/jpeg;base64,' + bytes.toString('base64');
}));
const model = (await readFile(new URL('room.glb', assetsDirectory))).toString('base64');
const checkoutDirectory = new URL('tenant-pics/', photosDirectory);
const checkoutNames = (await readdir(checkoutDirectory)).filter(name => /\.jpe?g$/i.test(name)).sort();
if (checkoutNames.length !== 3) {
  throw new Error('Provide three checkout JPEGs in the tenant-pics directory.');
}
const checkoutPhotos = await Promise.all(checkoutNames.map(async name => {
  const bytes = await readFile(new URL(encodeURIComponent(name), checkoutDirectory));
  return 'data:image/jpeg;base64,' + bytes.toString('base64');
}));
const result = await build({
  entryPoints: [fileURLToPath(new URL('app.js', import.meta.url))],
  bundle: true,
  minify: true,
  write: false,
  format: 'iife',
});
const json = JSON.stringify({ views, photos, model, checkoutPhotos }).replaceAll('<', '\\u003c');
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const injection = '<script>window.roomData=' + json + ';</script><script>' + script + '</script>';
await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL('dashboard.html', outputDirectory), template.replace('<!-- APP -->', () => injection));
