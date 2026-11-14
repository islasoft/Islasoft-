/**
 * SunbizStatusBadge.jsx
 * Per-card Florida Sunbiz annual report checker.
 * Also exports checkSunbizStatus() + getSunbizSearchUrl() for batch use in Clients.jsx.
 *
 * Flow:
 *   1. Fetch search results via allorigins CORS proxy (document number lookup)
 *   2. Extract first GetFiling detail link from search HTML
 *   3. Fetch detail page via proxy
 *   4. Parse entity status + annual report years from HTML text
 *   5. Return structured result
 */

import React, { useState } from 'react';
import { Shield, ShieldCheck, ShieldX, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Constants ───────────────────────────────────────────────────────────────

export const SUNBIZ_CURRENT_YEAR = new Date().getFullYear();
const PROXY = 'https://api.allorigins.win/get?url=';
const SUNBIZ_SEARCH_BASE =
  'https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults';

// ─── Helpers (exported for batch use in Clients.jsx) ─────────────────────────

/** Build the Sunbiz document-number search URL for a given doc number */
export function getSunbizSearchUrl(documentNumber) {
  return (
    `${SUNBIZ_SEARCH_BASE}?inquiryType=DocumentNumber` +
    `&inquiryDirective=StartsWith` +
    `&masterFileNumber=${encodeURIComponent(documentNumber.trim())}`
  );
}

/**
 * Fetch + parse annual report status for one entity.
 * Returns a plain object (never throws — callers should try/catch).
 * @returns {{
 *   found: boolean,
 *   reason?: string,
 *   entityStatus?: string,
 *   annualReportYears?: number[],
 *   hasCurrentYear?: boolean,
 *   latestYear?: number|null,
 *   detailUrl?: string,
 * }}
 */
export async function checkSunbizStatus(documentNumber) {
  if (!documentNumber?.trim()) {
    return { found: false, reason: 'no_doc_number' };
  }

  // ── Step 1: Search by document number ──────────────────────────────────────
  const searchUrl = getSunbizSearchUrl(documentNumber);
  const r1 = await fetch(`${PROXY}${encodeURIComponent(searchUrl)}`);
  if (!r1.ok) throw new Error('CORS proxy unavailable');
  const { contents: html1 } = await r1.json();

  // Find the first GetFiling detail link in the search results HTML
  const hrefMatch = html1.match(/href="(\/Inquiry\/CorporationSearch\/GetFiling[^"]+)"/);
  if (!hrefMatch) {
    return { found: false, reason: 'not_found_on_sunbiz' };
  }

  const detailUrl =
    'https://search.sunbiz.org' + hrefMatch[1].replace(/&amp;/g, '&');

  // ── Step 2: Fetch entity detail page ───────────────────────────────────────
  const r2 = await fetch(`${PROXY}${encodeURIComponent(detailUrl)}`);
  if (!r2.ok) throw new Error('Entity detail page unavailable');
  const { contents: html2 } = await r2.json();

  // ── Step 3: Parse entity status ────────────────────────────────────────────
  let entityStatus = 'UNKNOWN';

  // Try label/span pattern first (most common in Sunbiz detail pages)
  const statusPatterns = [
    /Status[^<]*<\/label>\s*<span[^>]*>([^<]{2,30})<\/span>/i,
    /<td[^>]*>\s*Status\s*<\/td>\s*<td[^>]*>\s*([^<]{2,30})\s*<\/td>/i,
    /Status:\s*<\/[a-z]+>\s*<[a-z][^>]*>([^<]{2,30})<\//i,
  ];
  for (const p of statusPatterns) {
    const m = html2.match(p);
    if (m) {
      entityStatus = m[1].trim().toUpperCase();
      break;
    }
  }
  // Fallback: look for bare ACTIVE / INACTIVE token in the status section
  if (entityStatus === 'UNKNOWN') {
    if (/\bACTIVE\b/.test(html2)) entityStatus = 'ACTIVE';
    else if (/\bINACTIVE\b/.test(html2)) entityStatus = 'INACTIVE';
  }

  // ── Step 4: Parse annual report years ─────────────────────────────────────
  // Strategy: find every occurrence of "ANNUAL REPORT" and grab the first
  // 4-digit year (20xx) within the next 300 characters.
  const years = new Set();
  const arRe = /ANNUAL REPORT/gi;
  let arMatch;
  while ((arMatch = arRe.exec(html2)) !== null) {
    const nearby = html2.substring(arMatch.index, arMatch.index + 300);
    const yearMatch = nearby.match(/\b(20\d{2})\b/);
    if (yearMatch) {
      const y = parseInt(yearMatch[1], 10);
      if (y >= 2015 && y <= SUNBIZ_CURRENT_YEAR) years.add(y);
    }
  }

  // Also scan inside any <table> rows adjacent to "Annual Reports" header
  const arSectionMatch = html2.match(
    /Annual Reports?[\s\S]{0,50}<table[\s\S]*?<\/table>/i
  );
  if (arSectionMatch) {
    const tableText = arSectionMatch[0];
    const tableYears = [...tableText.matchAll(/\b(20\d{2})\b/g)];
    tableYears.forEach(([, yr]) => {
      const y = parseInt(yr, 10);
      if (y >= 2015 && y <= SUNBIZ_CURRENT_YEAR) years.add(y);
    });
  }

  const sortedYears = [...years].sort((a, b) => b - a);

  return {
    found: true,
    entityStatus,
    annualReportYears: sortedYears,
    hasCurrentYear: years.has(SUNBIZ_CURRENT_YEAR),
    latestYear: sortedYears[0] ?? null,
    detailUrl,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Inline Sunbiz annual report badge for an entity client card.
 * Shows a "Check Annual Report" button; on click fetches status and
 * displays entity status + AR year badge.
 */
export default function SunbizStatusBadge({ documentNumber }) {
  const [phase, setPhase] = useState('idle'); // idle | checking | done | error
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const runCheck = async (e) => {
    e?.stopPropagation();
    setPhase('checking');
    setErrorMsg('');
    setResult(null);
    try {
      const res = await checkSunbizStatus(documentNumber);
      setResult(res);
      setPhase('done');
    } catch (err) {
      setErrorMsg(err.message || 'Check failed');
      setPhase('error');
    }
  };

  const openExternal = (e) => {
    e?.stopPropagation();
    const url = result?.detailUrl || getSunbizSearchUrl(documentNumber || '');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // No document number on file
  if (!documentNumber?.trim()) {
    return <span className="text-xs text-gray-400 italic">No doc #</span>;
  }

  return (
    <div
      className="flex items-center gap-1 flex-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ── Idle ── */}
      {phase === 'idle' && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs px-2 text-orange-600 border-orange-300 hover:bg-orange-50"
          onClick={runCheck}
        >
          <Shield className="w-3 h-3 mr-1" />
          Check AR
        </Button>
      )}

      {/* ── Checking ── */}
      {phase === 'checking' && (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Checking Sunbiz…
        </span>
      )}

      {/* ── Error ── */}
      {phase === 'error' && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-red-500">
            {errorMsg.toLowerCase().includes('proxy')
              ? 'Connection error —'
              : 'Failed —'}
          </span>
          <button
            className="text-xs text-blue-600 underline flex items-center gap-0.5"
            onClick={openExternal}
          >
            Open Sunbiz <ExternalLink className="w-3 h-3" />
          </button>
          <button className="ml-1" onClick={runCheck} title="Retry">
            <RefreshCw className="w-3 h-3 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      )}

      {/* ── Done ── */}
      {phase === 'done' && result && (
        <div className="flex items-center gap-1 flex-wrap">
          {!result.found ? (
            <span className="text-xs text-gray-500">Not found on Sunbiz</span>
          ) : (
            <>
              {/* Entity status */}
              <Badge
                className={`text-xs px-1.5 py-0 h-5 border font-medium ${
                  result.entityStatus === 'ACTIVE'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : result.entityStatus === 'INACTIVE'
                    ? 'bg-gray-100 text-gray-500 border-gray-300'
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}
              >
                {result.entityStatus}
              </Badge>

              {/* Annual report badge */}
              {result.hasCurrentYear ? (
                <Badge className="text-xs px-1.5 py-0 h-5 bg-green-50 text-green-700 border border-green-200">
                  <ShieldCheck className="w-3 h-3 mr-0.5" />
                  AR {SUNBIZ_CURRENT_YEAR} ✓
                </Badge>
              ) : (
                <Badge className="text-xs px-1.5 py-0 h-5 bg-red-50 text-red-700 border border-red-200">
                  <ShieldX className="w-3 h-3 mr-0.5" />
                  AR {SUNBIZ_CURRENT_YEAR} MISSING
                </Badge>
              )}

              {/* Last AR year when current is missing */}
              {!result.hasCurrentYear && result.latestYear && (
                <span className="text-xs text-gray-400">
                  last: {result.latestYear}
                </span>
              )}
            </>
          )}

          {/* Utility buttons */}
          <button
            className="text-gray-400 hover:text-blue-500 ml-0.5"
            onClick={openExternal}
            title="Open on Sunbiz"
          >
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={runCheck}
            title="Re-check"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
