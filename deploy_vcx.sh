#!/bin/bash
# VCX Worker 部署 (统一走 wrangler, 自动打包 index.js)
# 用法: CLOUDFLARE_API_TOKEN=xxx ./deploy_vcx.sh
set -e
command -v npx >/dev/null || { echo "npx not found"; exit 1; }
npx wrangler deploy
