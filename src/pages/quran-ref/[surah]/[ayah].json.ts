/**
 * /quran-ref/<surah>/<ayah>.json: the quoted reference for one ayah (word grid,
 * detailed i'rab, sarf/balagha/fawaid, footnotes) from «الجدول في إعراب القرآن».
 * Fetched on demand by the ayah page when the reader asks for it, so the book
 * text is never part of a Google-indexable HTML document. robots.txt disallows
 * /quran-ref/ for every crawler. Static: one file per ayah at build time.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { AYAT, surahById, renderIrab, caseHex, type Ayah } from '../../../lib/quran';

const CASE_LABEL: Record<string, string> = {
  marfu: 'مرفوع',
  mansub: 'منصوب',
  majrur: 'مجرور',
  jazm: 'مجزوم',
  mabni: 'مبني',
};

export const getStaticPaths: GetStaticPaths = () =>
  AYAT.map((a) => ({
    params: { surah: surahById(a.surah)!.slug, ayah: String(a.ayah) },
    props: { ayah: a },
  }));

export const GET: APIRoute = ({ props }) => {
  const a = props.ayah as Ayah;
  const body = {
    surah: a.surah,
    ayah: a.ayah,
    ayahStart: a.ayahStart,
    ayahEnd: a.ayahEnd,
    source: 'الجدول في إعراب القرآن، تأليف محمود صافي',
    words: a.words.map((w) => ({
      token: w.token,
      analysis: w.analysis,
      hex: caseHex(w.case),
      caseLabel: w.case ? CASE_LABEL[w.case] ?? null : null,
    })),
    irabHtml: renderIrab(a.irab, a.footnotes),
    sarfHtml: renderIrab(a.sarf, a.footnotes),
    balaghaHtml: renderIrab(a.balagha, a.footnotes),
    fawaidHtml: renderIrab(a.fawaid, a.footnotes),
    footnotes: a.footnotes.map((f) => ({ id: `fn-${f.marker.replace(/[^0-9]/g, '')}`, content: f.content })),
  };
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
