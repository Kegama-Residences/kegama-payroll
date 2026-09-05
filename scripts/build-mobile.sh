#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Preparing KEGAMA Payroll Mobile Distribution Packages"
echo "=========================================================="

echo "[1/4] Building web application distribution..."
npm run build

echo "[2/4] Syncing Capacitor platforms (Android & iOS)..."
npx cap sync

echo "[3/4] Verifying Android release signature keystore..."
if [ ! -f "android/app/kegama-release.keystore" ]; then
  echo "Keystore not found. Generating new release keystore..."
  ./scripts/generate-keystore.sh
else
  echo "Release keystore present: android/app/kegama-release.keystore"
fi

echo "[4/4] Mobile build preparation complete!"
echo ""
echo "Next Steps:"
echo "- To build APK locally with Android Studio: npm run cap:android"
echo "- To build iOS app locally with Xcode:       npm run cap:ios"
echo "- To trigger cloud CI build: Push to GitHub or run workflow 'Build KEGAMA Payroll Mobile Apps'"
echo "=========================================================="
