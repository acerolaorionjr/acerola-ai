#!/usr/bin/env bash
set -euo pipefail
APP="android/app/src/main"
mkdir -p "$APP/res/drawable" "$APP/res/values"
cat > "$APP/res/drawable/acerola_icon.xml" <<'EOF'
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#050505" android:pathData="M54,0A54,54 0,1 0,54 108A54,54 0,1 0,54 0"/><path android:fillColor="#00E5FF" android:pathData="M54,18L79,82L66,82L61,68L47,68L42,82L29,82L54,18M54,40L50,57L58,57L54,40"/><path android:fillColor="#FF3CA6" android:pathData="M34,88L74,88L70,94L38,94Z"/></vector>
EOF
cat > "$APP/res/drawable/acerola_splash.xml" <<'EOF'
<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@android:color/black"/><item android:gravity="center"><drawable name="acerola_icon"/></item></layer-list>
EOF
MAN="$APP/AndroidManifest.xml"
python3 - <<'PY'
from pathlib import Path
p=Path("android/app/src/main/AndroidManifest.xml")
s=p.read_text()
s=s.replace('android:icon="@mipmap/ic_launcher"','android:icon="@drawable/acerola_icon"')
s=s.replace('android:roundIcon="@mipmap/ic_launcher_round"','android:roundIcon="@drawable/acerola_icon"')
if 'android.permission.RECORD_AUDIO' not in s:
    s=s.replace('<manifest ', '<manifest xmlns:android="http://schemas.android.com/apk/res/android" ', 1) if 'xmlns:android=' not in s else s
    s=s.replace('<uses-permission android:name="android.permission.INTERNET" />','<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />')
p.write_text(s)
PY
# Capacitor's generated theme varies slightly by version; patch whichever values file exists.
for f in android/app/src/main/res/values/styles.xml android/app/src/main/res/values/themes.xml; do
  if [ -f "$f" ]; then
    python3 - "$f" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]); s=p.read_text()
insert='    <item name="android:windowBackground">@drawable/acerola_splash</item>\n'
if 'acerola_splash' not in s:
    s=s.replace('</style>',insert+'</style>')
p.write_text(s)
PY
  fi
done
