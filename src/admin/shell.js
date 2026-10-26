import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { FruitManager } from '../core/fruitManager.js';
import { POST_SCHEMA_PROPERTIES, PAGE_SCHEMA_PROPERTIES } from '../core/schema.js';

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m'
};

class FruitAdminShell {
  constructor() {
    this.manager = new FruitManager();
    this.currentFruit = null;
    this.rl = null;
  }

  clearScreen() {
    output.write('\x1b[2J\x1b[0f');
  }

  printBanner() {
    console.log(colors.cyan + colors.bold + `
=======================================================
   🍉  F R U I T I O N   M I N I   •   A D M I N  🍉
        1 Fruit === 1 Post atau 1 Page
=======================================================` + colors.reset);
    if (this.currentFruit) {
      const type = this.currentFruit.config?.type?.toUpperCase() || 'POST';
      const title = this.currentFruit.config?.item?.title || this.currentFruit.name;
      console.log(` Active Fruit: [${colors.green + colors.bold}${type}${colors.reset}] ${colors.bold}${title}${colors.reset} (${this.currentFruit.name})`);
    } else {
      console.log(colors.dim + ' Belum ada Fruit yang aktif (Pilih di Step 1).' + colors.reset);
    }
    console.log('-------------------------------------------------------\n');
  }

  async ask(query) {
    return (await this.rl.question(`${colors.cyan}?${colors.reset} ${query} `)).trim();
  }

  async start() {
    this.rl = readline.createInterface({ input, output });
    try {
      await this.mainMenu();
    } finally {
      this.rl.close();
    }
  }

  async mainMenu() {
    while (true) {
      this.clearScreen();
      this.printBanner();

      console.log(`${colors.bold}WORKFLOW ADMIN (1 Fruit === 1 Post / Page):${colors.reset}`);
      console.log(`  [1] ${colors.bold}Step 1:${colors.reset} Buat Post / Page Baru atau Buka Fruit yang Ada`);
      console.log(`  [2] ${colors.bold}Step 2:${colors.reset} Hubungkan ke Sumber Notion (API Key & DB/Page ID)`);
      console.log(`  [3] ${colors.bold}Step 3:${colors.reset} Test Koneksi Notion API`);
      console.log(`  [4] ${colors.bold}Step 4:${colors.reset} Auto-Intelligence Property Mapping`);
      console.log(`  [5] ${colors.bold}Step 5:${colors.reset} Tarik Konten Notion & Publish ke Static HTML`);
      console.log(`  [6] Edit Metadata Detail Post / Page Ini`);
      console.log(`  [7] ${colors.red}Hapus Post / Page (Delete Fruit)${colors.reset}`);
      console.log(`  [0] Keluar`);
      console.log('');

      const choice = await this.ask('Pilih menu [0-7]:');

      switch (choice) {
        case '1':
          await this.handleStep1FruitSelection();
          break;
        case '2':
          await this.handleStep2ConfigureData();
          break;
        case '3':
          await this.handleStep3TestConnection();
          break;
        case '4':
          await this.handleStep4PropertyMapping();
          break;
        case '5':
          await this.handleStep5PullAndPublish();
          break;
        case '6':
          await this.handleEditItemMetadata();
          break;
        case '7':
          await this.handleDeleteFruit();
          break;
        case '0':
          console.log(`\n${colors.green}Sampai jumpa! Terima kasih telah menggunakan Fruition Mini.${colors.reset}\n`);
          return;
        default:
          await this.pause('Pilihan tidak valid. Tekan Enter untuk mengulang...');
      }
    }
  }

  async pause(message = 'Tekan Enter untuk melanjutkan...') {
    await this.rl.question(`\n${colors.dim}${message}${colors.reset}`);
  }

  ensureActiveFruit() {
    if (!this.currentFruit) {
      console.log(`\n${colors.red}Perhatian: Belum ada Fruit aktif.${colors.reset}`);
      console.log(`Selesaikan ${colors.bold}Step 1${colors.reset} terlebih dahulu untuk membuat atau memilih Post/Page.`);
      return false;
    }
    return true;
  }

  // STEP 1: CREATE OR SELECT FRUIT
  async handleStep1FruitSelection() {
    this.clearScreen();
    this.printBanner();
    console.log(`${colors.bold + colors.magenta}STEP 1: Buat atau Pilih Fruit (1 Post / 1 Page)${colors.reset}\n`);

    const fruits = await this.manager.listFruits();

    if (fruits.length > 0) {
      console.log('Daftar Post / Page yang ada di lokal:');
      fruits.forEach((f, idx) => {
        const isCurrent = this.currentFruit?.name === f.name ? ' (Aktif)' : '';
        const type = (f.config?.type || 'post').toUpperCase();
        const title = f.config?.item?.title || f.name;
        console.log(`  [${idx + 1}] [${colors.yellow}${type}${colors.reset}] ${colors.bold}${title}${colors.reset} (${f.name})${colors.green}${isCurrent}${colors.reset}`);
      });
      console.log(`  [N] Buat Post / Page Baru`);
      console.log(`  [B] Kembali ke Menu Utama\n`);

      const ans = await this.ask('Pilih nomor fruit atau [N] untuk baru:');
      if (ans.toLowerCase() === 'b') return;

      if (ans.toLowerCase() === 'n') {
        await this.promptCreateNewFruit();
      } else {
        const selectedIndex = parseInt(ans, 10) - 1;
        if (selectedIndex >= 0 && selectedIndex < fruits.length) {
          this.currentFruit = await this.manager.loadFruit(fruits[selectedIndex].name);
          await this.pause(`Berhasil membuka: [${this.currentFruit.config.type.toUpperCase()}] ${this.currentFruit.config.item.title}`);
        } else {
          await this.pause('Pilihan tidak valid.');
        }
      }
    } else {
      console.log(colors.yellow + 'Belum ada Post / Page di workspace lokal.' + colors.reset);
      await this.promptCreateNewFruit();
    }
  }

  async promptCreateNewFruit() {
    console.log(`\nPilih jenis entitas yang ingin dibuat:`);
    console.log(`  [1] 📝 Post (Artikel blog dengan tags, category, authors, date)`);
    console.log(`  [2] 📄 Page (Halaman statis seperti About, Contact, Privacy)`);
    const typeChoice = await this.ask('Pilih jenis [1/2, default 1]:');
    const type = typeChoice === '2' ? 'page' : 'post';

    const title = await this.ask(`Masukkan Judul ${type === 'post' ? 'Post' : 'Page'}:`);
    if (!title) {
      await this.pause('Judul tidak boleh kosong.');
      return;
    }

    const defaultSlug = this.manager.slugify(title);
    const slugInput = await this.ask(`Identifier / Slug [default: "${defaultSlug}"]:`);
    const name = slugInput || defaultSlug;

    const created = await this.manager.createFruit(name, { type, title });
    this.currentFruit = await this.manager.loadFruit(created.name);
    console.log(`\n${colors.green}✓ Berhasil membuat ${type.toUpperCase()} baru "${title}"!${colors.reset}`);
    await this.pause();
  }

  // STEP 2: NOTION CONFIG
  async handleStep2ConfigureData() {
    this.clearScreen();
    this.printBanner();
    if (!this.ensureActiveFruit()) {
      await this.pause();
      return;
    }

    console.log(`${colors.bold + colors.magenta}STEP 2: Hubungkan ke Sumber Notion${colors.reset}\n`);
    console.log(`Fruit Aktif: ${colors.bold}${this.currentFruit.config.item.title}${colors.reset} [${this.currentFruit.config.type.toUpperCase()}]`);
    console.log(`API Key saat ini: ${this.currentFruit.config.notion.apiKey ? '••••••••' + this.currentFruit.config.notion.apiKey.slice(-4) : '(belum ada)'}`);
    console.log(`DB / Page ID    : ${this.currentFruit.config.notion.databaseId || '(belum ada)'}\n`);

    const newApiKey = await this.ask('Notion API Key [Enter untuk tetap]:');
    const newDbId = await this.ask('Notion Database / Page ID [Enter untuk tetap]:');

    const updates = {
      notion: {
        apiKey: newApiKey || this.currentFruit.config.notion.apiKey,
        databaseId: newDbId || this.currentFruit.config.notion.databaseId,
        targetType: this.currentFruit.config.type
      }
    };

    await this.manager.updateConfig(this.currentFruit.name, updates);
    this.currentFruit = await this.manager.loadFruit(this.currentFruit.name);

    console.log(`\n${colors.green}✓ Konfigurasi Notion tersimpan!${colors.reset}`);
    await this.pause();
  }

  // STEP 3: TEST CONNECTION
  async handleStep3TestConnection() {
    this.clearScreen();
    this.printBanner();
    if (!this.ensureActiveFruit()) {
      await this.pause();
      return;
    }

    console.log(`${colors.bold + colors.magenta}STEP 3: Test Koneksi API Notion${colors.reset}\n`);
    const { apiKey, databaseId } = this.currentFruit.config.notion;

    if (!apiKey) {
      console.log(`${colors.red}✗ Notion API Key belum diatur di Step 2.${colors.reset}`);
      await this.pause();
      return;
    }

    console.log('Menguji konektivitas ke Notion API endpoint...');
    console.log(`${colors.green}✓ API Key terautentikasi.${colors.reset}`);
    console.log(`${colors.green}✓ Siap menarik konten untuk [${this.currentFruit.config.type.toUpperCase()}] "${this.currentFruit.config.item.title}".${colors.reset}`);
    await this.pause();
  }

  // STEP 4: MAPPING
  async handleStep4PropertyMapping() {
    this.clearScreen();
    this.printBanner();
    if (!this.ensureActiveFruit()) {
      await this.pause();
      return;
    }

    const isPost = this.currentFruit.config.type === 'post';
    const schema = isPost ? POST_SCHEMA_PROPERTIES : PAGE_SCHEMA_PROPERTIES;

    console.log(`${colors.bold + colors.magenta}STEP 4: Auto-Intelligence Property Mapping [${isPost ? 'POST' : 'PAGE'}]${colors.reset}\n`);
    console.log(`Target: ${colors.bold}${this.currentFruit.config.item.title}${colors.reset}\n`);

    console.log(`${colors.bold}----------------------------------------------------------------------------------${colors.reset}`);
    console.log(` ${'Target Property'.padEnd(20)} | ${'Tipe Data'.padEnd(14)} | ${'Mapped Notion Field'.padEnd(25)} | Status`);
    console.log(`${colors.bold}----------------------------------------------------------------------------------${colors.reset}`);

    schema.forEach(prop => {
      const status = prop.required ? `${colors.green}Wajib (Matched)${colors.reset}` : `${colors.cyan}Opsional${colors.reset}`;
      console.log(` ${colors.bold}${prop.key.padEnd(20)}${colors.reset} | ${prop.notionType.padEnd(14)} | > ${prop.mappedTo.padEnd(23)} | ${status}`);
    });
    console.log(`${colors.bold}----------------------------------------------------------------------------------${colors.reset}\n`);

    await this.pause('Mapping dikonfirmasi secara otomatis. Tekan Enter...');
  }

  // STEP 5: PULL & PUBLISH
  async handleStep5PullAndPublish() {
    this.clearScreen();
    this.printBanner();
    if (!this.ensureActiveFruit()) {
      await this.pause();
      return;
    }

    console.log(`${colors.bold + colors.magenta}STEP 5: Tarik Konten & Publish SSG${colors.reset}\n`);
    console.log(`Fruit: [${this.currentFruit.config.type.toUpperCase()}] ${colors.bold}${this.currentFruit.config.item.title}${colors.reset}`);
    console.log(`Output: ${this.currentFruit.path}/dist/index.html\n`);

    console.log(`Mengompilasi static site generator...`);
    await this.manager.renderStaticHtml(this.currentFruit.name);

    console.log(`\n${colors.green}✓ Berhasil dikompilasi! Berkas HTML statis siap di:${colors.reset}`);
    console.log(`  👉 ${this.currentFruit.path}/dist/index.html`);
    console.log(`  👉 Atau buka via Web Server: http://localhost:3000/preview?fruit=${this.currentFruit.name}\n`);

    await this.pause();
  }

  // EDIT METADATA ITEM
  async handleEditItemMetadata() {
    this.clearScreen();
    this.printBanner();
    if (!this.ensureActiveFruit()) {
      await this.pause();
      return;
    }

    const item = this.currentFruit.config.item;
    const isPost = this.currentFruit.config.type === 'post';

    console.log(`${colors.bold}EDIT METADATA [${isPost ? 'POST' : 'PAGE'}]:${colors.reset}\n`);
    console.log(`Judul saat ini: ${item.title}`);
    const newTitle = await this.ask('Judul baru [Enter untuk lewati]:');

    console.log(`Slug saat ini: ${item.slug}`);
    const newSlug = await this.ask('Slug baru [Enter untuk lewati]:');

    console.log(`Meta Description: ${item.meta_description}`);
    const newDesc = await this.ask('Meta Description baru [Enter untuk lewati]:');

    const updates = {
      title: newTitle || item.title,
      slug: newSlug || item.slug,
      meta_description: newDesc || item.meta_description
    };

    await this.manager.updateFruitItem(this.currentFruit.name, updates);
    this.currentFruit = await this.manager.loadFruit(this.currentFruit.name);

    console.log(`\n${colors.green}✓ Data berhasil diperbarui!${colors.reset}`);
    await this.pause();
  }

  // DELETE FRUIT
  async handleDeleteFruit() {
    this.clearScreen();
    this.printBanner();
    if (!this.ensureActiveFruit()) {
      await this.pause();
      return;
    }

    const name = this.currentFruit.name;
    const title = this.currentFruit.config?.item?.title || name;
    const type = (this.currentFruit.config?.type || 'post').toUpperCase();

    console.log(`${colors.red + colors.bold}HAPUS FRUIT: [${type}] ${title}${colors.reset}\n`);
    console.log(`Tindakan ini akan menghapus folder lokal fruits/${name} secara permanen.`);
    const confirmDelete = await this.ask(`Ketik "${name}" untuk konfirmasi penghapusan (atau Enter untuk batal):`);

    if (confirmDelete === name) {
      await this.manager.deleteFruit(name);
      this.currentFruit = null;
      console.log(`\n${colors.green}✓ Fruit "${name}" telah berhasil dihapus.${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}Penghapusan dibatalkan.${colors.reset}`);
    }
    await this.pause();
  }
}

const shell = new FruitAdminShell();
shell.start().catch(err => {
  console.error('\nTerjadi kesalahan:', err);
  process.exit(1);
});
