#!/bin/bash
# VCX Worker 部署 (统一走 wrangler, 自动打包 index.js)
# wrangler 版本锁在 package.json devDependencies (精确版本, 无 ^)
# 用法: CLOUDFLARE_API_TOKEN=xxx ./deploy_vcx.sh
set -e
[ -x ./node_modules/.bin/wrangler ] || { echo "wrangler 未安装，请先运行: npm install"; exit 1; }
echo "wrangler: $(./node_modules/.bin/wrangler --version 2>/dev/null | tail -1)"
./node_modules/.bin/wrangler deploy
