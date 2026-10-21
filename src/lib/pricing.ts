/**
 * pricing.ts: the pre-purchase questions, shared by the pricing component
 * (the accordion) and the two pricing pages (their FAQPage schema), so the
 * structured data always matches what is on screen.
 */
export interface Faq { q: string; a: string; }

export const pricingFaqs = (l: 'ar' | 'en'): Faq[] => l === 'en'
  ? [
      { q: 'Is the free trial really free?', a: "Yes. Choose the annual plan and you pay $0.00 today, with 7 full days of every feature. Cancel before the trial ends and you won't be charged; otherwise the $35.99 annual subscription begins." },
      { q: 'Do I need a card for the free plan?', a: 'No. Create a free account with your email, Google or Apple, and start right away without any payment details.' },
      { q: 'Does one subscription work on both web and app?', a: 'Yes. One subscription with the same account unlocks everything on the site and in the iOS and Android apps, wherever you sign in.' },
      { q: 'What happens if I cancel?', a: 'Cancel anytime and keep full access until the end of the paid period. You then return automatically to the free plan without losing your account or progress.' },
      { q: 'How are payments processed?', a: 'Through Paddle (Merchant of Record), securely, with major cards, PayPal, Apple Pay, and Google Pay. Tax is added at checkout based on your country, and regional prices may vary.' },
    ]
  : [
      { q: 'هل التجربة المجانية مجانية فعلًا؟', a: 'نعم. عند اختيار الخطة السنوية تدفع ٠٫٠٠$ اليوم، ولك ٧ أيام كاملة بكل الميزات. إن ألغيت قبل انتهائها فلن تُحاسَب، وإلا بدأ الاشتراك السنوي ٣٥٫٩٩$.' },
      { q: 'هل أحتاج إلى بطاقة دفع للخطة المجانية؟', a: 'لا. أنشئ حسابًا مجانيًّا بالبريد أو بحساب Google أو Apple، وابدأ فورًا دون أي بيانات دفع.' },
      { q: 'هل يعمل الاشتراك على الويب والتطبيق معًا؟', a: 'نعم. اشتراكٌ واحد بحسابك نفسه يفتح كل شيء على الموقع وفي تطبيق iOS وAndroid، أينما سجّلت دخولك.' },
      { q: 'ماذا يحدث إذا ألغيت؟', a: 'تُلغي في أي وقت، ويبقى وصولك الكامل حتى نهاية الفترة المدفوعة، ثم تعود تلقائيًّا إلى الخطة المجانية دون فقدان حسابك أو تقدّمك.' },
      { q: 'كيف تتم معالجة الدفع؟', a: 'عبر Paddle (بائع التسجيل)، بأمانٍ كامل وببطاقات الدفع الشائعة وPayPal وApple Pay وGoogle Pay. تُضاف الضرائب عند الدفع حسب بلدك، وقد تختلف الأسعار الإقليمية.' },
    ];
