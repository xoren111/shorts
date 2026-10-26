"""Download / crop the archive photos listed in photos_manifest.py into public/photos and write credits.jsonl.

Usage (run with a Python that has Pillow + PyMuPDF, isolated mode):
  python -I tools/build_photos.py <stage_dir> <usgs_gip_1976_report.pdf>
Downloads go through curl with a descriptive User-Agent. Commons licenses are verified per file via the
API (extmetadata LicenseShortName) and anything outside PD / CC0 / CC BY / CC BY-SA aborts the build."""
import json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import commons_meta  # noqa: E402
import photos_manifest as M  # noqa: E402
from PIL import Image, ImageFilter  # noqa: E402

UA = "AtlasApeShort/1.0 (educational YouTube Short; no contact)"
OUT = os.path.join(os.path.dirname(HERE), "public", "photos")
ALLOWED = re.compile(r"^(public domain|pd\b.*|cc0.*|cc[ -]by(-sa)?[ -]?\d.*)$", re.I)
NARA_BOX = {  # print area inside the mount card (refine_edges.py, then inset 8 px)
    "File:Hawaii - Mauna Loa - NARA - 23937849.jpg": (406, 448, 3996, 3281),
    "File:Hawaii - Mauna Loa - NARA - 23937857.jpg": (458, 478, 4027, 3209),
    "File:Hawaii - Hilo - NARA - 23937293.jpg": (461, 465, 3992, 3248),
}


def curl(url, dest):
    subprocess.run(["curl", "-sSfL", "--retry", "3", "-A", UA, "-o", dest, url], check=True)


def clean_url(u):
    return u.split("?")[0] if u else u


def save_jpeg(im, path, q=92):
    im.convert("RGB").save(path, "JPEG", quality=q, optimize=True)


def main(stage, gip_pdf):
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(stage, exist_ok=True)
    credits = []
    pdf = None
    for it in M.ITEMS:
        dest = os.path.join(OUT, it["file"])
        rec = {"file": it["file"], "need": it["need"]}
        if it["src"] == "commons":
            m = commons_meta.meta([it["title"]])[0]
            lic = m["license"]
            if not ALLOWED.match(lic.strip()):
                raise SystemExit(f"license not allowed for {it['title']}: {lic!r}")
            url = clean_url(m["url"])
            want = it.get("width")
            if want and m["width"] > want:
                q = commons_meta.get({"action": "query", "titles": it["title"], "prop": "imageinfo",
                                      "iiprop": "url", "iiurlwidth": want})
                url = clean_url(list(q["query"]["pages"].values())[0]["imageinfo"][0]["thumburl"])
            raw = os.path.join(stage, it["file"] + ".raw")
            if not os.path.exists(raw):
                curl(url, raw)
            if it.get("nara_crop"):
                l, t, r, b = NARA_BOX[it["title"]]
                save_jpeg(Image.open(raw).crop((l + 8, t + 8, r - 8, b - 8)), dest)
            else:
                Image.open(raw).verify()
                shutil.copyfile(raw, dest)
            rec.update(title=it["title"].replace("File:", ""),
                       author=it.get("author") or m["artist"].split("\n")[0].strip() or "not given",
                       license=lic, license_url=it.get("license_url") or m["license_url"] or "",
                       source_url=m["page"], original_url=url)
        elif it["src"] == "url":
            raw = os.path.join(stage, it["file"] + ".raw")
            if not os.path.exists(raw):
                curl(it["url"], raw)
            Image.open(raw).verify()
            shutil.copyfile(raw, dest)
            rec.update(title=it["title"], author=it["author"], license=it["license"],
                       license_url=it["license_url"], source_url=it["page_url"], original_url=it["url"])
        elif it["src"] == "booklet":
            import pymupdf
            if pdf is None:
                pdf = pymupdf.open(gip_pdf)
            page = pdf[it["page"] - 1]
            xref = page.get_images(full=True)[0][0]
            pix = pymupdf.Pixmap(pdf, xref)
            if pix.n > 3:
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            png = os.path.join(stage, f"gip76_p{it['page']}.png")
            pix.save(png)
            im = Image.open(png).crop(it["box"]).filter(ImageFilter.GaussianBlur(0.9))
            save_jpeg(im, dest)
            rec.update(title=it["title"] + f" (USGS booklet INF-75-22, 1976, p. {it['page']})",
                       author=M.GIP_AUTHOR, license="Public domain (U.S. federal government work, USGS)",
                       license_url=M.PD_US, source_url=M.USGS_GIP_PAGE,
                       original_url=M.USGS_GIP_PDF + f"#page={it['page']}")
        with Image.open(dest) as im:
            w, h = im.size
        rec.update(date=it["date"], place=it["place"], description=it["description"], width=w, height=h)
        note = " ".join(x for x in [M.GIP_NOTE if it["src"] == "booklet" else "", it.get("note", "")] if x)
        if note:
            rec["note"] = note
        if it.get("crop_hint"):
            rec["crop_hint"] = it["crop_hint"]
        credits.append(rec)
        print(f"{it['file']:40s} {w}x{h}  {rec['license']}")
    with open(os.path.join(OUT, "credits.jsonl"), "w", encoding="utf-8") as f:
        for r in credits:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print(len(credits), "files ->", OUT)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
