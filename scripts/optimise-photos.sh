#!/usr/bin/env bash
# Rebuilds every photo in images/ from a folder of originals.
#
#   ./scripts/optimise-photos.sh ~/path/to/originals
#
# The originals are the full-size files from the JustRent Marbella listing
# (see README, "Facts, and where they came from"); they are deliberately not
# committed. Re-run this whenever a photo is replaced so the whole set keeps
# one look and one compression standard.
#
# Needs: sips (macOS), and `brew install imagemagick webp`.
set -euo pipefail

SRC="${1:?usage: optimise-photos.sh <source-photo-dir>}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/images"
mkdir -p "$DEST"

# The photographs came off the camera flat — shot in hard Andalusian sun, which
# washes the water out. These grades put back what the eye sees standing there:
# saturation and a little contrast, plus a nudge on blue so the pool reads as
# turquoise rather than grey-green. Whites are left alone (saturation does not
# touch neutrals), so the walls stay white and nothing looks retouched.
OUTDOOR="-modulate 103,124,100 -sigmoidal-contrast 2.5x48% -channel B -evaluate multiply 1.05 +channel"
# Interiors are already well lit and full of white surfaces; they get contrast
# only. Pushing saturation here would tint the walls and betray the room.
INTERIOR="-modulate 102,108,100 -sigmoidal-contrast 1.5x50%"

# Emit one graded JPEG at a given width, plus its WebP sibling.
# usage: variant <source> <out-basename> <width> <jpeg-quality> <grade>
# The grade is deliberately unquoted below: it is a list of magick flags, not
# one argument. macOS ships bash 3.2, which has no namerefs to pass it cleanly.
variant() {
  src="$1"; out="$2"; width="$3"; quality="$4"; grade="$5"
  # shellcheck disable=SC2086
  magick "$SRC/$src" $grade -resize "${width}x" -quality "$quality" "$DEST/$out.jpg"
  cwebp -quiet -q 72 "$DEST/$out.jpg" -o "$DEST/$out.webp"
  echo "  $out  (${width}w)"
}

echo "Hero (photo-33) — the whole property, house and water in one frame"
variant photo-33.jpg hero-pool          1300 58 "$OUTDOOR"
variant photo-33.jpg hero-pool-900       900 60 "$OUTDOOR"
# Portrait screens get their own crop; see README. Height first in sips -c.
magick "$SRC/photo-33.jpg" $OUTDOOR -quality 66 "$DEST/hero-pool-portrait.jpg"
sips -c 900 700 "$DEST/hero-pool-portrait.jpg" >/dev/null
cwebp -quiet -q 74 "$DEST/hero-pool-portrait.jpg" -o "$DEST/hero-pool-portrait.webp"
echo "  hero-pool-portrait  (700x900 crop)"

echo "Social share card — 1200x630, cropped from the hero frame"
magick "$SRC/photo-33.jpg" $OUTDOOR -resize 1200x -gravity center \
  -crop 1200x630+0+0 +repage -quality 65 "$DEST/og-image.jpg"
echo "  og-image  (1200x630)"

echo "Story"
variant photo-34.jpg story-pool-terrace      1000 62 "$OUTDOOR"
variant photo-34.jpg story-pool-terrace-800   800 62 "$OUTDOOR"
variant photo-01.jpg story-living-kitchen    1000 62 "$INTERIOR"
variant photo-01.jpg story-living-kitchen-800 800 62 "$INTERIOR"
variant photo-14.jpg story-garden-bbq        1000 62 "$OUTDOOR"
variant photo-14.jpg story-garden-bbq-800     800 62 "$OUTDOOR"

echo "Gallery"
variant photo-35.jpg gallery-pool        700 60 "$OUTDOOR"
variant photo-18.jpg gallery-living-room 700 60 "$INTERIOR"
variant photo-20.jpg gallery-kitchen     700 60 "$INTERIOR"
variant photo-16.jpg gallery-garden      700 60 "$OUTDOOR"
variant photo-03.jpg gallery-bedroom     700 60 "$INTERIOR"
variant photo-12.jpg gallery-terrace     700 60 "$OUTDOOR"

echo
echo "Done. Check the hero at a phone size before committing —"
echo "the scrim in .hero__scrim is tuned against this exposure."
