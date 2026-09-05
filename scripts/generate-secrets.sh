#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " Generating Cryptographic API Secrets for KEGAMA Payroll"
echo "=========================================================="

API_SEC=$(node -e "const crypto = require('crypto'); console.log('kgm_sec_' + crypto.randomBytes(24).toString('hex'));")
CLIENT_KEY=$(node -e "const crypto = require('crypto'); console.log('kgm_cli_' + crypto.randomBytes(24).toString('hex'));")

echo "Generated Secrets:"
echo "KEGAMA_API_SECRET:    $API_SEC"
echo "CLIENT_INTERFACE_KEY: $CLIENT_KEY"
echo ""
echo "To apply these secrets, update your .env and GitHub Secrets:"
echo "  KEGAMA_API_SECRET=$API_SEC"
echo "  CLIENT_INTERFACE_KEY=$CLIENT_KEY"
echo "  VITE_API_SECRET=$API_SEC"
echo "=========================================================="
