#!/bin/sh
# Render a diagram source to a 1600x900 card thumbnail on a white background.
# Usage: diagrams/build.sh thumb-spde   (run from landing/)
set -e
name="$1"
dir=$(mktemp -d)
pdflatex -interaction=nonstopmode -halt-on-error -output-directory "$dir" "diagrams/$name.tex" >/dev/null
pdftoppm -png -r 600 -singlefile "$dir/$name.pdf" "$dir/$name"
python3 - "$dir/$name.png" "public/thumbs/$name.png" <<'EOF'
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
W, H = 1600, 900
s = min(W / im.width, H / im.height)
im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
out = Image.new("RGB", (W, H), "white")
out.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
out.save(dst, optimize=True)
EOF
rm -rf "$dir"
echo "wrote public/thumbs/$name.png"
