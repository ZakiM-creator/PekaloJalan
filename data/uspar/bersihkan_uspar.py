#!/usr/bin/env python3
"""
Pembersih data USPAR Kota Pekalongan -> file siap impor Firestore (koleksi "places").

Hanya memakai pustaka bawaan Python 3.8+ (tanpa pip install).

Cara pakai (dari folder berisi file ini):
    python bersihkan_uspar.py "Data USPAR KOTA PEKALONGAN 2026-10-09 06_50_57new.csv"

Opsi:
    --keluar FOLDER      folder hasil (bawaan: ./hasil)
    --tanpa-telepon      jangan ikutkan nomor telepon sama sekali

Hasil:
    places_uspar.json        data siap impor (satu objek per tempat, id = uspar-001, dst)
    perlu_dicek.csv         daftar masalah data yang perlu dilihat manusia
    kandidat_unggulan.csv   50 tempat paling lengkap, untuk dilengkapi foto dan jam buka dulu
    laporan.txt             ringkasan angka (untuk validasi)
"""
import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

SUMBER = "USPAR Kota Pekalongan, per 9 Oktober 2026"
KOSONG = {"", "-", "--", "0", "o", "O", "nan", "none", "null"}

# Batas wajar koordinat Kota Pekalongan (dipakai untuk memeriksa hasil perbaikan)
LAT_MIN, LAT_MAX = -7.00, -6.80
LON_MIN, LON_MAX = 109.55, 109.80

# Gambar bawaan yang sama dengan yang dipakai PlaceCard.jsx saat foto gagal dimuat
GAMBAR_BAWAAN = ("https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb"
                 "?q=80&w=800&auto=format&fit=crop")


# Tempat USPAR yang sama dengan data contoh aplikasi (INITIAL_PLACES di mockPlaces.js).
# Versi contoh dipertahankan (lebih lengkap), versi USPAR dilewati agar tidak muncul dua kali.
# Dicocokkan manual lewat nama dan alamat. Format: nomor USPAR -> id tempat contoh.
GANDA_DENGAN_CONTOH = {
    137: "place-1",   # Museum Batik Pekalongan (Jl. Jetayu)
    156: "place-2",   # Pantai Pasir Kencana (Jl. Pantai Sari)
    104: "place-3",   # Kampung wisata batik Pesindon (Pesindon Gg. 2 No. 12)
    160: "place-4",   # Pekalongan Mangrove Park (Kandang Panjang)
    92: "place-9",    # Hotel Santika Pekalongan (Jl. Gajah Mada)
    141: "place-10",  # Namira Syariah (Jl. Dr. Cipto No. 70)
    118: "place-16",  # Makam Habib Ahmad bin Thalib Alatas (Sapuro)
    # Tiga berikut kecocokannya kurang pasti, tetapi diputuskan pemilik proyek untuk digabung:
    108: "place-11",  # Kawasan Budaya Jetayu
    28: "place-17",   # Bang Dul (Soto Tauto Bang Dul, Jl. Dr. Sutomo)
    14: "place-7",    # Ayam Bakar Selaras (RM Selaras, Jl. Sriwijaya)
}


def kosong(v):
    return v is None or str(v).strip() in KOSONG


def bersih_teks(v):
    if kosong(v):
        return ""
    s = str(v).replace('"', "").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def judul(s):
    """Ubah HURUF BESAR jadi huruf judul, singkatan umum tetap benar."""
    s = bersih_teks(s)
    if not s:
        return s
    if s.isupper() or s.islower():
        s = s.title()
        for a, b in (("Cv.", "CV."), ("Cv ", "CV "), ("Pt.", "PT."), ("Pt ", "PT "),
                     ("Po.", "PO."), ("Po ", "PO "), ("Rm ", "RM "), ("Rs ", "RS ")):
            s = s.replace(a, b)
    return s


def perbaiki_koordinat(teks, panjang_bulat):
    """
    Excel versi Indonesia menyisipkan titik ribuan: -6.906.137.141.638.280.
    Perbaikan: buang semua titik, lalu sisipkan titik desimal setelah
    `panjang_bulat` digit (lintang: 1 digit -> -6.xxx, bujur: 3 digit -> 109.xxx).
    """
    if kosong(teks):
        return None
    s = str(teks).strip()
    negatif = s.startswith("-")
    digit = re.sub(r"\D", "", s)
    if len(digit) <= panjang_bulat:
        return None
    nilai = round(float(digit[:panjang_bulat] + "." + digit[panjang_bulat:]), 7)
    return -nilai if negatif else nilai


def normalisasi_telepon(*kandidat):
    for v in kandidat:
        if kosong(v):
            continue
        d = re.sub(r"\D", "", str(v))
        if len(d) < 7:
            continue
        if d.startswith("62"):
            d = "0" + d[2:]
        elif not d.startswith("0"):
            d = "0" + d
        return d
    return ""


def website_valid(v):
    if kosong(v):
        return ""
    s = str(v).strip()
    # alamat portal dinas dipakai sebagai isian umum, bukan situs usaha
    if "tourism.pekalongankota.go.id" in s:
        return ""
    if re.match(r"^(https?://|www\.)\S+\.\S+", s, re.I):
        return s if s.lower().startswith("http") else "https://" + s
    return ""


def pecah(v):
    """'a;b;c' -> ['a','b','c'] tanpa isian kosong."""
    if kosong(v):
        return []
    return [p.strip() for p in str(v).split(";") if not kosong(p)]


def angka(v):
    try:
        return int(float(str(v).strip()))
    except (ValueError, TypeError):
        return 0


def rupiah(n):
    return "Rp " + f"{n:,}".replace(",", ".")


def petakan_kategori(kat, sub, nama, deskripsi):
    """Kembalikan id kategori aplikasi PekaloJalan."""
    n = nama.lower()
    d = deskripsi.lower()
    sub_l = sub.lower()
    if kat == "Makanan & Minuman":
        if sub in ("Rumah Minum atau Kafe", "Kedai Minuman"):
            return "cafe"
        if re.search(r"kaki lima|angkringan|gerobak|lesehan", n + " " + d):
            return "street-food"
        return "resto"
    if kat == "Akomodasi":
        return "penginapan"
    if kat in ("Hiburan & Rekreasi",):
        return "hiburan"
    if kat == "SPA":
        return "hiburan"
    if kat == "Daya Tarik Wisata":
        if re.search(r"makam|kanzus|masjid|ziarah", n):
            return "religi"
        if "batik" in n and "museum" not in n:
            return "oleh-oleh"
        return "wisata"
    if kat in ("Wisata Tirta", "Kawasan Pariwisata"):
        return "wisata"
    if kat in ("Perjalanan Wisata", "MICE", "Transportasi Wisata",
               "Jasa Pramuwisata", "Informasi Pariwisata"):
        return "layanan"
    return "layanan"


def baca_csv(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        baris = list(csv.reader(f, delimiter=";"))
    idx = next((i for i, r in enumerate(baris) if r and r[0].strip() == "NO"), None)
    if idx is None:
        sys.exit("Baris judul kolom (diawali 'NO') tidak ditemukan. Cek file CSV.")
    header = [h.strip().lower() for h in baris[idx]]
    data = []
    for r in baris[idx + 1:]:
        if r and r[0].strip().isdigit() and len(r) >= len(header):
            data.append(dict(zip(header, r)))
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv_path")
    ap.add_argument("--keluar", default="hasil")
    ap.add_argument("--tanpa-telepon", action="store_true")
    a = ap.parse_args()

    mentah = baca_csv(a.csv_path)
    keluar = Path(a.keluar)
    keluar.mkdir(parents=True, exist_ok=True)

    masalah = []  # (no, nama, jenis, keterangan)
    hasil = []
    terlihat = {}  # kunci duplikat -> id

    for r in mentah:
        no = int(r["no"])
        nama = judul(r["nama"])
        if no in GANDA_DENGAN_CONTOH:
            masalah.append((no, nama, "sama-dengan-contoh",
                            f"dilewati, memakai versi contoh {GANDA_DENGAN_CONTOH[no]}"))
            continue
        sub = bersih_teks(r["sub kategori"])
        sub = "MICE" if sub.lower() == "mice" else sub
        kat = bersih_teks(r["kategori"])
        kec = judul(r["kecamatan"])
        kel = judul(r["kelurahan"])

        lat = perbaiki_koordinat(r["latitude"], 1)
        lon = perbaiki_koordinat(r["longitude"], 3)
        if lat is None or lon is None or not (LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX):
            masalah.append((no, nama, "koordinat", f"tidak wajar atau kosong: {r['latitude']} / {r['longitude']}"))
            lat = lon = None

        desk_asli = bersih_teks(r["deskripsi"])
        lokasi = ", ".join(x for x in (f"Kel. {kel}" if kel else "", f"Kec. {kec}" if kec else "", "Kota Pekalongan") if x)
        if len(desk_asli) >= 40:
            deskripsi, desk_sumber = desk_asli, "uspar"
        elif desk_asli:
            deskripsi = f"{desk_asli.rstrip('.')}. {sub or kat} di {lokasi}."
            desk_sumber = "gabungan"
        else:
            deskripsi = f"{sub or kat} di {lokasi}."
            desk_sumber = "dibuat-otomatis"
        if desk_sumber != "uspar":
            masalah.append((no, nama, "deskripsi", f"singkat/kosong ({desk_sumber}), perlu ditulis ulang"))

        alamat = bersih_teks(r["alamat"])
        if not alamat:
            alamat = lokasi
            masalah.append((no, nama, "alamat", "kosong, diisi dari kelurahan dan kecamatan"))

        kategori = petakan_kategori(kat, sub, nama, desk_asli)

        # Harga hanya ada untuk sebagian akomodasi: "min;maks"
        harga = [angka(x) for x in pecah(r["harga"])]
        harga = [h for h in harga if h > 0]
        if harga:
            lo, hi = min(harga), max(harga)
            price_range = f"{rupiah(lo)} - {rupiah(hi)} / malam" if hi != lo else f"{rupiah(lo)} / malam"
            biaya, harga_ada = lo, True
        else:
            price_range, biaya, harga_ada = "Harga belum tersedia", 0, False

        kamar = [angka(x) for x in pecah(r["kamar"])]
        fasilitas = [bersih_teks(x) for x in re.split(r"[,;]", r["fasilitas"]) if not kosong(x)]
        fasilitas = [x for x in fasilitas if x]

        pribadi = sub == "Pondok Wisata"
        telepon = ""
        if not a.tanpa_telepon and not pribadi:
            telepon = normalisasi_telepon(r["handphone"], r["telepon"])
        web = website_valid(r["website"])

        punya_foto = r["ada gambar"].strip().lower() == "ada"
        izin = r["tdup"].strip().lower() == "berizin"
        sertif = r["sertifikasi"].strip().lower() == "bersertifikasi"

        # Skor kelengkapan 0-100 (untuk panel pengelola dan memilih tempat unggulan)
        poin = {
            "deskripsi": 25 if desk_sumber == "uspar" else 0,
            "alamat": 10 if not kosong(r["alamat"]) else 0,
            "koordinat": 15 if lat is not None else 0,
            "foto": 20 if punya_foto else 0,
            "kontak": 10 if telepon or web else 0,
            "fasilitas": 10 if fasilitas else 0,
            "harga": 10 if (harga_ada or kategori != "penginapan") else 0,
        }
        kelengkapan = sum(poin.values())

        url_peta = (f"https://www.google.com/maps/search/?api=1&query={lat:.6f},{lon:.6f}"
                    if lat is not None else
                    f"https://www.google.com/maps/search/?api=1&query={nama.replace(' ', '+')}+Pekalongan")

        tag = [t for t in (sub, kec.title() if kec else "") if t]

        item = {
            "id": f"uspar-{no:03d}",
            "name": nama,
            "category": kategori,
            "description": deskripsi,
            "address": alamat,
            "locationMapUrl": url_peta,
            "image": GAMBAR_BAWAAN,
            "rating": 0,
            "reviewsCount": 0,
            "priceRange": price_range,
            "estimatedCost": biaya,
            "openingHours": "Jam buka belum tersedia",
            "facilities": fasilitas,
            "tags": tag,
            "featured": False,
            "managerEmail": "",
            # Kolom tambahan dari USPAR (aman: aturan Firestore tidak membatasi kolom)
            "latitude": lat,
            "longitude": lon,
            "kecamatan": kec,
            "kelurahan": kel,
            "subKategori": sub,
            "kategoriAsli": kat,
            "izinTdup": izin,
            "bersertifikasi": sertif,
            "telepon": telepon,
            "website": web,
            "jumlahKamar": kamar[0] if (kategori == "penginapan" and kamar) else 0,
            "hargaTersedia": harga_ada,
            "fotoAsli": False,
            "penandaFotoUspar": punya_foto,
            "sumberDeskripsi": desk_sumber,
            "kelengkapan": kelengkapan,
            "sumberData": SUMBER,
            "statusData": "belum-dikurasi",
        }

        # Deteksi data ganda: nama (tanpa tanda baca) + titik koordinat yang sama
        norm = re.sub(r"[^a-z0-9]", "", nama.lower())
        kunci = (norm, round(lat, 4) if lat is not None else None)
        if kunci in terlihat and lat is not None:
            masalah.append((no, nama, "ganda", f"sama dengan {terlihat[kunci]}, dilewati"))
            continue
        terlihat[kunci] = item["id"]
        hasil.append(item)

    # Nama sama tetapi lokasi berbeda (cabang): tambahkan kelurahan agar mudah dibedakan
    hitung = Counter(h["name"].lower() for h in hasil)
    dipakai = Counter()
    for h in hasil:
        if hitung[h["name"].lower()] > 1:
            asli = h["name"]
            h["name"] = f"{asli} ({h['kelurahan'].title()})" if h["kelurahan"] else asli
            dipakai[h["name"].lower()] += 1
            if dipakai[h["name"].lower()] > 1:  # kelurahan sama juga: beri nomor
                h["name"] += f" {dipakai[h['name'].lower()]}"
            masalah.append((int(h["id"][-3:]), asli, "nama-sama", f"cabang? nama diubah menjadi: {h['name']}"))

    # Tulis hasil
    (keluar / "places_uspar.json").write_text(
        json.dumps(hasil, ensure_ascii=False, indent=2), encoding="utf-8")

    with open(keluar / "perlu_dicek.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["no_uspar", "nama", "jenis_masalah", "keterangan"])
        w.writerows(sorted(masalah))

    unggulan = sorted(
        (h for h in hasil if h["category"] in ("wisata", "religi", "oleh-oleh", "penginapan", "cafe", "resto", "hiburan")),
        key=lambda h: (-h["kelengkapan"], h["name"]))[:50]
    with open(keluar / "kandidat_unggulan.csv", "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["id", "nama", "kategori", "kecamatan", "kelengkapan", "perlu_dilengkapi"])
        for h in unggulan:
            kurang = ["foto asli", "jam buka", "rating"]
            if h["sumberDeskripsi"] != "uspar":
                kurang.insert(0, "deskripsi")
            w.writerow([h["id"], h["name"], h["category"], h["kecamatan"], h["kelengkapan"], ", ".join(kurang)])

    # Laporan angka untuk validasi manual
    kat_c = Counter(h["category"] for h in hasil)
    jenis_c = Counter(m[2] for m in masalah)
    lap = [
        f"Sumber        : {SUMBER}",
        f"Baris mentah  : {len(mentah)}",
        f"Baris hasil   : {len(hasil)}",
        f"Dilewati ganda: {jenis_c.get('ganda', 0)}",
        f"Dilewati karena sama dengan data contoh: {jenis_c.get('sama-dengan-contoh', 0)}",
        f"Koordinat valid: {sum(1 for h in hasil if h['latitude'] is not None)}",
        f"Koordinat bermasalah: {jenis_c.get('koordinat', 0)}",
        "Per kategori aplikasi:",
        *[f"  {k:12s} {v}" for k, v in sorted(kat_c.items())],
        f"Deskripsi asli USPAR (>=40 huruf): {sum(1 for h in hasil if h['sumberDeskripsi']=='uspar')}",
        f"Punya telepon : {sum(1 for h in hasil if h['telepon'])}",
        f"Punya website : {sum(1 for h in hasil if h['website'])}",
        f"Berizin TDUP  : {sum(1 for h in hasil if h['izinTdup'])}",
        f"Bersertifikasi: {sum(1 for h in hasil if h['bersertifikasi'])}",
        f"Akomodasi dengan harga: {sum(1 for h in hasil if h['category']=='penginapan' and h['hargaTersedia'])}",
        f"Masalah tercatat (perlu_dicek.csv): {len(masalah)}",
    ]
    (keluar / "laporan.txt").write_text("\n".join(lap) + "\n", encoding="utf-8")
    print("\n".join(lap))


if __name__ == "__main__":
    main()
