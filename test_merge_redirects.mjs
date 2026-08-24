import app from './index.js'
const env={DB:{prepare(){return this},bind(){return this},async all(){return {results:[]}}},R2:{async get(){return null}}}
const cases={
'/virtualcardx2026-2/':'/virtualcardx2026.txt',
'/en/virtualcardx2026-2/':'/virtualcardx2026.txt',
'/2026/07/13/coca-visa-card-review/':'/2026/07/31/coca-card-review-2026/',
'/en/2026/07/13/coca-visa-card-review/':'/en/2026/07/31/coca-card-review-2026/',
'/2026/07/13/paymier-cross-border-payment-virtual-card/':'/2025/05/19/paymier/',
'/en/2026/07/13/paymier-cross-border-payment-virtual-card/':'/en/2025/05/19/paymier/'
}
for(const [p,target] of Object.entries(cases)){const r=await app.fetch(new Request('https://virtualcardx.com'+p),env);console.log(p,r.status,r.headers.get('location'));if(r.status!==301||new URL(r.headers.get('location'),'https://virtualcardx.com').pathname!==target)process.exit(1)}
