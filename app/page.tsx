import {
  AppleLogo,
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  Code,
  DownloadSimple,
  GithubLogo,
  Handshake,
  Leaf,
  LockKey,
  PawPrint,
  ShieldCheck,
  Sparkle,
  TerminalWindow,
  WindowsLogo,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

const repositoryUrl = "https://github.com/fantuan-lab/codex-skin-market";
const siteUrl = "https://codex-skin-market.liucui19981231.chatgpt.site";

const pandaTag = "bamboo-panda-v0.1.0-beta.1";
const pandaReleaseUrl = `${repositoryUrl}/releases/tag/${pandaTag}`;
const pandaReleaseBase = `${repositoryUrl}/releases/download/${pandaTag}`;
const pandaMacDownloadUrl = `${pandaReleaseBase}/codex-bamboo-panda-macos-beta1.zip`;
const pandaWindowsDownloadUrl = `${pandaReleaseBase}/codex-bamboo-panda-windows-beta1.zip`;

const moonTag = "v0.1.0-beta.1";
const moonReleaseUrl = `${repositoryUrl}/releases/tag/${moonTag}`;
const moonReleaseBase = `${repositoryUrl}/releases/download/${moonTag}`;
const moonMacDownloadUrl = `${moonReleaseBase}/codex-moon-spirit-macos-beta1.zip`;
const moonWindowsDownloadUrl = `${moonReleaseBase}/codex-moon-spirit-windows-beta1.zip`;

const partnershipUrl = `${repositoryUrl}/issues/new?template=relay-partnership.yml`;
const bugReportUrl = `${repositoryUrl}/issues/new?template=bug-report.yml`;

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Codex Skin Lab",
      url: siteUrl,
      description: "非官方 Codex Desktop 双平台互动皮肤下载与开源项目。",
    },
    {
      "@type": "ItemList",
      name: "Codex Skin Lab 皮肤库",
      numberOfItems: 2,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          item: {
            "@type": "SoftwareApplication",
            name: "竹影熊猫 · Codex Skin",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "macOS, Windows",
            softwareVersion: "0.1.0-beta.1",
            description: "熊猫与成都竹林意象的第三方 Codex Desktop 互动皮肤。",
            image: `${siteUrl}/skins/bamboo-panda-hero.png`,
            url: pandaReleaseUrl,
            downloadUrl: [pandaMacDownloadUrl, pandaWindowsDownloadUrl],
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
          },
        },
        {
          "@type": "ListItem",
          position: 2,
          item: {
            "@type": "SoftwareApplication",
            name: "月影灵编 · Codex Skin",
            applicationCategory: "DeveloperApplication",
            operatingSystem: "macOS, Windows",
            softwareVersion: "0.1.0-beta.1",
            description: "月夜氛围的第三方 Codex Desktop 互动皮肤。",
            image: `${siteUrl}/skins/moon-spirit.png`,
            url: moonReleaseUrl,
            downloadUrl: [moonMacDownloadUrl, moonWindowsDownloadUrl],
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
          },
        },
      ],
    },
  ],
};

const concepts = [
  { name: "机械小团团", tag: "陪伴型角色", image: "/skins/soft-pet.png" },
  { name: "像素招财喵", tag: "像素工作台", image: "/skins/lucky-cat.png" },
  { name: "霓影守护者", tag: "未来感主题", image: "/skins/neon-guardian.png" },
];

export default function Home() {
  return (
    <div className="site-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="topbar">
        <a className="brand" href="#top" aria-label="Codex Skin Lab 首页">
          <span className="brand-mark"><PawPrint weight="fill" aria-hidden="true" /></span>
          <span><strong>Codex Skin Lab</strong><small>非官方皮肤实验室</small></span>
        </a>
        <nav aria-label="页面导航">
          <a href="#skins">皮肤库</a>
          <a href="#install">安装</a>
          <a href="#safety">安全</a>
          <a href="#partners">中转站合作</a>
        </nav>
        <a className="github-link" href={repositoryUrl} target="_blank" rel="noreferrer">
          <GithubLogo weight="fill" aria-hidden="true" /> GitHub <ArrowSquareOut aria-hidden="true" />
        </a>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow"><i /> NEW · FREE PUBLIC BETA</span>
            <h1 id="hero-title">竹影熊猫，<br /><em>陪你把项目啃下来。</em></h1>
            <p className="hero-lead">
              熊猫、竹影与成都松弛感，进入你的 Codex 工作台。它不是一张壁纸：原生侧栏、任务和输入框仍然可用，macOS 与 Windows 都提供 Beta 安装、验证和恢复入口。
            </p>
            <div className="hero-actions">
              <a className="button primary" href={pandaMacDownloadUrl} aria-label="下载竹影熊猫 macOS Beta 1 安装包">
                <AppleLogo weight="fill" aria-hidden="true" /> 下载 macOS · Beta 1
              </a>
              <a className="button dark" href={pandaWindowsDownloadUrl} aria-label="下载竹影熊猫 Windows Beta 1 安装包">
                <WindowsLogo weight="fill" aria-hidden="true" /> 下载 Windows 10 / 11 · Beta 1
              </a>
            </div>
            <div className="hero-subactions">
              <a href={pandaReleaseUrl} target="_blank" rel="noreferrer"><TerminalWindow weight="fill" />查看发布说明</a>
              <a href={repositoryUrl} target="_blank" rel="noreferrer"><GithubLogo weight="fill" />查看源码 / Star</a>
            </div>
            <p className="user-path"><DownloadSimple weight="bold" /><strong>下载 ZIP</strong><span>→</span><strong>完整解压</strong><span>→</span><strong>双击安装入口</strong></p>
            <p className="beta-note"><ShieldCheck weight="fill" />未签名公开 Beta · 双平台真机闭环待补齐 · 非 OpenAI 官方产品</p>
          </div>

          <div className="hero-stage" aria-label="竹影熊猫主题视觉概念预览">
            <div className="hero-window panda-window">
              <div className="window-bar"><span /><span /><span /><b>Codex · Bamboo Panda</b></div>
              <Image src="/skins/bamboo-panda-hero.png" alt="竹影熊猫 Codex Desktop 皮肤视觉概念图" width={1942} height={809} priority />
            </div>
            <span className="floating-chip chip-one"><CheckCircle weight="fill" />原生控件仍可用</span>
            <span className="floating-chip chip-two"><Wrench weight="fill" />可验证 · 可恢复</span>
            <p className="concept-disclaimer">视觉概念图 · 实际效果会随 Codex 版本与系统界面略有差异</p>
          </div>
        </section>

        <section className="fact-strip" aria-label="项目事实">
          <div><strong>2</strong><span>竹影熊猫 / 月影灵编<br />两款公开皮肤</span></div>
          <div><strong>2</strong><span>macOS / Windows<br />双平台安装包</span></div>
          <div><strong>0</strong><span>不修改 app.asar<br />不替换官方签名</span></div>
          <div><strong>1</strong><span>本机回环连接<br />随时停止与恢复</span></div>
        </section>

        <section id="skins" className="section skin-library">
          <div className="section-heading">
            <span className="section-index">01 / SKIN LIBRARY</span>
            <h2>两款皮肤，直接选系统下载。</h2>
            <p>普通用户无需克隆仓库，也不要下载 GitHub 自动生成的 Source code。选择皮肤和系统，拿到可安装 ZIP。</p>
          </div>

          <div className="skin-grid">
            <article className="skin-card featured-skin">
              <div className="skin-preview">
                <Image src="/skins/bamboo-panda-hero.png" alt="竹影熊猫视觉概念预览" width={1942} height={809} />
                <span className="skin-badge"><PawPrint weight="fill" />NEW · BETA 1</span>
                <small>视觉概念图</small>
              </div>
              <div className="skin-content">
                <div className="skin-kicker"><Leaf weight="fill" /> 成都竹林与熊猫意象</div>
                <h3>竹影熊猫</h3>
                <p>米白、竹青与熊猫陪伴感。保留 Codex 的工作流，只改变你每天面对它的心情。</p>
                <div className="skin-actions">
                  <a className="button primary" href={pandaMacDownloadUrl}><AppleLogo weight="fill" />下载 macOS</a>
                  <a className="button dark" href={pandaWindowsDownloadUrl}><WindowsLogo weight="fill" />下载 Windows</a>
                </div>
                <p className="beta-scope"><ShieldCheck weight="fill" />未签名公开 Beta；自动化与真机验证边界以 <a href={pandaReleaseUrl}>Release 说明</a>为准。</p>
              </div>
            </article>

            <article className="skin-card">
              <div className="skin-preview moon-preview">
                <Image src="/skins/moon-spirit.png" alt="月影灵编 Codex Desktop 皮肤预览" width={1200} height={720} />
                <span className="skin-badge"><Sparkle weight="fill" />PUBLIC BETA</span>
              </div>
              <div className="skin-content">
                <div className="skin-kicker moon-kicker"><Sparkle weight="fill" /> 月夜工作台</div>
                <h3>月影灵编</h3>
                <p>更克制的蓝紫氛围主题。双平台包保留原生控件、验证工具与恢复路径。</p>
                <div className="skin-actions">
                  <a className="button subtle" href={moonMacDownloadUrl}><AppleLogo weight="fill" />下载 macOS</a>
                  <a className="button subtle dark-outline" href={moonWindowsDownloadUrl}><WindowsLogo weight="fill" />下载 Windows</a>
                </div>
                <p className="beta-scope"><CheckCircle weight="fill" />现有 Beta 1 下载链接保持不变；详细状态见 <a href={moonReleaseUrl}>Release 说明</a>。</p>
              </div>
            </article>
          </div>

          <div className="download-footnote">
            <TerminalWindow weight="duotone" />
            <p><strong>GitHub 页面怎么选？</strong> 只下载与你系统对应的 <code>codex-…-macos-…zip</code> 或 <code>codex-…-windows-…zip</code>；不要点 <code>Code → Download ZIP</code>，也不要下载 Release 底部的 Source code。</p>
          </div>
        </section>

        <section id="install" className="section how-section">
          <div className="section-heading compact">
            <span className="section-index">02 / INSTALL</span>
            <h2>三步装好，也给自己留好退路。</h2>
          </div>
          <div className="step-grid">
            <article><span>01</span><div className="step-icon"><DownloadSimple weight="duotone" /></div><h3>下载对应 ZIP</h3><p>确认皮肤名称和系统。普通用户不需要克隆源码仓库。</p></article>
            <article><span>02</span><div className="step-icon"><Code weight="duotone" /></div><h3>先完整解压</h3><p>不要在压缩包预览里运行。解压后打开最外层文件夹。</p></article>
            <article><span>03</span><div className="step-icon"><Wrench weight="duotone" /></div><h3>双击安装入口</h3><p>使用包内顶层“安装 / Install”入口；遇到问题先验证，再一键恢复。</p></article>
          </div>
          <div className="install-warning">
            <ShieldCheck weight="duotone" />
            <p><strong>当前 Beta 尚未签名。</strong>macOS 如阻止打开，请右键或按住 Control 点击安装入口后选择“打开”；Windows 如显示 SmartScreen，请先核对 Release 中的 SHA-256。不要关闭系统安全机制。</p>
          </div>
        </section>

        <section id="safety" className="section safety-section">
          <div className="safety-copy">
            <span className="section-index light">03 / SAFETY</span>
            <h2>安全边界，写在下载按钮旁边。</h2>
            <p>这是需要本机调试能力的第三方工具，不是零风险的官方功能。源码、安装行为、校验值和恢复路径保持公开，方便下载前检查。</p>
            <a href={`${repositoryUrl}/tree/main/codex-skin`} target="_blank" rel="noreferrer">阅读完整技术说明 <ArrowSquareOut /></a>
          </div>
          <div className="safety-list">
            <div><LockKey weight="duotone" /><span><strong>设计上不采集</strong><small>不上传账号、代码、对话或模型配置</small></span></div>
            <div><ShieldCheck weight="duotone" /><span><strong>不修改官方包</strong><small>不改 .app、app.asar、WindowsApps 或官方签名</small></span></div>
            <div><Wrench weight="duotone" /><span><strong>验证与恢复同包提供</strong><small>安装前备份，出现异常时先停止主题并恢复原界面</small></span></div>
          </div>
        </section>

        <section className="section concept-section">
          <div className="section-heading row">
            <div><span className="section-index">04 / NEXT SKINS</span><h2>熊猫已经出发，下一批继续排队。</h2></div>
            <p>以下仍是概念储备，尚未发布、未定价。欢迎在 GitHub 留下你最想要的方向。</p>
          </div>
          <div className="concept-grid">
            {concepts.map((concept) => (
              <article key={concept.name}>
                <Image src={concept.image} alt={`${concept.name}概念预览`} width={1200} height={720} />
                <div><span><b>概念中</b>{concept.tag}</span><h3>{concept.name}</h3></div>
              </article>
            ))}
          </div>
        </section>

        <section id="partners" className="partner-section">
          <div className="partner-art"><Handshake weight="duotone" /><span>RELAY × SKIN</span></div>
          <div className="partner-copy">
            <span className="section-index light">05 / PARTNERS</span>
            <h2>给 API 服务商一个更自然的用户入口。</h2>
            <p>你提供稳定额度或测试支持，我们提供主题入口、安装教程与合作展示位。所有合作会标注关系，不把赞助包装成评测。</p>
            <ul>
              <li><CheckCircle weight="fill" />仅接受合法、透明、有售后渠道的服务商</li>
              <li><CheckCircle weight="fill" />不接收任何用户 API Key、Token 或 Cookie</li>
              <li><CheckCircle weight="fill" />先公开申请，再讨论联名主题与资源互换</li>
            </ul>
            <a href={partnershipUrl} target="_blank" rel="noreferrer">提交中转站合作申请 <ArrowRight /></a>
          </div>
        </section>

        <section className="section faq-section">
          <div className="section-heading compact"><span className="section-index">06 / FAQ</span><h2>下载之前，先把这些说清楚。</h2></div>
          <div className="faq-grid">
            <details><summary>这是 OpenAI 官方皮肤吗？</summary><p>不是。Codex Skin Lab、竹影熊猫、月影灵编及本网站均为独立第三方项目，与 OpenAI 没有隶属、赞助或背书关系。</p></details>
            <details><summary>熊猫主视觉是真实运行截图吗？</summary><p>当前主视觉是设计目标概念图，不冒充已验收的真实运行截图。实际效果会随 Codex 版本、系统字体和窗口尺寸略有差异。</p></details>
            <details><summary>为什么下载后可能出现安全提醒？</summary><p>当前免费 Beta 尚未完成 macOS Developer ID / 公证与 Windows Authenticode 签名。请从本仓库 Release 下载并核对 SHA-256，不要关闭系统安全机制。</p></details>
            <details><summary>安装后不喜欢怎么办？</summary><p>先运行包内验证工具确认状态，再使用同包提供的恢复入口停止主题并恢复 Codex 原界面。遇到问题可提交不含敏感信息的 <a href={bugReportUrl}>Beta Bug 报告</a>。</p></details>
          </div>
        </section>

        <section className="closing">
          <PawPrint weight="fill" />
          <h2>选好系统，让熊猫开工。</h2>
          <p>下载 ZIP，完整解压，双击安装入口。先跑一次真实任务，再决定它值不值得留下。</p>
          <div>
            <a className="button primary" href={pandaMacDownloadUrl}><AppleLogo weight="fill" />下载 macOS</a>
            <a className="button dark" href={pandaWindowsDownloadUrl}><WindowsLogo weight="fill" />下载 Windows</a>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><PawPrint weight="fill" /><span><strong>Codex Skin Lab</strong><small>Independent · Open source · Beta</small></span></div>
        <p>基于 <a href="https://github.com/Fei-Away/Codex-Dream-Skin" target="_blank" rel="noreferrer">Fei-Away/Codex-Dream-Skin</a> MIT 源码制作。熊猫主题灵感来自成都竹林意象，项目非任何机构或 OpenAI 官方产品。</p>
        <div><a href={repositoryUrl}>GitHub</a><a href={`${repositoryUrl}/blob/main/codex-skin/UPSTREAM.md`}>License & Credits</a></div>
      </footer>
    </div>
  );
}
