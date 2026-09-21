/**
 * Direct answers for the lesson heroes.
 *
 * Each lesson opens with this text before its summary: the definition and the
 * governing rule in two or three sentences, the way a reader (or an answer
 * engine) would quote it. Studies of AI citations show the quoted passage is
 * almost always in the first third of the page, so the answer goes first and
 * the essay follows. Keep every entry under ~60 words, definition first,
 * one canonical example where it helps.
 */
export interface LessonAnswer {
  ar: string;
  en: string;
}

export const lessonAnswers: Record<string, LessonAnswer> = {
  'al-adad': {
    ar: 'العدد اسم يدل على كمية المعدود، وأقسامه أربعة: المفرد (من واحد إلى عشرة)، والمركب (من أحد عشر إلى تسعة عشر)، وألفاظ العقود (من عشرين إلى تسعين)، والمعطوف. يوافق المعدود في واحد واثنين، ويخالفه من ثلاثة إلى عشرة، ويُعرب بحسب موقعه، وتمييزه مجرور بعد الثلاثة إلى العشرة ومنصوب بعد أحد عشر إلى تسعة وتسعين.',
    en: 'A number in Arabic agrees with the counted noun in gender for one and two, reverses gender for three to ten, and follows fixed patterns from eleven to ninety-nine. The number takes its case from its position in the sentence. The counted noun is genitive plural after three to ten and accusative singular after eleven to ninety-nine.',
  },
  'al-afal-al-khamsa': {
    ar: 'الأفعال الخمسة كل فعل مضارع اتصلت به ألف الاثنين أو واو الجماعة أو ياء المخاطبة، نحو: يفعلان وتفعلان ويفعلون وتفعلون وتفعلين. تُرفع بثبوت النون، وتُنصب وتُجزم بحذفها.',
    en: 'The five verbs are any imperfect verb ending in the dual alif, the plural wāw, or the feminine singular yāʾ: yafʿalāni, tafʿalāni, yafʿalūna, tafʿalūna, tafʿalīna. They are nominative by keeping the final nūn, and accusative or jussive by dropping it.',
  },
  'al-asma-al-khamsa': {
    ar: 'الأسماء الخمسة هي: أب وأخ وحم وفو وذو. تُرفع بالواو وتُنصب بالألف وتُجر بالياء، بشرط أن تكون مفردة مكبرة مضافة إلى غير ياء المتكلم، نحو: جاء أبوك، ورأيت أباك، ومررت بأبيك.',
    en: 'The five nouns are ab (father), akh (brother), ḥam (father-in-law), fū (mouth), and dhū (possessor of). They take wāw in the nominative, alif in the accusative, and yāʾ in the genitive, but only when singular, not diminutive, and annexed to something other than the first-person yāʾ: jāʾa abūka, raʾaytu abāka, marartu bi-abīka.',
  },
  'al-asma-al-mawsula': {
    ar: 'الاسم الموصول اسم مبني يدل على معين بواسطة جملة بعده تسمى صلة الموصول، وفيها ضمير يعود عليه يسمى العائد. الموصولات الخاصة: الذي والتي واللذان واللتان والذين واللاتي واللائي، والمشتركة: من وما وأي. ومحله من الإعراب بحسب موقعه في الجملة.',
    en: 'A relative noun is an indeclinable noun completed by a following clause, the ṣila, which contains a pronoun referring back to it. The specific relatives are alladhī, allatī, alladhāni, allatāni, alladhīna, allātī, and allāʾī; the shared ones are man, mā, and ayy. Its case position depends on its role in the sentence.',
  },
  'al-atf': {
    ar: 'العطف تابع يتوسط بينه وبين متبوعه حرف من حروف العطف، فيتبعه في إعرابه. حروفه: الواو والفاء وثم وحتى وأو وأم وبل ولا ولكن. نحو: جاء محمدٌ وعليٌّ، فعليٌّ معطوف على محمد مرفوع مثله.',
    en: 'Coordination joins a word to an earlier one through a particle, and the second word takes the case of the first: jāʾa Muḥammadun wa-ʿAliyyun, where ʿAliyyun is nominative like Muḥammadun. The particles are wa, fa, thumma, ḥattā, aw, am, bal, lā, and lākin, each with its own meaning.',
  },
  'al-badal': {
    ar: 'البدل تابع مقصود بالحكم بلا واسطة، يتبع المبدل منه في إعرابه. أنواعه: بدل مطابق (كل من كل) نحو: جاء الخليفةُ عمرُ، وبدل بعض من كل نحو: أكلتُ الرغيفَ نصفَه، وبدل اشتمال نحو: أعجبني الطالبُ خلقُه.',
    en: 'A substitute follows an earlier noun in case with no particle between them, and it is the word actually meant. There are three kinds: the whole for the whole (jāʾa l-khalīfatu ʿUmaru), the part for the whole (akaltu l-raghīfa niṣfahu), and the inclusive substitute (aʿjabanī l-ṭālibu khuluquhu).',
  },
  'al-damair': {
    ar: 'الضمير اسم مبني يدل على متكلم أو مخاطب أو غائب، وله محل من الإعراب رفعًا أو نصبًا أو جرًّا بحسب موقعه. أقسامه ثلاثة: منفصل (أنا وأنت وهو وأخواتها)، ومتصل (تاء الفاعل وكاف الخطاب وهاء الغائب وأخواتها)، ومستتر.',
    en: 'Every Arabic pronoun is indeclinable and takes a case position from its role: nominative, accusative, or genitive. There are three groups: detached pronouns (anā, anta, huwa and the rest), attached pronouns (the tāʾ of the doer, the kāf of address, the hāʾ of the third person and the rest), and concealed pronouns.',
  },
  'al-fail': {
    ar: 'الفاعل اسم مرفوع يدل على من قام بالفعل أو اتصف به، ويأتي بعد الفعل أبدًا، نحو: قامَ الطالبُ. يكون اسمًا ظاهرًا أو ضميرًا أو مصدرًا مؤولًا، ولا يُحذف، ويبقى الفعل معه مفردًا وإن كان الفاعل مثنى أو جمعًا.',
    en: 'The fāʿil is the nominative noun that follows a verb and names who performed the act: qāma l-ṭālibu. It always comes after its verb, it may be an explicit noun, a pronoun, or an interpreted verbal noun, it is never omitted, and the verb stays singular before it even when the doer is dual or plural.',
  },
  'al-hal': {
    ar: 'الحال اسم نكرة منصوب يبين هيئة صاحبه عند وقوع الفعل، ويجيب عن السؤال «كيف؟»، نحو: جاء محمدٌ مسرعًا. تأتي مفردة وجملة وشبه جملة، وصاحبها معرفة في الغالب.',
    en: 'The ḥāl is an indefinite accusative noun describing the state of its subject at the moment of the act, and it answers the question how: jāʾa Muḥammadun musriʿan. It may be a single word, a clause, or a prepositional phrase, and its subject is normally definite.',
  },
  'al-idafa': {
    ar: 'الإضافة نسبة بين اسمين يُجر ثانيهما (المضاف إليه) أبدًا، ويُحذف من الأول (المضاف) التنوين ونون المثنى والجمع، نحو: كتابُ الطالبِ. وهي معنوية تفيد المضاف تعريفًا أو تخصيصًا، ولفظية لا تفيده شيئًا من ذلك.',
    en: 'Annexation joins two nouns so that the second qualifies the first. The second noun is always genitive, and the first drops its tanwīn and the nūn of the dual and plural: kitābu l-ṭālibi. Semantic annexation makes the first noun definite or specific; formal annexation does not.',
  },
  'al-istithna': {
    ar: 'الاستثناء إخراج ما بعد الأداة من حكم ما قبلها. أدواته: إلا وغير وسوى وخلا وعدا وحاشا. والمستثنى بإلا منصوب في الكلام التام المثبت، ويجوز فيه النصب والبدلية في التام المنفي، ويُعرب بحسب موقعه في الكلام المفرغ.',
    en: 'Exception removes what follows the particle from the ruling before it. The particles are illā, ghayr, siwā, khalā, ʿadā, and ḥāshā. After illā the excepted noun is accusative in a complete affirmative sentence, accusative or a substitute in a complete negative one, and takes the case of its role when the sentence is incomplete.',
  },
  'al-jumla-al-filiyya': {
    ar: 'الجملة الفعلية هي التي تبدأ بفعل، وركناها الفعل والفاعل (أو نائب الفاعل)، ويلحق بهما المفعول به إن كان الفعل متعديًا، نحو: كتبَ الطالبُ الدرسَ.',
    en: 'A verbal sentence begins with a verb. Its pillars are the verb and its doer, or the deputy doer in the passive, and a transitive verb adds a direct object: kataba l-ṭālibu l-darsa.',
  },
  'al-jumla-al-ismiyya': {
    ar: 'الجملة الاسمية هي التي تبدأ باسم، وركناها المبتدأ والخبر، وكلاهما مرفوع، نحو: العلمُ نورٌ. والخبر يأتي مفردًا وجملة وشبه جملة، ويجوز تقديمه على المبتدأ في مواضع ويجب في أخرى.',
    en: 'A nominal sentence begins with a noun. Its two pillars, the mubtadaʾ and the khabar, are both nominative: al-ʿilmu nūrun. The predicate may be a single word, a clause, or a prepositional phrase, and in some positions it precedes the subject.',
  },
  'al-maful-al-mutlaq': {
    ar: 'المفعول المطلق مصدر منصوب من لفظ الفعل يُذكر بعده لتوكيده أو بيان نوعه أو عدده، نحو: ضربتُ ضربًا، وسرتُ سيرَ الصالحين، ودقّ الجرسُ دقتين.',
    en: 'The absolute object is an accusative verbal noun from the same root as its verb, placed after it to confirm the act, state its kind, or state its number: ḍarabtu ḍarban, sirtu sayra l-ṣāliḥīna, daqqa l-jarasu daqqatayni.',
  },
  'al-maful-bih': {
    ar: 'المفعول به اسم منصوب يدل على من وقع عليه فعل الفاعل، نحو: قرأ الطالبُ الكتابَ. يُنصب بالفتحة أو ما ينوب عنها، وقد يتقدم على الفاعل، ويتعدد مع الأفعال المتعدية إلى أكثر من مفعول.',
    en: 'The direct object is the accusative noun on which the doer’s act falls: qaraʾa l-ṭālibu l-kitāba. It takes fatḥa or its substitute, it may precede the doer, and verbs that take two or three objects have more than one.',
  },
  'al-maful-fih': {
    ar: 'المفعول فيه هو الظرف: اسم منصوب يدل على زمان وقوع الفعل أو مكانه متضمنًا معنى «في»، نحو: سافرتُ ليلًا، وجلستُ أمامَ البيت. ظروف الزمان تُنصب كلها، وظروف المكان يُنصب المبهم منها ويُجر المختص بفي.',
    en: 'The adverbial object, the ẓarf, is an accusative noun stating the time or place of the act with the sense of “in”: sāfartu laylan, jalastu amāma l-bayti. All adverbs of time take the accusative; adverbs of place take it only when their meaning is unbounded.',
  },
  'al-maful-li-ajlih': {
    ar: 'المفعول لأجله مصدر قلبي منصوب يبين سبب وقوع الفعل، ويجيب عن السؤال «لماذا؟»، نحو: قمتُ احترامًا للمعلم. شروط نصبه: أن يكون مصدرًا قلبيًّا، معللًا للفعل، متحدًا معه في الزمان والفاعل، وإلا جُر باللام.',
    en: 'The causative object is an accusative verbal noun of an inward state that gives the reason for the act, answering why: qumtu iḥtirāman lil-muʿallimi. It takes the accusative only when it is a verbal noun of the heart, explains the verb, and shares its time and doer; otherwise it takes the genitive with li-.',
  },
  'al-mamnu-min-al-sarf': {
    ar: 'الممنوع من الصرف اسم معرب لا يُنوَّن ويُجر بالفتحة بدل الكسرة، نحو: مررتُ بأحمدَ. يُمنع لعلة واحدة (صيغة منتهى الجموع، أو ألف التأنيث)، أو لعلتين (العلمية أو الوصفية مع سبب آخر). ويعود إلى الجر بالكسرة إذا عُرّف بأل أو أُضيف.',
    en: 'A diptote is a declinable noun that takes no tanwīn and is genitive with fatḥa instead of kasra: marartu bi-Aḥmada. A noun is a diptote for one cause (the ultimate plural pattern, or a feminine alif) or for two (a proper name or an adjective plus another cause). With al- or in annexation it returns to kasra.',
  },
  'al-maqsur-wal-manqus-wal-mamdud': {
    ar: 'المقصور اسم آخره ألف لازمة (الفتى)، والمنقوص اسم آخره ياء لازمة قبلها كسرة (القاضي)، والممدود اسم آخره همزة بعد ألف زائدة (السماء). تُقدر الحركات كلها على المقصور، وتُقدر الضمة والكسرة على المنقوص وتظهر الفتحة، وتظهر الحركات كلها على الممدود.',
    en: 'A shortened noun ends in a fixed alif (al-fatā), a defective noun in a fixed yāʾ after kasra (al-qāḍī), and an extended noun in hamza after an added alif (al-samāʾ). All three case vowels are implied on the shortened noun; ḍamma and kasra are implied on the defective noun while fatḥa appears; all three appear on the extended noun.',
  },
  'al-mubtada-wal-khabar': {
    ar: 'المبتدأ اسم مرفوع يقع في أول الجملة الاسمية، والخبر اسم مرفوع يتمم معناه، نحو: الطالبُ مجتهدٌ. الخبر مفرد أو جملة أو شبه جملة، ويُقدم على المبتدأ جوازًا ووجوبًا في مواضع، ويُحذف أحدهما إذا دل عليه دليل.',
    en: 'The mubtadaʾ is a nominative noun that opens a nominal sentence, and the khabar is the nominative that completes it: al-ṭālibu mujtahidun. The predicate is a single word, a clause, or a prepositional phrase; it may precede the subject and sometimes must; and either may be omitted when the context supplies it.',
  },
  'al-munada': {
    ar: 'المنادى اسم يُذكر بعد حرف نداء (يا، أيا، هيا، أي، الهمزة) طلبًا للإقبال. يُبنى على الضم إن كان علمًا مفردًا أو نكرة مقصودة (يا محمدُ)، ويُنصب إن كان مضافًا أو شبيهًا بالمضاف أو نكرة غير مقصودة (يا طالبَ العلمِ).',
    en: 'The vocative is a noun called after a particle of address (yā, ayā, hayā, ay, or the hamza). It is built on ḍamma when it is a single proper name or a specific indefinite (yā Muḥammadu), and accusative when annexed, resembling the annexed, or an unspecific indefinite (yā ṭāliba l-ʿilmi).',
  },
  'al-naat': {
    ar: 'النعت تابع يدل على صفة في متبوعه (النعت الحقيقي) أو فيما يتعلق به (النعت السببي)، نحو: جاء الطالبُ المجتهدُ. يتبع المنعوت في الإعراب والتعريف والتنكير، والحقيقي يتبعه أيضًا في العدد والنوع.',
    en: 'An adjective is a follower that names a quality of its noun (the real adjective) or of something connected to it (the causal adjective): jāʾa l-ṭālibu l-mujtahidu. It matches the noun in case and in definiteness, and the real adjective also matches it in number and gender.',
  },
  'al-nakira-wal-marifa': {
    ar: 'النكرة اسم يدل على شائع في جنسه (رجل)، والمعرفة اسم يدل على معين. المعارف سبع: الضمير، والعلم، واسم الإشارة، والاسم الموصول، والمعرف بأل، والمضاف إلى معرفة، والمنادى المقصود.',
    en: 'An indefinite noun names any member of its kind (rajul, a man); a definite noun names a specific one. The seven definites are the pronoun, the proper name, the demonstrative, the relative noun, the noun with al-, the noun annexed to a definite, and the specific vocative.',
  },
  'al-tamyiz': {
    ar: 'التمييز اسم نكرة منصوب يفسر إبهامًا في ذات أو نسبة، ويجيب عن السؤال «من أي شيء؟»، نحو: اشتريتُ رطلًا عسلًا، وطاب محمدٌ نفسًا. تمييز الذات يأتي بعد العدد والمقادير، وتمييز النسبة يفسر إبهام الجملة.',
    en: 'The specifier is an indefinite accusative noun that clears up a vagueness in a thing or in a relation, answering the question of what: ishtaraytu raṭlan ʿasalan, ṭāba Muḥammadun nafsan. The specifier of a thing follows numbers and measures; the specifier of a relation clarifies a whole clause.',
  },
  'al-tawkid': {
    ar: 'التوكيد تابع يُذكر لتقرير المتبوع ورفع احتمال السهو أو المجاز. قسمان: لفظي بإعادة اللفظ نفسه (جاء جاء محمدٌ)، ومعنوي بألفاظ محفوظة: النفس والعين وكل وجميع وكلا وكلتا، بشرط اتصالها بضمير يعود على المؤكد (جاء الطلابُ كلُّهم).',
    en: 'Emphasis is a follower that confirms its noun and removes any suspicion of a slip or a figure of speech. It is verbal when the word is repeated (jāʾa jāʾa Muḥammadun) and semantic when it uses nafs, ʿayn, kull, jamīʿ, kilā, or kiltā with a pronoun referring to the emphasized noun (jāʾa l-ṭullābu kulluhum).',
  },
  'alamat-al-irab': {
    ar: 'علامات الإعراب الأصلية أربع: الضمة للرفع، والفتحة للنصب، والكسرة للجر، والسكون للجزم. وتنوب عنها علامات فرعية في سبعة أبواب: المثنى، وجمع المذكر السالم، وجمع المؤنث السالم، والأسماء الخمسة، والممنوع من الصرف، والأفعال الخمسة، والمضارع المعتل الآخر.',
    en: 'The original case signs are ḍamma for the nominative, fatḥa for the accusative, kasra for the genitive, and sukūn for the jussive. Substitute signs replace them in seven chapters: the dual, the sound masculine plural, the sound feminine plural, the five nouns, the diptote, the five verbs, and the imperfect ending in a weak letter.',
  },
  'asma-al-ishara': {
    ar: 'أسماء الإشارة معارف مبنية تدل على معين بالإشارة إليه: هذا وهذه للمفرد، وهذان وهاتان للمثنى (وهما معربان)، وهؤلاء للجمع، وهنا وثَمَّ للمكان. محلها من الإعراب بحسب موقعها، والاسم المعرف بأل بعدها بدل أو عطف بيان.',
    en: 'Demonstratives are indeclinable definites that point to something: hādhā and hādhihi for the singular, hādhāni and hātāni for the dual (which decline), hāʾulāʾi for the plural, hunā and thamma for place. Their case position follows their role, and a noun with al- after them is a substitute or an explanatory apposition.',
  },
  'huruf-al-jarr': {
    ar: 'حروف الجر حروف مختصة بالأسماء تجر ما بعدها، وأشهرها: من، إلى، عن، على، في، الباء، الكاف، اللام، ورُبَّ. الحرف مبني لا محل له من الإعراب، والاسم بعده مجرور بالكسرة أو ما ينوب عنها، والجار والمجرور متعلقان بفعل أو ما يشبهه.',
    en: 'Prepositions are particles that govern nouns only and put them in the genitive. The commonest are min, ilā, ʿan, ʿalā, fī, bi-, ka-, li-, and rubba. The particle is indeclinable with no case position, the noun after it is genitive with kasra or its substitute, and the phrase attaches to a verb or something verb-like.',
  },
  'inna-wa-akhawatuha': {
    ar: 'إنّ وأخواتها حروف ناسخة تدخل على الجملة الاسمية فتنصب المبتدأ ويسمى اسمها، وترفع الخبر ويسمى خبرها، نحو: إنّ العلمَ نورٌ. وهي: إنّ وأنّ وكأنّ ولكنّ وليت ولعلّ.',
    en: 'Inna and its sisters are particles that enter a nominal sentence, put the subject into the accusative as their noun, and leave the predicate nominative as their predicate: inna l-ʿilma nūrun. They are inna, anna, kaʾanna, lākinna, layta, and laʿalla.',
  },
  'jazm-al-mudari': {
    ar: 'الجزم يختص بالفعل المضارع، وأدواته قسمان: ما يجزم فعلًا واحدًا (لم، ولمّا، ولام الأمر، ولا الناهية)، وما يجزم فعلين في أسلوب الشرط (إن، ومن، وما، ومهما، ومتى، وأخواتها). علاماته: السكون، وحذف حرف العلة، وحذف النون.',
    en: 'The jussive belongs to the imperfect verb alone. Some particles apocopate one verb: lam, lammā, the lām of command, and the lā of prohibition. Conditional particles apocopate two: in, man, mā, mahmā, matā, and their sisters. Its signs are sukūn, dropping the weak final letter, and dropping the nūn.',
  },
  'kada-wa-akhawatuha': {
    ar: 'كاد وأخواتها أفعال ناقصة تعمل عمل كان: ترفع الاسم، وخبرها جملة فعلية فعلها مضارع. أفعال المقاربة: كاد وأوشك وكرب، وأفعال الرجاء: عسى وحرى واخلولق، وأفعال الشروع: شرع وأخذ وبدأ وجعل وطفق.',
    en: 'Kāda and its sisters are deficient verbs that govern like kāna: they raise a noun and take a predicate that is always an imperfect verbal clause. Verbs of nearness: kāda, awshaka, karaba. Verbs of hope: ʿasā, ḥarā, ikhlawlaqa. Verbs of beginning: sharaʿa, akhadha, badaʾa, jaʿala, ṭafiqa.',
  },
  'kana-wa-akhawatuha': {
    ar: 'كان وأخواتها أفعال ناسخة تدخل على الجملة الاسمية فترفع المبتدأ ويسمى اسمها، وتنصب الخبر ويسمى خبرها، نحو: كان الجوُّ صحوًا. وهي: كان وأصبح وأضحى وظل وأمسى وبات وصار وليس وما زال وما دام وأخواتها.',
    en: 'Kāna and its sisters are verbs that enter a nominal sentence, keep the subject nominative as their noun, and put the predicate into the accusative as their predicate: kāna l-jawwu ṣaḥwan. They include kāna, aṣbaḥa, aḍḥā, ẓalla, amsā, bāta, ṣāra, laysa, mā zāla, and mā dāma.',
  },
  'la-nafiya-lil-jins': {
    ar: 'لا النافية للجنس حرف يعمل عمل إنّ: ينصب الاسم ويرفع الخبر، وينفي الحكم عن الجنس كله، نحو: لا إلهَ إلا الله. شروط عملها: أن يكون اسمها وخبرها نكرتين، وأن يتصل بها اسمها، وألا يسبقها حرف جر.',
    en: 'The lā of categorical negation governs like inna: it puts its noun in the accusative, leaves its predicate nominative, and denies the ruling of the whole class: lā ilāha illā llāh. It governs only when its noun and predicate are indefinite, its noun follows it directly, and no preposition precedes it.',
  },
  'naib-al-fail': {
    ar: 'نائب الفاعل اسم مرفوع يحل محل الفاعل بعد حذفه وبناء الفعل للمجهول، نحو: كُتِبَ الدرسُ. يُبنى الماضي للمجهول بضم أوله وكسر ما قبل آخره، والمضارع بضم أوله وفتح ما قبل آخره. وينوب عن الفاعل المفعول به، أو الظرف، أو الجار والمجرور، أو المصدر.',
    en: 'The deputy doer is the nominative noun that takes the doer’s place when the doer is removed and the verb is made passive: kutiba l-darsu. The perfect is made passive with ḍamma on its first letter and kasra before its last; the imperfect with ḍamma on the first and fatḥa before the last. The object, an adverb, a prepositional phrase, or a verbal noun can deputize.',
  },
  'nasb-al-mudari': {
    ar: 'المضارع يُنصب إذا سبقه ناصب: أن ولن وكي وإذن، أو أن مضمرة بعد لام التعليل وحتى ولام الجحود وفاء السببية وواو المعية. علامات نصبه: الفتحة الظاهرة أو المقدرة، وحذف النون في الأفعال الخمسة.',
    en: 'The imperfect takes the accusative after an, lan, kay, or idhan, or after an implied an following the lām of purpose, ḥattā, the lām of denial, the fāʾ of consequence, or the wāw of accompaniment. Its signs are fatḥa, shown or implied, and dropping the nūn in the five verbs.',
  },
  'uslub-al-istifham': {
    ar: 'الاستفهام طلب العلم بشيء مجهول. أدواته حرفان لا محل لهما من الإعراب: الهمزة وهل، وأسماء لها محل بحسب موقعها: من وما ومتى وأين وكيف وكم وأي. فـ«كيف» خبر مقدم في «كيف حالُك؟» وحال في «كيف جئتَ؟».',
    en: 'A question asks for knowledge of something unknown. Two particles have no case position, the hamza and hal. The interrogative nouns take a case position from their role: man, mā, matā, ayna, kayfa, kam, and ayy. So kayfa is a fronted predicate in kayfa ḥāluka and a ḥāl in kayfa jiʾta.',
  },
  'uslub-al-madh-wal-dhamm': {
    ar: 'نعم وبئس فعلان ماضيان جامدان لإنشاء المدح والذم. فاعلهما معرف بأل، أو مضاف إلى معرف بأل، أو ضمير مستتر يفسره تمييز، ثم يأتي المخصوص بالمدح أو الذم مبتدأً مؤخرًا، نحو: نعم الرجلُ محمدٌ. ومثلهما حبذا في المدح ولا حبذا في الذم.',
    en: 'Niʿma and biʾsa are frozen perfect verbs of praise and blame. Their doer is a noun with al-, a noun annexed to one, or a concealed pronoun explained by a specifier, and the person praised or blamed follows as a postponed subject: niʿma l-rajulu Muḥammadun. Ḥabbadhā and lā ḥabbadhā work the same way.',
  },
  'uslub-al-shart': {
    ar: 'الشرط تعليق حصول الجواب على حصول الشرط بأداة. أدواته جازمة تجزم فعلين (إن، ومن، وما، ومهما، ومتى، وأين، وأينما)، وغير جازمة (إذا، ولو، ولولا، وكلما). ويقترن الجواب بالفاء وجوبًا إذا لم يصلح أن يكون شرطًا.',
    en: 'A conditional sentence ties an outcome to a condition through a particle. Apocopating particles put both verbs in the jussive: in, man, mā, mahmā, matā, ayna, aynamā. Non-apocopating ones are idhā, law, lawlā, and kullamā. The outcome takes fāʾ whenever it could not itself serve as a condition.',
  },
  'uslub-al-taajjub': {
    ar: 'التعجب استعظام أمر خفي سببه، وله صيغتان قياسيتان: «ما أفعلَه» نحو: ما أجملَ السماءَ، و«أفعِلْ به» نحو: أجمِلْ بالسماءِ. «ما» نكرة تامة مبتدأ، والفعل جامد فاعله مستتر وجوبًا، والاسم بعده مفعول به، وفي الصيغة الثانية الباء زائدة.',
    en: 'Wonder is expressed by two fixed patterns: mā afʿalahu, as in mā ajmala l-samāʾa, and afʿil bihi, as in ajmil bil-samāʾi. In the first, mā is an indefinite subject, the verb is frozen with an obligatorily concealed doer, and the noun after it is the object; in the second the bāʾ is redundant.',
  },
  'zanna-wa-akhawatuha': {
    ar: 'ظنّ وأخواتها أفعال تدخل على المبتدأ والخبر فتنصبهما مفعولين، نحو: ظننتُ الامتحانَ سهلًا. منها أفعال القلوب: ظنّ وحسب وخال وزعم ورأى وعلم ووجد، وأفعال التحويل: صيّر وجعل واتخذ. ويُلغى عملها جوازًا إذا توسطت أو تأخرت.',
    en: 'Ẓanna and its sisters are verbs that enter upon a subject and predicate and put both in the accusative as two objects: ẓanantu l-imtiḥāna sahlan. Verbs of the heart: ẓanna, ḥasiba, khāla, zaʿama, raʾā, ʿalima, wajada. Verbs of transformation: ṣayyara, jaʿala, ittakhadha. Their governance may be cancelled when they come in the middle or at the end.',
  },
};
