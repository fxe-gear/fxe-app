#!/usr/bin/env bash

set -x
gulp
ionic build --release android
cd platforms/android/build/outputs/apk
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ~/.android/release.keystore android-release-unsigned.apk release
rm android-release.apk
/Applications/android-sdk-macosx/build-tools/*/zipalign -v 4 android-release-unsigned.apk android-release.apk
