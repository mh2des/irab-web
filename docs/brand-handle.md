# Brand handle: إعراب آب / Irab App

Decided 2026-09-02. Reason: «إعراب» is the generic word, so Google could not build a brand
entity or count name searches for the product. The two sites ranking above us both use a
coined name (أعربلي, سيبويه GPT). "اعراب اب" was already the only brand-like query in Search
Console (85 impressions in 3 months). The handle keeps the root, the domain (irab.app), the
package id (com.irabapp.arabic) and the existing alternateName "IrabApp".

## Where it lives (site, done in commit "feat(brand): …")
- Title suffix on every page: `… | إعراب آب` / `… | Irab App`
- og:site_name, application-name, apple-mobile-web-app-title (language aware)
- JSON-LD: WebSite name, Organization name, MobileApplication name, Article/Ayah publisher
- Footer wordmark and copyright, about and press pages, manifest.json
- The nav wordmark stays «إعراب» as the visual logo; the premium tier stays "Irab Plus".

## Store listings (paste exactly; limits: App Store name 30, subtitle 30; Play title 30, short description 80)

| Field | Arabic | English |
|---|---|---|
| App Store name | `إعراب آب: أتقن النحو العربي` (27) | `Irab App: Arabic Grammar, Nahw` (30) |
| App Store subtitle | `إعراب ذكي وقرآن ومعجم` (21) | `AI I'rab, Quran & Dictionary` (28) |
| Google Play title | `إعراب آب: أتقن النحو العربي` (27) | `Irab App: Arabic Grammar, Nahw` (30) |
| Play short description | `إعراب أي جملة كلمةً كلمة بالذكاء الاصطناعي، مع تدريب وتحديات وإعراب القرآن.` (75) | `AI i'rab of any Arabic sentence, word by word. Practice, Quran, dictionary.` (75) |

First sentence of both long descriptions should open with the handle:
- AR: «إعراب آب» تطبيق إعراب الجمل بالذكاء الاصطناعي…
- EN: Irab App (إعراب آب) is the AI i'rab companion…

## Other surfaces (manual)
- Google Cloud OAuth consent screen app name: `Irab App · إعراب آب` (project arabic-grammar-app-43de9, authuser 2)
- Instagram @irab.app and X @irab_app display names and bios: start with «إعراب آب · Irab App»
- Flutter app: in-app title, share sheets and PDF header (separate repo)
- Any new press mention or directory listing: always the full handle
