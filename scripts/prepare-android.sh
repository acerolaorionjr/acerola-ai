#!/usr/bin/env bash
set -euo pipefail

# Keep the Android wrapper deliberately simple for the first native build.
# Capacitor's generated MainActivity/theme handle startup; we only customize
# the Acerola icon, app label, and microphone permission.

APP="android/app/src/main"
mkdir -p "$APP/res/drawable"

cat > "$APP/res/drawable/acerola_icon.xml" <<'EOF'
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="#050505"
        android:pathData="M54,0A54,54 0,1 0,54 108A54,54 0,1 0,54 0"/>
    <path android:fillColor="#00E5FF"
        android:pathData="M54,18L79,82L66,82L61,68L47,68L42,82L29,82L54,18M54,40L50,57L58,57L54,40"/>
    <path android:fillColor="#FF3CA6"
        android:pathData="M34,88L74,88L70,94L38,94Z"/>
</vector>
EOF

MAN="$APP/AndroidManifest.xml"

python3 - <<'PY'
from pathlib import Path

p = Path("android/app/src/main/AndroidManifest.xml")
s = p.read_text()

s = s.replace('android:icon="@mipmap/ic_launcher"', 'android:icon="@drawable/acerola_icon"')
s = s.replace('android:roundIcon="@mipmap/ic_launcher_round"', 'android:roundIcon="@drawable/acerola_icon"')
s = s.replace('android:name="com.acerola.ai.MainActivity"', 'android:name=".MainActivity"')

if 'android:label="Acerola AI"' not in s:
    s = s.replace('<application ', '<application android:label="Acerola AI" ', 1)

if 'android.permission.RECORD_AUDIO' not in s:
    marker = '<uses-permission android:name="android.permission.INTERNET" />'
    if marker in s:
        s = s.replace(
            marker,
            marker + '\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />'
        )
    else:
        s = s.replace(
            '<application ',
            '<uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <application ',
            1
        )

p.write_text(s)
PY

# Do not override Capacitor's generated MainActivity or Android theme.
# This removes the custom startup layer that can crash before the web app loads.
rm -f "$APP/java/com/acerola/ai/MainActivity.java"
rm -f "$APP/res/drawable/acerola_splash.xml"
