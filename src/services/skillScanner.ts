export enum Severity {
  INFO = "info",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum RiskLevel {
  SAFE = "safe",
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
  BLOCKED = "blocked",
}

export enum ContextType {
  PROSE = "prose",
  CODE_BLOCK = "code_block",
  INLINE_CODE = "inline_code",
  HEADING = "heading",
  BLOCKQUOTE = "blockquote",
  LIST_ITEM = "list_item",
}

export interface CodeBlockSpan {
  startLine: number;
  endLine: number;
  startChar: number;
  endChar: number;
  language: string;
  content: string;
}

export interface ContextualFinding {
  ruleId: string;
  ruleName: string;
  originalSeverity: Severity;
  adjustedSeverity: Severity;
  lineNumber: number;
  lineContent: string;
  charPosition: number;
  contextType: ContextType;
  inCodeBlock: boolean;
  codeBlockLanguage: string | null;
  matchedPattern: string;
  matchText: string;
  description: string;
  adjustmentReason: string;
  detectionStandard: string;
  standardUrl: string;
}

export interface ScanResult {
  riskLevel: RiskLevel;
  riskScore: number;
  originalRiskScore: number;
  findings: ContextualFinding[];
  codeBlocksFound: number;
  findingsInCodeBlocks: number;
  severityAdjustments: number;
  blocked: boolean;
  blockedReason: string;
}

const DETECTION_STANDARDS: Record<string, { name: string; url: string; description: string }> = {
  "SEC001": {
    name: "OWASP LLM01 + Vigil-LLM",
    url: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
    description: "Shell command injection patterns from OWASP and vigil-llm YARA rules",
  },
  "SEC002": {
    name: "CWE-732 + Custom",
    url: "https://cwe.mitre.org/data/definitions/732.html",
    description: "Dangerous file operations that could cause data loss",
  },
  "SEC003": {
    name: "OWASP Secrets Management",
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html",
    description: "Detection of hardcoded credentials and secrets",
  },
  "SEC004": {
    name: "Vigil-LLM mdexfil.yar",
    url: "https://github.com/deadbits/vigil-llm/blob/main/data/yara/mdexfil.yar",
    description: "Network-based data exfiltration patterns",
  },
  "SEC005": {
    name: "Vigil-LLM instruction_bypass.yar",
    url: "https://github.com/deadbits/vigil-llm/blob/main/data/yara/instruction_bypass.yar",
    description: "Prompt injection patterns that attempt to override instructions",
  },
  "SEC006": {
    name: "CWE-269 Privilege Escalation",
    url: "https://cwe.mitre.org/data/definitions/269.html",
    description: "Patterns indicating privilege escalation attempts",
  },
  "SEC007": {
    name: "Vigil-LLM mdexfil.yar",
    url: "https://github.com/deadbits/vigil-llm/blob/main/data/yara/mdexfil.yar",
    description: "Data exfiltration via markdown image links",
  },
  "SEC008": {
    name: "OWASP XSS + Prototype Pollution",
    url: "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html",
    description: "Unsafe code patterns in web contexts",
  },
  "SEC009": {
    name: "Custom - Unsafe Instructions",
    url: "https://github.com/user/skill-0/blob/main/governance/GOVERNANCE.md#sec009",
    description: "Instructions that encourage bypassing safety checks",
  },
};

class MarkdownContextParser {
  content: string;
  lines: string[];
  codeBlocks: CodeBlockSpan[] = [];

  constructor(content: string) {
    this.content = content;
    this.lines = content.split("\n");
    this._parseWithRegex();
  }

  private _parseWithRegex() {
    const fencedPattern = /^(```|~~~)(\w*)\n([\s\S]*?)\n\1/gm;
    let match;
    while ((match = fencedPattern.exec(this.content)) !== null) {
      const startChar = match.index;
      const endChar = fencedPattern.lastIndex;
      const startLine = this.content.substring(0, startChar).split("\n").length;
      const endLine = this.content.substring(0, endChar).split("\n").length;

      this.codeBlocks.push({
        startLine,
        endLine,
        startChar,
        endChar,
        language: match[2] || "",
        content: match[3],
      });
    }
  }

  isInsideCodeBlock(lineNumber: number): { inCode: boolean; block: CodeBlockSpan | null } {
    for (const block of this.codeBlocks) {
      if (lineNumber >= block.startLine && lineNumber <= block.endLine) {
        return { inCode: true, block };
      }
    }
    return { inCode: false, block: null };
  }

  getContextType(lineNumber: number, lineContent: string): ContextType {
    const { inCode } = this.isInsideCodeBlock(lineNumber);
    if (inCode) return ContextType.CODE_BLOCK;

    const stripped = lineContent.trim();
    if (stripped.includes("`") && !stripped.startsWith("```")) {
      // Simplification for inline code
    }

    if (stripped.startsWith("#")) return ContextType.HEADING;
    if (stripped.startsWith(">")) return ContextType.BLOCKQUOTE;
    if (/^[-*+]/.test(stripped) || /^\d+\./.test(stripped)) return ContextType.LIST_ITEM;

    return ContextType.PROSE;
  }
}

class ContextAwareSecurityRule {
  ruleId: string;
  name: string;
  severity: Severity;
  patterns: RegExp[];
  description: string;
  detectionStandard: string;
  standardUrl: string;

  static SEVERITY_REDUCTION: Record<Severity, Severity> = {
    [Severity.CRITICAL]: Severity.LOW,
    [Severity.HIGH]: Severity.INFO,
    [Severity.MEDIUM]: Severity.INFO,
    [Severity.LOW]: Severity.INFO,
    [Severity.INFO]: Severity.INFO,
  };

  constructor(ruleId: string, name: string, severity: Severity, patterns: string[], description: string) {
    this.ruleId = ruleId;
    this.name = name;
    this.severity = severity;
    this.patterns = patterns.map(p => new RegExp(p, "i"));
    this.description = description;

    const stdInfo = DETECTION_STANDARDS[ruleId] || { name: "Custom Rule", url: "", description };
    this.detectionStandard = stdInfo.name;
    this.standardUrl = stdInfo.url;
  }

  scanWithContext(content: string, parser: MarkdownContextParser): ContextualFinding[] {
    const findings: ContextualFinding[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const lineNum = i + 1;
      const line = lines[i];

      for (let j = 0; j < this.patterns.length; j++) {
        const pattern = this.patterns[j];
        const match = pattern.exec(line);
        if (match) {
          const { inCode, block } = parser.isInsideCodeBlock(lineNum);
          const contextType = parser.getContextType(lineNum, line);

          let adjustedSeverity = this.severity;
          let adjustmentReason = "Pattern found in prose text - full severity applied.";

          if (inCode) {
            adjustedSeverity = ContextAwareSecurityRule.SEVERITY_REDUCTION[this.severity] || Severity.INFO;
            adjustmentReason = `Pattern found inside code block (${block?.language || 'unknown'} code example). Severity reduced from ${this.severity} to ${adjustedSeverity} as this appears to be documentation/tutorial content.`;
          }

          findings.push({
            ruleId: this.ruleId,
            ruleName: this.name,
            originalSeverity: this.severity,
            adjustedSeverity,
            lineNumber: lineNum,
            lineContent: line.trim(),
            charPosition: match.index,
            contextType,
            inCodeBlock: inCode,
            codeBlockLanguage: block?.language || null,
            matchedPattern: pattern.source,
            matchText: match[0],
            description: this.description,
            adjustmentReason,
            detectionStandard: this.detectionStandard,
            standardUrl: this.standardUrl,
          });
        }
      }
    }

    return findings;
  }
}

export class AdvancedSkillAnalyzer {
  static SEVERITY_SCORES: Record<Severity, number> = {
    [Severity.INFO]: 1,
    [Severity.LOW]: 3,
    [Severity.MEDIUM]: 10,
    [Severity.HIGH]: 20,
    [Severity.CRITICAL]: 35,
  };

  static RISK_THRESHOLDS: [number, RiskLevel][] = [
    [10, RiskLevel.SAFE],
    [30, RiskLevel.LOW],
    [50, RiskLevel.MEDIUM],
    [80, RiskLevel.HIGH],
    [99, RiskLevel.CRITICAL],
    [100, RiskLevel.BLOCKED],
  ];

  rules: ContextAwareSecurityRule[];

  constructor() {
    this.rules = this._loadRules();
  }

  private _loadRules(): ContextAwareSecurityRule[] {
    return [
      new ContextAwareSecurityRule(
        "SEC001", "Shell Command Injection", Severity.CRITICAL,
        [
          "run\\s+['\"][^'\"]+['\"]", "execute\\s+shell", "system\\s*\\(['\"]",
          "subprocess\\.call\\s*\\(", "subprocess\\.run\\s*\\(", "subprocess\\.Popen\\s*\\(",
          "os\\.system\\s*\\(", "os\\.popen\\s*\\(", "eval\\s*\\(['\"]", "exec\\s*\\(['\"]",
          "require\\s*\\(['\"]child_process", "spawn\\s*\\(['\"]", "execSync\\s*\\(",
          "sh\\s+-c\\s+['\"]", "bash\\s+-c\\s+['\"]", "cmd\\s+/c\\s+", "powershell\\s+-c"
        ],
        "Detects attempts to execute shell commands."
      ),
      new ContextAwareSecurityRule(
        "SEC002", "Dangerous File Operations", Severity.HIGH,
        [
          "rm\\s+-rf", "rm\\s+-fr", "rmdir\\s+/s", "del\\s+/[fqs]", "format\\s+[a-z]:",
          "mkfs\\.", "dd\\s+if=", ">\\s*/dev/", "truncate\\s+-s\\s*0", "shred\\s+",
          "Remove-Item.*-Recurse.*-Force", "shutil\\.rmtree"
        ],
        "Detects dangerous file deletion or overwrite operations."
      ),
      new ContextAwareSecurityRule(
        "SEC003", "Credential/Secret Access", Severity.MEDIUM,
        [
          "\\bpassword\\s*[=:]", "api[_-]?key\\s*[=:]", "secret[_-]?key\\s*[=:]",
          "private[_-]?key\\s*[=:]", "access[_-]?token\\s*[=:]", "AWS_SECRET", "AZURE_KEY", "GCP_KEY"
        ],
        "Detects references to sensitive credentials."
      ),
      new ContextAwareSecurityRule(
        "SEC004", "Suspicious Network Operations", Severity.MEDIUM,
        [
          "curl.*\\|\\s*sh", "curl.*\\|\\s*bash", "wget.*\\|\\s*sh", "wget.*\\|\\s*bash",
          "nc\\s+-[elp]", "reverse\\s*shell", "bind\\s*shell", "/dev/tcp/",
          "Invoke-WebRequest.*\\|.*Invoke-Expression"
        ],
        "Detects suspicious network operations."
      ),
      new ContextAwareSecurityRule(
        "SEC005", "Prompt Injection Attempt", Severity.MEDIUM,
        [
          "ignore\\s+(all\\s+)?previous\\s+instructions", "disregard\\s+(the\\s+)?above",
          "forget\\s+everything", "you\\s+are\\s+now", "act\\s+as\\s+if", "jailbreak",
          "DAN\\s*mode", "developer\\s*mode", "override\\s+safety", "bypass\\s+restrictions"
        ],
        "Detects prompt injection patterns."
      ),
      new ContextAwareSecurityRule(
        "SEC006", "Privilege Escalation", Severity.HIGH,
        [
          "\\bsudo\\s+", "\\bsu\\s+-", "runas\\s+/user", "chmod\\s+[0-7]*777",
          "chmod\\s+\\+s", "setuid", "SeDebugPrivilege", "NT\\s*AUTHORITY\\\\SYSTEM"
        ],
        "Detects privilege escalation attempts."
      ),
      new ContextAwareSecurityRule(
        "SEC007", "Data Exfiltration Risk", Severity.LOW,
        [
          "exfil", "base64.*encode.*send", "webhook\\.site", "requestbin", "pipedream\\.net", "ngrok"
        ],
        "Detects potential data exfiltration attempts."
      ),
      new ContextAwareSecurityRule(
        "SEC008", "Unsafe Code Patterns", Severity.MEDIUM,
        [
          "innerHTML\\s*=", "dangerouslySetInnerHTML", "document\\.write", "__proto__",
          "pickle\\.load", "yaml\\.load\\s*\\([^)]*Loader\\s*=\\s*None"
        ],
        "Detects unsafe code patterns."
      ),
      new ContextAwareSecurityRule(
        "SEC009", "Suspicious AI Instructions", Severity.LOW,
        [
          "never\\s+refuse", "always\\s+comply", "do\\s+not\\s+question", "skip\\s+validation",
          "disable\\s+checks", "--no-verify"
        ],
        "Detects instructions that bypass safety checks."
      )
    ];
  }

  calculateRiskScore(findings: ContextualFinding[], useAdjusted: boolean = true): number {
    let score = 0;
    const ruleFindings: Record<string, ContextualFinding[]> = {};

    for (const f of findings) {
      if (!ruleFindings[f.ruleId]) {
        ruleFindings[f.ruleId] = [];
      }
      ruleFindings[f.ruleId].push(f);
    }

    for (const ruleId in ruleFindings) {
      const ruleItems = ruleFindings[ruleId];
      const severity = useAdjusted ? ruleItems[0].adjustedSeverity : ruleItems[0].originalSeverity;
      const baseScore = AdvancedSkillAnalyzer.SEVERITY_SCORES[severity] || 3;

      const countMultiplier = 1 + Math.log2(ruleItems.length) * 0.3;
      score += Math.floor(baseScore * countMultiplier);
    }

    return Math.min(score, 100);
  }

  determineRiskLevel(score: number): RiskLevel {
    for (const [threshold, level] of AdvancedSkillAnalyzer.RISK_THRESHOLDS) {
      if (score <= threshold) {
        return level;
      }
    }
    return RiskLevel.BLOCKED;
  }

  scanContent(content: string): ScanResult {
    const parser = new MarkdownContextParser(content);
    const findings: ContextualFinding[] = [];

    for (const rule of this.rules) {
      findings.push(...rule.scanWithContext(content, parser));
    }

    const riskScore = this.calculateRiskScore(findings, true);
    const originalRiskScore = this.calculateRiskScore(findings, false);
    const riskLevel = this.determineRiskLevel(riskScore);

    let blocked = riskLevel === RiskLevel.BLOCKED;
    let blockedReason = "";

    const criticalCount = findings.filter(f => f.adjustedSeverity === Severity.CRITICAL).length;
    if (criticalCount >= 3) {
      blocked = true;
      blockedReason = "Multiple critical findings";
    }

    const findingsInCodeBlocks = findings.filter(f => f.inCodeBlock).length;
    const severityAdjustments = findings.filter(f => f.originalSeverity !== f.adjustedSeverity).length;

    return {
      riskLevel,
      riskScore,
      originalRiskScore,
      findings,
      codeBlocksFound: parser.codeBlocks.length,
      findingsInCodeBlocks,
      severityAdjustments,
      blocked,
      blockedReason
    };
  }
}
