#!/usr/bin/env bash
set -e

KEYSTORE_DIR="android/app"
KEYSTORE_FILE="$KEYSTORE_DIR/kegama-release.keystore"
KEYSTORE_BASE64="$KEYSTORE_DIR/kegama-release.keystore.base64"
KEY_PASSWORD="kegama_payroll_secret_2026"
ALIAS="kegama"

echo "=========================================================="
echo " Generating Android Release Signature Keystore for KEGAMA"
echo "=========================================================="

mkdir -p "$KEYSTORE_DIR"
TEMP_KEY=$(mktemp /tmp/kegama_key_XXXXXX.pem)
TEMP_CERT=$(mktemp /tmp/kegama_cert_XXXXXX.pem)

openssl req -x509 -newkey rsa:2048 -keyout "$TEMP_KEY" -out "$TEMP_CERT" -days 10000 -nodes \
  -subj "/CN=KEGAMA Payroll/OU=Hospitality Systems/O=Kegama Residences Inc/L=Taguig City/ST=Metro Manila/C=PH"

openssl pkcs12 -export -out "$KEYSTORE_FILE" \
  -inkey "$TEMP_KEY" -in "$TEMP_CERT" -name "$ALIAS" -passout "pass:$KEY_PASSWORD"

rm "$TEMP_KEY" "$TEMP_CERT"

cat "$KEYSTORE_FILE" | base64 -w 0 > "$KEYSTORE_BASE64"

echo "Keystore created at: $KEYSTORE_FILE"
echo "Keystore Base64 saved at: $KEYSTORE_BASE64"
echo ""
echo "Certificate Fingerprint (SHA-256):"
openssl pkcs12 -in "$KEYSTORE_FILE" -nodes -passin "pass:$KEY_PASSWORD" 2>/dev/null | openssl x509 -noout -fingerprint -sha256
echo ""
echo "GitHub Secret Configuration:"
echo "- ANDROID_KEYSTORE_BASE64: (Contents of $KEYSTORE_BASE64)"
echo "- ANDROID_KEYSTORE_PASSWORD: $KEY_PASSWORD"
echo "- ANDROID_KEY_ALIAS: $ALIAS"
echo "- ANDROID_KEY_PASSWORD: $KEY_PASSWORD"
echo "=========================================================="
