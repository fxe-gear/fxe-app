#!/usr/bin/env bash

set -x
gulp
ionic build android --release --buildConfig=build.json

cd platforms/android/build/outputs/apk
rm android-*-release.apk

for FILE in android-*-unsigned.apk; do
  # jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/.android/release.keystore $FILE release
  /Applications/android-sdk-macosx/build-tools/*/zipalign -v 4 $FILE ${FILE%-*}-signed.apk
done

open .
