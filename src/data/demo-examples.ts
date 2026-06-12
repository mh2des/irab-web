/**
 * Pre-parsed demo data for the live i'rab parser.
 *
 * Format mirrors the actual app's /api/irab response: scholar-grade detail
 * with `irab` (full classical analysis), `details` (hidden pronouns,
 * attachments, alternate views), `type` (noun/verb/particle/adjective),
 * plus sentence-level `explanation` and optional `additionalClarification`.
 *
 * Specimen + chips are hand-crafted to match what a trained scholar would
 * give. User-typed input hits the Worker which returns the same shape.
 */

export type WordCase = 'marfu' | 'mansub' | 'majrur' | 'jazm' | 'mabni';
export type WordType = 'noun' | 'verb' | 'particle' | 'adjective';

export interface ParsedWord {
  /** The word with full diacritics */
  word: string;
  /** Word category (noun/verb/particle/adjective) */
  type: WordType;
  /** Grammatical case (drives the underline color in the verse display) */
  case: WordCase;
  /** Case label in Arabic (مرفوع، منصوب، مجرور...) */
  caseLabel: string;
  /** Function transliterated for technical labels */
  functionLatin: string;
  /** Full classical i'rab analysis in Arabic */
  irab: string;
  /** Additional details: hidden pronouns, attachments, alternate views, morphological notes */
  details: string;
}

export interface ParseExample {
  id: string;
  /** Original text */
  text: string;
  /** Fully vocalized text */
  vocalizedSentence: string;
  /** Source reference, e.g. "Surah al-Fatiha · 1:2" */
  source?: string;
  /** English meaning */
  meaning?: string;
  /** Sentence-level structural explanation (Arabic) */
  explanation: string;
  /** Optional rhetorical/balagha note */
  additionalClarification?: string;
  words: ParsedWord[];
}

// ─── Specimen: Surah al-Fatiha 1:2 ─────────────────────────────────────────
export const SPECIMEN: ParseExample = {
  id: 'fatiha-2',
  text: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ',
  vocalizedSentence: 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَالَمِينَ',
  source: 'سورة الفاتحة · الآية ٢',
  meaning: 'All praise belongs to Allah, Lord of all worlds.',
  explanation:
    'الجملة اسمية. (ٱلْحَمْدُ) مبتدأ، وخبره الجار والمجرور (لِلَّهِ) متعلقان بمحذوف تقديره (مُسْتَحَقٌّ) أو (ثابتٌ). وما بعد لفظ الجلالة من توابع: (رَبِّ) نعت، و(ٱلْعَالَمِينَ) مضاف إليه.',
  additionalClarification:
    'تعريف (الحمد) بـ"أل" يفيد العموم والاستغراق: كلّ حمد لله. وحذف الخبر هنا لقرينة الإضافة، وهو من أبلغ ما يكون في الإيجاز القرآني.',
  words: [
    {
      word: 'ٱلْحَمْدُ',
      type: 'noun',
      case: 'marfu',
      caseLabel: 'مرفوع',
      functionLatin: 'mubtada',
      irab: 'مبتدأ مرفوع وعلامة رفعه الضمة الظاهرة على آخره.',
      details:
        'اسم معرفة بـ(أل) الجنسية أو الاستغراقية، يفيد عموم الحمد لله سبحانه. والمصدر مضاف إلى مفعوله المحذوف تقديره (نحمده).',
    },
    {
      word: 'لِـ',
      type: 'particle',
      case: 'mabni',
      caseLabel: 'مبني',
      functionLatin: 'harf jarr',
      irab: 'حرف جر مبني على الكسر لا محل له من الإعراب.',
      details:
        'لام الجر، وقد تفيد الاختصاص أو الاستحقاق. والجار والمجرور (لِلَّهِ) متعلقان بمحذوف خبر للمبتدأ تقديره (ثابتٌ) أو (مُسْتَحَقٌّ).',
    },
    {
      word: 'ٱللَّهِ',
      type: 'noun',
      case: 'majrur',
      caseLabel: 'مجرور',
      functionLatin: 'ism majrur',
      irab: 'لفظ الجلالة اسم مجرور بحرف الجر (لـ) وعلامة جره الكسرة الظاهرة على آخره.',
      details:
        'عَلَم على الذات الإلهية المقدسة، اسم خاص لا يصغّر ولا يجمع، ولا يقبل التعريف ولا التنكير لأنه عَلَم في أصله.',
    },
    {
      word: 'رَبِّ',
      type: 'noun',
      case: 'majrur',
      caseLabel: 'مجرور',
      functionLatin: "na't",
      irab: 'نعت للفظ الجلالة مجرور وعلامة جره الكسرة الظاهرة على آخره، وهو مضاف.',
      details:
        '(الربّ) في اللغة: السيد المالك المربّي، اسم فاعل من (ربّ يربّ). يجوز إعرابه بدلاً من لفظ الجلالة، والوجه الراجح أنه نعت لأن النعت أكثر مع المعرفة.',
    },
    {
      word: 'ٱلْعَالَمِينَ',
      type: 'noun',
      case: 'majrur',
      caseLabel: 'مجرور',
      functionLatin: 'mudaf ilayh',
      irab: 'مضاف إليه مجرور وعلامة جره الياء لأنه مُلحق بجمع المذكر السالم، والنون عوض عن التنوين في المفرد.',
      details:
        'جمع (عالَم) بفتح اللام، يدلّ على كلّ ما سوى الله من المخلوقات: الإنس والجنّ والملائكة والحيوان والنبات والجماد. وقيل جمع تكسير، والراجح إلحاقه بجمع المذكر السالم لأنه يدلّ على العقلاء.',
    },
  ],
};

// ─── Chip examples (one-tap try) ───────────────────────────────────────────
export const EXAMPLES: ParseExample[] = [
  // ─── Basmala ─────────────────────────────────────────────────────────────
  {
    id: 'basmala',
    text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَنِ ٱلرَّحِيمِ',
    vocalizedSentence: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَنِ ٱلرَّحِيمِ',
    source: 'البسملة',
    meaning: 'In the name of Allah, the Most Gracious, the Most Merciful.',
    explanation:
      'الجار والمجرور (بِاسْمِ) متعلقان بفعل محذوف تقديره (أبدأ) أو (أقرأ). الجملة بأكملها استفتاح للتيمّن والتبرّك بذكر الله.',
    additionalClarification:
      'حُذف متعلَّق الجار للعلم بقصد المتكلّم، وهو من إيجاز القرآن. تأخّر المتعلَّق عن الجار يفيد الحصر: (بِاسْمِ الله أبدأ) لا بغيره.',
    words: [
      {
        word: 'بِـ',
        type: 'particle',
        case: 'mabni',
        caseLabel: 'مبني',
        functionLatin: 'harf jarr',
        irab: 'حرف جر مبني على الكسر لا محل له من الإعراب.',
        details:
          'الباء حرف جر مفيد للاستعانة والملابسة. الجار والمجرور (بِاسْمِ) متعلقان بفعل محذوف تقديره (أبدأ) أو (أقرأ).',
      },
      {
        word: 'ٱسْمِ',
        type: 'noun',
        case: 'majrur',
        caseLabel: 'مجرور',
        functionLatin: 'ism majrur',
        irab: 'اسم مجرور بالباء وعلامة جره الكسرة الظاهرة، وهو مضاف.',
        details:
          'حُذفت همزة الوصل في (اسم) خطًّا للكثرة الاستعمال في البسملة، وأصلها (بِاسْمِ).',
      },
      {
        word: 'ٱللَّهِ',
        type: 'noun',
        case: 'majrur',
        caseLabel: 'مجرور',
        functionLatin: 'mudaf ilayh',
        irab: 'لفظ الجلالة مضاف إليه مجرور وعلامة جره الكسرة الظاهرة.',
        details: 'عَلَم على الذات الإلهية، لا يقبل التنكير ولا الجمع.',
      },
      {
        word: 'ٱلرَّحْمَنِ',
        type: 'adjective',
        case: 'majrur',
        caseLabel: 'مجرور',
        functionLatin: "na't",
        irab: 'نعت للفظ الجلالة مجرور وعلامة جره الكسرة الظاهرة.',
        details:
          'صفة مشبهة على وزن (فَعْلان)، تدل على سَعة الرحمة. مختصّ بالله تعالى لا يُطلق على غيره.',
      },
      {
        word: 'ٱلرَّحِيمِ',
        type: 'adjective',
        case: 'majrur',
        caseLabel: 'مجرور',
        functionLatin: "na't",
        irab: 'نعت ثانٍ للفظ الجلالة مجرور وعلامة جره الكسرة الظاهرة.',
        details:
          'صفة مشبهة على وزن (فَعِيل)، تدل على ثبوت الرحمة وكثرتها. والفرق بينها وبين (الرحمن): الرحمن يدلّ على رحمة عامّة في الدنيا، والرحيم يدلّ على رحمة خاصّة بالمؤمنين في الآخرة.',
      },
    ],
  },
  // ─── al-Baqara 2:153 (إنّ + خبر شبه جملة) ──────────────────────────────
  {
    id: 'sabr',
    text: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّابِرِينَ',
    vocalizedSentence: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّابِرِينَ',
    source: 'سورة البقرة · الآية ١٥٣',
    meaning: 'Indeed Allah is with those who are patient.',
    explanation:
      'جملة اسمية مؤكَّدة بـ(إنّ). (ٱللَّهَ) اسم إنّ منصوب، وخبرها شبه جملة (مَعَ ٱلصَّابِرِينَ). الظرف (مَعَ) في محل رفع خبر إنّ.',
    additionalClarification:
      'تأكيد الجملة بـ(إنّ) دليل على عناية القرآن بترسيخ هذا المعنى: معيّة الله للصابرين معيّة نصرة وتأييد، لا معيّة علم فقط (التي هي عامّة لجميع الخلق).',
    words: [
      {
        word: 'إِنَّ',
        type: 'particle',
        case: 'mabni',
        caseLabel: 'مبني',
        functionLatin: 'inna',
        irab: 'حرف توكيد ونصب مبني على الفتح لا محل له من الإعراب.',
        details:
          'من الحروف الناسخة المشبَّهة بالفعل، تنصب المبتدأ اسمًا لها وترفع الخبر خبرًا لها. تفيد التوكيد.',
      },
      {
        word: 'ٱللَّهَ',
        type: 'noun',
        case: 'mansub',
        caseLabel: 'منصوب',
        functionLatin: 'ism inna',
        irab: 'لفظ الجلالة اسم إنّ منصوب وعلامة نصبه الفتحة الظاهرة على آخره.',
        details: 'كان مبتدأ في الأصل قبل دخول إنّ عليه، فلما دخلت نصبته.',
      },
      {
        word: 'مَعَ',
        type: 'noun',
        case: 'mansub',
        caseLabel: 'منصوب',
        functionLatin: 'zarf makan',
        irab:
          'ظرف مكان منصوب وعلامة نصبه الفتحة الظاهرة على آخره، وهو مضاف. وشبه الجملة (مَعَ ٱلصَّابِرِينَ) في محل رفع خبر إنّ.',
        details:
          '(مَعَ) ظرف يدل على المصاحبة. وهنا تدل على معيّة النصرة والتأييد لا معيّة العلم العامّة.',
      },
      {
        word: 'ٱلصَّابِرِينَ',
        type: 'noun',
        case: 'majrur',
        caseLabel: 'مجرور',
        functionLatin: 'mudaf ilayh',
        irab: 'مضاف إليه مجرور وعلامة جره الياء لأنه جمع مذكر سالم، والنون عوض عن التنوين في المفرد.',
        details:
          'اسم فاعل من (صبر) بمعنى احتبس واستمسك. الجمع المذكر السالم يدل على عقلاء.',
      },
    ],
  },
  // ─── العلم نور (Arabic proverb) ──────────────────────────────────────────
  {
    id: 'ilm',
    text: 'ٱلْعِلْمُ نُورٌ',
    vocalizedSentence: 'ٱلْعِلْمُ نُورٌ',
    source: 'مَثَلٌ عربي',
    meaning: 'Knowledge is light.',
    explanation:
      'جملة اسمية بسيطة من ركنين فقط: مبتدأ وخبر. (ٱلْعِلْمُ) مبتدأ، (نُورٌ) خبره. التشبيه البليغ: حُذفت أداة التشبيه ووجه الشبه، فصار التشبيه في أعلى مراتب البلاغة.',
    additionalClarification:
      'هذا تشبيه بليغ (بحذف الأداة ووجه الشبه)، وهو من أرقى أنواع التشبيه. كأنه يقول: العلم كالنور في كشف الظلمات والاهتداء به.',
    words: [
      {
        word: 'ٱلْعِلْمُ',
        type: 'noun',
        case: 'marfu',
        caseLabel: 'مرفوع',
        functionLatin: 'mubtada',
        irab: 'مبتدأ مرفوع وعلامة رفعه الضمة الظاهرة على آخره.',
        details: 'معرفة بـ(أل) الجنسية، تفيد العموم: كلّ علم نور.',
      },
      {
        word: 'نُورٌ',
        type: 'noun',
        case: 'marfu',
        caseLabel: 'مرفوع',
        functionLatin: 'khabar',
        irab: 'خبر المبتدأ مرفوع وعلامة رفعه الضمة الظاهرة (تنوين الضم).',
        details: 'نكرة، والإخبار بالنكرة عن المعرفة هنا يفيد التعظيم.',
      },
    ],
  },
];

// ─── Color tokens ─────────────────────────────────────────────────────────
/** Case → underline color (kept in sync with global.css `--color-marfu` etc.) */
export const CASE_COLORS: Record<WordCase, { hex: string; label: string }> = {
  marfu:  { hex: '#7C4DFF', label: "marfu' · nominative" },
  mansub: { hex: '#173847', label: 'mansub · accusative' },
  majrur: { hex: '#1F789B', label: 'majrur · genitive' },
  jazm:   { hex: '#8B7355', label: 'jazm · jussive' },
  mabni:  { hex: '#94A3B8', label: 'mabni · indeclinable' },
};

/** Word-type chip styling (matches the app's WordType icons + colors, adapted to brand) */
export const TYPE_META: Record<WordType, { ar: string; en: string; iconPath: string; tint: string }> = {
  noun: {
    ar: 'اسم',
    en: 'Noun',
    // Person icon
    iconPath: 'M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z',
    tint: '#1F789B',
  },
  verb: {
    ar: 'فعل',
    en: 'Verb',
    // Lightning bolt
    iconPath: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z',
    tint: '#10B981',
  },
  particle: {
    ar: 'حرف',
    en: 'Particle',
    // Link icon
    iconPath: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    tint: '#F59E0B',
  },
  adjective: {
    ar: 'صفة',
    en: 'Adjective',
    // Star icon
    iconPath: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    tint: '#7C4DFF',
  },
};
