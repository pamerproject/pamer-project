/**
 * Client-side URL safety checker.
 * Detects suspicious patterns without requiring external API calls.
 */

// Known URL shorteners — often used to hide malicious destinations
const SHORTENER_DOMAINS = new Set([
  "bit.ly", "tinyurl.com", "ow.ly", "is.gd", "buff.ly", "shorturl.at",
  "tiny.cc", "lc.chat", "tr.im", "v.gd", "click.ly", "dld.bz",
  "db.tt", "goo.gl", "youtu.be", "rebrand.ly", "s.id", "rb.gy",
  "short.link", "cutt.ly", "shorte.st", "adf.ly", "bc.vc", "u.to",
  "soo.gd", "s2r.co", "bit.do", "bitly.com", "x.co", "1url.com",
  "t.co", "fb.me", "wp.me", "buff.ly", "hubs.ly", "lnkd.in",
]);

// Suspicious keywords often found in phishing/malicious URLs
// Only truly suspicious terms — avoids flagging common legit URL patterns like "login"
const SUSPICIOUS_KEYWORDS = [
  "hack", "crack", "cheat", "mod", "exploit",
  "phishing", "malware", "trojan", "virus", "spyware",
  "freebitcoin", "free-eth", "free-btc", "airdrop",
  "giveaway", "btc", "bitcoin", "ethereum",
  "wallet", "blockchain", "mining", "investment",
  "jackpot", "lottery", "bonus", "cashback",
  " redeem", "/gift", "prize",
];

// Suspicious TLDs often associated with spam/malware
const SUSPICIOUS_TLDS = new Set([
  "tk", "ml", "ga", "cf", "gq", // Free domain providers
  "xyz", "top", "loan", "work", "date", // Often abused
  "men", "click", "download", "review", "stream",
  "trade", "webcam", "bid", "win", "mom",
]);

// Minimal IP address pattern: 4 groups of 1-3 digits separated by dots
const IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/;

export interface UrlSafetyResult {
  safe: boolean;
  warnings: string[];
  severity: "low" | "medium" | "high";
}

/**
 * Check a URL for suspicious patterns.
 * @param url - The URL to check (can be with or without protocol)
 * @returns UrlSafetyResult with safety info
 */
export function checkUrlSafety(url: string): UrlSafetyResult {
  const warnings: string[] = [];
  let severity: "low" | "medium" | "high" = "low";

  // Normalize: remove protocol for domain checks
  const normalized = url.toLowerCase().trim();
  const hasProtocol = normalized.startsWith("http://") || normalized.startsWith("https://");
  let domain = normalized;

  if (hasProtocol) {
    try {
      const parsed = new URL(normalized);
      domain = parsed.hostname;
    } catch {
      warnings.push("safety.invalidUrl");
      return { safe: false, warnings, severity: "high" };
    }
  }

  // 1. IP address URLs
  if (IP_REGEX.test(domain)) {
    warnings.push("safety.ipAddress");
    severity = "high";
  }

  // 2. URL shorteners
  if (SHORTENER_DOMAINS.has(domain) || [...SHORTENER_DOMAINS].some((s) => domain.endsWith("." + s) || domain === s)) {
    warnings.push("safety.shortener");
    if (severity === "low") severity = "medium";
  }

  // 3. Suspicious TLDs
  const tld = domain.split(".").pop() || "";
  if (SUSPICIOUS_TLDS.has(tld)) {
    warnings.push("safety.suspiciousTld");
    if (severity === "low") severity = "medium";
  }

  // 4. Suspicious keywords in full URL
  const fullUrlLower = normalized.toLowerCase();
  for (const keyword of SUSPICIOUS_KEYWORDS) {
    if (fullUrlLower.includes(keyword)) {
      warnings.push("safety.suspiciousKeyword");
      if (severity === "low") severity = "medium";
      else if (severity === "medium") severity = "high";
      break; // Only add this warning once
    }
  }

  // 5. Excessive subdomains (more than 3)
  const parts = domain.split(".");
  if (parts.length > 4) {
    warnings.push("safety.excessiveSubdomains");
    if (severity === "low") severity = "medium";
  }

  // 6. Very long URL
  if (normalized.length > 200) {
    warnings.push("safety.longUrl");
    if (severity === "low") severity = "medium";
  }

  // 7. Typosquatting: common brand names with character substitutions
  // Known legitimate brand names — any domain where these appear as a full label is legit
  const BRAND_NAMES = new Set([
    "google", "youtube", "facebook", "instagram",
    "twitter", "whatsapp", "telegram", "microsoft",
    "apple", "paypal", "amazon", "netflix",
    "spotify", "disney", "linkedin", "github",
    "gitlab", "stackoverflow", "medium", "reddit",
    "discord", "slack", "notion", "figma",
    "vercel", "netlify", "heroku", "digitalocean",
    "cloudflare",
  ]);

  const domainClean = domain.replace(/^www\./, "");
  const domainLabels = domainClean.split(".");

  // Only skip typosquatting if a brand is the ACTUAL registered domain (SLD or country domain).
  // This prevents false negatives like "google.evil.com" where "google" is a
  // subdomain label but the actual registered domain is "evil.com".
  // e.g., "google.com" → SLD "google" → has brand ✅
  // e.g., "mail.google.com" → SLD "google" → has brand ✅
  // e.g., "google.co.id" → SLD "co" (≤3 chars), 3rd-level "google" → has brand ✅
  // e.g., "google.evil.com" → SLD "evil" (≠ brand, >3 chars) → NO brand → runs check ✅
  // e.g., "google.com.evil.com" → SLD "evil" → NO brand → runs check ✅
  // e.g., "g00gle.com" → SLD "g00gle" → NOT in BRAND_NAMES → runs check ✅
  const sld = domainLabels[domainLabels.length - 2];
  const hasBrandAsSld = !!sld && BRAND_NAMES.has(sld);
  const thirdLevel = domainLabels[domainLabels.length - 3];
  const isIntermediateSld = !!sld && sld.length <= 3;
  const hasBrandInRegDomain = hasBrandAsSld || (!!thirdLevel && isIntermediateSld && BRAND_NAMES.has(thirdLevel));

  if (!hasBrandInRegDomain) {
    const typosquatPatterns = [
      /g[o0][o0]?g[l1]e/i, /faceb[0o][0o]k/i, /instagr[a4]m/i,
      /twit[t4]er/i, /whats[a4]pp/i, /te[l1]egr[a4]m/i,
      /y[o0]utub[e3]/i, /micr[o0]s[o0]ft/i, /app[l1]e/i,
      /p[4a]yp[a4]l/i, /amaz[o0]n/i, /netfl[i1]x/i,
      /sp[o0]t[i1]f[y4]/i, /disne[y]/i,
    ];

    for (const pattern of typosquatPatterns) {
      if (pattern.test(domainClean)) {
        warnings.push("safety.typosquatting");
        severity = "high";
        break;
      }
    }
  }

  return {
    safe: warnings.length === 0,
    warnings,
    severity,
  };
}

/**
 * Get a human-readable label for severity level.
 */
export function getSeverityLabel(severity: "low" | "medium" | "high"): string {
  switch (severity) {
    case "high": return "safety.severityHigh";
    case "medium": return "safety.severityMedium";
    case "low": return "safety.severityLow";
  }
}
