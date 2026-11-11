// Menjalankan satu build dengan opsi JSON dari argumen, lalu mencetak
// hasilnya sebagai JSON. Dipakai buildIsolated() di builder/isolated.js.
import { build } from '../builder/index.js';

try {
  const result = await build(JSON.parse(process.argv[2]));
  process.stdout.write(JSON.stringify(result));
} catch (error) {
  process.stderr.write(error.message);
  process.exit(1);
}
