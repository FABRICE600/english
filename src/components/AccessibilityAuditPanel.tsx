import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  LocateFixed,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

type AuditCategory = 'contrast' | 'aria' | 'structure';
type AuditSeverity = 'critical' | 'warning';

interface AuditFinding {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  detail: string;
  recommendation: string;
  selectorHint: string;
  element: HTMLElement | null;
}

interface AuditStats {
  scannedElements: number;
  contrastChecks: number;
  ariaChecks: number;
  structureChecks: number;
  lastScannedAt: string;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseCssColor(value: string): RgbColor | null {
  const match = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i);
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] !== undefined ? Number(match[4]) : 1,
  };
}

function blendColors(fg: RgbColor, bg: RgbColor): RgbColor {
  const alpha = fg.a;
  return {
    r: Math.round(fg.r * alpha + bg.r * (1 - alpha)),
    g: Math.round(fg.g * alpha + bg.g * (1 - alpha)),
    b: Math.round(fg.b * alpha + bg.b * (1 - alpha)),
    a: 1,
  };
}

function relativeLuminance(rgb: RgbColor): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

function contrastRatio(c1: RgbColor, c2: RgbColor): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getEffectiveBackground(el: HTMLElement): RgbColor {
  const layers: RgbColor[] = [];
  let current: HTMLElement | null = el;
  while (current) {
    const parsed = parseCssColor(window.getComputedStyle(current).backgroundColor);
    if (parsed && parsed.a > 0) {
      layers.unshift(parsed);
      if (parsed.a >= 0.99) break;
    }
    current = current.parentElement;
  }
  const isDark = document.documentElement.classList.contains('dark');
  let base: RgbColor = isDark ? { r: 2, g: 6, b: 23, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
  for (const layer of layers) {
    base = blendColors(layer, base);
  }
  return base;
}

function isElementVisible(el: HTMLElement): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getElementLabel(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase();
  const idPart = el.id ? `#${el.id}` : '';
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 36);
  return text ? `<${tag}${idPart}> "${text}"` : `<${tag}${idPart}>`;
}

function hasAccessibleName(el: HTMLElement): boolean {
  const ariaLabel = el.getAttribute('aria-label')?.trim();
  if (ariaLabel) return true;
  const ariaLabelledBy = el.getAttribute('aria-labelledby')?.trim();
  if (ariaLabelledBy) {
    const ref = document.getElementById(ariaLabelledBy);
    if (ref?.textContent?.trim()) return true;
  }
  if (el.getAttribute('title')?.trim()) return true;

  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'select' || tag === 'textarea') {
    const inputEl = el as HTMLInputElement;
    if (inputEl.type === 'hidden') return true;
    if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
    if (el.closest('label')?.textContent?.trim()) return true;
    if (inputEl.placeholder?.trim()) return false; // Placeholder alone is not a full accessible label
    return false;
  }

  const visibleText = (el.textContent || '').trim();
  if (visibleText.length > 0) return true;

  const imgAlt = el.querySelector('img[alt]')?.getAttribute('alt')?.trim();
  return Boolean(imgAlt);
}

export function AccessibilityAuditPanel() {
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [stats, setStats] = useState<AuditStats>({
    scannedElements: 0,
    contrastChecks: 0,
    ariaChecks: 0,
    structureChecks: 0,
    lastScannedAt: '',
  });
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditCategory>('all');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [highlightAll, setHighlightAll] = useState(false);

  const highlightedNodesRef = useRef<Array<{ el: HTMLElement; prevOutline: string; prevOffset: string }>>([]);

  const clearDomHighlights = useCallback(() => {
    for (const item of highlightedNodesRef.current) {
      item.el.style.outline = item.prevOutline;
      item.el.style.outlineOffset = item.prevOffset;
      item.el.removeAttribute('data-a11y-highlighted');
    }
    highlightedNodesRef.current = [];
    setHighlightedId(null);
    setHighlightAll(false);
  }, []);

  useEffect(() => {
    return () => {
      for (const item of highlightedNodesRef.current) {
        item.el.style.outline = item.prevOutline;
        item.el.style.outlineOffset = item.prevOffset;
        item.el.removeAttribute('data-a11y-highlighted');
      }
      highlightedNodesRef.current = [];
    };
  }, []);

  const applyHighlight = (targets: Array<{ el: HTMLElement; severity: AuditSeverity }>) => {
    clearDomHighlights();
    const recorded: Array<{ el: HTMLElement; prevOutline: string; prevOffset: string }> = [];
    for (const target of targets) {
      if (!document.body.contains(target.el)) continue;
      recorded.push({
        el: target.el,
        prevOutline: target.el.style.outline,
        prevOffset: target.el.style.outlineOffset,
      });
      target.el.style.outline =
        target.severity === 'critical' ? '3px solid #dc2626' : '3px solid #d97706';
      target.el.style.outlineOffset = '3px';
      target.el.setAttribute('data-a11y-highlighted', 'true');
    }
    highlightedNodesRef.current = recorded;
  };

  const runAudit = useCallback(() => {
    clearDomHighlights();
    const root = (document.querySelector('main') as HTMLElement) || document.body;
    const allElements = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(
      (el) => !el.closest('[data-a11y-audit-panel="true"]')
    );

    const detected: AuditFinding[] = [];
    let contrastChecks = 0;
    let ariaChecks = 0;
    let structureChecks = 0;

    // 1. Interactive ARIA & accessible name checks + touch targets
    const interactiveEls = allElements.filter((el) =>
      el.matches('button, a[href], input, select, textarea, [role="button"], [role="progressbar"]')
    );

    for (const el of interactiveEls) {
      if (!isElementVisible(el)) continue;
      ariaChecks += 1;

      if (!hasAccessibleName(el)) {
        const isInput = el.matches('input, select, textarea');
        detected.push({
          id: `aria-${detected.length}`,
          category: 'aria',
          severity: 'critical',
          title: isInput ? 'Form control missing explicit label' : 'Interactive control missing ARIA label',
          detail: `${getElementLabel(el)} has no accessible text, aria-label, or associated <label>.`,
          recommendation: isInput
            ? 'Associate a <label htmlFor="..."> or add aria-label for screen readers.'
            : 'Add descriptive text or aria-label explaining the action.',
          selectorHint: getElementLabel(el),
          element: el,
        });
      }

      if (el.matches('[role="progressbar"]')) {
        const hasRange =
          el.hasAttribute('aria-valuenow') &&
          el.hasAttribute('aria-valuemin') &&
          el.hasAttribute('aria-valuemax');
        if (!hasRange) {
          detected.push({
            id: `aria-pb-${detected.length}`,
            category: 'aria',
            severity: 'warning',
            title: 'Progress bar missing ARIA range attributes',
            detail: `${getElementLabel(el)} lacks aria-valuenow, aria-valuemin, or aria-valuemax.`,
            recommendation: 'Provide numeric ARIA progress attributes so learners using assistive tech hear percentage values.',
            selectorHint: getElementLabel(el),
            element: el,
          });
        }
      }

      const rect = el.getBoundingClientRect();
      if (
        el.matches('button, a[href], [role="button"]') &&
        (rect.width < 24 || rect.height < 24)
      ) {
        structureChecks += 1;
        detected.push({
          id: `target-${detected.length}`,
          category: 'structure',
          severity: 'warning',
          title: 'Compact interactive target (< 24px)',
          detail: `${getElementLabel(el)} measures ${Math.round(rect.width)}×${Math.round(rect.height)}px.`,
          recommendation: 'Increase clickable padding to at least 24×24px (44px recommended on touch screens).',
          selectorHint: getElementLabel(el),
          element: el,
        });
      }
    }

    // 2. Media alt-text & heading hierarchy checks
    const images = allElements.filter((el) => el.tagName === 'IMG' && isElementVisible(el));
    for (const img of images) {
      structureChecks += 1;
      if (!img.hasAttribute('alt')) {
        detected.push({
          id: `img-${detected.length}`,
          category: 'structure',
          severity: 'critical',
          title: 'Image missing alt attribute',
          detail: `${getElementLabel(img)} does not declare an alt attribute.`,
          recommendation: 'Add meaningful alt text or alt="" if purely decorative.',
          selectorHint: getElementLabel(img),
          element: img,
        });
      }
    }

    const headings = allElements.filter(
      (el) => /^H[1-6]$/.test(el.tagName) && isElementVisible(el)
    );
    let prevHeadingLevel = 0;
    for (const heading of headings) {
      structureChecks += 1;
      const level = Number(heading.tagName.slice(1));
      if (prevHeadingLevel > 0 && level > prevHeadingLevel + 1) {
        detected.push({
          id: `heading-${detected.length}`,
          category: 'structure',
          severity: 'warning',
          title: `Skipped heading level (H${prevHeadingLevel} → H${level})`,
          detail: `${getElementLabel(heading)} jumps heading hierarchy.`,
          recommendation: `Use H${prevHeadingLevel + 1} instead of H${level} to preserve outline navigation.`,
          selectorHint: getElementLabel(heading),
          element: heading,
        });
      }
      prevHeadingLevel = level;
    }

    // 3. WCAG 2.1 Color Contrast Checks on visible text elements
    const seenContrastPairs = new Set<string>();
    const textCandidates = allElements.filter((el) => {
      if (!isElementVisible(el)) return false;
      if (el.closest('svg, .recharts-wrapper')) return false;
      return Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0
      );
    });

    for (const el of textCandidates) {
      const style = window.getComputedStyle(el);
      const fg = parseCssColor(style.color);
      if (!fg) continue;

      const bg = getEffectiveBackground(el);
      const compositedFg = fg.a < 1 ? blendColors(fg, bg) : fg;
      const ratio = contrastRatio(compositedFg, bg);

      const fontSize = parseFloat(style.fontSize) || 14;
      const fontWeight = parseInt(style.fontWeight, 10) || 400;
      const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const minRequired = isLargeText ? 3.0 : 4.5;

      contrastChecks += 1;

      if (ratio < minRequired) {
        const pairKey = `${style.color}|${bg.r},${bg.g},${bg.b}|${el.tagName}`;
        if (seenContrastPairs.has(pairKey)) continue;
        seenContrastPairs.add(pairKey);

        detected.push({
          id: `contrast-${detected.length}`,
          category: 'contrast',
          severity: ratio < 3.0 ? 'critical' : 'warning',
          title: `Low text contrast (${ratio.toFixed(2)}:1)`,
          detail: `${getElementLabel(el)} renders ${isLargeText ? 'large' : 'body'} text below WCAG AA (${minRequired}:1 minimum).`,
          recommendation: 'Darken light-mode slate text (use slate-600+ on white) or brighten dark-mode text (slate-300+ on slate-900).',
          selectorHint: getElementLabel(el),
          element: el,
        });
      }
    }

    setFindings(detected);
    setStats({
      scannedElements: allElements.length,
      contrastChecks,
      ariaChecks,
      structureChecks,
      lastScannedAt: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    });
  }, [clearDomHighlights]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      runAudit();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [runAudit]);

  const handleLocateFinding = (finding: AuditFinding) => {
    if (!finding.element || !document.body.contains(finding.element)) return;
    if (highlightedId === finding.id) {
      clearDomHighlights();
      return;
    }
    applyHighlight([{ el: finding.element, severity: finding.severity }]);
    setHighlightedId(finding.id);
    setHighlightAll(false);
    finding.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleToggleHighlightAll = () => {
    if (highlightAll) {
      clearDomHighlights();
      return;
    }
    const validTargets = findings
      .filter((f) => f.element && document.body.contains(f.element))
      .map((f) => ({ el: f.element!, severity: f.severity }));
    if (validTargets.length === 0) return;
    applyHighlight(validTargets);
    setHighlightAll(true);
    setHighlightedId(null);
  };

  const filteredFindings = findings.filter((f) =>
    categoryFilter === 'all' ? true : f.category === categoryFilter
  );
  const criticalCount = findings.filter((f) => f.severity === 'critical').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;

  return (
    <section
      data-a11y-audit-panel="true"
      aria-labelledby="a11y-audit-heading"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
            Inclusive Learning Inspector · WCAG 2.1 AA ·{' '}
            <span className="font-mono tabular-nums">
              {stats.lastScannedAt ? `Scanned ${stats.lastScannedAt}` : 'Scanning dashboard…'}
            </span>
          </p>
          <h2
            id="a11y-audit-heading"
            className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"
          >
            <ShieldCheck className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            Live Accessibility (A11y) Audit
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Audits the live Student Dashboard DOM for missing ARIA labels, low contrast ratios, heading order, and target sizing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {findings.length > 0 && (
            <button
              type="button"
              onClick={handleToggleHighlightAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              {highlightAll ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Clear Highlights
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Highlight All ({findings.length})
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={runAudit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Re-run Audit
          </button>
        </div>
      </div>

      {/* Audit Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">DOM Nodes Scanned</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.scannedElements}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Contrast Checks</p>
          <p className="mt-1 font-mono text-xl font-bold text-slate-900 dark:text-white tabular-nums">
            {stats.contrastChecks}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Critical A11y Issues</p>
          <p
            className={`mt-1 font-mono text-xl font-bold tabular-nums ${
              criticalCount > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {criticalCount}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">Warnings / Advisories</p>
          <p
            className={`mt-1 font-mono text-xl font-bold tabular-nums ${
              warningCount > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {warningCount}
          </p>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
          {(
            [
              { key: 'all', label: `All (${findings.length})` },
              {
                key: 'contrast',
                label: `Contrast (${findings.filter((f) => f.category === 'contrast').length})`,
              },
              {
                key: 'aria',
                label: `ARIA & Labels (${findings.filter((f) => f.category === 'aria').length})`,
              },
              {
                key: 'structure',
                label: `Structure & Targets (${findings.filter((f) => f.category === 'structure').length})`,
              },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoryFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                categoryFilter === tab.key
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          {stats.ariaChecks} controls · {stats.structureChecks} structure checks
        </p>
      </div>

      {/* Findings List or Passing Verification */}
      {filteredFindings.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-5 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {findings.length === 0
                ? 'All checked WCAG 2.1 AA accessibility checks passed on the current view.'
                : 'No issues detected in this category.'}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Verified <span className="font-mono tabular-nums">{stats.ariaChecks}</span> interactive controls for accessible names,{' '}
              <span className="font-mono tabular-nums">{stats.contrastChecks}</span> text nodes for AA contrast ratios, and heading/alt-text structure.
            </p>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
          {filteredFindings.map((finding) => {
            const isActiveHighlight = highlightedId === finding.id;
            return (
              <div
                key={finding.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <AlertTriangle
                      className={`h-3.5 w-3.5 shrink-0 ${
                        finding.severity === 'critical'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    />
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {finding.title}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span
                      className={`font-semibold uppercase text-[11px] ${
                        finding.severity === 'critical'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-mono text-slate-500 dark:text-slate-400 truncate max-w-xs">
                      {finding.selectorHint}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {finding.detail}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Suggested fix: {finding.recommendation}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLocateFinding(finding)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 self-start md:self-center ${
                    isActiveHighlight
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  {isActiveHighlight ? 'Clear Highlight' : 'Highlight in Page'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
