// 测试数据。刻意混入几种线上真实存在的脏数据形态：
// - date 同时存在 ISO 与 "November 21, 2025" 可读格式
// - modified 早于 date（导入脏数据）
// - 正文里残留 WP 的 /wp-content/uploads/ 旧路径
// - 英文文章无 featured_media / 无 excerpt（靠中文配对回退）
export const posts = [
  {
    id: 1, lang: 'zh', slug: 'virtual-credit-card-platform-review',
    title: '虚拟卡平台实测', excerpt: '费率、开卡与风控实测。',
    content: '<p>正文</p><img src="/wp-content/uploads/2026/01/old.jpg" alt="">',
    path: 'virtual-credit-card-platform-review',
    date: '2026-09-20T00:00:00.000Z', modified: '2026-09-19T00:00:00.000Z',
    status: 'publish', featured_media: 10, category_ids: '[7]', tag_ids: '[]',
    translation_id: 101, sticky: 0,
  },
  {
    id: 2, lang: 'zh', slug: 'old-style-post', title: '旧版日期路径文章',
    excerpt: '旧格式。', content: '<p>正文</p>',
    path: '2026/08/04/old-style-post',
    date: '2026-08-04', modified: '2026-08-04',
    status: 'publish', featured_media: null, category_ids: '[7]', tag_ids: '[]',
    translation_id: null, sticky: 0,
  },
  {
    id: 3, lang: 'zh', slug: 'crypto-card-guide', title: 'U 卡入门',
    excerpt: '稳定币充值。', content: '<p>正文</p>',
    path: 'crypto-card-guide',
    date: 'November 21, 2025', modified: 'November 21, 2025',
    status: 'publish', featured_media: null, category_ids: '[8]', tag_ids: '[]',
    translation_id: null, sticky: 0,
  },
  {
    id: 101, lang: 'en', slug: 'virtual-credit-card-platform-review',
    title: 'Virtual Card Platform Review', excerpt: '',
    content: '<p>Body</p>', path: 'virtual-credit-card-platform-review',
    date: '2026-09-20', modified: '2026-09-20',
    status: 'publish', featured_media: null, category_ids: '[]', tag_ids: '[]',
    translation_id: 1, sticky: 0,
  },
  {
    id: 102, lang: 'en', slug: 'tailscale-guide', title: 'Tailscale Guide',
    excerpt: 'Mesh VPN setup.', content: '<p>Body</p>',
    path: '2026/07/04/tailscale-guide',
    date: '2026-07-04', modified: '2026-07-04',
    status: 'publish', featured_media: null, category_ids: '[]', tag_ids: '[]',
    translation_id: null, sticky: 0,
  },
  {
    id: 4, lang: 'zh', slug: 'script-injection-title',
    title: '标题里带 </script> 的边界用例', excerpt: '边界。', content: '<p>正文</p>',
    path: 'script-injection-title', date: '2026-01-01', modified: '2026-01-01',
    status: 'publish', featured_media: null, category_ids: '[]', tag_ids: '[]',
    translation_id: null, sticky: 0,
  },
]

export const media = [
  { id: 10, filename: 'card.jpg', path: 'media/10-card.jpg', alt: 'Card', width: 1200, height: 675, mime_type: 'image/jpeg' },
  { id: 11, filename: 'old.jpg', path: 'media/11-old.jpg', alt: 'Old', width: 800, height: 450, mime_type: 'image/jpeg' },
  { id: 1556, filename: '1556-cropped-logo.png', path: 'media/1556-cropped-logo.png', alt: '', width: 128, height: 45, mime_type: 'image/png' },
]

export const pages = [
  { id: 1, lang: 'zh', slug: 'about', title: '关于本站', content: '<p>关于</p>', path: 'about' },
  { id: 2, lang: 'en', slug: 'about', title: 'About', content: '<p>About</p>', path: 'about' },
]

export const categories = [
  { id: 7, name: '虚拟卡评测', slug: 'virtual-credit-card', parent: 0, description: '', count: 2 },
  { id: 8, name: '加密货币', slug: 'cryptocurrency', parent: 0, description: '', count: 1 },
]

export function seed(overrides = {}) {
  return { posts, media, pages, categories, ...overrides }
}
