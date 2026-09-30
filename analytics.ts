export interface AppRecord {
  id: number;
  name: string;
  category: string;
  rating: number | null;
  reviews: number;
  installs: string;
  type: string;
  price: number;
}
export type View = "overview" | "explorer" | "compare";
export interface Filters {
  search: string;
  category: string;
  type: string;
  minReviews: number;
  minRating: number;
  maxPrice: number;
}
export interface Workspace {
  filters: Filters;
  view: View;
  compare: number[];
}
export const defaults: Filters = {
  search: "",
  category: "",
  type: "",
  minReviews: 0,
  minRating: 0,
  maxPrice: 400,
};
export const label = (text: string) =>
  text
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
export const format = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );
export const compact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
export function filterApps(apps: AppRecord[], f: Filters) {
  const q = f.search.trim().toLowerCase();
  return apps.filter(
    (a) =>
      (!q || a.name.toLowerCase().includes(q)) &&
      (!f.category || f.category === a.category) &&
      (!f.type || f.type === a.type) &&
      a.reviews >= f.minReviews &&
      a.price <= f.maxPrice &&
      (f.minRating === 0 || (a.rating !== null && a.rating >= f.minRating)),
  );
}
export function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b),
    m = Math.floor(sorted.length / 2);
  return sorted.length
    ? sorted.length % 2
      ? sorted[m]
      : (sorted[m - 1] + sorted[m]) / 2
    : null;
}
export function summarize(apps: AppRecord[]) {
  const rated = apps.filter((a) => a.rating !== null),
    paid = apps.filter((a) => a.type === "Paid");
  return {
    count: apps.length,
    rated: rated.length,
    missing: apps.length - rated.length,
    mean: rated.length
      ? rated.reduce((s, a) => s + a.rating!, 0) / rated.length
      : null,
    paid: paid.length,
    free: apps.filter((a) => a.type === "Free").length,
    medianPrice: median(paid.map((a) => a.price)),
    medianReviews: median(apps.map((a) => a.reviews)),
  };
}
export function categoryStats(apps: AppRecord[]) {
  const groups = new Map<string, AppRecord[]>();
  apps.forEach((a) => {
    const group = groups.get(a.category) ?? [];
    group.push(a);
    groups.set(a.category, group);
  });
  return [...groups]
    .map(([category, items]) => ({
      category,
      name: label(category),
      ...summarize(items),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
export function histogram(apps: AppRecord[]) {
  const bins = [0, 0, 0, 0, 0];
  apps.forEach((a) => {
    if (a.rating !== null) bins[Math.min(4, Math.floor(a.rating) - 1)]++;
  });
  return bins.map((count, i) => ({
    name: ["1–<2", "2–<3", "3–<4", "4–<5", "Exactly 5"][i],
    count,
  }));
}
export function sortApps(apps: AppRecord[], sort: string) {
  return [...apps].sort(
    (a, b) =>
      (sort === "name"
        ? a.name.localeCompare(b.name)
        : sort === "rating"
          ? (b.rating ?? -1) - (a.rating ?? -1)
          : sort === "price"
            ? b.price - a.price
            : b.reviews - a.reviews) ||
      a.name.localeCompare(b.name) ||
      a.id - b.id,
  );
}
export function chartSample(apps: AppRecord[], limit = 600) {
  const eligible = apps.filter((a) => a.rating !== null && a.reviews > 0);
  const step = Math.max(1, Math.ceil(eligible.length / limit));
  return {
    total: eligible.length,
    points: eligible
      .filter((_, i) => i % step === 0)
      .map((a) => ({ ...a, logReviews: Math.log10(a.reviews) })),
  };
}
const bounded = (value: string | null, fallback: number, max: number) =>
  value !== null && value.trim() !== "" && Number.isFinite(Number(value))
    ? Math.min(max, Math.max(0, Number(value)))
    : fallback;
export function parseWorkspace(query: string, apps: AppRecord[]): Workspace {
  const p = new URLSearchParams(query),
    cats = new Set(apps.map((a) => a.category)),
    ids = new Set(apps.map((a) => a.id));
  return {
    filters: {
      search: (p.get("q") ?? "").slice(0, 200),
      category: cats.has(p.get("category") ?? "") ? p.get("category")! : "",
      type: ["Free", "Paid"].includes(p.get("type") ?? "")
        ? p.get("type")!
        : "",
      minReviews: bounded(p.get("reviews"), 0, 1e9),
      minRating: bounded(p.get("rating"), 0, 5),
      maxPrice: bounded(p.get("price"), 400, 400),
    },
    view: ["overview", "explorer", "compare"].includes(p.get("view") ?? "")
      ? (p.get("view") as View)
      : "overview",
    compare: [
      ...new Set(
        (p.get("compare") ?? "")
          .split(",")
          .filter(Boolean)
          .map(Number)
          .filter((id) => Number.isInteger(id) && ids.has(id)),
      ),
    ].slice(0, 4),
  };
}
export function serializeWorkspace(state: Workspace) {
  const p = new URLSearchParams(),
    f = state.filters;
  if (f.search) p.set("q", f.search);
  if (f.category) p.set("category", f.category);
  if (f.type) p.set("type", f.type);
  if (f.minReviews) p.set("reviews", String(f.minReviews));
  if (f.minRating) p.set("rating", String(f.minRating));
  if (f.maxPrice !== 400) p.set("price", String(f.maxPrice));
  if (state.view !== "overview") p.set("view", state.view);
  if (state.compare.length) p.set("compare", state.compare.join(","));
  return p.toString();
}
// Quoting alone does not prevent spreadsheet formula execution in exported names.
export function csvCell(value: string | number | null) {
  const s = String(value ?? "");
  const safe = /^[\s]*[=+@-]/.test(s) ? "'" + s : s;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function toCsv(apps: AppRecord[]) {
  return [
    "App,Category,Rating,Reviews,Install band,Type,Price USD",
    ...apps.map((a) =>
      [
        a.name,
        label(a.category),
        a.rating,
        a.reviews,
        a.installs,
        a.type,
        a.price,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}
