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
}
copy "$P/eksi2048/www" eksi2048
copy "$P/birim-top/www" orbitwise
copy "$P/hedef/www" hedef
find oyna -name '.DS_Store' -delete
du -sh oyna/*
