/**
 * content-dates.ts: real content dates from git, at build time.
 *
 * Used by the byline ("آخر تحديث") and the Article JSON-LD (datePublished /
 * dateModified). Dates come from the commit history of the page's source
 * file, never from the build clock: a "last updated" that changes on every
 * deploy is noise to a reader and to a crawler. CI checks out full history
 * (fetch-depth: 0 in .github/workflows) so these are accurate there too.
 *
 * Everything is cached per path and fails soft: if git is unavailable or the
 * file has no history yet, the helpers return undefined and callers omit the
 * date rather than print a wrong one.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const cache = new Map<string, string | undefined>();

function git(args: string): string | undefined {
  try {
    const out = execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return out || undefined;
  } catch {
    return undefined;
  }
}

/** ISO date of the most recent commit touching `path` (repo-relative). */
export function lastCommitDate(path: string): string | undefined {
  const key = `last:${path}`;
  if (!cache.has(key)) cache.set(key, git(`log -1 --format=%cI -- "${path}"`));
  return cache.get(key);
}

/** ISO date of the first commit that added `path` (repo-relative). */
export function firstCommitDate(path: string): string | undefined {
  const key = `first:${path}`;
  if (!cache.has(key)) {
    const out = git(`log --reverse --format=%cI -- "${path}"`);
    cache.set(key, out ? out.split('\n')[0] : undefined);
  }
  return cache.get(key);
}

/**
 * Map a built URL path to its source file under src/pages. Covers the static
 * article pages this is used on (/duroos/<slug>, /irab, /nahw and /en twins).
 * Returns undefined when no such file exists, so callers can omit the date.
 */
export function sourceFileFor(pathname: string): string | undefined {
  const clean = pathname.replace(/\/$/, '') || '/';
  const candidate = clean === '/' ? 'src/pages/index.astro' : `src/pages${clean}.astro`;
  if (existsSync(candidate)) return candidate;
  const dirIndex = `src/pages${clean}/index.astro`;
  return existsSync(dirIndex) ? dirIndex : undefined;
}

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const arDigits = (n: number | string) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "٢٠ أغسطس ٢٠٢٦" / "20 August 2026" from an ISO date. */
export function formatDate(iso: string, lang: 'ar' | 'en'): string {
  const d = new Date(iso);
  const day = d.getDate();
  const month = d.getMonth();
  const year = d.getFullYear();
  return lang === 'ar'
    ? `${arDigits(day)} ${MONTHS_AR[month]} ${arDigits(year)}`
    : `${day} ${MONTHS_EN[month]} ${year}`;
}
