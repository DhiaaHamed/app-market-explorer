# App Market Explorer

A React and TypeScript analytics workspace for **9,659 historical Google Play apps across 33 categories**. Explore linked charts, inspect app records and build a shareable comparison.

## Workspace features

- **Market overview:** category composition, rating histogram, ratings/reviews scatter plot and selection-aware summaries.
- **App explorer:** combined search, category, pricing, rating, review-count and price-ceiling filters; deterministic sorting and pagination; app-detail dialogs.
- **Comparison:** shortlist up to four apps and inspect their ratings, review counts, install bands and prices side by side.
- **Saved views:** keep up to five named filter/comparison states in browser storage.
- **Shareable state:** URL parameters restore the current filters, view and comparison; malformed values are validated and bounded.
- **CSV export:** export every filtered record with correct quoting and protection against spreadsheet formula injection.
- **Responsive design:** mobile navigation, scrollable tables, keyboard controls, native modal focus management, visible focus indicators and reduced-motion support.

## Stack and architecture

React 19 · TypeScript · Vite · Recharts · Lucide

| Module                           | Responsibility                                                                |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `main.tsx`                       | Dataset loading, retry state and application entry                            |
| `Dashboard.tsx`                  | Workspace state, navigation, filters, records, comparisons and saved views    |
| `Charts.tsx`                     | Lazily loaded chart components and point inspection                           |
| `analytics.ts`                   | Pure filtering, aggregation, sorting, sampling, URL parsing and CSV functions |
| `analytics.test.ts`              | Calculation, boundary, round-trip and export tests                            |
| `theme.css`                      | Responsive layout, components, focus and motion styles                        |
| `build_data.py`                  | Validate and transform the source CSV                                         |
| `apps.json` / `data-source.json` | Bundled records and source checksum                                           |

Data is loaded as a separate static asset; chart code is split from the application shell. No backend account, external API, third-party font request or analytics tracker is required. Saved views remain on the current browser/device. App tiles are generated initials, not official product logos.

## Develop

Use **Node.js 24+** and **pnpm 11.19.0**.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. This is a compiled application: opening the source `index.html` directly is not supported.

```sh
pnpm test
pnpm build
pnpm preview
```

The production site is generated in `dist/`. Relative asset paths support deployment under a GitHub Pages repository path. GitHub Actions validates the code and builds the production artifact before deployment.

## Verification

Tests cover source totals and numeric domains; combined filters; trimmed search; empty and unrated-only selections; median and histogram boundaries; non-mutating sorting; deterministic scatter sampling; URL round trips and invalid query parameters; and CSV escaping/formula protection. TypeScript strict checking runs before each production build. Browser interaction testing complements these tests; this is not a claim of a complete accessibility audit.

## Data and interpretation

The historical `apps.csv` was supplied with a DataCamp learning project. The unchanged source is preserved in [google-play-analysis](https://github.com/DhiaaHamed/google-play-analysis/blob/main/datasets/apps.csv). Source records include updates through August 2018; the collection date and sampling design are not established.

- Ratings give each rated app equal weight, not each reviewer. Missing ratings are excluded, never converted to zero.
- Median paid price uses paid apps only, in source USD values. No inflation or currency adjustment is applied.
- Install bands are reported lower bounds, not exact download counts. They are not summed as exact downloads.
- Category counts describe sample composition, not current market share, demand or commercial opportunity.
- The scatter plot includes rated apps with positive review counts, sampled deterministically in source order to at most 600 points. This subset is for display, not a representative statistical sample. Metrics and exports use all filtered records.
- App names occur once in the source but are not verified package identifiers. Comparing ratings does not account for differing reviewer populations.
- Rating histogram intervals are `[1,2)`, `[2,3)`, `[3,4)`, `[4,5)` and exactly `5`.

Rebuild the data from a downloaded copy of the original CSV:

```sh
python build_data.py path/to/apps.csv
pnpm test
```

The builder records the source SHA-256 in `data-source.json`, rejects duplicate app names and invalid numeric values, and preserves original names and install bands. The source dataset remains subject to its owners’ rights; no blanket license is asserted over third-party data.

This project extends the earlier notebook into an interactive web application. It does not claim an independently collected dataset.

[Portfolio](https://1huge-dhiaa.carrd.co/) · [LinkedIn](https://www.linkedin.com/in/dhiaa-hamed/) · [Notebook analysis](https://github.com/DhiaaHamed/google-play-analysis)
