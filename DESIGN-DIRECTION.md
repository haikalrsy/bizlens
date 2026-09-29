# BizLens — Creative Direction & Experience Design (v4.0)

Dokumen ini ditulis **sebelum** satu baris kode dibuat. Ini adalah keputusan desain, bukan dokumentasi kode.

---

## 1. Premis

BizLens bukan landing page. BizLens adalah **editorial interactive experience**: pembaca masuk ke sebuah cerita tentang kegagalan bisnis kecil, melihat data berbicara, mencoba simulasi sendiri, lalu percaya.

Tagline yang tidak pernah berubah:
> Bangun Bisnis Lebih Cerdas dengan Data, Bukan Tebakan.

Perasaan yang dituju: **tenang, mahal, yakin.** Bukan ramai, bukan neon, bukan startup template.

---

## 2. Palet & material

| Token | Nilai | Peran |
|---|---|---|
| `--cream` | `#FFFDF0` | Kertas. Dasar seluruh halaman. |
| `--ink` | `#384B70` | Tinta. Heading, body, garis. |
| `--accent` | `#0F4C75` | Aksen. Data, angka hidup, CTA. |

Aturan material:
- Tidak ada warna lain. Variasi hanya lewat **opacity, tint di atas cream, blur, dan elevasi bayangan sangat lembut**.
- Tint ladder: `ink 4% / 8% / 12% / 20% / 40% / 64%` — dipakai untuk hairline, surface, muted text.
- Glass = `background: cream 60–72%` + `backdrop-filter: blur(20px) saturate(120%)` + hairline `ink 10%`.
- Glow = radial `accent 8%` blur besar, tidak pernah terlihat sebagai lingkaran tegas.
- Shadow selalu berwarna ink, bukan hitam: `0 24px 60px rgba(56,75,112,.10)`.

---

## 3. Hirarki tipografi

Dua font saja.
- **Display**: serif editorial (Fraunces/Instrument Serif style) — hanya untuk headline besar dan angka raksasa. Memberi rasa majalah.
- **Text**: grotesk netral (Inter) — nav, body, UI dashboard, label.

Skala (fluid, `clamp`):

| Level | Ukuran | Pemakaian |
|---|---|---|
| Colossal | 88–200px | angka statistik (`64%`), hero |
| Display | 48–92px | judul section |
| Lead | 20–26px | paragraf pembuka, satu per section |
| Body | 16–17px | teks isi, max 62ch |
| Micro | 11–12px, tracking .18em, uppercase | eyebrow / label section |

Line-height lega: 1.05 untuk display, 1.7 untuk body. Bold dipakai sangat hemat — hirarki dibangun oleh **ukuran dan ruang**, bukan berat huruf.

---

## 4. Ritme whitespace

- Section padding vertikal: `clamp(120px, 16vh, 220px)`. Section "pernafasan" (angka besar) lebih longgar lagi.
- Grid 12 kolom, gutter 32px, max-width 1280px; blok teks tidak pernah lebih lebar dari 7 kolom.
- Target: ≥40% area layar kosong pada setiap viewport. Setiap section maksimal **satu** ide.
- Ritme padat→lega diselang-seling agar scroll terasa bernafas: `padat, lega, sangat lega, padat, lega…`

---

## 5. Ritme scroll (scrollytelling)

Halaman dibaca sebagai film 11 scene. Dashboard adalah **aktor tetap**: ia pinned di layar selama Scene 02–07 dan isinya berubah mengikuti narasi, sehingga pengguna tidak merasa berpindah section.

| Scene | Cerita | Perilaku dashboard | Layout |
|---|---|---|---|
| 01 | Pembukaan, tagline | blur → tajam, chart menggambar, counter jalan | teks tengah, dashboard di bawah |
| 02 | "Data Anda sudah bicara" | membesar jadi fokus, Health Score naik | pinned, full |
| 03 | **64% UMKM gagal berkembang** | mengecil, jadi background pucat | tipografi memenuhi layar |
| 04 | BizLens sebagai solusi | kembali, chart berubah naik, background lebih terang | teks kiri / dashboard kanan |
| 05 | Simulasi What-if | slider mengubah dashboard realtime | kontrol kiri / dashboard kanan |
| 06 | Cermin Bisnis AI | panel AI mengetik analisis | glass panel di atas dashboard |
| 07 | Business Health Score | gauge bergerak, ROI & BEP terhitung | dashboard sempit + angka besar |
| 08 | Feature story | dashboard dilepas | blok editorial bergantian kiri/kanan |
| 09 | Case study | — | visual besar, teks kecil |
| 10 | Testimonial | — | stack card glass yang mengembang saat scroll |
| 11 | CTA + Footer | dashboard mini | headline besar, satu tombol |

Setiap scene punya **layout berbeda** — tidak ada dua section dengan komposisi sama.

---

## 6. Motion

Vanilla JS saja: `IntersectionObserver` untuk reveal, `requestAnimationFrame` untuk counter/chart/scroll progress, CSS variables sebagai jembatan JS→CSS.

- Properti yang dianimasikan hanya `transform`, `opacity`, `filter`, `clip-path`.
- Easing `ease-in-out` (cubic-bezier .4,0,.2,1). Durasi 200/300/500ms, **tidak pernah >700ms**.
- Reveal: `translateY(28px) + opacity 0 → 0`, stagger 60ms.
- Microinteraction: tilt kartu, refleksi glass mengikuti mouse, ripple tombol, chart draw via `stroke-dashoffset`, counter easing, parallax halus, cahaya mengambang, progress line di navbar.
- `prefers-reduced-motion` mematikan semua transform dan langsung menampilkan state akhir.

---

## 7. Dashboard sebagai produk

Dashboard bukan gambar — ia dirender sebagai DOM/SVG dan hidup: Business Health Score (gauge), revenue chart, cash flow bar, ROI, BEP, Business Projection, Business Risk, Recommendation, Cermin Bisnis AI, Export PDF, Business Report. Angka-angka berasal dari satu state model yang sama yang dipakai What-if Simulator, sehingga slider benar-benar mengubah seluruh dashboard tanpa reload.

---

## 8. Kriteria selesai

1. Tidak ada warna di luar tiga token.
2. Tidak ada dua section dengan layout identik.
3. Dashboard tetap di layar melintasi ≥4 scene dengan isi berubah.
4. Slider mengubah score, chart, ROI, BEP, proyeksi, dan teks AI secara realtime.
5. Setiap animasi ≤700ms, halus, tidak mengganggu pembacaan.
6. Responsif: scrollytelling turun jadi urutan linear yang tetap elegan di mobile.
