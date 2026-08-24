// 静态页与分类页 meta description (SEO 2026-08-24: 原 4-14 字符过短)
// pages 表无 description 列, 分类表无文案 — 统一在渲染层注入
const PAGE_DESC = {
  zh: {
    about: 'VirtualCardx 专注虚拟信用卡实测与跨境支付：逐平台实测开卡、充值、费率与风控，分享外贸收款、独立站支付与降本经验。',
    contact: '联系 VirtualCardx：商务合作、投稿、纠错与平台评测请求均可通过 Telegram 联系站长，工作日通常 24 小时内回复。',
    'privacy-policy': 'VirtualCardx 隐私政策：说明本站收集的信息范围、Cookie 与分析工具使用、第三方服务数据披露及用户权利。',
    terms: 'VirtualCardx 使用条款：站内虚拟卡平台信息仅供研究与参考，不构成金融或投资建议，使用服务前请核实官方条款。',
  },
  en: {
    about: 'VirtualCardx publishes hands-on virtual credit card reviews and cross-border payment guides: onboarding tests, fees, limits, and risk notes.',
    contact: 'Contact VirtualCardx for business cooperation, corrections, or platform review requests via Telegram. Replies typically within 24 hours on weekdays.',
    'privacy-policy': 'VirtualCardx privacy policy: what data this site collects, how cookies and analytics are used, third-party disclosures, and your choices.',
    terms: 'VirtualCardx terms of use: platform information is for research only and is not financial advice. Verify official terms before using any service.',
  },
}
// 分类页: slug -> 描述 (中英)
const CATEGORY_DESC = {
  zh: {
    'virtual-credit-card': '虚拟信用卡平台实测汇总：开卡流程、充值方式、月费与交易费率、KYC 要求和封卡风险，持续更新真实使用体验。',
    'technology-share': '技术教程合集：Linux 服务器运维、SSL 证书、WordPress 与 API 自动化配置的实操步骤与踩坑记录。',
    cryptocurrency: '加密货币栏目：稳定币充值虚拟卡、链上手续费对比、交易所提现与 U 卡选择的实操指南。',
    'cross-border-collections': '跨境支付收款平台实测：开户流程、费率、提现时效与风控案例，覆盖主流收款工具的真实使用体验。',
    'social-media': '社媒运营实战：Facebook、LinkedIn、WhatsApp 等平台的内容策略与客户开发方法，附外贸获客实操案例。',
    'artificial-intelligence': 'AI 工具评测与教程：编程助手、API 接入、订阅支付方案对比，帮你选对工具少踩坑。',
    seo: 'SEO 与流量实战：搜索引擎优化策略、AI Overview 应对、GSC 数据分析与外链建设方法。',
    'resource-share': '免费资源分享：开发者工具、SaaS 免费额度与低成本 VPS 优惠汇总，长期更新。',
  },
  en: {
    'virtual-credit-card': 'Hands-on virtual credit card platform reviews: onboarding, top-up methods, monthly and transaction fees, KYC requirements, and ban risks.',
    'technology-share': 'Tech tutorials: Linux server operations, SSL certificates, WordPress, and API automation with step-by-step guides and pitfalls.',
    cryptocurrency: 'Cryptocurrency guides: topping up virtual cards with stablecoins, on-chain fee comparisons, exchange withdrawals, and crypto card choices.',
    'cross-border-collections': 'Cross-border payment platform reviews: account setup, fees, withdrawal speed, and risk cases from real usage.',
    'social-media': 'Social media playbooks: content strategy and client development on Facebook, LinkedIn, and WhatsApp for exporters.',
    'artificial-intelligence': 'AI tool reviews and tutorials: coding assistants, API access, and subscription payment options compared.',
    seo: 'SEO and traffic guides: search optimization, AI Overview impact, GSC analysis, and link building in practice.',
    'resource-share': 'Free resources: developer tools, SaaS free tiers, and budget VPS deals, updated regularly.',
  },
}
export function pageDescFor(lang, slug) { return (PAGE_DESC[lang] || {})[slug] || null }
export function categoryDescFor(lang, slug) { return (CATEGORY_DESC[lang] || {})[slug] || null }
