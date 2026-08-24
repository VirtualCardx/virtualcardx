#!/bin/bash
# VCX 新站 Worker 部署 (等 token 后运行)
# 用法: VCCF_TOKEN=xxx ./deploy_vcx.sh <account_id> <worker_name>
set -e
CF=$VCCF_TOKEN
ACC=$1
NAME=$2
echo "=== 部署 $NAME 到账户 $ACC ==="
curl -sS -X PUT "https://api.cloudflare.com/client/v4/accounts/$ACC/workers/scripts/$NAME" \
  -H "Authorization: Bearer $CF" \
  -F "metadata={\"main_module\":\"index.js\",\"compatibility_date\":\"2025-04-30\"};type=application/json" \
  -F "script=@worker_bundle.js;type=application/javascript+module" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('success:',d.get('success'))
if d.get('result'): print('modified:',d['result'].get('modified_on'))
print('errors:',[e.get('message') for e in d.get('errors',[])])
"
