import type {
  CoverageItem,
  DetectionKind,
  Finding,
  FindingCategory,
  FindingStatus,
  PdfVersionRecord,
  Severity,
  StandardProfileId,
} from "./pdf/types";

export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

type DeepStringShape<T> = T extends string
  ? string
  : T extends readonly unknown[]
    ? { readonly [K in keyof T]: DeepStringShape<T[K]> }
    : T extends object
      ? { readonly [K in keyof T]: DeepStringShape<T[K]> }
      : T;

const EN_UI_COPY = {
  locale: {
    switchLabel: "Language",
    english: "English",
    chinese: "中文",
    changeToEnglish: "Switch to English",
    changeToChinese: "切换到中文",
  },
  navigation: {
    skip: "Skip to main content",
    brandAria: "ClearTag home",
    tagline: "PDF remediation workspace · working name",
    primaryAria: "Primary navigation",
    workflow: "Workflow",
    standards: "Standards",
    security: "Security",
    pricing: "Pricing",
    openAnalyzer: "Open analyzer",
  },
  hero: {
    eyebrow: "Guided PDF remediation",
    title: "Turn accessibility findings into reviewable fixes and defensible evidence.",
    lead: "Analyze text-based PDFs in your browser, locate structural risks by page, guide human review, and export a versioned remediation evidence pack.",
    boundariesAria: "Product boundaries",
    boundaries: [
      "Machine-detected failures stay separate from human verification.",
      "Every finding keeps its page, evidence, method, mapping, and status.",
      "Complex tags, tables, formulas, and forms escalate to specialists.",
    ],
    boundaryNote: "Guided remediation—not one-click compliance.",
  },
  intake: {
    kicker: "Local analyzer",
    title: "Review a PDF",
    privacyChip: "In-browser",
    chooseOrDrop: "Choose or drop a PDF",
    fileRequirements: "Text-based PDF · 1–100 pages · up to 50 MB",
    selected: "selected",
    browse: "Browse files",
    remove: "Remove selected file",
    mappingLegend: "Evidence mapping",
    opening: "Opening PDF",
    starting: "Starting",
    progressAria: "PDF analysis progress",
    cancel: "Cancel analysis",
    analyze: "Analyze locally",
    privacy: "Files and extracted content stay in this tab. No PDF text, field values, or link targets are logged or uploaded.",
    samplesAria: "Test with sample PDFs",
    samplesLead: "Try a real fixture:",
    taggedSample: "Well-tagged sample",
    issuesSample: "Known-issues sample",
    errors: {
      tooLarge: "Choose a PDF no larger than 50 MB.",
      noMapping: "Choose at least one evidence mapping.",
      unavailable: "Sample file is unavailable.",
      analyzeFailed: "The PDF could not be analyzed.",
    },
  },
  confidence: {
    aria: "MVP processing facts",
    items: [
      { value: "1–100", label: "text-based pages per file" },
      { value: "Local", label: "analysis in this browser tab" },
      { value: "SHA-256", label: "file and version fingerprint" },
      { value: "Human", label: "review stays explicit" },
    ],
  },
  audience: {
    label: "Built for accountable delivery",
    title: "A review queue, not a pass/fail badge.",
    intro: "For teams accountable for public-facing and contract-delivered PDFs, where a finding needs an owner, a decision, and evidence—not a score that hides uncertainty.",
    cards: [
      {
        title: "Accessibility consultancies",
        copy: "Triage high-volume client files, keep reviewer decisions, and deliver evidence with the remediated version.",
      },
      {
        title: "Public colleges and universities",
        copy: "Review syllabi, course packets, admissions and aid forms, training, and public notices before publication.",
      },
      {
        title: "Government document teams",
        copy: "Prepare council materials, permits, benefit applications, budgets, notices, and procurement deliverables.",
      },
      {
        title: "Federal delivery partners",
        copy: "Build the evidence required by the contract, agency method, acceptance criteria, and Section 508 review process.",
      },
    ],
    documentTypes: "Common files: course handouts · syllabi · admissions and aid forms · council packets · permits · benefits applications · budgets · public notices · training · user guides · delivery reports",
  },
  workflow: {
    label: "Evidence-led workflow",
    title: "From file intake to a defensible handoff.",
    intro: "Automation narrows the queue. People remain responsible for meaning, usability, and the final delivery decision.",
    steps: [
      {
        title: "Analyze locally",
        copy: "Validate the file, fingerprint the exact bytes, and inspect real PDF structure and annotation signals page by page.",
      },
      {
        title: "Review what machines cannot know",
        copy: "Confirm meaning, reading order, alternate-text quality, table relationships, form behavior, and exceptions.",
      },
      {
        title: "Version, recheck, and export",
        copy: "Create a strictly preflighted metadata revision, preserve the original, rerun checks, and export accessible HTML plus JSON evidence.",
      },
    ],
  },
  scope: {
    label: "Honest coverage",
    title: "Three lanes. No hidden “pass.”",
    intro: "A green signal means only that a specific machine-detectable issue was not found. It never means the document is compliant or certified.",
    lanes: [
      {
        label: "Machine-detected",
        title: "Objective PDF signals",
        items: [
          "Page count and searchable text",
          "Title, language, MarkInfo, and exposed tag roles",
          "Heading-level gaps and basic list/table relationships",
          "Link and form-widget annotation properties",
        ],
      },
      {
        label: "Human verification",
        title: "Meaning and real usability",
        items: [
          "Logical reading order in the target reader",
          "Heading and link purpose",
          "Alternate-text accuracy and decorative intent",
          "Table headers, keyboard flow, and field instructions",
        ],
      },
      {
        label: "Escalated / not evaluated",
        title: "Specialist remediation",
        items: [
          "Complex tag trees and complex tables",
          "Formula semantics and STEM notation",
          "XFA, scripts, signatures, and complex forms",
          "Complete PDF/UA validation and legal applicability",
        ],
      },
    ],
  },
  standards: {
    label: "Standards and legal context",
    title: "Evidence mapping—not a compliance mode.",
    intro: "Applicable duties depend on the publisher, content, jurisdiction, contract, exceptions, and use. ClearTag maps evidence to review targets; it does not turn a partial scan into a conformity claim.",
    cards: [
      {
        label: "US state and local government",
        title: "Title II · WCAG 2.1 A / AA",
        copy: "Current federal deadlines are April 26, 2027 for public entities of 50,000 or more, and April 26, 2028 for smaller entities and special district governments. Limited exceptions require context.",
        link: "DOJ small entity guide",
      },
      {
        label: "US federal electronic documents",
        title: "Revised Section 508 · E205",
        copy: "Covered non-web documents map to applicable WCAG 2.0 A / AA criteria. Supplier duties flow from agency scope, contracts, statements of work, and acceptance methods—not from a universal contractor claim.",
        link: "Supplier guidance",
      },
      {
        label: "PDF interoperability",
        title: "PDF/UA-1 preflight signals",
        copy: "This MVP inspects selected structure signals for PDF/UA-1 context. It is not a complete ISO 14289-1 validator, and PDF/UA is not a legal certification or a substitute for semantic review.",
        link: "ISO 14289-1:2014",
      },
      {
        label: "European public sector and selected services",
        title: "EN 301 549 / WAD · EAA context",
        copy: "WAD document requirements use EN 301 549 clause 10 context. The EAA covers selected consumer products and services—not every PDF—and national scope and current harmonised standards still matter.",
        link: "European Accessibility Act",
      },
    ],
  },
  security: {
    label: "Privacy by architecture",
    title: "Your document stays in this tab.",
    intro: "The MVP has no document upload API, database, analytics event, or retention job. Closing or refreshing the tab clears the active review state from memory.",
    cards: [
      {
        title: "Local processing",
        copy: "PDF bytes are parsed in-browser. Extracted text, form values, and full link targets are not written to logs or browser storage.",
      },
      {
        title: "Explicit deletion",
        copy: "“Review another file” releases the active in-memory reference. Generated download URLs are revoked after use.",
      },
      {
        title: "User-controlled evidence",
        copy: "The evidence pack is generated locally and omits the source PDF. Downloaded files follow your organization’s retention policy.",
      },
    ],
    caveat: "Browser, device, endpoint-security, backup, and download-folder policies remain under your organization’s control. Do not process files on an unmanaged device.",
  },
  pricing: {
    label: "Pricing placeholder",
    title: "Start with the review workflow, then price the saved work.",
    intro: "This MVP does not take payment. Pilot pricing should be based on page complexity, reviewer time, evidence requirements, and deployment needs.",
    cards: [
      {
        label: "MVP",
        title: "Local evaluator",
        price: "Free during validation",
        copy: "Single-file browser analysis, status decisions, restricted metadata revisions, and evidence-pack export.",
        action: "Open analyzer",
      },
      {
        label: "Design partner",
        title: "Team pilot",
        price: "Scoped with your workflow",
        copy: "Representative document set, reviewer playbook, ruleset feedback, and measured manual time saved.",
        action: "Pilot contact placeholder",
      },
      {
        label: "Future",
        title: "Organization",
        price: "Not yet offered",
        copy: "Policy-controlled deployment, review assignments, retention controls, integrations, and procurement evidence.",
        action: "Roadmap only",
      },
    ],
  },
  finalBoundary: {
    label: "The product promise",
    title: "Evidence you can review. Decisions you can defend.",
    copy: "Not one-click compliance. Not automatic certification. Not legal advice. A clearer path from verifiable PDF signals to accountable human remediation.",
    action: "Analyze a PDF locally",
  },
  footer: {
    workingName: "ClearTag is a temporary working name for this MVP.",
    retention: "No server-side PDF retention in this build.",
  },
  workspace: {
    label: "Analysis workspace",
    reviewAnother: "Review another file",
    downloadPack: "Download evidence pack",
    imageOnlyTitle: "Text-based remediation is out of scope for this version.",
    imageOnlyCopy: "The analyzer recorded image-only signals and metadata evidence, but OCR and content verification must happen in an approved external workflow.",
    findingSummaryAria: "Finding summary",
    summary: {
      machine: "machine-detected failures",
      review: "open review items",
      notEvaluated: "not evaluated",
      decided: "reviewer decisions",
    },
    selectedMappingsAria: "Selected evidence mappings",
    evidenceMappings: "Evidence mappings:",
    mappingCaveat: "Mappings organize evidence; they are not conformance results.",
    queue: "Review queue",
    findings: "findings",
    severity: "Severity",
    status: "Status",
    category: "Category",
    all: "All",
    noMatches: "No findings match these filters.",
    page: "Page",
    documentWide: "Document-wide",
    location: "Location",
    evidence: "Evidence",
    method: "Method",
    mapping: "Evidence mapping",
    noNormativeResult: "No normative result is assigned to this declared coverage limit.",
    guidance: "Guided next steps",
    restrictedWriteback: "Restricted writeback",
    createRevision: "Create a restricted metadata revision",
    revisionBoundary: "The original is never overwritten. ClearTag strictly preflights the real input bytes, refuses rich or uncertain structures, writes a separately serialized PDF, then reopens and rechecks it. Preserve the original and review the output; this is not a guarantee that only metadata bytes changed or that the PDF is undamaged.",
    accurateTitle: "Accurate document title",
    primaryLanguage: "Primary language tag",
    titleExample: "Example: 2026–27 Financial Aid Guide",
    languageExample: "Example: en-US",
    createAndRecheck: "Create and recheck version",
    humanDecision: "Human decision",
    recordStatus: "Record reviewer status",
    reviewerRationale: "Reviewer rationale",
    required: "required",
    rationalePlaceholder: "Record what was checked, the decision, and any follow-up. Do not paste sensitive PDF content.",
    rationaleHelp: "Record what was checked before a status action becomes available.",
    actions: {
      confirmed: "Confirm finding",
      dismissed: "Dismiss with rationale",
      escalated: "Escalate to specialist",
    },
    history: "Status and version history",
    selectFinding: "Select a finding to review its evidence.",
    coverageLabel: "Coverage register",
    coverageTitle: "What was checked—and what was not",
    coverageRegionAria: "Coverage register table",
    coverageCaption: "Analyzer coverage and required follow-up",
    check: "Check",
    recordedState: "Recorded state",
    evidenceNote: "Evidence note",
    versionRecord: "Version record",
    fileVersion: "file version",
    fileVersions: "file versions",
    versionCaveat: "Audit packs identify exact PDF versions; they do not certify compliance.",
    busy: {
      revision: "Strictly preflighting and rechecking a restricted metadata revision",
      report: "Building the local evidence pack",
    },
    messages: {
      statusRecorded: "Status recorded",
      versionVerified: "verified and downloaded. The original file was not overwritten.",
      reportDownloaded: "Evidence pack downloaded as accessible HTML, JSON, and README files.",
      revisionFailed: "The restricted metadata revision failed.",
      reportFailed: "The evidence pack failed.",
    },
  },
  report: {
    htmlLang: "en",
    title: "Remediation Evidence Pack",
    titlePrefix: "Remediation Evidence Pack",
    eyebrow: "ClearTag · versioned review record",
    notCertificate: "Not a certificate of conformance.",
    disclaimer: "This evidence pack records the checks performed, findings, changes, and reviewer decisions for the identified PDF version. It is not an accessibility certification, legal opinion, or guarantee of conformance with WCAG, Section 508, PDF/UA, EN 301 549, the WAD, the EAA, or any procurement requirement. Automated checks cover only the methods and scope listed in this report. Manual and assistive-technology testing may still be required. Applicable obligations and exceptions depend on the publisher, content, jurisdiction, contract, and use.",
    skip: "Skip to report",
    scopeHeading: "File, scope, and method",
    fileName: "File name",
    pagesAndSize: "Pages and size",
    analyzed: "Analyzed",
    tool: "Tool",
    ruleset: "Ruleset",
    totalsAria: "Finding status totals",
    evidenceMappings: "Evidence mappings",
    declaredLimits: "Declared limits",
    coverageHeading: "Coverage register",
    coverageCaption: "What the analyzer observed, and what still needs human work",
    check: "Check",
    recordedState: "Recorded state",
    evidenceNote: "Evidence note",
    findingsHeading: "Findings and reviewer decisions",
    versionsHeading: "Version record",
    version: "Version",
    footer: "Generated locally by ClearTag. The source PDF is not embedded in this report.",
    rule: "Rule",
    location: "Location",
    evidence: "Evidence",
    method: "Method",
    standardsMapping: "Standards mapping",
    noNormativeResult: "No normative result assigned",
    before: "Before",
    after: "After",
    guidedSteps: "Guided next steps",
    statusHistory: "Status history",
    date: "Date",
    actor: "Actor",
    change: "Change",
    note: "Note",
    created: "Created",
    documentWide: "Document-wide",
    page: "Page",
    readmeTitle: "ClearTag Remediation Evidence Pack",
    readmeNotCertificate: "Not a certificate of conformance",
    sourceFile: "Source file",
    sourceHash: "Source SHA-256",
    openHtml: "Open remediation-evidence.html in a browser for the accessible human-readable report.",
    useJson: "Use evidence.json for machine-readable review records.",
    sourceOmitted: "The source PDF is intentionally not included in this package.",
  },
} as const;

export type UiCopy = DeepStringShape<typeof EN_UI_COPY>;

const ZH_UI_COPY: UiCopy = {
  locale: {
    switchLabel: "语言",
    english: "English",
    chinese: "中文",
    changeToEnglish: "切换到 English",
    changeToChinese: "切换到中文",
  },
  navigation: {
    skip: "跳到主要内容",
    brandAria: "ClearTag 首页",
    tagline: "PDF 无障碍修复工作台 · 临时名称",
    primaryAria: "主导航",
    workflow: "工作流程",
    standards: "标准",
    security: "安全",
    pricing: "价格",
    openAnalyzer: "打开分析器",
  },
  hero: {
    eyebrow: "引导式 PDF 无障碍修复",
    title: "把无障碍问题转化为可复核的修复和可追溯的证据。",
    lead: "在浏览器中分析文本型 PDF，按页定位结构风险，引导人工复核，并导出带版本记录的修复证据包。",
    boundariesAria: "产品边界",
    boundaries: [
      "机器检测到的问题与人工验证结果始终分开记录。",
      "每项发现都保留页码、证据、方法、标准映射和状态。",
      "复杂标签、表格、公式和表单会升级给专业人员处理。",
    ],
    boundaryNote: "提供引导式修复，不承诺一键合规。",
  },
  intake: {
    kicker: "本地分析器",
    title: "检查 PDF",
    privacyChip: "浏览器内处理",
    chooseOrDrop: "选择或拖入 PDF",
    fileRequirements: "文本型 PDF · 1–100 页 · 最大 50 MB",
    selected: "已选择",
    browse: "浏览文件",
    remove: "移除所选文件",
    mappingLegend: "证据映射",
    opening: "正在打开 PDF",
    starting: "正在启动",
    progressAria: "PDF 分析进度",
    cancel: "取消分析",
    analyze: "在本地分析",
    privacy: "文件和提取内容只保留在当前标签页中。PDF 文本、表单值和链接目标不会被记录或上传。",
    samplesAria: "使用样例 PDF 测试",
    samplesLead: "试用真实样例：",
    taggedSample: "含基础标签的样例",
    issuesSample: "含已知问题的样例",
    errors: {
      tooLarge: "请选择不超过 50 MB 的 PDF。",
      noMapping: "请至少选择一种证据映射。",
      unavailable: "样例文件暂不可用。",
      analyzeFailed: "无法分析此 PDF。",
    },
  },
  confidence: {
    aria: "MVP 处理说明",
    items: [
      { value: "1–100", label: "每份文件支持的文本型页面数" },
      { value: "本地", label: "在当前浏览器标签页内分析" },
      { value: "SHA-256", label: "文件与版本指纹" },
      { value: "人工", label: "明确保留人工复核" },
    ],
  },
  audience: {
    label: "为可问责交付而设计",
    title: "这是复核队列，不是简单的通过或失败标签。",
    intro: "面向需要对公开发布或合同交付 PDF 负责的团队：每项发现都需要负责人、决定和证据，而不是掩盖不确定性的分数。",
    cards: [
      { title: "无障碍咨询机构", copy: "批量分流客户文件，保留复核决定，并随修复版本交付证据。" },
      { title: "公立高校与社区学院", copy: "在发布前检查课程大纲、课程资料、招生与资助表单、培训材料和公共通知。" },
      { title: "政府文档团队", copy: "处理议会材料、许可证、福利申请、预算、公告和采购交付文件。" },
      { title: "联邦项目交付供应商", copy: "按合同、机构方法、验收标准和 Section 508 复核流程整理所需证据。" },
    ],
    documentTypes: "常见文件：课程讲义 · 课程大纲 · 招生与资助表单 · 议会材料 · 许可证 · 福利申请 · 预算 · 公共通知 · 培训材料 · 用户指南 · 项目交付报告",
  },
  workflow: {
    label: "证据驱动的工作流程",
    title: "从文件接收到可交代的交付。",
    intro: "自动化用于缩小复核范围；内容含义、真实可用性和最终交付决定仍由人负责。",
    steps: [
      { title: "本地分析", copy: "验证文件，为原始字节生成指纹，并逐页检查真实的 PDF 结构和批注信号。" },
      { title: "复核机器无法判断的内容", copy: "确认含义、阅读顺序、替代文本质量、表格关系、表单行为和适用例外。" },
      { title: "建立版本、复查并导出", copy: "创建经过严格预检的元数据修订版，保留原件，重新检测并导出无障碍 HTML 与 JSON 证据。" },
    ],
  },
  scope: {
    label: "如实说明覆盖范围",
    title: "三条处理路径，不隐藏“通过”结论。",
    intro: "绿色信号只表示没有发现某个可由机器检测的问题，绝不表示文档已经合规或获得认证。",
    lanes: [
      {
        label: "机器检测",
        title: "客观 PDF 信号",
        items: ["页数与可搜索文本", "标题、语言、MarkInfo 和可见标签角色", "标题层级跳跃及基础列表/表格关系", "链接和表单控件批注属性"],
      },
      {
        label: "人工验证",
        title: "语义和真实可用性",
        items: ["目标阅读器中的逻辑阅读顺序", "标题与链接目的", "替代文本准确性与装饰性判断", "表头、键盘流程与字段说明"],
      },
      {
        label: "升级处理 / 未评估",
        title: "专业修复范围",
        items: ["复杂标签树和复杂表格", "公式语义和 STEM 记号", "XFA、脚本、签名和复杂表单", "完整 PDF/UA 验证和法律适用性"],
      },
    ],
  },
  standards: {
    label: "标准与法律背景",
    title: "这是证据映射，不是“合规模式”。",
    intro: "实际义务取决于发布者、内容、司法辖区、合同、例外和用途。ClearTag 将证据映射到复核目标，但不会把局部扫描包装成符合性结论。",
    cards: [
      {
        label: "美国州及地方政府",
        title: "Title II · WCAG 2.1 A / AA",
        copy: "现行联邦截止日期为：人口达到 50,000 的公共实体在 2027 年 4 月 26 日前完成；较小实体和特别区政府在 2028 年 4 月 26 日前完成。有限例外需要结合具体情形判断。",
        link: "美国司法部小型实体指南",
      },
      {
        label: "美国联邦电子文档",
        title: "修订版 Section 508 · E205",
        copy: "适用的非网页文档映射到相应的 WCAG 2.0 A / AA 成功准则。供应商义务来自机构范围、合同、工作说明书和验收方法，并非对所有承包商的一概要求。",
        link: "供应商指南",
      },
      {
        label: "PDF 互操作性",
        title: "PDF/UA-1 预检信号",
        copy: "本 MVP 只检查 PDF/UA-1 相关的部分结构信号。它不是完整的 ISO 14289-1 验证器；PDF/UA 也不是法律认证，不能替代语义复核。",
        link: "ISO 14289-1:2014",
      },
      {
        label: "欧洲公共部门及特定服务",
        title: "EN 301 549 / WAD · EAA 背景",
        copy: "WAD 的文档要求采用 EN 301 549 第 10 章语境。EAA 只覆盖特定消费产品和服务，并非所有 PDF；仍需确认各国适用范围和现行协调标准。",
        link: "《欧洲无障碍法案》",
      },
    ],
  },
  security: {
    label: "架构级隐私保护",
    title: "文档留在当前标签页。",
    intro: "本 MVP 没有文档上传 API、数据库、分析埋点或留存任务。关闭或刷新标签页会清除内存中的当前复核状态。",
    cards: [
      { title: "本地处理", copy: "PDF 字节在浏览器内解析。提取文本、表单值和完整链接目标不会写入日志或浏览器存储。" },
      { title: "明确删除", copy: "点击“检查另一份文件”会释放内存中的当前引用；生成的下载 URL 会在使用后撤销。" },
      { title: "用户控制证据", copy: "证据包在本地生成且不包含源 PDF；下载后的文件遵循贵组织的留存政策。" },
    ],
    caveat: "浏览器、设备、终端安全、备份和下载目录政策仍由贵组织控制。请勿在不受管理的设备上处理文件。",
  },
  pricing: {
    label: "价格占位",
    title: "先验证复核流程，再根据节省的工作量定价。",
    intro: "本 MVP 不收取费用。试点价格应基于页面复杂度、复核时间、证据要求和部署需求。",
    cards: [
      { label: "MVP", title: "本地评估器", price: "验证期间免费", copy: "单文件浏览器分析、状态决定、受限元数据修订和证据包导出。", action: "打开分析器" },
      { label: "设计合作伙伴", title: "团队试点", price: "按工作流程确定范围", copy: "使用代表性文档集、复核手册、规则反馈和实际节省的人工时间开展验证。", action: "试点联系占位" },
      { label: "未来版本", title: "组织版", price: "尚未提供", copy: "受政策控制的部署、复核分派、留存控制、集成和采购证据。", action: "仅为路线图" },
    ],
  },
  finalBoundary: {
    label: "产品承诺",
    title: "证据可复核，决定可解释。",
    copy: "不承诺一键合规，不提供自动认证，也不构成法律意见；它提供一条从可验证 PDF 信号走向可问责人工修复的清晰路径。",
    action: "在本地分析 PDF",
  },
  footer: {
    workingName: "ClearTag 是本 MVP 的临时工作名称。",
    retention: "此版本不在服务器端留存 PDF。",
  },
  workspace: {
    label: "分析工作台",
    reviewAnother: "检查另一份文件",
    downloadPack: "下载证据包",
    imageOnlyTitle: "此版本不支持对图片型 PDF 进行内容修复。",
    imageOnlyCopy: "分析器会记录图片型页面信号和元数据证据，但 OCR 与内容验证必须在经过批准的外部流程中完成。",
    findingSummaryAria: "问题汇总",
    summary: {
      machine: "机器检测到的问题",
      review: "待复核项目",
      notEvaluated: "未评估项目",
      decided: "复核决定",
    },
    selectedMappingsAria: "已选证据映射",
    evidenceMappings: "证据映射：",
    mappingCaveat: "映射用于组织证据，不代表符合性结论。",
    queue: "复核队列",
    findings: "项发现",
    severity: "严重程度",
    status: "状态",
    category: "类别",
    all: "全部",
    noMatches: "没有符合当前筛选条件的发现。",
    page: "第",
    documentWide: "文档级",
    location: "位置",
    evidence: "证据",
    method: "方法",
    mapping: "证据映射",
    noNormativeResult: "此项为已声明的覆盖范围限制，不赋予规范性结论。",
    guidance: "建议的后续步骤",
    restrictedWriteback: "受限写回",
    createRevision: "创建受限元数据修订版",
    revisionBoundary: "原文件绝不会被覆盖。ClearTag 会严格预检真实输入字节，拒绝复杂或无法确定安全性的结构，另行序列化新 PDF，再重新打开并复查。请保留原件并人工检查输出；这不保证只改变了元数据字节，也不保证 PDF 绝对无损。",
    accurateTitle: "准确的文档标题",
    primaryLanguage: "主要语言标签",
    titleExample: "例如：2026–27 年助学金指南",
    languageExample: "例如：zh-CN",
    createAndRecheck: "创建并复查新版本",
    humanDecision: "人工决定",
    recordStatus: "记录复核状态",
    reviewerRationale: "复核依据",
    required: "必填",
    rationalePlaceholder: "记录检查内容、决定和后续事项。请勿粘贴 PDF 中的敏感内容。",
    rationaleHelp: "请先记录检查内容，随后才能执行状态操作。",
    actions: {
      confirmed: "确认该发现",
      dismissed: "填写依据后忽略",
      escalated: "升级给专业人员",
    },
    history: "状态与版本历史",
    selectFinding: "请选择一项发现以查看证据。",
    coverageLabel: "覆盖范围登记",
    coverageTitle: "已检查内容与未检查内容",
    coverageRegionAria: "覆盖范围登记表",
    coverageCaption: "分析器覆盖范围与必要后续工作",
    check: "检查项",
    recordedState: "记录状态",
    evidenceNote: "证据说明",
    versionRecord: "版本记录",
    fileVersion: "个文件版本",
    fileVersions: "个文件版本",
    versionCaveat: "审计包会标识确切 PDF 版本，但不提供合规认证。",
    busy: {
      revision: "正在严格预检并复查受限元数据修订版",
      report: "正在生成本地证据包",
    },
    messages: {
      statusRecorded: "已记录状态",
      versionVerified: "已验证并下载。原文件未被覆盖。",
      reportDownloaded: "证据包已下载，内含无障碍 HTML、JSON 和 README 文件。",
      revisionFailed: "受限元数据修订失败。",
      reportFailed: "证据包生成失败。",
    },
  },
  report: {
    htmlLang: "zh-CN",
    title: "PDF 修复证据包",
    titlePrefix: "PDF 修复证据包",
    eyebrow: "ClearTag · 带版本的复核记录",
    notCertificate: "本报告不是符合性证书。",
    disclaimer: "本证据包记录了针对指定 PDF 版本执行的检查、发现、变更和复核决定。它不是无障碍认证、法律意见，也不保证符合 WCAG、Section 508、PDF/UA、EN 301 549、WAD、EAA 或任何采购要求。自动检查仅覆盖本报告列明的方法和范围，仍可能需要人工及辅助技术测试。实际义务和例外取决于发布者、内容、司法辖区、合同和用途。",
    skip: "跳到报告正文",
    scopeHeading: "文件、范围与方法",
    fileName: "文件名",
    pagesAndSize: "页数与大小",
    analyzed: "分析时间",
    tool: "工具",
    ruleset: "规则集",
    totalsAria: "各状态发现数量",
    evidenceMappings: "证据映射",
    declaredLimits: "已声明限制",
    coverageHeading: "覆盖范围登记",
    coverageCaption: "分析器观察到的内容及仍需人工完成的工作",
    check: "检查项",
    recordedState: "记录状态",
    evidenceNote: "证据说明",
    findingsHeading: "发现与复核决定",
    versionsHeading: "版本记录",
    version: "版本",
    footer: "由 ClearTag 在本地生成。此报告未嵌入源 PDF。",
    rule: "规则",
    location: "位置",
    evidence: "证据",
    method: "方法",
    standardsMapping: "标准映射",
    noNormativeResult: "未赋予规范性结论",
    before: "修订前",
    after: "修订后",
    guidedSteps: "建议的后续步骤",
    statusHistory: "状态历史",
    date: "日期",
    actor: "操作方",
    change: "变更",
    note: "备注",
    created: "已创建",
    documentWide: "文档级",
    page: "第",
    readmeTitle: "ClearTag PDF 修复证据包",
    readmeNotCertificate: "不是符合性证书",
    sourceFile: "源文件",
    sourceHash: "源文件 SHA-256",
    openHtml: "请在浏览器中打开 remediation-evidence.html，查看无障碍的人类可读报告。",
    useJson: "evidence.json 用于机器可读的复核记录。",
    sourceOmitted: "本证据包有意不包含源 PDF。",
  },
};

export const UI_COPY: Readonly<Record<Locale, UiCopy>> = {
  en: EN_UI_COPY,
  zh: ZH_UI_COPY,
};

export function getUiCopy(locale: Locale): UiCopy {
  return UI_COPY[locale];
}

export interface StandardProfileCopy {
  shortName: string;
  name: string;
  description: string;
  scopeNote: string;
}

export const STANDARD_PROFILE_COPY: Readonly<
  Record<Locale, Record<StandardProfileId, StandardProfileCopy>>
> = {
  en: {
    wcag21: {
      shortName: "WCAG 2.1 AA",
      name: "WCAG 2.1 AA — document interpretation",
      description: "Maps findings to relevant WCAG 2.1 A/AA success criteria and informative W3C PDF techniques.",
      scopeNote: "A partial automated mapping is not a WCAG conformance determination.",
    },
    section508: {
      shortName: "Section 508",
      name: "Revised Section 508 — electronic documents",
      description: "Maps covered document findings to E205 and applicable WCAG 2.0 A/AA criteria.",
      scopeNote: "The contract, agency method, and acceptance process determine required evidence.",
    },
    pdfua1: {
      shortName: "PDF/UA-1",
      name: "PDF/UA-1 preflight — ISO 14289-1:2014",
      description: "Checks selected machine-verifiable structure and syntax signals for PDF 1.x files.",
      scopeNote: "Semantic correctness and full PDF/UA validation require specialist tools and human review.",
    },
    en301549: {
      shortName: "EN 301 549 / WAD",
      name: "EN 301 549 v3.2.1 / WAD context",
      description: "Maps downloadable-document findings to relevant clause 10 requirements.",
      scopeNote: "WCAG-only coverage is not equivalent to WAD conformity.",
    },
    "eaa-context": {
      shortName: "EAA context",
      name: "EAA context — informational",
      description: "Adds scope notes for selected consumer products and services covered by the EAA.",
      scopeNote: "The EAA does not cover every PDF. Confirm sector scope, national law, and current harmonised standards.",
    },
  },
  zh: {
    wcag21: {
      shortName: "WCAG 2.1 AA",
      name: "WCAG 2.1 AA — 文档解释",
      description: "将发现映射到相关 WCAG 2.1 A/AA 成功准则及 W3C PDF 信息性技术。",
      scopeNote: "局部自动映射不构成 WCAG 符合性判定。",
    },
    section508: {
      shortName: "Section 508",
      name: "修订版 Section 508 — 电子文档",
      description: "将适用的文档发现映射到 E205 和相应 WCAG 2.0 A/AA 准则。",
      scopeNote: "所需证据由合同、机构方法和验收流程决定。",
    },
    pdfua1: {
      shortName: "PDF/UA-1",
      name: "PDF/UA-1 预检 — ISO 14289-1:2014",
      description: "检查 PDF 1.x 文件中部分可由机器验证的结构和语法信号。",
      scopeNote: "语义正确性和完整 PDF/UA 验证需要专业工具与人工复核。",
    },
    en301549: {
      shortName: "EN 301 549 / WAD",
      name: "EN 301 549 v3.2.1 / WAD 背景",
      description: "将可下载文档中的发现映射到第 10 章相关要求。",
      scopeNote: "仅覆盖 WCAG 不等同于符合 WAD。",
    },
    "eaa-context": {
      shortName: "EAA 背景",
      name: "EAA 背景 — 仅供参考",
      description: "补充 EAA 所覆盖特定消费产品和服务的范围说明。",
      scopeNote: "EAA 不覆盖所有 PDF；请确认行业范围、各国法律和现行协调标准。",
    },
  },
};

export function getStandardProfileCopy(
  profileId: StandardProfileId,
  locale: Locale,
): StandardProfileCopy {
  return STANDARD_PROFILE_COPY[locale][profileId];
}

export const LABEL_COPY = {
  severity: {
    en: { critical: "Critical severity", high: "High severity", medium: "Medium severity", low: "Low severity" },
    zh: { critical: "严重", high: "高", medium: "中", low: "低" },
  },
  detection: {
    en: {
      machine: "Machine-detected failure",
      heuristic: "Potential issue — review required",
      manual: "Manual verification required",
      "not-evaluated": "Not evaluated",
    },
    zh: {
      machine: "机器检测到的问题",
      heuristic: "潜在问题 — 需要复核",
      manual: "需要人工验证",
      "not-evaluated": "未评估",
    },
  },
  status: {
    en: {
      open: "Open",
      confirmed: "Confirmed by reviewer",
      dismissed: "Dismissed with reviewer rationale",
      escalated: "Escalated to specialist",
      fixed: "Resolved and rechecked",
    },
    zh: {
      open: "待处理",
      confirmed: "复核人已确认",
      dismissed: "已填写依据并忽略",
      escalated: "已升级给专业人员",
      fixed: "已修订并复查",
    },
  },
  coverage: {
    en: {
      "issue-found": "Issue or risk signal found",
      "signal-present": "No machine-detectable issue found",
      manual: "Manual verification required",
      "not-evaluated": "Not evaluated",
    },
    zh: {
      "issue-found": "发现问题或风险信号",
      "signal-present": "未发现机器可检测的问题",
      manual: "需要人工验证",
      "not-evaluated": "未评估",
    },
  },
  category: {
    en: {
      input: "Input",
      ocr: "OCR",
      metadata: "Metadata",
      structure: "Structure",
      headings: "Headings",
      lists: "Lists",
      links: "Links",
      images: "Images",
      "reading-order": "Reading order",
      tables: "Tables",
      forms: "Forms",
      "text-encoding": "Text encoding",
      coverage: "Coverage",
    },
    zh: {
      input: "输入文件",
      ocr: "OCR",
      metadata: "元数据",
      structure: "文档结构",
      headings: "标题层级",
      lists: "列表",
      links: "链接",
      images: "图像",
      "reading-order": "阅读顺序",
      tables: "表格",
      forms: "表单",
      "text-encoding": "文本编码",
      coverage: "覆盖范围",
    },
  },
} as const;

export function severityLabel(value: Severity, locale: Locale): string {
  return LABEL_COPY.severity[locale][value];
}

export function detectionLabel(value: DetectionKind, locale: Locale): string {
  return LABEL_COPY.detection[locale][value];
}

export function statusLabel(value: FindingStatus, locale: Locale): string {
  return LABEL_COPY.status[locale][value];
}

export function coverageLabel(value: CoverageItem["state"], locale: Locale): string {
  return LABEL_COPY.coverage[locale][value];
}

export function categoryLabel(value: FindingCategory, locale: Locale): string {
  return LABEL_COPY.category[locale][value];
}

export function actorLabel(value: "analyzer" | "reviewer", locale: Locale): string {
  if (locale === "zh") return value === "analyzer" ? "分析器" : "复核人";
  return value === "analyzer" ? "Analyzer" : "Reviewer";
}

export function pageLabel(page: number | null, locale: Locale): string {
  if (page === null) return UI_COPY[locale].report.documentWide;
  return locale === "zh" ? `第 ${page} 页` : `Page ${page}`;
}

export function pageCountLabel(count: number, locale: Locale): string {
  if (locale === "zh") return `${count} 页`;
  return `${count} page${count === 1 ? "" : "s"}`;
}

export function formatBytes(bytes: number, locale: Locale): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale === "zh" ? "zh-CN" : "en")} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString(locale === "zh" ? "zh-CN" : "en", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} MB`;
}

export function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date)} UTC`;
}

export interface LocalizedFindingContent {
  title: string;
  evidence: string;
  method: string;
  guidance: string[];
}

export const KNOWN_FINDING_RULE_IDS = [
  "OCR-001",
  "FIG-001",
  "FIG-002",
  "LIST-001",
  "LIST-002",
  "LINK-001",
  "FORM-001",
  "TABLE-001",
  "TABLE-002",
  "ORDER-001",
  "TEXT-001",
  "META-001",
  "META-002",
  "STRUCT-001",
  "STRUCT-002",
  "HEAD-001",
  "HEAD-002",
  "HEAD-003",
  "ORDER-900",
  "LINK-900",
  "FIG-900",
  "TABLE-900",
  "FORM-900",
  "COVERAGE-001",
  "COVERAGE-002",
] as const;

export type KnownFindingRuleId = (typeof KNOWN_FINDING_RULE_IDS)[number];

function isKnownFindingRuleId(value: string): value is KnownFindingRuleId {
  return (KNOWN_FINDING_RULE_IDS as readonly string[]).includes(value);
}

type FindingRenderer = (finding: Finding) => LocalizedFindingContent;

const ZH_FINDING_RENDERERS: Record<KnownFindingRuleId, FindingRenderer> = {
  "OCR-001": (finding) => ({
    title: "页面可能只有图像，需要进行 OCR 复核",
    evidence: `观察到 ${metric(finding, "textCharacters")} 个可提取字符和 ${metric(finding, "imagePaintOperations")} 次图像绘制操作。`,
    method: "使用 PDF.js 提取文本并统计图像绘制操作；此方法无法确认图像中是否包含文字。",
    guidance: ["目视确认页面文字是否只存在于图像中。", "在本 MVP 之外使用获批的 OCR 工具，并逐字核对文字及预期阅读顺序。", "重新导出可搜索 PDF，并分析新版本。"],
  }),
  "FIG-001": (finding) => ({
    title: "带标签的图像缺少替代描述数据",
    evidence: `${difference(finding, "figures", "figuresWithAlt")} 个 Figure 结构节点缺少 Alt 或 ActualText 信号；共观察到 ${metric(finding, "figures")} 个 Figure 节点。`,
    method: "检查 PDF.js 暴露的结构树角色和替代描述。",
    guidance: ["判断每个图像是信息性、功能性还是装饰性。", "在专业 PDF 修复工具中为信息性图像添加等效替代描述。", "将真正的装饰性内容标记为 artifact，并使用辅助技术验证。"],
  }),
  "FIG-002": (finding) => ({
    title: "图像内容需要复核结构和装饰性状态",
    evidence: `观察到 ${metric(finding, "imagePaintOperations")} 次图像绘制操作和 ${metric(finding, "figures")} 个 Figure 节点。`,
    method: "比较 PDF.js 图像绘制操作与可见 Figure 结构节点；其中可能包含背景或装饰性图像。",
    guidance: ["检查每个图像并判断其为信息性还是装饰性。", "确认信息性图像映射到带准确描述的 Figure 标签。", "确认装饰性图像不进入阅读顺序。"],
  }),
  "LIST-001": (finding) => ({
    title: "带标签的列表结构不完整",
    evidence: `${metric(finding, "malformedLists")} 个 L 节点未呈现预期的 LI / Lbl / LBody 关系。`,
    method: "检查 PDF.js 暴露的结构树关系。",
    guidance: ["在 PDF 标签编辑器中修复列表容器和列表项层级。", "确保标签和项目正文位于对应 LI 节点中。", "使用屏幕阅读器验证项目数量和嵌套关系。"],
  }),
  "LIST-002": (finding) => ({
    title: "视觉列表模式需要语义列表复核",
    evidence: `发现 ${metric(finding, "visualListCandidates")} 个项目符号或编号行模式，但未暴露 L 结构节点。`,
    method: "将文本行前缀启发式结果与 PDF.js 结构树角色进行比较；装饰字符可能产生误报。",
    guidance: ["确认这些行是否构成真正的列表。", "若是，请按预期嵌套顺序添加 L、LI、Lbl 和 LBody 结构。", "若不是，请在忽略该信号前记录复核依据。"],
  }),
  "LINK-001": (finding) => ({
    title: "链接批注未暴露目标地址",
    evidence: `${metric(finding, "unresolvedLinks")} 个 Link 批注缺少可见的 URI 或文档内目标。`,
    method: "检查 PDF.js 暴露的 Link 批注；证据中不保留 URL。",
    guidance: ["打开每个链接并确认目标有效。", "将批注与对应的 Link 标签关联。", "确认链接文字能在上下文中表达用途。"],
  }),
  "FORM-001": (finding) => ({
    title: "表单字段缺少工具提示或无障碍名称信号",
    evidence: `${metric(finding, "unlabeledWidgets")} 个 Widget 批注缺少解析器暴露的 alternativeText（/TU 工具提示）信号。仅有字段名不能证明无障碍名称恰当。`,
    method: "检查 PDF.js 暴露的 Widget 批注 fieldName 和 alternativeText 信号。此信号无法确定 PDF 阅读器最终播报的名称；字段值不会被保留。",
    guidance: ["添加简洁的工具提示或无障碍名称，说明需要输入的内容。", "确认可见标签、程序化名称和说明彼此一致。", "在桌面 PDF 阅读器中测试焦点顺序、键盘操作、错误提示和屏幕阅读器输出。"],
  }),
  "TABLE-001": (finding) => ({
    title: "带标签的表格未暴露表头单元格",
    evidence: `暴露了 ${metric(finding, "tables")} 个 Table 节点，但没有 TH 节点。`,
    method: "检查 PDF.js 暴露的 Table 和 TH 结构角色。",
    guidance: ["确认内容是数据表格而非布局表格。", "添加 TH 单元格，并将表头与各数据单元格关联。", "将合并单元格、多级表头或复杂跨行跨列情况升级给专业人员复核。"],
  }),
  "TABLE-002": (finding) => ({
    title: "对齐的多列内容需要表格复核",
    evidence: `观察到 ${metric(finding, "visualTableRows")} 行包含三个或更多对齐文本项，但未暴露 Table 节点。`,
    method: "将文本坐标对齐启发式结果与 PDF.js 结构角色比较；分栏和表单也可能类似表格。",
    guidance: ["确认对齐内容是否表达行列关系。", "若为数据表格，请添加 Table、TR、TH、TD 结构和表头关联。", "将复杂跨行跨列和嵌套表格升级给专业人员。"],
  }),
  "ORDER-001": (finding) => ({
    title: "内容流顺序与视觉顺序存在明显差异",
    evidence: `几何比较得到 ${metric(finding, "readingOrderRiskScore")}/100 的风险分数。`,
    method: "将 PDF.js 文本内容顺序与从上到下、从左到右的几何顺序比较；多栏布局可能存在合理差异。",
    guidance: ["在标签树和阅读顺序工具中复核该页。", "在目标 PDF 阅读器中使用屏幕阅读器测试线性阅读。", "确认侧栏、脚注、图注和重复页眉在有意义的位置出现。"],
  }),
  "TEXT-001": (finding) => ({
    title: "提取文本包含替换字符信号",
    evidence: `在 ${metric(finding, "textCharacters")} 个非空白字符中观察到 ${metric(finding, "replacementCharacters")} 个替换字符信号。`,
    method: "检查 PDF.js 提取的 Unicode 文本；不保留文档正文。",
    guidance: ["将少量样本文本复制到纯文本编辑器，并与可见页面比较。", "使用屏幕阅读器验证字符读音。", "若文本损坏，请嵌入字体并使用有效 ToUnicode 映射重新导出。"],
  }),
  "META-001": () => ({
    title: "缺少文档标题元数据",
    evidence: "PDF.js 的文档信息和 XMP 元数据检查未暴露非空 Title 值。",
    method: "检查 PDF.js 暴露的文档信息与 XMP 元数据。",
    guidance: ["输入能简洁说明文档主题或用途的标题。", "将受限元数据修订另存为新的 PDF 版本。", "重新检查阅读器是否显示文档标题，并确认标题准确。"],
  }),
  "META-002": (finding) => {
    const present = metricBoolean(finding, "languagePresent");
    return {
      title: present ? "文档语言值需要修正" : "缺少文档语言元数据",
      evidence: present ? "检测到语言值，但无法将其解析为合理的 BCP 47 语言标签。" : "元数据和页面文本内容均未暴露文档语言值。",
      method: "结合 PDF.js 语言信号与 Intl.Locale 语法验证。",
      guidance: ["选择文档使用的主要自然语言。", "将有效的 BCP 47 语言标签（例如 zh-CN）写入新的 PDF 版本。", "在专业工具中单独检查并标记使用其他语言的段落。"],
    };
  },
  "STRUCT-001": (finding) => ({
    title: "未暴露可用的标签结构",
    evidence: metricBoolean(finding, "markInfoMarked")
      ? "MarkInfo 声明文件已标记，但没有页面暴露可用的结构角色；仅有声明不视为结构证据。"
      : "MarkInfo 未指示 Marked 内容，且没有页面返回结构角色。",
    method: "检查 PDF.js 暴露的 MarkInfo 与逐页结构树。",
    guidance: ["从源文档或专业 PDF 修复工具创建逻辑标签树。", "将标题、段落、列表、链接、图像、表格和表单控件映射到语义标签。", "人工验证标签顺序与语义；本 MVP 不创建标签树。"],
  }),
  "STRUCT-002": () => ({
    title: "PDF MarkInfo 将结构标记为可疑",
    evidence: "MarkInfo 的 Suspects 标志为 true。",
    method: "检查 PDF.js 暴露的 MarkInfo。",
    guidance: ["审计完整结构树，查找自动生成或错误标签。", "修复被误标为 artifact 或分配了错误语义角色的内容。", "修复后重新运行专业 PDF/UA 验证器。"],
  }),
  "HEAD-001": (finding) => ({
    title: "带标签的标题层级发生跳级",
    evidence: `${metric(finding, "previousHeading")} 后紧接 ${metric(finding, "currentHeading")}。`,
    method: "按顺序比较 PDF.js 暴露的 H1–H6 结构角色。",
    guidance: ["在源文档中确认预期大纲。", "重新标记标题，使层级反映章节嵌套，而不是只依赖视觉字号。", "使用屏幕阅读器检查完整标题列表。"],
  }),
  "HEAD-002": (finding) => ({
    title: "通用标题标签需要验证层级",
    evidence: `暴露了 ${metric(finding, "genericHeadingCount")} 个没有明确 H1–H6 层级的通用 H 角色。`,
    method: "检查 PDF.js 暴露的标题角色。",
    guidance: ["将每个通用标题与文档大纲进行比较。", "在创作工具和目标标准要求时分配明确层级。", "确认脱离正文、作为列表朗读时，标题仍然表达清楚。"],
  }),
  "HEAD-003": (finding) => ({
    title: "视觉标题候选项需要语义标签复核",
    evidence: `${metric(finding, "candidatePages")} 页包含短文本，其字体高度明显大于页面中位数。`,
    method: "使用字体高度和行长度启发式方法；大号文本也可能是装饰或提示，因此需要人工判断语义。",
    guidance: ["识别真正承担章节标题功能的文本，不要只依据视觉外观。", "添加与文档大纲相符的标题标签。", "对误报的展示性文本记录复核依据。"],
  }),
  "ORDER-900": (finding) => ({
    title: "逻辑阅读顺序需要人工及辅助技术复核",
    evidence: `自动几何与标签信号无法证明 ${metric(finding, "pagesRequiringReview")} 页形成有意义的阅读体验。`,
    method: "必须人工覆盖；不推断通过或失败结论。",
    guidance: ["在目标 PDF 阅读器中使用屏幕阅读器线性朗读文档。", "检查分栏、图注、脚注、侧栏、重复页眉和 artifact。", "记录阅读器、辅助技术、版本、复核人和结果。"],
  }),
  "LINK-900": (finding) => ({
    title: "链接目的和行为需要人工验证",
    evidence: `解析器识别到 ${metric(finding, "linkAnnotations")} 个链接批注，但无法判断可见链接文字是否表达用途，或目标是否恰当。`,
    method: "对观察到的链接批注执行必要的语义与交互复核。",
    guidance: ["在上下文和屏幕阅读器链接列表中逐一复核链接。", "验证焦点、激活、目标以及与周围文字的区分。", "除非项目要求，否则不要在审计记录中暴露敏感目标 URL。"],
  }),
  "FIG-900": (finding) => ({
    title: "替代文本准确性和装饰性意图需要人工复核",
    evidence: `观察到 ${metric(finding, "imagePaintOperations")} 次图像绘制操作和 ${metric(finding, "figures")} 个 Figure 节点。`,
    method: "对观察到的图像和 Figure 信号执行必要的语义复核。",
    guidance: ["结合上下文确认每个图像的用途。", "评估描述是否提供等效信息且没有不必要细节。", "确认装饰性内容不进入辅助技术阅读顺序。"],
  }),
  "TABLE-900": () => ({
    title: "表格关系需要人工验证",
    evidence: "仅凭结构数量无法确定单元格含义、复杂跨行跨列和表头关联。",
    method: "对观察到的表格信号执行必要的语义和辅助技术复核。",
    guidance: ["使用屏幕阅读器按行和列浏览每个数据表格。", "验证表头播报、跨行跨列、缩写和阅读顺序。", "将复杂、嵌套或依赖布局的表格升级给专业人员。"],
  }),
  "FORM-900": (finding) => ({
    title: "交互式表单行为需要专业人员验证",
    evidence: `观察到 ${metric(finding, "widgetAnnotations")} 个 Widget 批注。`,
    method: "必须进行交互复核。本 MVP 不评估脚本、错误、字段依赖关系或完整 Tab 顺序。",
    guidance: ["仅使用键盘和屏幕阅读器测试每个字段。", "验证标签、说明、必填状态、错误、焦点顺序和提交行为。", "将 XFA、计算、签名和脚本验证升级给专业人员。"],
  }),
  "COVERAGE-001": () => ({
    title: "未评估视觉呈现",
    evidence: "此浏览器分析未测量颜色对比度、仅用颜色表达含义、缩放、重排、裁切或可见焦点指示器。",
    method: "已声明的分析器覆盖范围限制。",
    guidance: ["复核视觉对比度和仅通过颜色传达的信息。", "在目标阅读器中测试缩放、放大和文档可用性。", "记录工具、设置、抽样页面和复核结果。"],
  }),
  "COVERAGE-002": () => ({
    title: "未评估复杂语义",
    evidence: "公式语义、复杂标签树、复杂表格、XFA、脚本、签名和完整 PDF/UA 语法不在本 MVP 规则集范围内。",
    method: "已声明的分析器覆盖范围限制。",
    guidance: ["将复杂结构和交互行为升级给无障碍专业人员。", "目标规范要求时，使用完整 PDF/UA 验证器并由具备专业知识的人员复核。", "记录省略的方法和适用的采购验收标准。"],
  }),
};

/**
 * Returns localized rule-authored content only. File names, extracted PDF text,
 * reviewer notes, before/after values, and other user-authored values are never
 * translated here. Unknown rules intentionally retain their source text.
 */
export function localizeFindingContent(
  finding: Finding,
  locale: Locale,
): LocalizedFindingContent {
  if (locale === "en" || !isKnownFindingRuleId(finding.ruleId)) {
    return {
      title: finding.title,
      evidence: finding.evidence,
      method: finding.method,
      guidance: [...finding.guidance],
    };
  }
  return ZH_FINDING_RENDERERS[finding.ruleId](finding);
}

export function localizeFinding(finding: Finding, locale: Locale): Finding {
  return { ...finding, ...localizeFindingContent(finding, locale) };
}

export function localizeFindingLocation(finding: Finding, locale: Locale): string {
  if (locale === "en") return finding.location;
  if (finding.page !== null) return `第 ${finding.page} 页 · ${categoryLabel(finding.category, locale)}`;
  const documentLocations: Partial<Record<FindingCategory, string>> = {
    metadata: "文档元数据",
    structure: "文档结构",
    headings: "文档标题结构",
    links: "文档内全部链接",
    images: "包含图像或 Figure 信号的全部页面",
    "reading-order": "全部页面",
    tables: "包含表格信号的全部页面",
    forms: "交互式表单字段",
    coverage: "文档级",
  };
  return documentLocations[finding.category] ?? "文档级";
}

const ZH_COVERAGE_COPY: Record<
  CoverageItem["id"],
  { label: string; note: Partial<Record<CoverageItem["state"], string>> }
> = {
  input: { label: "输入文件", note: {} },
  ocr: {
    label: "可搜索文本 / OCR 风险",
    note: {
      "issue-found": "一个或多个以图像为主的页面需要复核。",
      "signal-present": "未发现机器可检测的纯图像页面信号。",
      manual: "需要人工确认文字是否可搜索。",
    },
  },
  metadata: {
    label: "标题与文档语言",
    note: {
      "issue-found": "元数据信号缺失或无效。",
      "signal-present": "必要元数据信号存在，但仍需复核语义是否准确。",
      manual: "需要人工验证元数据语义。",
    },
  },
  structure: {
    label: "标签结构",
    note: {
      "issue-found": "未暴露可用结构信号，或结构信号存在问题。",
      "signal-present": "已暴露结构信号；存在不代表语义正确。",
      manual: "需要人工验证标签结构。",
    },
  },
  headings: { label: "标题层级", note: { "issue-found": "标题层级信号需要处理。", "signal-present": "未发现机器可检测的标题跳级；含义仍需复核。", manual: "需要人工复核标题含义与层级。" } },
  lists: { label: "列表结构", note: { "issue-found": "列表结构或视觉列表信号需要复核。", "signal-present": "未发现机器可检测的列表结构问题。", manual: "需要人工复核列表语义。" } },
  links: { label: "链接", note: { "issue-found": "链接批注存在问题或风险信号。", "signal-present": "已检查批注；链接目的和行为仍需人工复核。", manual: "未暴露链接批注；视觉样式类似链接的内容仍需复核。" } },
  images: { label: "图像与替代描述", note: { "issue-found": "图像或替代描述信号需要处理。", "signal-present": "已检查图像信号；描述质量和意图仍需人工复核。", manual: "未暴露图像绘制信号；装饰性和矢量内容仍需复核。" } },
  "reading-order": { label: "逻辑阅读顺序", note: { manual: "始终需要检查标签树并使用辅助技术验证。" } },
  tables: { label: "基础表格结构", note: { "issue-found": "表格结构信号需要处理。", "signal-present": "已检查基础表格信号；表头关系、跨行跨列和含义仍需人工复核。", manual: "表头关系、跨行跨列和含义需要人工复核。" } },
  forms: { label: "表单字段命名信号", note: { "issue-found": "表单字段命名信号需要处理。", "signal-present": "已检查字段命名信号；行为、说明、错误和焦点顺序仍需专业复核。", manual: "字段行为、说明、错误和焦点顺序需要专业复核。" } },
  "text-encoding": { label: "文本编码", note: {} },
  coverage: { label: "视觉、公式和复杂交互覆盖范围", note: { "not-evaluated": "明确不在本 MVP 规则集范围内。" } },
};

export function localizeCoverageItem(item: CoverageItem, locale: Locale): CoverageItem {
  if (locale === "en") return item;
  const copy = ZH_COVERAGE_COPY[item.id];
  return {
    ...item,
    label: copy.label,
    note: copy.note[item.state] ?? item.note,
  };
}

const KNOWN_LIMITS_ZH: Record<string, string> = {
  "Text-based PDFs from 1 to 100 pages; image-only pages receive an OCR risk signal, not OCR.": "支持 1–100 页文本型 PDF；图片型页面只会收到 OCR 风险信号，本工具不执行 OCR。",
  "Restricted metadata revision is offered only for PDF 1.7 files whose analyzer safety probes are conclusive and whose exposed signals remain inside the simple-document boundary.": "只有 PDF 1.7 文件、分析器安全探测均有明确结论且暴露信号保持在简单文档边界内时，才会提供受限元数据修订。",
  "No PDF body text, form values, or full link targets are sent to a server or persisted. Selected metadata, aggregate signals, and reviewer notes remain in this tab unless the reviewer downloads an evidence pack.": "PDF 正文、表单值和完整链接目标不会发送到服务器或持久保存。除非复核人下载证据包，所选元数据、汇总信号和复核备注只保留在当前标签页。",
  "Complex tag trees, formulas, complex tables, XFA, scripts, signatures, and interactive-form behavior require specialist review.": "复杂标签树、公式、复杂表格、XFA、脚本、签名和交互式表单行为需要专业人员复核。",
  "A finding-free automated check is recorded as no machine-detectable issue found, never as compliance passed.": "自动检查未发现问题时，只记录为“未发现机器可检测的问题”，绝不记录为“已合规”。",
};

export function localizeAnalyzerLimit(limit: string, locale: Locale): string {
  return locale === "zh" ? (KNOWN_LIMITS_ZH[limit] ?? limit) : limit;
}

/** Keeps hashes and arbitrary change text intact; only known analyzer labels change. */
export function localizeVersionRecord(
  version: PdfVersionRecord,
  locale: Locale,
): PdfVersionRecord {
  if (locale === "en") return version;
  const labels: Record<string, string> = {
    "Original analyzed file": "原始分析文件",
    "Verified metadata-only revision": "已验证的受限元数据修订版",
    "Rechecked restricted metadata revision": "已复查的受限元数据修订版",
  };
  const changes: Record<string, string> = {
    "Baseline analysis recorded": "已记录基线分析",
    "Set document Title in the document information dictionary": "在文档信息字典中设置文档标题",
    "Updated the document modification date for the new revision": "为新修订版更新文档修改日期",
  };
  return {
    ...version,
    label: labels[version.label] ?? version.label,
    changes: version.changes.map((change) => {
      const language = /^Set document catalog language to (.+)$/.exec(change);
      return changes[change] ?? (language ? `将文档目录语言设置为 ${language[1]}` : change);
    }),
  };
}

function metric(finding: Finding, key: string): string | number {
  const value = finding.metrics[key];
  return typeof value === "number" || typeof value === "string" ? value : "未知";
}

function metricBoolean(finding: Finding, key: string): boolean {
  return finding.metrics[key] === true;
}

function difference(finding: Finding, leftKey: string, rightKey: string): string | number {
  const left = finding.metrics[leftKey];
  const right = finding.metrics[rightKey];
  return typeof left === "number" && typeof right === "number" ? left - right : "未知数量";
}
