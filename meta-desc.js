// 静态页与分类页 meta description (SEO 2026-08-24: 原 4-14 字符过短)
// pages 表无 description 列, 分类表无文案 — 统一在渲染层注入
//
// 文案原则: 写具体做过的事, 不写"专注""全面""一站式""帮你少踩坑"这类空话。
// meta description 仍是给搜索结果的摘要, 保留关键词, 但句子要是人说的话。
const PAGE_DESC = {
  zh: {
    about: '写了几年虚拟信用卡和跨境支付。开卡、充值、扣费、封卡都遇到过，这里记的是过程本身，不是推荐榜。',
    contact: '想聊合作、投稿、纠错，或者让我测某个平台，都可以在 Telegram 找我。工作日一般当天回。',
    'privacy-policy': '本站收集什么、Cookie 怎么用、分析工具和第三方服务会看到哪些数据，以及你可以怎么处理。',
    terms: '站内写的平台信息都是自己研究时留下的记录，不构成金融或投资建议。用之前请以官方条款为准。',
  },
  en: {
    about: 'Notes from a few years of using virtual cards and cross-border payment tools. What onboarding, funding and getting flagged actually look like.',
    contact: 'For corrections, review requests or anything else, reach me on Telegram. I usually reply the same day on weekdays.',
    'privacy-policy': 'What this site collects, how cookies and analytics are used, which third parties see data, and what you can do about it.',
    terms: "Everything here is research notes, not financial advice. Check the provider's own terms before you use anything.",
  },
}
// 分类页: slug -> 描述 (中英)
const CATEGORY_DESC = {
  zh: {
    'virtual-credit-card': '各家虚拟卡的开卡流程、充值方式、月费与交易费率、KYC 要求，以及什么情况下会被封号。',
    'technology-share': '服务器、证书、WordPress 和接口配置这类活，实际做一遍的步骤和卡住的地方。',
    cryptocurrency: '用稳定币给虚拟卡充值、链上手续费、交易所提现到账要多久，以及 U 卡怎么挑。',
    'cross-border-collections': '收款平台的开户流程、费率结构、提现时效，以及实际碰到的风控案例。',
    'social-media': '在 Facebook、LinkedIn、WhatsApp 上找客户时，内容怎么发、话怎么开。',
    'artificial-intelligence': '编程助手、接口接入、订阅怎么付，实际用下来值得留下的那几个。',
    seo: '搜索排名、收录、外链这些东西，做过和没做过的地方差在哪。',
    'resource-share': '开发工具、SaaS 免费额度、便宜 VPS，自己用着顺手才放上来。',
  },
  en: {
    'virtual-credit-card': 'How each virtual card handles onboarding, top-ups, monthly and transaction fees, KYC, and where accounts get shut down.',
    'technology-share': 'Servers, certificates, WordPress and API plumbing — the steps we ran, and where each one got stuck.',
    cryptocurrency: 'Funding cards with stablecoins, on-chain fees, how long exchange withdrawals take, and how to pick a crypto card.',
    'cross-border-collections': 'Payout platforms: account setup, fee structure, withdrawal speed, and the risk cases we actually hit.',
    'social-media': 'Finding customers on Facebook, LinkedIn and WhatsApp — what to post, and how to open a conversation.',
    'artificial-intelligence': 'Coding assistants, API access and paying for subscriptions — the few that were worth keeping.',
    seo: 'Ranking, indexing, links: what changed when we did the work versus when we did not.',
    'resource-share': 'Dev tools, SaaS free tiers and cheap VPS — only the ones still in use.',
  },
}
export function pageDescFor(lang, slug) { return (PAGE_DESC[lang] || {})[slug] || null }
export function categoryDescFor(lang, slug) { return (CATEGORY_DESC[lang] || {})[slug] || null }
