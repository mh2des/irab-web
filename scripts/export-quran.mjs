/**
 * export-quran.mjs — build-time extract of i'rab data → static JSON.
 *
 * Reads the shippable SQLite (الجدول في إعراب القرآن corpus) and emits a
 * compact JSON bundle the Astro build consumes via getStaticPaths. Keeping the
 * 49 MB DB out of the web repo: we export only the ayat we publish.
 *
 * Uses Node's built-in `node:sqlite` (Node 22.5+) — no native module, no
 * better-sqlite3, CI-safe.
 *
 * The word-grid query keys on (group_id, ayah): `ayah_words.ayah` is
 * surah-relative, so `WHERE ayah=?` alone would pull the wrong rows.
 *
 *   node scripts/export-quran.mjs
 *   IRAB_DB=/path/to/irab_v7.sqlite node scripts/export-quran.mjs
 */
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.env.IRAB_DB ||
  resolve(__dirname, '../../../irabapp-data/out/irab_v7.sqlite');
const OUT = resolve(__dirname, '../src/data/quran-pilot.json');

// ── Full Quran: every surah, every ayah. (Was a pilot subset; now complete.)
// Set QURAN_PILOT=1 to fall back to the marquee subset for fast local iteration.
const PILOT = process.env.QURAN_PILOT
  ? [
      { surah: 1, ayat: 'all' }, { surah: 2, ayat: [255] }, { surah: 103, ayat: 'all' },
      { surah: 108, ayat: 'all' }, { surah: 112, ayat: 'all' }, { surah: 113, ayat: 'all' },
      { surah: 114, ayat: 'all' },
    ]
  : Array.from({ length: 114 }, (_, i) => ({ surah: i + 1, ayat: 'all' }));

// ── Canonical per-surah metadata not in the DB: transliterated slug (one
// ASCII slug serves both locales), English name, revelation place.
const SURAH_META = {
  1: ['al-fatiha', 'Al-Fatiha', 'makki'], 2: ['al-baqarah', 'Al-Baqarah', 'madani'],
  3: ['al-imran', "Aal-i-Imran", 'madani'], 4: ['an-nisa', 'An-Nisa', 'madani'],
  5: ['al-maidah', "Al-Ma'idah", 'madani'], 6: ['al-anam', "Al-An'am", 'makki'],
  7: ['al-araf', "Al-A'raf", 'makki'], 8: ['al-anfal', 'Al-Anfal', 'madani'],
  9: ['at-tawbah', 'At-Tawbah', 'madani'], 10: ['yunus', 'Yunus', 'makki'],
  11: ['hud', 'Hud', 'makki'], 12: ['yusuf', 'Yusuf', 'makki'],
  13: ['ar-rad', "Ar-Ra'd", 'madani'], 14: ['ibrahim', 'Ibrahim', 'makki'],
  15: ['al-hijr', 'Al-Hijr', 'makki'], 16: ['an-nahl', 'An-Nahl', 'makki'],
  17: ['al-isra', 'Al-Isra', 'makki'], 18: ['al-kahf', 'Al-Kahf', 'makki'],
  19: ['maryam', 'Maryam', 'makki'], 20: ['ta-ha', 'Ta-Ha', 'makki'],
  21: ['al-anbiya', 'Al-Anbiya', 'makki'], 22: ['al-hajj', 'Al-Hajj', 'madani'],
  23: ['al-muminun', "Al-Mu'minun", 'makki'], 24: ['an-nur', 'An-Nur', 'madani'],
  25: ['al-furqan', 'Al-Furqan', 'makki'], 26: ['ash-shuara', "Ash-Shu'ara", 'makki'],
  27: ['an-naml', 'An-Naml', 'makki'], 28: ['al-qasas', 'Al-Qasas', 'makki'],
  29: ['al-ankabut', 'Al-Ankabut', 'makki'], 30: ['ar-rum', 'Ar-Rum', 'makki'],
  31: ['luqman', 'Luqman', 'makki'], 32: ['as-sajdah', 'As-Sajdah', 'makki'],
  33: ['al-ahzab', 'Al-Ahzab', 'madani'], 34: ['saba', 'Saba', 'makki'],
  35: ['fatir', 'Fatir', 'makki'], 36: ['ya-sin', 'Ya-Sin', 'makki'],
  37: ['as-saffat', 'As-Saffat', 'makki'], 38: ['sad', 'Sad', 'makki'],
  39: ['az-zumar', 'Az-Zumar', 'makki'], 40: ['ghafir', 'Ghafir', 'makki'],
  41: ['fussilat', 'Fussilat', 'makki'], 42: ['ash-shura', 'Ash-Shura', 'makki'],
  43: ['az-zukhruf', 'Az-Zukhruf', 'makki'], 44: ['ad-dukhan', 'Ad-Dukhan', 'makki'],
  45: ['al-jathiyah', 'Al-Jathiyah', 'makki'], 46: ['al-ahqaf', 'Al-Ahqaf', 'makki'],
  47: ['muhammad', 'Muhammad', 'madani'], 48: ['al-fath', 'Al-Fath', 'madani'],
  49: ['al-hujurat', 'Al-Hujurat', 'madani'], 50: ['qaf', 'Qaf', 'makki'],
  51: ['adh-dhariyat', 'Adh-Dhariyat', 'makki'], 52: ['at-tur', 'At-Tur', 'makki'],
  53: ['an-najm', 'An-Najm', 'makki'], 54: ['al-qamar', 'Al-Qamar', 'makki'],
  55: ['ar-rahman', 'Ar-Rahman', 'madani'], 56: ['al-waqiah', "Al-Waqi'ah", 'makki'],
  57: ['al-hadid', 'Al-Hadid', 'madani'], 58: ['al-mujadilah', 'Al-Mujadilah', 'madani'],
  59: ['al-hashr', 'Al-Hashr', 'madani'], 60: ['al-mumtahanah', 'Al-Mumtahanah', 'madani'],
  61: ['as-saff', 'As-Saff', 'madani'], 62: ['al-jumuah', "Al-Jumu'ah", 'madani'],
  63: ['al-munafiqun', 'Al-Munafiqun', 'madani'], 64: ['at-taghabun', 'At-Taghabun', 'madani'],
  65: ['at-talaq', 'At-Talaq', 'madani'], 66: ['at-tahrim', 'At-Tahrim', 'madani'],
  67: ['al-mulk', 'Al-Mulk', 'makki'], 68: ['al-qalam', 'Al-Qalam', 'makki'],
  69: ['al-haqqah', 'Al-Haqqah', 'makki'], 70: ['al-maarij', "Al-Ma'arij", 'makki'],
  71: ['nuh', 'Nuh', 'makki'], 72: ['al-jinn', 'Al-Jinn', 'makki'],
  73: ['al-muzzammil', 'Al-Muzzammil', 'makki'], 74: ['al-muddaththir', 'Al-Muddaththir', 'makki'],
  75: ['al-qiyamah', 'Al-Qiyamah', 'makki'], 76: ['al-insan', 'Al-Insan', 'madani'],
  77: ['al-mursalat', 'Al-Mursalat', 'makki'], 78: ['an-naba', 'An-Naba', 'makki'],
  79: ['an-naziat', "An-Nazi'at", 'makki'], 80: ['abasa', 'Abasa', 'makki'],
  81: ['at-takwir', 'At-Takwir', 'makki'], 82: ['al-infitar', 'Al-Infitar', 'makki'],
  83: ['al-mutaffifin', 'Al-Mutaffifin', 'makki'], 84: ['al-inshiqaq', 'Al-Inshiqaq', 'makki'],
  85: ['al-buruj', 'Al-Buruj', 'makki'], 86: ['at-tariq', 'At-Tariq', 'makki'],
  87: ['al-ala', "Al-A'la", 'makki'], 88: ['al-ghashiyah', 'Al-Ghashiyah', 'makki'],
  89: ['al-fajr', 'Al-Fajr', 'makki'], 90: ['al-balad', 'Al-Balad', 'makki'],
  91: ['ash-shams', 'Ash-Shams', 'makki'], 92: ['al-layl', 'Al-Layl', 'makki'],
  93: ['ad-duha', 'Ad-Duha', 'makki'], 94: ['ash-sharh', 'Ash-Sharh', 'makki'],
  95: ['at-tin', 'At-Tin', 'makki'], 96: ['al-alaq', 'Al-Alaq', 'makki'],
  97: ['al-qadr', 'Al-Qadr', 'makki'], 98: ['al-bayyinah', 'Al-Bayyinah', 'madani'],
  99: ['az-zalzalah', 'Az-Zalzalah', 'madani'], 100: ['al-adiyat', 'Al-Adiyat', 'makki'],
  101: ['al-qariah', "Al-Qari'ah", 'makki'], 102: ['at-takathur', 'At-Takathur', 'makki'],
  103: ['al-asr', 'Al-Asr', 'makki'], 104: ['al-humazah', 'Al-Humazah', 'makki'],
  105: ['al-fil', 'Al-Fil', 'makki'], 106: ['quraysh', 'Quraysh', 'makki'],
  107: ['al-maun', "Al-Ma'un", 'makki'], 108: ['al-kawthar', 'Al-Kawthar', 'makki'],
  109: ['al-kafirun', 'Al-Kafirun', 'makki'], 110: ['an-nasr', 'An-Nasr', 'madani'],
  111: ['al-masad', 'Al-Masad', 'makki'], 112: ['al-ikhlas', 'Al-Ikhlas', 'makki'],
  113: ['al-falaq', 'Al-Falaq', 'makki'], 114: ['an-nas', 'An-Nas', 'makki'],
};

const db = new DatabaseSync(DB_PATH, { readOnly: true });

// Confirm we're on the expected corpus before generating anything.
const metaRows = db.prepare('SELECT key, value FROM meta').all();
const meta = Object.fromEntries(metaRows.map((r) => [r.key, r.value]));
if (meta.schema_version !== '3' || meta.total_ayat !== '6236') {
  throw new Error(
    `Unexpected DB (schema_version=${meta.schema_version}, total_ayat=${meta.total_ayat}). Aborting.`
  );
}

const qSurah = db.prepare('SELECT id, name, ayah_count FROM surahs WHERE id = ?');
const qAyatAll = db.prepare(
  'SELECT surah, ayah, group_id, uthmani, text, is_backfilled FROM ayat WHERE surah = ? ORDER BY ayah'
);
const qAyah = db.prepare(
  'SELECT surah, ayah, group_id, uthmani, text, is_backfilled FROM ayat WHERE surah = ? AND ayah = ?'
);
const qGroup = db.prepare('SELECT ayah_start, ayah_end, is_backfilled FROM ayah_groups WHERE id = ?');
const qIrab = db.prepare(
  "SELECT content, is_shared FROM irab_entries WHERE group_id = ? AND section = 'irab' AND ayah = ? LIMIT 1"
);
const qIrabShared = db.prepare(
  "SELECT content, is_shared FROM irab_entries WHERE group_id = ? AND section = 'irab' AND ayah IS NULL LIMIT 1"
);
const qSection = db.prepare(
  'SELECT content FROM irab_entries WHERE group_id = ? AND section = ? AND ayah IS NULL LIMIT 1'
);
const qWords = db.prepare(
  'SELECT position, token, analysis FROM ayah_words WHERE group_id = ? AND ayah = ? ORDER BY position'
);
const qFootnotes = db.prepare(
  'SELECT marker, content FROM footnotes WHERE group_id = ? ORDER BY id'
);

/** Best-effort grammatical-case detection for word-grid colour coding. */
function detectCase(s) {
  if (!s) return null;
  if (s.includes('مجزوم') || s.includes('جزم')) return 'jazm';
  if (s.includes('منصوب')) return 'mansub';
  if (s.includes('مجرور')) return 'majrur';
  if (s.includes('مرفوع')) return 'marfu';
  if (s.includes('محل نصب') || s.includes('محلّ نصب')) return 'mansub';
  if (s.includes('محل جر') || s.includes('محلّ جر')) return 'majrur';
  if (s.includes('محل رفع') || s.includes('محلّ رفع')) return 'marfu';
  if (s.includes('مبني') || s.includes('مبنيّ')) return 'mabni';
  return null;
}

function buildAyah(row) {
  const { surah, ayah, group_id, uthmani, text, is_backfilled } = row;
  const group = qGroup.get(group_id);
  const irab = qIrab.get(group_id, ayah) || qIrabShared.get(group_id);
  const words = qWords.all(group_id, ayah).map((w) => ({
    position: w.position,
    token: w.token,
    analysis: w.analysis,
    case: detectCase(w.analysis),
  }));
  const footnotes = qFootnotes.all(group_id).map((f) => ({
    marker: f.marker,
    content: f.content,
  }));
  const sarf = qSection.get(group_id, 'sarf')?.content ?? null;
  const balagha = qSection.get(group_id, 'balagha')?.content ?? null;
  const fawaid = qSection.get(group_id, 'fawaid')?.content ?? null;

  return {
    surah,
    ayah,
    groupId: group_id,
    ayahStart: group.ayah_start,
    ayahEnd: group.ayah_end,
    isShared: irab ? irab.is_shared === 1 : false,
    isBackfilled: is_backfilled === 1,
    uthmani,
    jadwal: text,
    irab: irab ? irab.content : null,
    words,
    sarf,
    balagha,
    fawaid,
    footnotes,
  };
}

const out = { surahs: {}, ayat: [] };

for (const entry of PILOT) {
  const s = qSurah.get(entry.surah);
  if (!s) throw new Error(`Surah ${entry.surah} missing`);
  const rows = entry.ayat === 'all' ? qAyatAll.all(entry.surah) : entry.ayat.map((n) => qAyah.get(entry.surah, n));
  const ayahNums = [];
  for (const row of rows) {
    if (!row) continue;
    out.ayat.push(buildAyah(row));
    ayahNums.push(row.ayah);
  }
  out.surahs[s.id] = { id: s.id, name: s.name, ayahCount: s.ayah_count, published: ayahNums };
}

// ── Full 114-surah index for the /quran hub (DB names+counts + our metadata).
const allSurahs = db.prepare('SELECT id, name, ayah_count FROM surahs ORDER BY id').all();
const SURAHS_OUT = resolve(__dirname, '../src/data/surahs.json');
const surahIndex = allSurahs.map((s) => {
  const m = SURAH_META[s.id];
  if (!m) throw new Error(`No SURAH_META for surah ${s.id}`);
  const published = out.surahs[s.id]?.published ?? [];
  return {
    id: s.id,
    name: s.name,
    ayahCount: s.ayah_count,
    slug: m[0],
    en: m[1],
    place: m[2],
    publishedCount: published.length,
  };
});

db.close();

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out));
writeFileSync(SURAHS_OUT, JSON.stringify(surahIndex));
const wordCount = out.ayat.reduce((n, a) => n + a.words.length, 0);
console.log(`✓ exported ${out.ayat.length} ayat across ${Object.keys(out.surahs).length} surahs (${wordCount} words) → quran-pilot.json`);
console.log(`✓ wrote ${surahIndex.length}-surah index → surahs.json`);
