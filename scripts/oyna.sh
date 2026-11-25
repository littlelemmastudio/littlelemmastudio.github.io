#!/bin/sh
# Arkadaşlara gösterilecek tarayıcı sürümleri: oyunların www/ klasörlerini /oyna/<ad>/ altına kopyalar.
# Sayfalar dizine eklenmez (noindex), sitede bağlantı verilmez. Kullanım: sh scripts/oyna.sh  (sonra commit + push, sahibin onayıyla)
set -e
cd "$(dirname "$0")/.."
P=~/Projects
copy() { # $1 kaynak www, $2 hedef ad
  rm -rf "oyna/$2"; mkdir -p "oyna/$2"; cp -R "$1/." "oyna/$2/"
  f="oyna/$2/index.html"
  grep -q 'name="robots"' "$f" || sed -i '' 's#<head>#<head>\n<meta name="robots" content="noindex, nofollow">#' "$f"
  grep -q 'All rights reserved' "$f" || sed -i '' 's#<head>#<head>\n<!-- Copyright (c) 2026 Taha Emre Kurt (Little Lemma). All rights reserved. Not licensed for reuse. -->#' "$f"
}
copy "$P/eksi2048/www" eksi2048
copy "$P/birim-top/www" orbitwise
copy "$P/hedefivur/www" hedefivur
copy "$P/katlama/www" foldandcut
copy "$P/permutation/www" uretec
cp "$P/hedefivur/assets/icon.svg" oyna/hedefivur/oyna-icon.svg
cp "$P/katlama/assets/icon.svg" oyna/foldandcut/oyna-icon.svg
# Bütün seviyeler açık (yalnız bu kopyalarda; oyunların kendi kodu değişmez)
for g in foldandcut uretec; do
  sed -E -i '' 's#^(const|let) UNLOCK_ALL = .*#let UNLOCK_ALL = true; // /oyna/ kopyası#' "oyna/$g/index.html"
  grep -q "UNLOCK_ALL = true; // /oyna/" "oyna/$g/index.html" || { echo "UNLOCK_ALL bulunamadı: $g"; exit 1; }
done
find oyna -name '.DS_Store' -delete
du -sh oyna/*
