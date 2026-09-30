import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  type AppRecord,
  defaults,
  filterApps,
  summarize,
  median,
  histogram,
  categoryStats,
  sortApps,
  chartSample,
  parseWorkspace,
  serializeWorkspace,
  toCsv,
  csvCell,
} from "./analytics.ts";
const apps: AppRecord[] = JSON.parse(
  readFileSync(new URL("./apps.json", import.meta.url), "utf8"),
);
test("source dimensions and numeric domains", () => {
  assert.equal(apps.length, 9659);
  assert.equal(new Set(apps.map((a) => a.id)).size, 9659);
  assert.equal(new Set(apps.map((a) => a.name)).size, 9659);
  assert.equal(new Set(apps.map((a) => a.category)).size, 33);
  for (const a of apps) {
    assert.ok(
      a.rating === null ||
        (Number.isFinite(a.rating) && a.rating >= 1 && a.rating <= 5),
    );
    assert.ok(Number.isInteger(a.reviews) && a.reviews >= 0);
    assert.ok(Number.isFinite(a.price) && a.price >= 0 && a.price <= 400);
    assert.ok(["Paid", "Free"].includes(a.type));
  }
});
test("full selection preserves source denominators", () => {
  assert.equal(filterApps(apps, defaults).length, 9659);
  const s = summarize(apps);
  assert.equal(s.rated, 8196);
  assert.equal(s.missing, 1463);
  assert.equal(s.paid, 756);
  assert.equal(s.free, 8903);
  assert.equal(s.medianPrice, 2.99);
  assert.ok(Math.abs(s.mean! - 4.17324) < 0.0001);
  assert.equal(
    categoryStats(apps).reduce((s, c) => s + c.count, 0),
    9659,
  );
  assert.equal(
    histogram(apps).reduce((s, c) => s + c.count, 0),
    8196,
  );
});
test("combined filters and case-insensitive trimmed search", () => {
  const selection = filterApps(apps, {
    ...defaults,
    category: "WEATHER",
    type: "Paid",
    minReviews: 10000,
  });
  assert.equal(selection.length, 4);
  assert.ok(
    selection.every(
      (a) =>
        a.category === "WEATHER" && a.type === "Paid" && a.reviews >= 10000,
    ),
  );
  assert.equal(
    filterApps(apps, { ...defaults, search: " WEATHER LIVE PRO " }).length,
    1,
  );
  assert.ok(
    filterApps(apps, { ...defaults, minRating: 4.5, maxPrice: 5 }).every(
      (a) => a.rating !== null && a.rating >= 4.5 && a.price <= 5,
    ),
  );
});
test("empty and unrated-only selections avoid NaN", () => {
  const e = summarize([]);
  assert.equal(e.count, 0);
  assert.equal(e.mean, null);
  assert.equal(e.medianPrice, null);
  assert.equal(median([]), null);
  const unrated = apps.filter((a) => a.rating === null);
  assert.equal(summarize(unrated).mean, null);
  assert.equal(filterApps(unrated, { ...defaults, minRating: 3 }).length, 0);
  assert.equal(
    filterApps(apps, { ...defaults, search: "__absent_85f0__" }).length,
    0,
  );
});
test("median and histogram boundary values", () => {
  assert.equal(median([4, 2]), 3);
  assert.equal(median([3, 1, 2]), 2);
  const ratings = [1, 1.9, 2, 2.9, 3, 3.9, 4, 4.9, 5].map((rating) => ({
    ...apps[0],
    rating,
  }));
  assert.deepEqual(
    histogram(ratings).map((b) => b.count),
    [2, 2, 2, 2, 1],
  );
});
test("sorting does not mutate input and null ratings sort last", () => {
  const original = apps.slice(0, 50),
    before = original.map((a) => a.id);
  sortApps(original, "rating");
  assert.deepEqual(
    original.map((a) => a.id),
    before,
  );
  const ordered = sortApps(apps, "rating");
  assert.equal(ordered[0].rating, 5);
  assert.equal(ordered.at(-1)?.rating, null);
  assert.ok(sortApps(apps, "reviews")[0].reviews >= ordered[0].reviews);
});
test("scatter sampling deterministic, bounded and excludes zero reviews", () => {
  const a = chartSample(apps);
  assert.ok(a.points.length <= 600);
  assert.ok(
    a.points.every(
      (p) =>
        p.rating !== null && p.reviews > 0 && Number.isFinite(p.logReviews),
    ),
  );
  assert.deepEqual(a, chartSample(apps));
  assert.deepEqual(chartSample([]), { total: 0, points: [] });
});
test("share URL round trip includes filters, view and comparison", () => {
  const state = {
    filters: {
      ...defaults,
      search: "weather & radar",
      category: "WEATHER",
      type: "Paid",
      minReviews: 10000,
      minRating: 4.5,
      maxPrice: 10,
    },
    view: "compare" as const,
    compare: [1, 2, 3],
  };
  assert.deepEqual(parseWorkspace(serializeWorkspace(state), apps), state);
});
test("untrusted URL values are bounded and compared IDs validated", () => {
  const state = parseWorkspace(
    "?category=bogus&type=no&reviews=NaN&rating=99&price=-1&view=bad&compare=0,0,1,2,3,4,999999,x",
    apps,
  );
  assert.equal(state.filters.category, "");
  assert.equal(state.filters.type, "");
  assert.equal(state.filters.minReviews, 0);
  assert.equal(state.filters.minRating, 5);
  assert.equal(state.filters.maxPrice, 0);
  assert.equal(state.view, "overview");
  assert.deepEqual(state.compare, [0, 1, 2, 3]);
  assert.deepEqual(parseWorkspace("", apps).compare, []);
});
test("CSV escapes quotes, commas, line breaks and spreadsheet formulas", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell("=SUM(A1)"), '"\'=SUM(A1)"');
  assert.equal(csvCell(" \t+1"), '"\' \t+1"');
  assert.equal(csvCell(null), '""');
  const csv = toCsv([{ ...apps[0], name: "a,b\nc", rating: null }]);
  assert.ok(csv.includes('"a,b\nc"'));
  assert.ok(csv.includes(',"",'));
  assert.equal(toCsv([]).split("\r\n").length, 1);
});
