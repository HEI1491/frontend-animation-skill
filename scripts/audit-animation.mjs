#!/usr/bin/env node
/**
 * audit-animation.mjs — Frontend animation anti-pattern scanner
 *
 * Usage:
 *   node audit-animation.mjs <dir> [--json] [--strict] [--ignore <glob>] [--help]
 *
 * Exit codes:
 *   0  — clean (or --strict not set)
 *   1  — findings exist AND --strict is set
 *   2  — script error (bad args, unreadable dir, etc.)
 *
 * Why no --fix?
 *   Animation changes require design intent review. Auto-fixing would break
 *   carefully tuned motion. This tool only locates issues; humans decide fixes.
 *
 * READ-ONLY CONTRACT:
 *   This script NEVER calls writeFile, mkdir, rm, unlink, or any write API.
 *   It only reads files and writes to stdout/stderr.
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';

const VERSION = 1;

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

const HELP = `
audit-animation.mjs — frontend animation anti-pattern scanner
Zero dependencies. Read-only. Node >= 18.

USAGE
  node audit-animation.mjs <dir> [options]

OPTIONS
  --json            Output JSON only (no human-readable text)
  --strict          Exit code 1 if any findings exist (default: always 0)
  --ignore <glob>   Skip paths matching glob (repeatable; supports * and **)
  --help            Show this help and exit

SCANNED EXTENSIONS
  .tsx .ts .jsx .js .vue .css .scss .sass .less

DEFAULT SKIP DIRS
  node_modules .git .next dist build out coverage .turbo .svelte-kit public

RULES (8)
  1. transition-all           error   Transitions ALL CSS properties; use explicit list
  2. linear-easing            warn    Linear motion looks mechanical outside progress bars
  3. layout-animating         error   Animating width/height/top/left/right/margin/padding
  4. long-duration            warn    Durations > 800ms feel sluggish
  5. no-reduced-motion        warn    No @media (prefers-reduced-motion: reduce) found
  6. timeout-driven           warn    setTimeout driving animation sequences
  7. missing-will-change      info    Infinite animations without will-change
  8. z-index-overlay          info    Full-screen layers without pointer-events: none

EXIT CODES
  0  — clean (or --strict not set)
  1  — findings exist AND --strict is set
  2  — error (invalid args, unreadable dir, etc.)

SUPPRESSION
  Add comment to suppress a line:
    .css/.scss:  /* audit-animation-ignore */
    .tsx/.tsx:   // audit-animation-ignore
`;

// ---------------------------------------------------------------------------
// Parse arguments
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(HELP);
    process.exit(0);
  }

  const dir = args.find((a) => !a.startsWith('--'));
  if (!dir) {
    console.error('error: no directory specified');
    process.exit(2);
  }

  const json = args.includes('--json');
  const strict = args.includes('--strict');
  const ignores = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ignore') ignores.push(args[++i]);
  }

  return { dir, json, strict, ignores };
}

// ---------------------------------------------------------------------------
// Glob matching (simple)
// ---------------------------------------------------------------------------

function globToRegex(glob) {
  const escaped = glob
    .replace(/\./g, '\\.')
    .replace(/\*/g, '[^/]*')
    .replace(/\*\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAnyGlob(posixPath, globs) {
  return globs.some((g) => globToRegex(g).test(posixPath));
}

// ---------------------------------------------------------------------------
// File collection
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  'coverage',
  '.turbo',
  '.svelte-kit',
  'public',
]);

const SCAN_EXT = new Set([
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.vue',
  '.css',
  '.scss',
  '.sass',
  '.less',
]);

function collectFiles(dir, root, ignoreGlobs) {
  const files = [];

  function walk(p) {
    let entries;
    try {
      entries = readdirSync(p, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(p, entry.name);
      const posixPath = toPosix(relative(root, full));

      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !matchesAnyGlob(posixPath, ignoreGlobs)) {
          walk(full);
        }
      } else if (SCAN_EXT.has(extname(entry.name))) {
        if (!matchesAnyGlob(posixPath, ignoreGlobs)) {
          files.push({ path: full, posix: posixPath });
        }
      }
    }
  }

  walk(dir);
  return files;
}

// ---------------------------------------------------------------------------
// File reading
// ---------------------------------------------------------------------------

function safeReadFile(filePath) {
  try {
    const stat = statSync(filePath);
    if (stat.size > 1_000_000) return null;
    const buf = readFileSync(filePath);
    if (buf.includes(0)) return null;
    return buf.toString('utf-8');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function stderr(msg) {
  process.stderr.write(msg + '\n');
}

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function trunc(s, maxLen) {
  return s.length > maxLen ? s.substring(0, maxLen - 1) + '…' : s;
}

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

function isSuppressed(lines, lineIdx) {
  const line = lines[lineIdx] || '';
  if (line.includes('audit-animation-ignore')) return true;
  if (lineIdx > 0 && lines[lineIdx - 1].includes('audit-animation-ignore')) {
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Finding
// ---------------------------------------------------------------------------

function makeFinding(
  rule,
  severity,
  posixFile,
  line,
  lineText,
  message,
  suggestion,
  col,
) {
  return {
    rule,
    severity,
    file: posixFile,
    line,
    column: col || undefined,
    snippet: trunc(lineText.trim(), 60),
    message,
    suggestion,
  };
}

// ---------------------------------------------------------------------------
// Rule: detect decorative selector
// ---------------------------------------------------------------------------

const DECORATIVE_KEYWORDS = [
  'bg',
  'background',
  'glow',
  'overlay',
  'grain',
  'noise',
  'gradient',
  'decor',
  'decoration',
  'canvas',
  'aurora',
  'orb',
  'blob',
  'particle',
  'hero',
  'ambient',
];

function isDecorativeSelector(text) {
  return DECORATIVE_KEYWORDS.some((kw) => text.toLowerCase().includes(kw));
}

// ---------------------------------------------------------------------------
// Rule: extract durations
// ---------------------------------------------------------------------------

function extractDurations(line) {
  const durations = [];
  const patterns = [
    /(\d+(?:\.\d+)?)\s*ms/gi,
    /(\d+(?:\.\d+)?)\s*s\b/gi,
    /duration\s*:\s*(\d+(?:\.\d+)?)/gi,
  ];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(line))) {
      const val = parseFloat(m[1]);
      const unit = m[0].includes('s') && !m[0].includes('ms') ? 1000 : 1;
      durations.push(val * unit);
    }
  }
  return durations;
}

// ---------------------------------------------------------------------------
// Scan CSS
// ---------------------------------------------------------------------------

function scanCss(content, posixFile, findings) {
  const lines = content.split('\n');
  let inRule = false;
  let ruleProps = [];
  let selector = '';
  let ruleStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isSuppressed(lines, i)) continue;

    // Track { } for simple nested CSS (SCSS)
    if (line.includes('{')) {
      if (!inRule) {
        inRule = true;
        selector = line.split('{')[0].trim();
        ruleStartLine = i + 1;
        ruleProps = [];
      }
    }

    if (inRule) {
      ruleProps.push({ line: i + 1, text: line });

      if (line.includes('}')) {
        inRule = false;
        checkCssRule(ruleProps, selector, posixFile, findings, lines);
        ruleProps = [];
      }
    }

    // Check for @keyframes with animation-*
    if (line.includes('@keyframes')) {
      const animName = line.split(/\s+/)[1];
      if (animName) {
        let foundAnimLine = i;
        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          if (lines[j].includes('}')) break;
          if (/width|height|top|left|right|margin|padding/.test(lines[j])) {
            findings.push(
              makeFinding(
                'layout-animating',
                'error',
                posixFile,
                j + 1,
                lines[j],
                `@keyframes ${animName} animates layout properties`,
                'Use transform: scaleX/scaleY instead',
              ),
            );
          }
          if (
            /animation:.*infinite|animation-iteration-count:\s*infinite/i.test(
              lines[j],
            )
          ) {
            foundAnimLine = j;
            if (!lines[j].includes('will-change')) {
              findings.push(
                makeFinding(
                  'missing-will-change',
                  'info',
                  posixFile,
                  j + 1,
                  lines[j],
                  'Infinite animation without will-change may cause layout thrashing',
                  'Add will-change: transform; (remove after animation ends)',
                ),
              );
            }
          }
        }
      }
    }

    // Check for no-reduced-motion (global check later)
    if (/animation:|@keyframes/.test(line)) {
      // Global check happens after file scan
    }

    // Check prefers-reduced-motion
    if (/prefers-reduced-motion/.test(line)) {
      // Found reduced-motion; will suppress global no-reduced-motion warning
    }
  }
}

function checkCssRule(props, selector, posixFile, findings, lines) {
  for (const prop of props) {
    const { line, text } = prop;

    // Rule 1: transition: all
    if (/transition\s*:\s*all|transition-property\s*:\s*all/.test(text)) {
      findings.push(
        makeFinding(
          'transition-all',
          'error',
          posixFile,
          line,
          text,
          'transition: all forces browser to compute changes on all properties',
          'List only transform, opacity, color: transition: transform 200ms, opacity 200ms;',
        ),
      );
    }

    // Rule 2: linear easing
    const isDecorative = DECORATIVE_KEYWORDS.some((kw) =>
      selector.toLowerCase().includes(kw),
    );
    if (
      /transition-timing-function:\s*linear|ease:\s*['\"]?linear['\"]?/.test(
        text,
      )
    ) {
      if (!isDecorative) {
        findings.push(
          makeFinding(
            'linear-easing',
            'warn',
            posixFile,
            line,
            text,
            'linear easing looks mechanical for UI motion',
            'Use ease-out, ease-in-out, or cubic-bezier for natural feel',
          ),
        );
      }
    }

    // Rule 3: layout-animating
    if (
      /transition-property|transition\s*:/.test(text) &&
      /width|height|top|left|right|margin|padding/.test(text)
    ) {
      findings.push(
        makeFinding(
          'layout-animating',
          'error',
          posixFile,
          line,
          text,
          'Animating width/height/top/left/right/margin/padding causes layout reflow',
          'Use transform: scaleX/scaleY, or motion library layout mode',
        ),
      );
    }

    // Rule 4: long-duration
    const durations = extractDurations(text);
    for (const dur of durations) {
      if (dur > 800) {
        findings.push(
          makeFinding(
            'long-duration',
            'warn',
            posixFile,
            line,
            text,
            `Duration ${dur}ms exceeds guideline (>800ms feels sluggish)`,
            'Target 240–400ms for enter, 156ms for exit, 300–500ms for page transitions',
          ),
        );
      }
    }

    // Rule 8: z-index-overlay (info level, only for decorative)
    if (isDecorativeSelector) {
      if (
        /position\s*:\s*(fixed|absolute)/.test(text) &&
        /z-index|inset\s*:\s*0/.test(text)
      ) {
        if (!text.includes('pointer-events') || !text.includes('none')) {
          findings.push(
            makeFinding(
              'z-index-overlay',
              'info',
              posixFile,
              line,
              text,
              'Decorative full-screen layer lacks pointer-events: none',
              'Add pointer-events: none; aria-hidden="true"; to prevent blocking interactions',
            ),
          );
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Scan JavaScript/TypeScript
// ---------------------------------------------------------------------------

function scanJs(content, posixFile, findings) {
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isSuppressed(lines, i)) continue;

    // Rule 3: motion animate with layout properties
    if (
      /animate\s*=\s*\{|initial\s*=\s*\{|whileHover\s*=\s*\{/.test(line)
    ) {
      if (/height|width|top|left|right|margin|padding/.test(line)) {
        findings.push(
          makeFinding(
            'layout-animating',
            'error',
            posixFile,
            i + 1,
            line,
            'motion library animating layout property',
            'Use motion layout mode or transform alternatives',
          ),
        );
      }
    }

    // Rule 4: long duration in motion
    const durs = extractDurations(line);
    for (const dur of durs) {
      if (dur > 800) {
        findings.push(
          makeFinding(
            'long-duration',
            'warn',
            posixFile,
            i + 1,
            line,
            `Motion duration ${dur}ms exceeds guideline`,
            'Use 240–400ms for enter, 156ms for exit',
          ),
        );
      }
    }

    // Rule 6: setTimeout driving animation
    if (/setTimeout\s*\(/.test(line)) {
      for (let j = Math.max(0, i - 5); j < Math.min(lines.length, i + 10); j++) {
        if (
          /animate|transition|motion|animation|keyframes/.test(
            lines[j].toLowerCase(),
          )
        ) {
          findings.push(
            makeFinding(
              'timeout-driven',
              'warn',
              posixFile,
              i + 1,
              line,
              'setTimeout may drive animation sequence; duration changes break sync',
              'Use onAnimationComplete, animation events, or GSAP timeline',
            ),
          );
          break;
        }
      }
    }

    // Rule 2: linear easing in motion
    if (/ease\s*:\s*['\"]?linear['\"]?/.test(line)) {
      if (
        !/progress|progress|marquee|spinner|shimmer|skeleton|loader|loop/i.test(
          lines[Math.max(0, i - 2)],
        )
      ) {
        findings.push(
          makeFinding(
            'linear-easing',
            'warn',
            posixFile,
            i + 1,
            line,
            'linear easing outside progress indicator context',
            'Use ease-out or cubic-bezier for natural UI motion',
          ),
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------

function scan(dir, ignoreGlobs, root) {
  const files = collectFiles(dir, root || dir, ignoreGlobs);
  const findings = [];
  let hasReducedMotion = false;

  for (const { path, posix } of files) {
    const content = safeReadFile(path);
    if (!content) continue;

    if (/prefers-reduced-motion/.test(content)) {
      hasReducedMotion = true;
    }

    if (posix.endsWith('.css') || posix.endsWith('.scss') || posix.endsWith('.sass') || posix.endsWith('.less')) {
      scanCss(content, posix, findings);
    } else if (
      posix.endsWith('.tsx') ||
      posix.endsWith('.ts') ||
      posix.endsWith('.jsx') ||
      posix.endsWith('.js')
    ) {
      scanJs(content, posix, findings);
    }
  }

  // Rule 5: no-reduced-motion (global)
  if (!hasReducedMotion) {
    for (const { posix } of files) {
      const content = safeReadFile(join(dir, posix));
      if (!content) continue;
      if (
        /animation:|@keyframes|animate\s*=/i.test(content)
      ) {
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (
            /animation:|@keyframes|animate\s*=/i.test(
              lines[i],
            )
          ) {
            findings.push(
              makeFinding(
                'no-reduced-motion',
                'warn',
                posix,
                i + 1,
                lines[i],
                'Project uses animations but has no prefers-reduced-motion fallback',
                'Add @media (prefers-reduced-motion: reduce) or useReducedMotion() hook',
              ),
            );
            break;
          }
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const unique = [];
  for (const f of findings) {
    const key = `${f.file}:${f.line}:${f.rule}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  }

  return { files, findings: unique };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

async function main() {
  const { dir, json: asJson, strict, ignores } = parseArgs();

  try {
    statSync(dir);
  } catch {
    stderr(`error: cannot read directory: ${dir}`);
    process.exit(2);
  }

  const { files, findings } = scan(dir, ignores, dir);

  if (asJson) {
    const summary = {
      version: VERSION,
      filesScanned: files.length,
      findings: findings.length,
      byRule: {},
      bySeverity: {},
    };

    for (const f of findings) {
      summary.byRule[f.rule] = (summary.byRule[f.rule] || 0) + 1;
      summary.bySeverity[f.severity] = (summary.bySeverity[f.severity] || 0) + 1;
    }

    console.log(
      JSON.stringify(
        {
          version: VERSION,
          root: dir,
          summary,
          findings,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  if (!findings.length) {
    console.log(
      `✓ Scanned ${files.length} files, no animation anti-patterns detected.`,
    );
    process.exit(0);
  }

  console.log(`Scanned ${files.length} files, found ${findings.length} issues:\n`);

  const byRule = {};
  for (const f of findings) {
    if (!byRule[f.rule]) byRule[f.rule] = [];
    byRule[f.rule].push(f);
  }

  for (const [rule, group] of Object.entries(byRule)) {
    console.log(`[${rule}] (${group.length})`);
    for (const f of group.slice(0, 3)) {
      console.log(
        `  ${f.file}:${f.line}  ${f.message}`,
      );
      console.log(`    → ${f.suggestion}`);
    }
    if (group.length > 3) {
      console.log(`  … and ${group.length - 3} more`);
    }
    console.log();
  }

  console.log(
    'This tool reports issues; fixing requires design review. Never auto-modify animations.',
  );

  if (strict && findings.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  stderr(`fatal: ${err.message}`);
  process.exit(2);
});
