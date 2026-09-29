# App Market Explorer

A responsive, interactive dashboard for exploring a historical sample of **9,659 Google Play apps across 33 categories**. Built by Dhiaa Hamed with AI assistance as a web and data-visualization portfolio extension.

## Explore

- Search app names and combine category, pricing and minimum-review filters.
- Compare the category mix and rating distribution for the current selection.
- Inspect average ratings, free-app share and median paid price with explicit denominators.
- Sort and paginate app records. Missing ratings, empty selections and zero paid apps are handled explicitly.
- Use keyboard-accessible controls and a responsive layout on mobile or desktop.

**Stack:** HTML, CSS and plain JavaScript. No framework, build dependencies, CDN, tracking or live API. Data is bundled so the app can also run offline.

## Run

Download and extract this repository, then open `index.html` in a modern browser. Alternatively, serve it locally:

```sh
python -m http.server 8000
```

Visit `http://localhost:8000`. No package installation is required.

## Verify

With Node.js installed:

```sh
node test.js
```

The tests check source totals, valid numeric values, combined filters, search normalization, empty selections, missing ratings, median calculation, histogram boundaries and stable sorting without modifying the source array. GitHub Actions runs these tests on pushes and pull requests. Browser interaction checks complement these calculation tests; the automated suite is not a full browser-accessibility audit.

## Data and interpretation

`data.js` is a reduced, validated browser representation of the historical `apps.csv` supplied with a DataCamp project. The unchanged source is preserved in [google-play-analysis/datasets/apps.csv](https://github.com/1hugemtf/google-play-analysis/blob/main/datasets/apps.csv). The collection date and sampling design are not established; source records include app updates through August 2018.

- Each source app name occurs once; names are not verified package identifiers.
- Ratings are unweighted across rated apps, not across individual reviewers. Missing ratings are excluded rather than converted to zero.
- Median paid price uses paid apps only, in source USD values.
- Install bands are lower bounds, not exact download counts. No sum is presented as total downloads.
- The sample cannot establish current market share, demand, causality or commercial opportunity.
- Histogram intervals are `[1,2)`, `[2,3)`, `[3,4)`, `[4,5)` and exactly `5`.

To rebuild the bundled data, download the linked original CSV and run:

```sh
python build_data.py path/to/apps.csv
node test.js
```

The source SHA-256 is recorded in `data.js`. The builder rejects duplicate app names and invalid ratings, pricing types or numeric values. Original names and install-band strings are preserved; they are rendered as text rather than injected HTML.

## Project scope and attribution

This is a new interactive web application extending the earlier notebook project, not a claim of an independently collected dataset. The dashboard interface, filtering and tests were developed with AI assistance. The historical data was supplied for DataCamp coursework; source-data rights remain with the respective owners. No blanket license is asserted over third-party data.

[Portfolio](https://1huge-dhiaa.carrd.co/) · [LinkedIn](https://www.linkedin.com/in/dhiaa-hamed/) · [Original notebook analysis](https://github.com/1hugemtf/google-play-analysis)
