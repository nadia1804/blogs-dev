import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);
const require = createRequire(import.meta.url);

// Bangun stylesheet tema ke {assetsDir}/theme.{hash}.css dan kembalikan nama
// berkasnya. Hash isi di nama berkas membuatnya aman di-cache selamanya.
//
// Mesin 'tailwind' menjalankan Tailwind CLI dari folder tema: hanya class
// yang benar-benar dipakai template yang masuk ke CSS akhir.
export async function compileStyles(theme, assetsDir) {
  const { styles } = theme.manifest;
  if (!styles) return null;

  await mkdir(assetsDir, { recursive: true });
  const temp = join(assetsDir, 'theme.build.css');
  const entry = join(theme.dir, styles.entry);

  if (styles.engine === 'tailwind') {
    const cliDir = dirname(require.resolve('@tailwindcss/cli/package.json'));
    try {
      await run(process.execPath, [join(cliDir, 'dist/index.mjs'), '-i', entry, '-o', temp, '--minify'], {
        cwd: theme.dir,
      });
    } catch (error) {
      throw new Error(`Kompilasi CSS tema gagal:\n${error.stderr || error.message}`);
    }
  } else {
    await copyFile(entry, temp);
  }

  const hash = createHash('sha256').update(await readFile(temp)).digest('hex').slice(0, 10);
  const name = `theme.${hash}.css`;
  await rename(temp, join(assetsDir, name));
  return name;
}
