import {
  AppleLogo,
  ArrowRight,
  ArrowSquareOut,
  CheckCircle,
  Code,
  DownloadSimple,
  GithubLogo,
  Handshake,
  LockKey,
  ShieldCheck,
  Sparkle,
  TerminalWindow,
  WindowsLogo,
  Wrench,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";

const repositoryUrl = "https://github.com/fantuan-lab/codex-skin-market";
const releaseBase = `${repositoryUrl}/releases/download/v0.1.0-beta.1`;
const macDownloadUrl = `${releaseBase}/codex-moon-spirit-macos-beta1.zip`;
const windowsDownloadUrl = `${releaseBase}/codex-moon-spirit-windows-beta1.zip`;
const partnershipUrl = `${repositoryUrl}/issues/new?template=relay-partnership.yml`;
const bugReportUrl = `${repositoryUrl}/issues/new?template=bug-report.yml`;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "月影灵编 · Codex Skin",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "macOS, Windows",
  softwareVersion: "0.1.0-beta.1",
  description: "第三方 Codex Desktop 互动皮肤，支持 macOS、Windows 与一键恢复。",
  url: repositoryUrl,
  downloadUrl: [macDownloadUrl, windowsDownloadUrl],
  license: "https://opensource.org/license/mit",
  isAccessibleForFree: true,
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
          <span className="brand-mark"><Sparkle weight="fill" aria-hidden="true" /></span>
          <span><strong>Codex Skin Lab</strong><small>非官方皮肤实验室</small></span>
        </a>
        <nav aria-label="页面导航">
          <a href="#download">下载</a>
          <a href="#how">原理</a>
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
            <span className="eyebrow"><i /> UNOFFICIAL CODEX DESKTOP SKIN · BETA 1</span>
            <h1 id="hero-title">给 Codex 桌面端，<br /><em>换一张会呼吸的脸。</em></h1>
            <p className="hero-lead">
              「月影灵编」是一款第三方 Codex Desktop 互动皮肤。不是壁纸截图：原生侧栏、任务和输入框仍然可用，macOS 与 Windows 均可随时恢复。
            </p>
            <div className="hero-actions">
              <a className="button primary" href={macDownloadUrl}>
                <AppleLogo weight="fill" aria-hidden="true" /> 下载 macOS Beta
              </a>
              <a className="button dark" href={windowsDownloadUrl}>
                <WindowsLogo weight="fill" aria-hidden="true" /> 下载 Windows Beta
              </a>
            </div>
            <div className="hero-subactions">
              <a href={repositoryUrl} target="_blank" rel="noreferrer"><GithubLogo weight="fill" />查看源码 / Star</a>
              <a href="#partners"><Handshake weight="fill" />中转站合作</a>
            </div>
            <p className="beta-note"><ShieldCheck weight="fill" />公开 Beta · 安装前自动备份 · 非 OpenAI 官方产品</p>
          </div>

          <div className="hero-stage" aria-label="月影灵编主题效果预览">
            <div className="hero-window">
              <div className="window-bar"><span /><span /><span /><b>Codex · Moon Spirit</b></div>
              <Image src="/skins/moon-spirit-hero.png" alt="月影灵编 Codex Desktop 皮肤效果图" width={1536} height={640} priority />
            </div>
            <span className="floating-chip chip-one"><CheckCircle weight="fill" />原生控件可交互</span>
            <span className="floating-chip chip-two"><Wrench weight="fill" />一键恢复</span>
          </div>
        </section>

        <section className="fact-strip" aria-label="项目事实">
          <div><strong>2</strong><span>macOS / Windows<br />双平台包</span></div>
          <div><strong>0</strong><span>不修改 app.asar<br />不替换官方签名</span></div>
          <div><strong>1</strong><span>本机回环连接<br />随时停止与恢复</span></div>
          <div><strong>MIT</strong><span>衍生代码开源<br />保留上游署名</span></div>
        </section>

        <section id="download" className="section download-section">
          <div className="section-heading">
            <span className="section-index">01 / DOWNLOAD</span>
            <h2>先免费下载，再决定它值不值得留下。</h2>
            <p>两个安装包来自同一套主题源码。当前是公开 Beta，平台验证边界全部写在卡片里。</p>
          </div>

          <div className="download-grid">
            <article className="platform-card mac-card">
              <div className="platform-icon"><AppleLogo weight="fill" /></div>
              <div className="platform-title"><span>macOS</span><b>Beta 1</b></div>
              <h3>适合先体验</h3>
              <p>已通过上游测试、隔离安装、客户 ZIP 解压复测和恢复代码检查。</p>
              <ul>
                <li><CheckCircle weight="fill" />官方 Codex 签名与内置 Node 检查</li>
                <li><CheckCircle weight="fill" />安装前备份，可一键恢复</li>
                <li className="pending"><span />最终真实 UI 闭环仍待验收</li>
              </ul>
              <a href={macDownloadUrl}><DownloadSimple weight="bold" />下载 macOS 安装包 <ArrowRight /></a>
            </article>

            <article className="platform-card windows-card">
              <div className="platform-icon"><WindowsLogo weight="fill" /></div>
              <div className="platform-title"><span>Windows 10 / 11</span><b>Beta 1</b></div>
              <h3>欢迎真机测试</h3>
              <p>静态安全断言、资源哈希、脚本语法、ZIP CRC 与解压复测均已通过。</p>
              <ul>
                <li><CheckCircle weight="fill" />动态发现 Store Codex 与内置 Node</li>
                <li><CheckCircle weight="fill" />本机回环、进程与路径身份校验</li>
                <li className="pending"><span />Windows 11 真机闭环仍待验收</li>
              </ul>
              <a href={windowsDownloadUrl}><DownloadSimple weight="bold" />下载 Windows 安装包 <ArrowRight /></a>
            </article>
          </div>

          <div className="download-footnote">
            <TerminalWindow weight="duotone" />
            <p><strong>遇到问题？</strong> 先运行包内“验证”工具；仍未解决时，提交一份不含 API Key、Token、Cookie 或私人代码的 <a href={bugReportUrl}>Beta Bug 报告</a>。</p>
          </div>
        </section>

        <section className="showcase section">
          <div className="showcase-image"><Image src="/skins/moon-spirit.png" alt="月影灵编在 Codex 工作区中的效果" width={1200} height={720} /></div>
          <div className="showcase-copy">
            <span className="section-index">02 / WHY A SKIN</span>
            <h2>编码工具不必永远长得像一张表格。</h2>
            <p>皮肤只改变工作空间的氛围，不接管你的工作流。Codex 的侧栏、任务列表、建议卡片和输入框依然是原来的原生控件。</p>
            <div className="quote">“角色是陪伴，代码才是主角。”</div>
          </div>
        </section>

        <section id="how" className="section how-section">
          <div className="section-heading compact">
            <span className="section-index">03 / HOW IT WORKS</span>
            <h2>没有替换安装包，也没有魔改官方文件。</h2>
          </div>
          <div className="step-grid">
            <article><span>01</span><div className="step-icon"><TerminalWindow weight="duotone" /></div><h3>启动本机调试端口</h3><p>脚本启动官方 Codex，并把 CDP 明确绑定在 127.0.0.1。</p></article>
            <article><span>02</span><div className="step-icon"><Code weight="duotone" /></div><h3>注入主题表现层</h3><p>连接本机页面后，仅加入 CSS、主题图片与装饰 DOM。</p></article>
            <article><span>03</span><div className="step-icon"><Wrench weight="duotone" /></div><h3>验证或一键恢复</h3><p>验证脚本检查进程与主题状态；恢复工具停止注入并清理主题。</p></article>
          </div>
        </section>

        <section id="safety" className="section safety-section">
          <div className="safety-copy">
            <span className="section-index light">04 / SAFETY</span>
            <h2>安全边界，写在明面上。</h2>
            <p>这是一款需要本机调试能力的第三方工具，不是零风险的官方功能。源码公开，是为了让安装行为和恢复路径都能被检查。</p>
            <a href={`${repositoryUrl}/tree/main/codex-skin`} target="_blank" rel="noreferrer">阅读完整技术说明 <ArrowSquareOut /></a>
          </div>
          <div className="safety-list">
            <div><LockKey weight="duotone" /><span><strong>设计上不采集</strong><small>不上传账号、代码、对话或模型配置</small></span></div>
            <div><ShieldCheck weight="duotone" /><span><strong>不修改官方包</strong><small>不改 .app、app.asar、WindowsApps 或官方签名</small></span></div>
            <div><Code weight="duotone" /><span><strong>可审查源码</strong><small>MIT 衍生代码、上游 commit 与校验值公开</small></span></div>
          </div>
        </section>

        <section className="section concept-section">
          <div className="section-heading row">
            <div><span className="section-index">05 / NEXT SKINS</span><h2>这一版先做透一款，下一批正在排队。</h2></div>
            <p>以下均为概念储备，尚未发布、未定价。欢迎在 GitHub 留下你最想要的方向。</p>
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
            <span className="section-index light">06 / PARTNERS</span>
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
          <div className="section-heading compact"><span className="section-index">07 / FAQ</span><h2>几个必须先说清楚的问题。</h2></div>
          <div className="faq-grid">
            <details><summary>这是 OpenAI 官方皮肤吗？</summary><p>不是。Codex Skin Lab、月影灵编及本网站均为独立第三方项目，与 OpenAI 没有隶属、赞助或背书关系。</p></details>
            <details><summary>MIT 是不是意味着什么都能卖？</summary><p>不是。MIT 只覆盖相应软件代码；原创图片、商标、官方应用文件各自有独立权利边界。项目保留了上游许可证与来源声明。</p></details>
            <details><summary>现在能直接商用售卖吗？</summary><p>当前是免费公开 Beta。正式收费前仍需完成 macOS 最终实机闭环、Windows 10/11 真机验证及签名验收。</p></details>
            <details><summary>为什么先找中转站合作？</summary><p>皮肤能提供长期可见的品牌入口；服务商能提供稳定额度、设备与测试资源。合作必须透明标注，不能牺牲用户安全。</p></details>
          </div>
        </section>

        <section className="closing">
          <Sparkle weight="fill" />
          <h2>先下载，跑一次真实任务。</h2>
          <p>好皮肤不是截图好看，是你愿意让它陪着写完下一段代码。</p>
          <div><a className="button primary" href="#download">选择系统下载</a><a className="text-link" href={repositoryUrl}>去 GitHub Star <ArrowRight /></a></div>
        </section>
      </main>

      <footer>
        <div className="footer-brand"><Sparkle weight="fill" /><span><strong>Codex Skin Lab</strong><small>Independent · Open source · Beta</small></span></div>
        <p>基于 <a href="https://github.com/Fei-Away/Codex-Dream-Skin" target="_blank" rel="noreferrer">Fei-Away/Codex-Dream-Skin</a> MIT 源码制作。项目非 OpenAI 官方产品。</p>
        <div><a href={repositoryUrl}>GitHub</a><a href={`${repositoryUrl}/blob/main/codex-skin/UPSTREAM.md`}>License & Credits</a></div>
      </footer>
    </div>
  );
}
