// route-order sanity check: ensure real article routes (/2025/05/19/worldfirst/) still 200,
// and WP-era endpoints 301. Run against local wrangler dev? No — quicker: build + deploy to
// a temp check via esbuild syntax validation first.
const { execSync } = require('child_process')
try {
  execSync('npx esbuild index.js --bundle --outfile=/tmp/vcx_check_bundle.js --format=esm --platform=neutral --external:hono --minify', { stdio: 'inherit', cwd: '/tmp/vcx_worker' })
  console.log('SYNTAX OK')
} catch (e) {
  console.log('SYNTAX FAIL', e.message)
  process.exit(1)
}
