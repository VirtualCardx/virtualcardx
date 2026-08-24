import worker from './worker_bundle.js';
import fs from 'node:fs';
const posts=[...JSON.parse(fs.readFileSync('/tmp/vcx_posts_zh.json','utf8')),...JSON.parse(fs.readFileSync('/tmp/vcx_posts_en.json','utf8'))].filter(x=>x.status==='publish');
for(const p of posts){p.featured_media=null;p.excerpt=p.excerpt||'';p.modified=p.modified||p.date;}
const media=[];
class Stmt{constructor(sql){this.sql=sql;this.args=[]}bind(...a){this.args=a;return this}async all(){let s=this.sql,r=[];
 if(s.includes('FROM posts')){r=[...posts];let li=s.match(/lang\s*=\s*\?/i);if(li)r=r.filter(x=>x.lang===this.args[0]);else if(s.includes("lang = 'zh'")||s.includes("lang='zh'"))r=r.filter(x=>x.lang==='zh');else if(s.includes("lang = 'en'")||s.includes("lang='en'"))r=r.filter(x=>x.lang==='en');r=r.sort((a,b)=>String(b.date).localeCompare(String(a.date)));if(s.includes('COUNT(*)'))return {results:[{n:r.length}]};let lm=s.match(/LIMIT\s+(\d+)/i);if(lm)r=r.slice(0,+lm[1]);}
 else if(s.includes('FROM media'))r=[];
 else if(s.includes('FROM categories'))r=[];
 return {results:r};}}
const env={DB:{prepare:s=>new Stmt(s)},R2:{get:async()=>null},API_TOKEN:'x'};
async function probe(path){let res=await worker.fetch(new Request('https://virtualcardx.com'+path),env,{}),text=await res.text();return {path,status:res.status,text,headers:Object.fromEntries(res.headers)}}
const p2=await probe('/en/page/2/'),p18=await probe('/en/page/18/'),p19=await probe('/en/page/19/'),sm=await probe('/sitemap.xml'),fav=await probe('/favicon.ico');
const urls=[...sm.text.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1]);
const checks={p2_status:p2.status,p2_h1:(p2.text.match(/<h1\b/g)||[]).length,p2_title:(p2.text.match(/<title>(.*?)<\/title>/)||[])[1],p2_has_about_card:/<h2 class="post-title"><a[^>]+>About<\/a>/.test(p2.text),p18_status:p18.status,p19_status:p19.status,sitemap_status:sm.status,sitemap_count:urls.length,sitemap_unique:new Set(urls).size,sitemap_has_roots:urls.includes('https://virtualcardx.com/')&&urls.includes('https://virtualcardx.com/en/'),sitemap_has_zh_about:urls.includes('https://virtualcardx.com/about/'),sitemap_has_seo:urls.includes('https://virtualcardx.com/seo/')&&urls.includes('https://virtualcardx.com/en/seo/'),security:p2.headers['x-content-type-options'],csp:!!p2.headers['content-security-policy'],favicon_status:fav.status,favicon_location:fav.headers.location};
console.log(JSON.stringify(checks,null,2));
if(checks.p2_status!==200||checks.p2_h1!==1||checks.p2_has_about_card||checks.p18_status!==200||checks.p19_status!==404||checks.sitemap_count!==376||checks.sitemap_unique!==376||!checks.sitemap_has_roots||!checks.sitemap_has_zh_about||!checks.sitemap_has_seo||checks.security!=='nosniff'||!checks.csp||checks.favicon_status!==301)process.exit(1);
