# Public dictionary entries

`entries.json` backs the indexable pages at `/dictionary/<word>`. It is generated
offline by `scripts/dictionary/generate.mjs` (which calls the same worker endpoint
as the interactive المعجم) and then spot-checked by a human.

- Empty array = zero pages built. The site never generates entries at build time.
- Shape: `DictEntry[]`, see `src/lib/dictionary.ts`.
- Only entries passing `isPublishable()` are built (confidence ≥ 0.5, a real first
  definition, at least one example).
- Set `reviewed: true` on an entry after checking it. The page shows a small
  "مراجَع" mark for reviewed entries and nothing for the rest.

Plan, word list sources, quality gate and cost: `docs/dictionary-pages-plan.md`.
