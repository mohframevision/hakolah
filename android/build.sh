#!/usr/bin/env bash
# Builds هكوله (Hakolah) into an installable APK. No Gradle, no AGP — just the
# SDK build-tools, same approach as StudyApp's android/build.sh.
#
# Unlike StudyApp, this project's path has Arabic characters + a space
# (D:\موقع ربحي\android). aapt2.exe cannot open a directory whose path
# contains non-ASCII characters at all (confirmed directly — it's not a
# quoting issue, `cygpath -w` doesn't help). So the whole build runs in a
# throwaway ASCII-only copy under /tmp, and only the final signed APK is
# copied back here.
#
# Usage: bash android/build.sh
set -euo pipefail

SDK="/d/AndroidSdk"
BT="$SDK/build-tools/34.0.0"
PLATFORM="$SDK/platforms/android-34/android.jar"
HERE="$(cd "$(dirname "$0")" && pwd)"
SAFE="/tmp/hakolah-android-build"
OUT="$SAFE/build"
APK_NAME="hakolah.apk"

rm -rf "$SAFE"
mkdir -p "$SAFE" "$OUT/classes" "$OUT/gen"
cp -r "$HERE/res" "$HERE/AndroidManifest.xml" "$HERE/src" "$SAFE/"
[ -f "$HERE/debug.keystore" ] && cp "$HERE/debug.keystore" "$SAFE/"

echo "1/6 compiling resources"
"$BT/aapt2.exe" compile --dir "$(cygpath -w "$SAFE/res")" -o "$(cygpath -w "$OUT/res.zip")"

echo "2/6 linking manifest and resources (+ generating R.java)"
"$BT/aapt2.exe" link \
  -I "$(cygpath -w "$PLATFORM")" \
  --manifest "$(cygpath -w "$SAFE/AndroidManifest.xml")" \
  --java "$(cygpath -w "$OUT/gen")" \
  -o "$(cygpath -w "$OUT/base.apk")" \
  "$(cygpath -w "$OUT/res.zip")"

echo "3/6 compiling java"
javac --release 11 -nowarn \
  -classpath "$(cygpath -w "$PLATFORM")" \
  -d "$(cygpath -w "$OUT/classes")" \
  $(find "$SAFE/src/app" "$OUT/gen" -name '*.java' -exec cygpath -w {} \;)

echo "4/6 dexing"
mapfile -t CLASSES < <(find "$OUT/classes" -name '*.class' -exec cygpath -w {} \;)
"$BT/d8.bat" --min-api 24 --output "$(cygpath -w "$OUT")" "${CLASSES[@]}"

echo "5/6 packaging"
cd "$OUT"
cp base.apk merged.apk
python - <<'PY'
import zipfile
with zipfile.ZipFile("merged.apk", "a", zipfile.ZIP_DEFLATED) as z:
    z.write("classes.dex", "classes.dex")
PY

echo "6/6 signing"
if [ ! -f "$SAFE/debug.keystore" ]; then
  keytool -genkeypair -v -keystore "$(cygpath -w "$SAFE/debug.keystore")" \
    -storepass android -keypass android -alias hakolah \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=Mohamed A. Abdali, O=Hakolah, C=BH" >/dev/null
fi
"$BT/zipalign.exe" -f 4 "$(cygpath -w "$OUT/merged.apk")" "$(cygpath -w "$OUT/aligned.apk")"
"$BT/apksigner.bat" sign \
  --ks "$(cygpath -w "$SAFE/debug.keystore")" \
  --ks-pass pass:android --key-pass pass:android \
  --out "$(cygpath -w "$OUT/$APK_NAME")" "$(cygpath -w "$OUT/aligned.apk")"

# keystore يرجع لمجلد المشروع الحقيقي عشان يضل ثابت بين كل بناء (نفس مفتاح
# التوقيع = يقدر يثبّت فوق النسخة القديمة بدون ما يحذفها أول)
cp "$SAFE/debug.keystore" "$HERE/debug.keystore"
cp "$OUT/$APK_NAME" "$HERE/$APK_NAME"

echo
echo "APK ready: $HERE/$APK_NAME"
