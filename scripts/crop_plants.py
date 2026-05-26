"""
Crop per-plant hero + thumbnail images from the raw photos in yardpics/.

Each entry in CROPS maps a plant id to:
    - source: filename in yardpics/
    - box:    (left, top, right, bottom) fractional crop of the EXIF-rotated original
              (0.0–1.0). The script applies EXIF orientation, crops to this rect,
              then writes:
                  public/plants/<id>.jpg       (hero, longest side 1200)
                  public/plants/<id>-thumb.jpg (square 400x400 center-cropped)

Identifications are double-checked against PLANTS in mw-backend/yard_seed.py.
Run from anywhere:
    python3 scripts/crop_plants.py
"""
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "yardpics"
OUT = ROOT / "public" / "plants"
OUT.mkdir(parents=True, exist_ok=True)


# Fractional (left, top, right, bottom) crops on the EXIF-corrected image.
# Tuned by viewing 1280px previews of each shot.
CROPS = {
    # Big bushy plant by the brown garage door — done blooming.
    "lilac":               ("IMG_0429.jpeg", (0.08, 0.04, 0.85, 0.97)),

    # White-cream variegated foliage shrub in front bed (back of tulip shot).
    "variegated-dogwood":  ("IMG_0428.jpeg", (0.12, 0.02, 0.85, 0.52)),

    # Pink/magenta tulips along the rock retaining wall.
    "tulips":              ("IMG_0428.jpeg", (0.02, 0.55, 0.62, 0.92)),

    # Low spreading evergreen on the right side of the front bed.
    "juniper":             ("IMG_0428.jpeg", (0.50, 0.42, 1.00, 0.78)),

    # Fountain-shaped white-flowered shrub on right of front paver bed.
    "vanhouttei-spirea":   ("IMG_0432.jpeg", (0.50, 0.02, 1.00, 0.95)),

    # Tall tree-like shrub covered in flat white flower clusters.
    "nannyberry":          ("IMG_0434.jpeg", (0.10, 0.02, 0.85, 0.97)),

    # Dense bushy shrub by fence/brick patio — bluish-green leaves.
    "coralberry":          ("IMG_0433.jpeg", (0.10, 0.10, 0.82, 0.97)),

    # Big leafy shrub by the deck — Morrow's honeysuckle.
    "honeysuckle-invasive":("IMG_0439.jpeg", (0.08, 0.05, 0.80, 0.95)),

    # Hostas cascading over the stone retaining wall, several varieties visible.
    "hostas":              ("IMG_0431.jpeg", (0.18, 0.30, 0.85, 0.95)),

    # Tall plumey ferns on the shaded hillside.
    "ostrich-fern":        ("IMG_0438.jpeg", (0.00, 0.04, 0.42, 0.55)),

    # Lavender-blue carpet of moss phlox in bloom over rock wall.
    "creeping-phlox":      ("IMG_0438.jpeg", (0.20, 0.10, 0.65, 0.50)),

    # Grass-like clump in a rock pocket — chives done blooming.
    "chives":              ("IMG_0436.jpeg", (0.40, 0.10, 0.78, 0.65)),

    # Pink / cream / red wax begonias planted in the rock pocket.
    "begonias":            ("IMG_0437.jpeg", (0.08, 0.18, 0.78, 0.82)),

    # The thin grass strip and bare patch along the brick foundation.
    "lawn":                ("IMG_0440.jpeg", (0.15, 0.30, 0.85, 0.95)),

    # Wide view showing mulch beds with two shrubs and stone border.
    "mulch-beds":          ("IMG_0430.jpeg", (0.10, 0.22, 0.85, 0.85)),

    # Rock drainage channel along the brick foundation wall.
    "rock-drainage":       ("IMG_0440.jpeg", (0.32, 0.02, 1.00, 0.62)),
}


def crop_one(plant_id: str, source: str, box: tuple[float, float, float, float]) -> None:
    src_path = SRC / source
    if not src_path.exists():
        print(f"  SKIP {plant_id}: missing {source}")
        return

    im = Image.open(src_path)
    im = ImageOps.exif_transpose(im)
    w, h = im.size
    l, t, r, b = box
    crop = im.crop((int(l * w), int(t * h), int(r * w), int(b * h)))

    # Hero: longest side 1200, quality 85 JPEG
    hero = crop.copy()
    hero.thumbnail((1200, 1200), Image.LANCZOS)
    hero_path = OUT / f"{plant_id}.jpg"
    hero.save(hero_path, "JPEG", quality=85, optimize=True)

    # Thumb: center-crop to square, resize to 400x400
    cw, ch = crop.size
    side = min(cw, ch)
    lx = (cw - side) // 2
    ty = (ch - side) // 2
    thumb = crop.crop((lx, ty, lx + side, ty + side))
    thumb = thumb.resize((400, 400), Image.LANCZOS)
    thumb_path = OUT / f"{plant_id}-thumb.jpg"
    thumb.save(thumb_path, "JPEG", quality=82, optimize=True)

    print(f"  ✓ {plant_id:22s} {source} → {hero.size} hero, 400² thumb"
          f"  ({hero_path.stat().st_size//1024} KB / {thumb_path.stat().st_size//1024} KB)")


def main() -> None:
    print(f"Source: {SRC}")
    print(f"Output: {OUT}\n")
    for plant_id, (src, box) in CROPS.items():
        crop_one(plant_id, src, box)
    print(f"\nDone. {len(CROPS)} plants processed.")


if __name__ == "__main__":
    main()
