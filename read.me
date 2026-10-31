# fruition-mini (Core v0.2.8)
> Headless Notion-Powered Static Site Generator & Dynamic Thematic Blog Engine dengan Antarmuka Admin Bergaya GitHub Shell, Kompilasi Resmi Astro SSG, dan Arsitektur Modular Plugin.

---

## 📌 Nama Project
- **Core Engine**: `fruition-mini` (v0.2.8)
- **Flagship Theme**: `Fruition-capsule` (v0.2.8)

---

## 💡 Konsep dan Workflow

### 1. Konsep Utama
**fruition-mini** dirancang untuk menjembatani kemudahan menulis di **Notion** dengan performa dan estetika situs statis modern. Menggunakan pendekatan *headless CMS*, konten ditarik dari Notion Database dan dirender secara dinamis melalui mesin tema fleksibel tanpa bergantung pada server Notion saat diakses publik.

### 2. Alur Kerja (Workflow)
1. **Notion Fruit Connectors**: Menghubungkan satu atau lebih Notion Database (mendukung multi-fruit / multi-post-type seperti artikel `read`, kategori `pelajaran`, halaman `pages`, dan relasi profil `authors`).
2. **Pipeline Media Otomatis (WebP)**: Mengunduh gambar sampul dan media dari blok Notion, lalu mengonversinya secara permanen menjadi format `.webp` yang ringan dan cepat.
3. **Penyimpanan Berkas Atomik (File-Based Storage)**: Seluruh data hasil sinkronisasi dan konfigurasi disimpan dalam format JSON terstruktur di direktori `content/` (`content/fruits/`, `content/settings/site.json`, `content/authors/`).
4. **Theme Renderer Dinamis**: Menggabungkan data JSON dengan komponen template (seperti header kaca kapsul, grid artikel editorial, daftar isi dinamis, dan profil penulis multi-fruit).
5. **Admin Shell Interaktif**: Panel kontrol berbasis web di `/admin` untuk memonitor sinkronisasi, mengatur navigasi menu, mengubah tata letak tema, dan mengelola kredensial.
6. **GitOps & Static Export**: Blog dapat diekspor langsung menjadi berkas statis siap *deploy* ke GitHub Pages, Vercel, Netlify, atau Cloudflare Pages.

---

## 🚀 Cara Penggunaan

### 1. Prasyarat
- **Node.js** versi 18 atau lebih baru.
- Token integrasi internal Notion (**Notion API Key / Secret**).

### 2. Setup Awal & Konfigurasi Kredensial

#### Opsi A: Menggunakan Berkas Batch 1-Klik (Windows)
1. Klik 2x pada file **`install.bat`** untuk menginstal seluruh dependensi project (`npm install`) dan otomatis menyiapkan berkas `.env`.
2. Klik 2x pada file **`start.bat`** untuk langsung menjalankan server pengembangan lokal.

#### Opsi B: Menggunakan Terminal / CLI Manual
1. Salin berkas lingkungan dari contoh:
   ```bash
   cp .env.example .env
   ```
2. Pasang dependensi:
   ```bash
   npm install
   ```
3. Isi token Notion Anda pada berkas `.env`:
   ```env
   NOTION_API_KEY=ntn_xxxxxxxxxxxxxxxxxxxx
   PORT=4321
   ```
   *(Pengaturan token juga dapat dilakukan langsung melalui antarmuka Admin pada menu Settings & GitOps).*

### 3. Menjalankan Server Pengembangan
Jalankan dev-server lokal:
```bash
start.bat
# atau: node dev-server.js
```
Akses di peramban web:
- **Pratinjau Situs Utama**: [http://localhost:4321](http://localhost:4321) (atau rute tema di [http://localhost:4321/theme](http://localhost:4321/theme))
- **Dashboard Admin Shell**: [http://localhost:4321/admin](http://localhost:4321/admin)

### 4. Menghubungkan Database Notion (Fruit Connector)
1. Buka dashboard di [http://localhost:4321/admin](http://localhost:4321/admin) dan pilih menu **Fruit Connectors**.
2. Klik tombol **+ New Fruit Connector**.
3. Masukkan Identifier, Nama, dan **Database ID** Notion Anda.
4. Tentukan **Post Type** (misal: `read`, `pelajaran`, `pages`, atau `authors`).
5. Pilih **Cover Fallback Color** menggunakan palet visual pastel (Blossom, Mint, Periwinkle, Peach, Lilac).
6. Klik **Save Fruit Connector** lalu jalankan sinkronisasi.

### 5. Mengatur Navigasi & Identitas Situs
1. Masuk ke menu **Navigasi & Tata Letak Situs**.
2. **Nama Situs (Site Title)**: Aktifkan atau nonaktifkan tampilan nama situs di navbar dengan tombol *toggle*.
3. **Logo Brand**: Unggah berkas logo atau gunakan logo bawaan sistem.
4. **Tautan Menu Header & Footer**:
   - Tambahkan item menu navigasi.
   - Pilih target URL dengan **Dropdown Lacak Otomatis** (mendeteksi rute single, arsip fruit, dan authors secara dinamis).
   - Tentukan status aktif link secara manual (Active Toggle).
   - Susun urutan menu dengan tombol **Order Drag / Reorder** (Naik/Turun).
5. Simpan pengaturan dengan menekan tombol **Save (Ctrl + S)**.

### 6. Menyesuaikan Tampilan Tema (Fruition-capsule)
1. Masuk ke menu **Themes** > klik **Pengaturan Tema** pada *Fruition-capsule*.
2. Pada tab **Card Grid**:
   - Pilih **Mode Tata Letak Kartu**: *Default Card (Ukuran Seragam)* atau *Editorial Card (Kartu Utama Besar)*.
   - Atur **Distribusi Kolom Responsif**:
     - **SM (Mobile)**: 1 atau 2 Kolom.
     - **MD (Tablet)**: 1, 2, atau 3 Kolom.
     - **LG (Desktop)**: 2, 3, atau 4 Kolom.
3. Klik **Save Theme Settings** (atau gunakan pintasan keyboard `Ctrl + S`).

---

## 📝 Pembaharuan Update (Changelog)

### Core: fruition-mini v0.2.8
- **Arsitektur Modular Plugin (Ekstensi Jamstack Atomik)**:
  - Direktori penyimpanan konfigurasi plugin terpusat di `content/plugins/` dalam format JSON atomik (`safelink.json` & `adsense.json`).
  - Endpoint REST API baru untuk manajemen plugin:
    - `GET /api/plugins`: Mendapatkan katalog plugin terpasang beserta status aktif/nonaktif dan konfigurasinya.
    - `GET & POST /api/plugins/:pluginId/config`: Membaca dan menyimpan formulir pengaturan plugin secara atomik.
    - `POST /api/plugins/:pluginId/toggle`: Mengaktifkan atau menonaktifkan status plugin secara instan.
- **Plugin 1: Safelink Protector Modular (`content/plugins/safelink.json`)**:
  - Script interceptor client-side (`src/plugins/safelink/SafelinkScript.astro`) yang mendeteksi seluruh link eksternal di dalam artikel blog.
  - Pengalihan otomatis link luar situs ke halaman proteksi `/safelink?url=[base64]` dengan hitungan mundur dinamis (*countdown* default 10 detik, dapat diubah oleh admin via panel pengaturan).
  - Sistem daftar putih domain (*domain whitelist*) yang fleksibel (misal: `localhost`, `github.com`, `google.com`) untuk mengecualikan domain terpercaya dari pengalihan.
  - Komponen halaman `src/pages/safelink.astro` yang dilengkapi bilah progres visual, tombol salin tautan, tombol buka URL tujuan, dan slot iklan ganda.
- **Plugin 2: Google AdSense & Monetisasi Modular (`content/plugins/adsense.json`)**:
  - Komponen Astro modular `<AdSenseScript />` dan `<AdSlot />` untuk injeksi iklan tanpa merusak skor Core Web Vitals.
  - **Dinonaktifkan Secara Default (`enabled: false`)**: Tidak menyisipkan skrip Google atau elemen placeholder kosong sebelum admin memasukkan Publisher ID (`ca-pub-xxxxxxxx`) dan mengaktifkannya.
  - Slot monetisasi modular: Di bawah judul artikel (`belowTitle`), di bawah isi artikel (`belowArticle`), di atas hitungan mundur safelink (`safelinkTop`), dan di bawah tombol safelink (`safelinkBottom`).
- **Antarmuka Admin Shell Plugins (`#viewPlugins`)**:
  - Menu navigasi baru di sidebar admin dengan badge jumlah plugin terpasang.
  - Tampilan katalog plugin dengan sakelar On/Off instan, badge status, dan tombol pengaturan.
  - Layer form konfigurasi untuk masing-masing plugin (durasi countdown safelink, whitelist textarea, Publisher ID AdSense, toggle slot iklan, dan auto ads).

### Tema: Fruition-capsule v0.2.8
- **Optimalisasi Tampilan Mobile (Layar <= 767px)**:
  - **Sembunyikan Meta Description pada SM 2-Kolom**: Ketika tata letak kartu di layar mobile diatur 2 kolom, teks kutipan artikel (`.card-excerpt`) otomatis disembunyikan agar kartu tetap rapi, seimbang, dan proporsional.
  - **Hero Unit Lebih Besar**: Judul hero diperbesar menjadi `clamp(2.2rem, 8.5vw, 2.9rem)` dan teks deskripsi menjadi `clamp(1.1rem, 4.2vw, 1.25rem)` untuk visibilitas dan dampak visual yang kuat di layar ponsel.
  - **Navbar Kapsul Mobile Lebih Besar & Ergonomis**: Ketinggian navbar kapsul ditingkatkan menjadi `60px` (sebelumnya `50px`), ukuran logo naik ke `34px`, brand text ke `1.05rem`, dan target sentuh tombol aksi / hamburger toggle menjadi `40px` (memenuhi standar aksesibilitas WCAG).
- **Preset Warna "Light" (Silver, Light Cream & Putih)**:
  - Preset warna `Light` disempurnakan dengan kombinasi warna: kanvas latar belakang *light cream* hangat (`#FAF8F5`), permukaan kartu dan modal putih murni (`#FFFFFF`), aksen *border* perak / *silver* (`#E2E4E9`), badge krem lembut (`#F1EFEA`), teks arang gelap (`#1E2229`), dan border kapsul kaca semi-transparan perak.
  - Didaftarkan sebagai preset aktif default di `theme.json` dan didukung penuh pada inspektor token CSS admin (`#themePresetCardsGrid`), dock kontrol pratinjau tema, dan kompilasi Astro SSG (`data-theme-preset="light"`).
- **Integrasi Plugin Safelink & AdSense pada Layout Tema**:
  - `src/themes/fruition-capsule/layouts/BaseLayout.astro` menginjeksi conditional script `<AdSenseScript />` di dalam `<head>` dan client-side interceptor `<SafelinkScript />` sebelum penutup `</body>`.
  - Halaman baca artikel `src/pages/[fruit]/[slug].astro` mengintegrasikan unit `<AdSlot slotId="belowTitle" />` dan `<AdSlot slotId="belowArticle" />` yang otomatis merender hanya jika plugin AdSense aktif.

### Core: fruition-mini v0.2.7
- **Migrasi Penuh ke Mesin Kompilasi Resmi Astro SSG (`@astrojs`)**:
  - Konfigurasi resmi `astro.config.mjs` dengan target output `static` dan direktori `dist/`.
  - Struktur routing dinamis Astro asli di `src/pages/`:
    - `src/pages/index.astro`: Beranda dinamis merender hero unit dan card grid langsung dari kumpulan data Notion.
    - `src/pages/[fruit]/index.astro`: Arsip per database Notion dengan `getStaticPaths()`.
    - `src/pages/[fruit]/[slug].astro`: Halaman baca artikel Notion lengkap dengan daftar isi (TOC), render blok HTML Notion, tombol cetak, tombol bagikan, dan kartu profil penulis.
    - `src/pages/authors/index.astro` & `src/pages/authors/[slug].astro`: Direktori penulis dan halaman profil yang mengagregasikan artikel lintas Fruit.
    - `src/pages/[slug].astro`: Halaman statis Notion (`content/pages/`).
    - `src/pages/safelink.astro`: Halaman **Safelink** modular dengan slot iklan Google AdSense dan timer hitung mundur.
  - Integrasi tombol **Publish (dist/)** dan **Publish via Git** di Admin Shell yang secara nyata memicu `npx astro build`.
  - Workflow otomatisasi CI/CD `.github/workflows/deploy.yml` untuk deploy otomatis ke GitHub Pages via GitHub Actions.

### Tema: Fruition-capsule v0.2.7
- **Aktivasi Komponen `.astro` Asli**: Seluruh komponen tema (`BaseLayout.astro`, `CapsuleHeader.astro`, `CardGrid.astro`, `HeroUnit.astro`) kini aktif dikompilasi secara nyata oleh Astro compiler, mendukung isolasi scoped CSS dan integrasi ikon SVG modular GitHub.

### Core: fruition-mini v0.2.6
- **Halaman `Home / Overview` (Grafik Wawasan Sistem & Analitik Arsitektur)**:
  - Menjadikan halaman **Home (`#viewHome`)** sebagai state awal resmi ketika server (`node dev-server.js`) pertama kali dimulai.
  - Menampilkan 4 kartu KPI utama (Total Konten Terindeks, Pipeline Visual WebP, Status Build Produksi `dist/`, serta Cadangan `backup/` & Total Disk).
  - Menyajikan 4 panel grafik visual real-time melalui endpoint `GET /api/system-overview`:
    1. **Grafik Distribusi Konten & Media per Koleksi Fruit** (grafik batang vertikal SVG perbandingan dokumen vs kata + bar proporsi per koleksi).
    2. **Grafik Komposisi Penyimpanan & Penggunaan Disk** (*stacked allocation bar* untuk `content/`, `assets/`, `dist/`, dan `backup/`).
    3. **Grafik Topik Artikel & Rasio Kelengkapan Visual** (*SVG Donut Ring* persentase sampul WebP + distribusi kategori artikel).
    4. **Panel Wawasan Konfigurasi Tema & Kesehatan Sistem** lengkap dengan tombol pintasan cepat ke sub-tab terkait.
- **Persistensi State Admin Saat Reload Browser vs Reset Saat Server Dimulai (`SERVER_BOOT_ID`)**:
  - Ketika halaman `/admin` di-reload (refresh) di browser selama sesi server yang sama, sistem mempertahankan state terakhir pengguna tanpa kedipan (*dark mode*, *sidebar collapsed*, menu utama aktif, hingga layer & sub-tab spesifik seperti `Themes > Fruition-capsule v0.2.6 > Card Grid System`).
  - State otomatis di-reset kembali ke state awal (`Home / Overview`) hanya ketika aplikasi server (`node dev-server.js`) baru dijalankan atau di-restart (dideteksi melalui pencocokan `bootId`).

### Tema: Fruition-capsule v0.2.6
- **Integrasi Telemetri Konfigurasi Tema ke Wawasan Sistem**: Menampilkan status aktif preset warna (`Mono`, `Blue Sky`, `Candy Pop`) dan pola susunan *Card Grid* (`Classic Grid` / `Editorial Card`) secara langsung pada panel kesehatan sistem di halaman *Home* admin serta perbaikan sinkronisasi atribut global `data-theme-preset` pada dokumen pratinjau.

### Core: fruition-mini v0.2.5
- **Konsolidasi Pengaturan Identitas Brand & Variabel Footer ke Pengaturan Tema**:
  - Memindahkan **Identitas Brand Header Kapsul** (Upload Logo Brand, Ikon Brand SVG, Nama Situs + Toggle On/Off) dari menu *Navigasi* ke **Pengaturan Tema > Header & Navigation**.
  - Memindahkan **Teks Hak Cipta & Brand Footer (Sisi Kiri)** dengan format `{yyyy} Made with {heart} by headless blogs` beserta pratinjau langsung dari menu *Navigasi* ke **Pengaturan Tema > Footer & Variables** (dan menghapus duplikasi input readonly lama `[logo] -- [yyyy] Made with [heart beat]`).
  - Menu **Navigasi & Tata Letak Situs** kini lebih fokus untuk mengatur daftar tautan menu Header, Toolbar Kapsul, dan daftar tautan Footer.

### Tema: Fruition-capsule v0.2.5
- **Sentralisasi Konfigurasi Header Brand & Footer Copyright**: Seluruh pengaturan visual brand kapsul dan format teks variabel `{yyyy}` & `{heart}` pada footer kini terpusat di dalam panel Pengaturan Tema (`Fruition-capsule v0.2.5`).

### Core: fruition-mini v0.2.4
- **Persisten & Sinkronisasi Color Presets API**: Endpoint `POST /api/themes/:themeId/config` kini menyimpan properti `defaultPreset` (`Mono`, `Blue Sky`, `Candy Pop`) secara atomik ke `theme.json`.
- **Interactive Preset Selector & Live Token Inspector**: Kartu pilihan pada tab *Color Presets & Tokens* di shell admin kini interaktif saat diklik (langsung menyimpan & menyinkronkan ke preview iframe) serta menampilkan tabel inspektor variabel CSS (`--theme-primary`, `--theme-accent`, `--theme-bg`, dll.) secara *real-time*.

### Tema: Fruition-capsule v0.2.4
- **Injeksi Server-Side `data-theme-preset` Dinamis**: `scripts/theme-renderer.js` kini menginjeksikan atribut `data-theme-preset` (`mono`, `blue-sky`, `candy-pop`) sesuai `defaultPreset` yang dipilih admin ke elemen `<html>` pada seluruh halaman (beranda, arsip, artikel single, penulis, halaman statis, dan hasil build `dist/`).

### Core: fruition-mini v0.2.3
- **2 Metode Publish Terpisah (`Publish dist/` & `Publish via Git`)**:
  - **Mode 1 (`Publish dist/`)**: Membangun seluruh halaman HTML statis (beranda, arsip per fruit, artikel single, halaman statis, direktori & profil penulis), stylesheet `capsule.css`, aset media/logo/favicon, serta feed teknis (`sitemap.xml`, `rss.xml`, `robots.txt`, `llms.txt`, `feed.json`) secara nyata ke dalam folder lokal `dist/`.
  - **Mode 2 (`Publish via Git`)**: Sakelar pada menu *Settings > GitOps & GitHub Repo* untuk mengaktifkan metode kedua yang memunculkan tombol **Publish via Git** di bilah bawah guna membangun `dist/` sekaligus melakukan *commit & push* ke repositori GitHub.
  - Penghapusan tombol *Download as ZIP* dari bilah aksi bawah agar alur kerja fokus pada 2 metode publish produksi.
- **Fitur Upload Favicon Situs**: Penggantian input teks statis `Favicon (SVG) = fruit` pada *Settings > Identitas Situs & Metadata Utama* menjadi fitur **Upload Favicon** interaktif (mendukung `.ico`, `.png`, `.svg`, `.webp`) lengkap dengan kotak pratinjau dan penghapusan.
- **Sistem Backup & Restore Snapshot (`backup/`)**: Tab dan engine baru di *Settings > Backup & Restore* untuk mencadangkan seluruh isi `content/`, `theme.json`, dan `assets/` ke folder lokal `backup/`, melihat daftar riwayat snapshot beserta ukuran & jumlah berkas, serta melakukan **Restore** atau hapus snapshot kapan saja.

### Tema: Fruition-capsule v0.2.3
- **Injeksi Favicon Dinamis & Kompilasi Statis Penuh**: Seluruh halaman tema merender tag `<link rel="icon">` berdasarkan favicon kustom yang diunggah admin (atau fallback SVG vektor) dan terkompilasi utuh ke struktur direktori statis `dist/`.

### Core: fruition-mini v0.2.2
- **REST API Kolom Bertingkat Editorial**: Dukungan penyimpanan dan pemuatan konfigurasi `editorialGrid` (`tier1`, `tier2`, `tier3`, dan `pattern`) melalui endpoint `/api/themes/:themeId/config`.
- **Dynamic Conditional Theme UI**: Shell admin secara otomatis memunculkan seksi pengaturan susunan kolom bertingkat secara kondisional khusus saat mode "Editorial Card" dipilih, dan menyembunyikannya saat mode "Default Card" aktif.
- **Skema Visual Balok Grid Real-Time**: Diagram skema visual interaktif di admin panel yang memperlihatkan susunan kartu bertingkat (Hero -> Sub-featured -> Grid) secara langsung saat preset atau dropdown kolom diubah.

### Tema: Fruition-capsule v0.2.2
- **Struktur Kolom Bertingkat Editorial (1-2-4, 1-3-3, 1-2-3, 1-3-4, 1-2-2)**: Dukungan fleksibel untuk mengatur jumlah kolom baris kedua (2 atau 3 kartu) dan baris seterusnya (2, 3, atau 4 kolom grid) pada mode layout Editorial Card.
- **Responsive Media Query Card Grid**: Penyesuaian otomatis breakpoint tablet (2 kolom) dan mobile (1 kolom) yang mulus serta tipografi proporsional untuk kartu berformat 4-kolom.

### Core: fruition-mini v0.2.1
- **Variabel Dinamis `{heart}` pada Footer Copyright**: Mendukung variabel `{heart}` (dan `{heartbeat}`) pada input hak cipta footer untuk merender ikon hati SVG yang beranimasi detak (*heartbeat pulse*).
- **Selector Ikon Navigasi Menu & Footer**: Integrasi selector ikon GitHub Octicon modular di samping input label teks pada tabel Header & Footer di shell admin, lengkap dengan kotak live preview dan opsi `- Tanpa Ikon -`.
- **Live Preview Teks Hak Cipta**: Pratinjau langsung di bawah form input teks hak cipta admin yang menampilkan hasil render token `{yyyy}` dan `{heart}` secara instan saat diedit.

### Tema: Fruition-capsule v0.2.1
- **Animasi Detak Jantung Heartbeat (`{heart}`)**: Animasi CSS `@keyframes heartBeatPulse` presisi dan terpusat (`.heartbeat-pulse`) untuk token `{heart}` di footer situs.
- **Rendering Ikon Navigasi & Footer**: Navbar kapsul (`.nav-link-icon`) dan menu tautan footer (`.footer-link-icon`) merender ikon SVG Octicon pilihan admin secara dinamis di samping label menu.

### Core: fruition-mini v0.2.0
- **Icon Pack GitHub (Modular SVG)**: Pustaka ikon SVG modular bergaya GitHub Octicons (`src/icons/github-icons.js` & `admin/scripts/github-icons.js`) yang menggantikan seluruh emoji antarmuka sistem di shell admin secara seragam di semua sistem operasi.
- **Multi-Fruit Author Relations**: Halaman penulis (`/authors/[author-name]`) kini mendeteksi dan menampilkan seluruh artikel dari berbagai post-type/database Notion secara agregat.
- **REST API Theme Configuration**: Endpoint backend baru (`GET & POST /api/themes/:themeId/config`) untuk membaca dan menyimpan setelan tema secara atomik ke `theme.json`.
- **Dropdown Lacak Otomatis URL Internal**: Form input URL pada konfigurasi Header dan Footer kini dilengkapi dropdown pelacak otomatis rute, halaman, dan arsip yang ada.
- **Urutan Navigasi (Reorder Item)**: Fitur pengurutan posisi tautan navigasi (tombol naik/turun) untuk tata letak menu header dan footer.
- **Kontrol Toggle Nama Situs**: Tombol *toggle* sakelar untuk menampilkan atau menyembunyikan judul situs pada navbar secara independen dari logo brand.
- **Manajemen Upload Logo Brand**: Dukungan unggah logo kustom pada identitas brand navbar dengan pratinjau instan.
- **Kontrol Status Aktif Tautan Menu**: Pilihan status aktif (`active state`) tautan navbar kini ditentukan secara manual oleh admin dan tidak lagi aktif otomatis.

### Tema: Fruition-capsule v0.2.0
- **Integrasi Icon Pack GitHub**: Menggantikan emoji antarmuka pada kontrol UI tema (tombol dark mode, open admin, printer, footer copyright heart, serta brand identity fallback) dengan ikon vektor SVG yang tajam tanpa menyentuh emoji pada isi konten artikel.
- **Mode Tata Letak Kartu Fungsional**: Pilihan antara layout simetris (*Default Card*) dan layout artikel utama masif (*Editorial Card / Hero Card*) kini berfungsi nyata pada tampilan publik.
- **Distribusi Kolom Responsif Ditentukan Admin**: Pengaturan jumlah kolom responsif untuk SM (Mobile $\le$ 767px), MD (Tablet 768–1023px), dan LG (Desktop $\ge$ 1024px) yang langsung memengaruhi CSS Grid Variables.
- **Palet Visual Swatch untuk Fallback Color**: Penggantian dropdown teks biasa di modal fruit dengan 5 lingkaran swatch warna pastel visual (Blossom, Mint, Periwinkle, Peach, Lilac) yang dilengkapi indikator aktif dan badge warna.
- **Pembersihan Pengaturan Tema**: Penghapusan seksi palet fallback statis dari tema card grid karena warna telah didelegasikan langsung ke tingkat Fruit.
- **Perbaikan Kode Blok Notion**: Penyesuaian CSS wrapper code block Notion untuk mencegah luapan horizontal teks/kode dan menyelaraskan rendering visual dengan standar web modern.
- **Floating Single-Capsule Header**: Pemutakhiran navbar kaca melayang (*glassmorphic capsule*) dengan dukungan pencarian modal, toggle dark mode, dan breadcrumbs dinamis.
