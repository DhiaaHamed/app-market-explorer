import {
  lazy,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Database,
  ExternalLink,
  LayoutDashboard,
  ListFilter,
  Menu,
  Plus,
  Search,
  Share2,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import {
  type AppRecord,
  type Filters,
  type View,
  type Workspace,
  defaults,
  format,
  compact,
  money,
  label,
  filterApps,
  summarize,
  categoryStats,
  sortApps,
  parseWorkspace,
  serializeWorkspace,
  toCsv,
} from "./analytics";
const CategoryChart = lazy(() =>
  import("./Charts").then((m) => ({ default: m.CategoryChart })),
);
const RatingChart = lazy(() =>
  import("./Charts").then((m) => ({ default: m.RatingChart })),
);
const ReviewScatter = lazy(() =>
  import("./Charts").then((m) => ({ default: m.ReviewScatter })),
);
const icons = {
    overview: LayoutDashboard,
    explorer: ListFilter,
    compare: Columns3,
  },
  names = {
    overview: "Market overview",
    explorer: "App explorer",
    compare: "Compare apps",
  };
interface SavedView {
  name: string;
  query: string;
}
function loadSaved(): SavedView[] {
  try {
    const raw = JSON.parse(localStorage.getItem("ame-views") ?? "[]");
    return Array.isArray(raw)
      ? raw
          .filter(
            (x) => typeof x?.name === "string" && typeof x?.query === "string",
          )
          .slice(0, 5)
      : [];
  } catch {
    return [];
  }
}
export default function Dashboard({ apps }: { apps: AppRecord[] }) {
  const categories = useMemo(
      () => [...new Set(apps.map((a) => a.category))].sort(),
      [apps],
    ),
    all = useMemo(() => summarize(apps), [apps]);
  const [workspace, setWorkspace] = useState<Workspace>(() =>
    parseWorkspace(location.search, apps),
  );
  const [sort, setSort] = useState("reviews"),
    [page, setPage] = useState(0),
    [detail, setDetail] = useState<AppRecord | null>(null),
    [notice, setNotice] = useState(""),
    [mobileMenu, setMobileMenu] = useState(false),
    [saved, setSaved] = useState(loadSaved),
    [saveName, setSaveName] = useState(""),
    [method, setMethod] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null),
    methodDialog = useRef<HTMLDialogElement>(null),
    navigation = useRef<HTMLElement>(null),
    menuToggle = useRef<HTMLButtonElement>(null);
  const { filters, view, compare } = workspace;
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view]);
  const selected = useMemo(() => filterApps(apps, filters), [filters]),
    stats = useMemo(() => summarize(selected), [selected]),
    cats = useMemo(() => categoryStats(selected), [selected]),
    sorted = useMemo(() => sortApps(selected, sort), [selected, sort]);
  const comparison = compare
      .map((id) => apps.find((a) => a.id === id))
      .filter((a): a is AppRecord => !!a),
    pages = Math.max(1, Math.ceil(sorted.length / 15)),
    safePage = Math.min(page, pages - 1),
    active = Object.entries(filters).filter(
      ([key, value]) => value !== defaults[key as keyof Filters],
    ).length;
  useEffect(() => {
    const q = serializeWorkspace(workspace);
    history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
  }, [workspace]);
  useEffect(() => {
    const pop = () => {
      setWorkspace(parseWorkspace(location.search, apps));
      setPage(0);
    };
    addEventListener("popstate", pop);
    return () => removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!mobileMenu) return;
    const panel = navigation.current;
    const controls = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled), input:not(:disabled)",
        ) ?? [],
      );
    const focusFrame = requestAnimationFrame(() => controls()[0]?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const desktop = matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMobileMenu(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenu(false);
      if (event.key !== "Tab") return;
      const items = controls(),
        first = items[0],
        last = items.at(-1);
      if (!panel?.contains(document.activeElement)) {
        event.preventDefault();
        first?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", closeOnDesktop);
      menuToggle.current?.focus();
    };
  }, [mobileMenu]);
  useEffect(() => {
    if (detail && !dialog.current?.open) dialog.current?.showModal();
    else if (!detail) dialog.current?.close();
  }, [detail]);
  useEffect(() => {
    if (method && !methodDialog.current?.open)
      methodDialog.current?.showModal();
    else if (!method) methodDialog.current?.close();
  }, [method]);
  function update(patch: Partial<Filters>) {
    setWorkspace((w) => ({ ...w, filters: { ...w.filters, ...patch } }));
    setPage(0);
  }
  function navigate(next: View) {
    setWorkspace((w) => ({ ...w, view: next }));
    setMobileMenu(false);
  }
  function toggleCompare(a: AppRecord) {
    if (compare.includes(a.id))
      setWorkspace((w) => ({
        ...w,
        compare: w.compare.filter((id) => id !== a.id),
      }));
    else if (compare.length < 4)
      setWorkspace((w) => ({ ...w, compare: [...w.compare, a.id] }));
    else
      setNotice(
        "Your comparison has four apps. Remove one before adding another.",
      );
  }
  function reset() {
    setWorkspace((w) => ({ ...w, filters: { ...defaults } }));
    setPage(0);
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      setNotice("Link copied, including filters and comparison.");
    } catch {
      setNotice("Copy the browser address to share this view.");
    }
  }
  function saveView() {
    const name = saveName.trim();
    if (!name) return;
    const next = [
      { name, query: serializeWorkspace(workspace) },
      ...saved.filter((v) => v.name !== name),
    ].slice(0, 5);
    try {
      localStorage.setItem("ame-views", JSON.stringify(next));
      setSaved(next);
      setSaveName("");
      setNotice("View saved on this device.");
    } catch {
      setNotice("Storage unavailable. Use a share link instead.");
    }
  }
  function removeSaved(index: number) {
    const next = saved.filter((_, i) => i !== index);
    try {
      localStorage.setItem("ame-views", JSON.stringify(next));
      setSaved(next);
    } catch {
      setNotice("Unable to update saved views.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
        new Blob(["\uFEFF" + toCsv(sorted)], {
          type: "text/csv;charset=utf-8",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "google-play-selection.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`${format(sorted.length)} app records exported.`);
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      {mobileMenu && (
        <button
          className="menu-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        ref={navigation}
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            mobileMenu &&
            !event.currentTarget.contains(document.activeElement)
          ) {
            event.currentTarget.querySelector<HTMLAnchorElement>("a")?.focus();
          }
        }}
        role={mobileMenu ? "dialog" : undefined}
        aria-modal={mobileMenu ? true : undefined}
        aria-label="Dashboard navigation"
        id="dashboard-navigation"
        className={"sidebar " + (mobileMenu ? "open" : "")}
      >
        <a className="brand" href={location.pathname}>
          <span>
            Google Play<span className="brand-sub">Analysis Dashboard</span>
          </span>
        </a>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Workspace">
          {(["overview", "explorer", "compare"] as View[]).map((key) => {
            const Icon = icons[key];
            return (
              <button
                key={key}
                onClick={() => navigate(key)}
                className={view === key ? "active" : ""}
                aria-current={view === key ? "page" : undefined}
              >
                <Icon size={17} />
                {names[key]}
                {key === "compare" && (
                  <span className="nav-count">{compare.length}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-rule" />
        <p className="nav-label">
          SAVED VIEWS <span>{saved.length}/5</span>
        </p>
        <div className="saved-list">
          {saved.length ? (
            saved.map((s, i) => (
              <div key={s.name}>
                <button
                  onClick={() => {
                    setWorkspace(parseWorkspace(s.query, apps));
                    setPage(0);
                    setMobileMenu(false);
                  }}
                >
                  <Bookmark size={14} />
                  <span>{s.name}</span>
                </button>
                <button
                  className="icon-button"
                  aria-label={`Remove saved view ${s.name}`}
                  onClick={() => removeSaved(i)}
                >
                  <X size={12} />
                </button>
              </div>
            ))
          ) : (
            <p>Save a useful filter combination to return to it later.</p>
          )}
        </div>
        <form
          className="save-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveView();
          }}
        >
          <input
            aria-label="Saved view name"
            placeholder="Name this view…"
            value={saveName}
            maxLength={40}
            onChange={(e) => setSaveName(e.target.value)}
          />
          <button disabled={!saveName.trim()} aria-label="Save current view">
            <Plus size={16} />
          </button>
        </form>
        <div className="sidebar-bottom">
          <div className="dataset-card">
            <Database size={17} />
            <strong>Google Play archive</strong>
            <p>{format(apps.length)} apps · 33 categories</p>
            <span>
              <i /> Historical sample · 2018
            </span>
          </div>
          <a href="https://1huge-dhiaa.carrd.co/" className="author">
            <span className="avatar">DH</span>
            <span>
              <b>Dhiaa Hamed</b>
              <small>Design & data portfolio</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
        </div>
      </aside>
      <div className="main-shell" inert={mobileMenu}>
        <header className="topbar">
          <div>
            <button
              ref={menuToggle}
              className="menu-button icon-button"
              aria-label="Toggle navigation"
              aria-expanded={mobileMenu}
              aria-controls="dashboard-navigation"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb">
              Workspace <span>/</span> <b>{names[view]}</b>
            </span>
          </div>
          <div>
            <span className="archive-badge">
              <i /> ARCHIVE DATA
            </span>
            <a
              href="https://github.com/DhiaaHamed/app-market-explorer"
              aria-label="View source code on GitHub"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </header>
        <main id="workspace">
          <section className="page-heading">
            <div>
              <p className="eyebrow">GOOGLE PLAY ANALYSIS DASHBOARD</p>
              <h1>
                {view === "overview"
                  ? "The app landscape, in focus."
                  : view === "explorer"
                    ? "Find your next insight."
                    : "A closer look, side by side."}
              </h1>
              <p>
                {view === "overview"
                  ? "Explore the categories, ratings and pricing behind a historical app sample."
                  : view === "explorer"
                    ? "Search the archive, inspect records and build a comparison."
                    : "Compare up to four shortlisted apps, independent of the current filters."}
              </p>
            </div>
            <div className="heading-actions">
              <button onClick={share}>
                <Share2 size={15} /> Share view
              </button>
              {view !== "compare" && (
                <button
                  className="primary"
                  onClick={download}
                  disabled={!selected.length}
                >
                  <ArrowDownToLine size={15} /> Export CSV
                </button>
              )}
            </div>
          </section>
          {view !== "compare" && (
            <>
              <section className="filter-panel" aria-label="Filter apps">
                <div className="filter-title">
                  <SlidersHorizontal size={16} />
                  <b>Filters</b>
                  {active > 0 && <span className="filter-count">{active}</span>}
                  <button onClick={reset} disabled={!active}>
                    Reset all
                  </button>
                </div>
                <div className="filters">
                  <label className="search-field">
                    <span>Search apps</span>
                    <div>
                      <Search size={16} />
                      <input
                        type="search"
                        placeholder="Search by app name…"
                        value={filters.search}
                        onChange={(e) => update({ search: e.target.value })}
                      />
                    </div>
                  </label>
                  <label>
                    Category
                    <select
                      value={filters.category}
                      onChange={(e) => update({ category: e.target.value })}
                    >
                      <option value="">All categories</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>
                          {label(c)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Pricing
                    <select
                      value={filters.type}
                      onChange={(e) => update({ type: e.target.value })}
                    >
                      <option value="">Free & paid</option>
                      <option>Free</option>
                      <option>Paid</option>
                    </select>
                  </label>
                  <label>
                    Minimum reviews
                    <select
                      value={filters.minReviews}
                      onChange={(e) =>
                        update({ minReviews: Number(e.target.value) })
                      }
                    >
                      {[0, 100, 1000, 10000, 100000].map((n) => (
                        <option key={n} value={n}>
                          {n ? format(n) + "+" : "Any count"}
                        </option>
                      ))}
                      {![0, 100, 1000, 10000, 100000].includes(
                        filters.minReviews,
                      ) && (
                        <option value={filters.minReviews}>
                          {format(filters.minReviews)}+
                        </option>
                      )}
                    </select>
                  </label>
                  <label>
                    Minimum rating
                    <select
                      value={filters.minRating}
                      onChange={(e) =>
                        update({ minRating: Number(e.target.value) })
                      }
                    >
                      {[0, 3, 4, 4.5, 5].map((n) => (
                        <option key={n} value={n}>
                          {n ? n + "+ stars" : "Include unrated"}
                        </option>
                      ))}
                      {![0, 3, 4, 4.5, 5].includes(filters.minRating) && (
                        <option value={filters.minRating}>
                          {filters.minRating}+ stars
                        </option>
                      )}
                    </select>
                  </label>
                </div>
                <div className="filter-footer">
                  <span aria-live="polite">
                    <b>{format(selected.length)}</b> apps match · {cats.length}{" "}
                    categories
                  </span>
                  <label>
                    Price ceiling{" "}
                    <input
                      type="range"
                      min="0"
                      max="400"
                      step="1"
                      aria-label="Maximum price"
                      value={filters.maxPrice}
                      onChange={(e) =>
                        update({ maxPrice: Number(e.target.value) })
                      }
                    />
                    <b>{money(filters.maxPrice)}</b>
                  </label>
                </div>
              </section>
              <section className="metrics" aria-label="Selection metrics">
                <Metric
                  label="Apps in selection"
                  value={format(stats.count)}
                  sub={`${((stats.count / apps.length) * 100).toFixed(1)}% of the full sample`}
                  icon={<Database size={17} />}
                  accent
                />
                <Metric
                  label="Average app rating"
                  value={stats.mean?.toFixed(2) ?? "—"}
                  sub={`${format(stats.rated)} rated apps · out of 5`}
                  icon={<Star size={17} />}
                  note={
                    stats.mean === null
                      ? ""
                      : `${stats.mean >= all.mean! ? "+" : ""}${(stats.mean - all.mean!).toFixed(2)} vs full sample`
                  }
                />
                <Metric
                  label="Free app share"
                  value={
                    stats.count
                      ? ((stats.free / stats.count) * 100).toFixed(1) + "%"
                      : "—"
                  }
                  sub={`${format(stats.free)} free / ${format(stats.paid)} paid`}
                  icon={<Columns3 size={17} />}
                />
                <Metric
                  label="Median paid price"
                  value={
                    stats.medianPrice === null ? "—" : money(stats.medianPrice)
                  }
                  sub={`${format(stats.paid)} paid apps · source USD`}
                  icon={<Activity size={17} />}
                />
              </section>
            </>
          )}
          {view === "overview" && (
            <>
              <div className="chart-grid">
                <section className="panel">
                  <PanelHeading
                    eyebrow="CATEGORY COMPOSITION"
                    title="Where the apps are"
                    badge="Top 7"
                  />
                  <p className="caption">
                    Click a category to focus the workspace.
                  </p>
                  <CategoryChart
                    apps={selected}
                    select={(category) => update({ category })}
                  />
                </section>
                <section className="panel">
                  <PanelHeading
                    eyebrow="RATING DISTRIBUTION"
                    title="How the sample scores"
                    badge="Out of 5"
                  />
                  <p className="caption">
                    One observation per rated app; no review weighting.
                  </p>
                  <RatingChart apps={selected} />
                  <div className="chart-foot">
                    <span>Missing ratings excluded</span>
                    <b>{format(stats.missing)} apps</b>
                  </div>
                </section>
              </div>
              <div className="scatter-grid">
                <section className="panel">
                  <PanelHeading
                    eyebrow="RATINGS × REVIEWS"
                    title="Popularity meets perception"
                  />
                  <p className="caption">
                    Inspect a point to see its underlying app record.
                  </p>
                  <ReviewScatter apps={selected} inspect={setDetail} />
                </section>
                <section className="insight-panel">
                  <span className="insight-icon">
                    <Activity size={20} />
                  </span>
                  <p className="eyebrow">IN THIS SELECTION</p>
                  <h2>
                    {cats[0] ? (
                      <>
                        {cats[0].name} leads
                        <br />
                        the category mix.
                      </>
                    ) : (
                      "No matching apps."
                    )}
                  </h2>
                  <p>
                    {cats[0]
                      ? `${format(cats[0].count)} apps make up ${((cats[0].count / stats.count) * 100).toFixed(1)}% of your selection. This describes the sample, not market share.`
                      : "Widen your filters to explore the archive."}
                  </p>
                  <div className="insight-stat">
                    <span>Median review count</span>
                    <b>
                      {stats.medianReviews === null
                        ? "—"
                        : format(stats.medianReviews)}
                    </b>
                  </div>
                  <div className="insight-stat">
                    <span>Rating completeness</span>
                    <b>
                      {stats.count
                        ? ((stats.rated / stats.count) * 100).toFixed(1) + "%"
                        : "—"}
                    </b>
                  </div>
                  <button onClick={() => navigate("explorer")}>
                    Explore these apps <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <div className="section-link">
                <span>
                  Go deeper with sorting, record details and comparisons.
                </span>
                <button onClick={() => navigate("explorer")}>
                  Open app explorer <ArrowRight size={15} />
                </button>
              </div>
            </>
          )}
          {view === "explorer" && (
            <section className="panel table-panel">
              <div className="table-heading">
                <PanelHeading
                  eyebrow="THE UNDERLYING RECORDS"
                  title="Explore the app archive"
                />
                <label>
                  Sort by
                  <select
                    value={sort}
                    onChange={(e) => {
                      setSort(e.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="reviews">Most reviews</option>
                    <option value="rating">Highest rating</option>
                    <option value="price">Highest price</option>
                    <option value="name">App name</option>
                  </select>
                </label>
              </div>
              <p className="caption">
                Select an app for details. Add up to four apps to compare.
              </p>
              <div
                className="table-scroll"
                tabIndex={0}
                role="region"
                aria-label="Scrollable app results"
              >
                <table>
                  <thead>
                    <tr>
                      <th>App</th>
                      <th>Category</th>
                      <th>Rating</th>
                      <th>Reviews</th>
                      <th>Install band</th>
                      <th>Price</th>
                      <th>Compare</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted
                      .slice(safePage * 15, (safePage + 1) * 15)
                      .map((a) => (
                        <tr key={a.id}>
                          <td>
                            <button
                              className="app-name"
                              onClick={() => setDetail(a)}
                            >
                              <AppTile app={a} />
                              <span>{a.name}</span>
                            </button>
                          </td>
                          <td>{label(a.category)}</td>
                          <td>
                            <span className="rating-pill">
                              {a.rating?.toFixed(1) ?? "—"}{" "}
                              {a.rating !== null && <Star size={10} />}
                            </span>
                          </td>
                          <td>{compact(a.reviews)}</td>
                          <td>{a.installs}</td>
                          <td>
                            {a.type === "Free" ? (
                              <span className="free-tag">Free</span>
                            ) : (
                              money(a.price)
                            )}
                          </td>
                          <td>
                            <button
                              className={
                                "compare-toggle " +
                                (compare.includes(a.id) ? "selected" : "")
                              }
                              aria-label={`${compare.includes(a.id) ? "Remove" : "Compare"} ${a.name}`}
                              aria-pressed={compare.includes(a.id)}
                              onClick={() => toggleCompare(a)}
                            >
                              {compare.includes(a.id) ? (
                                <Check size={15} />
                              ) : (
                                <Plus size={15} />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {!selected.length && (
                  <div className="empty-state">
                    <Search size={30} />
                    <h2>No apps found</h2>
                    <p>Try a broader search or reset the filters.</p>
                    <button onClick={reset}>Reset filters</button>
                  </div>
                )}
              </div>
              <div className="pagination">
                <span>
                  {selected.length
                    ? `${format(safePage * 15 + 1)}–${format(Math.min((safePage + 1) * 15, selected.length))} of ${format(selected.length)}`
                    : "0 results"}
                </span>
                <div>
                  <button
                    aria-label="Previous page"
                    disabled={safePage === 0}
                    onClick={() => setPage(safePage - 1)}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    Page {safePage + 1} of {pages}
                  </span>
                  <button
                    aria-label="Next page"
                    disabled={safePage >= pages - 1}
                    onClick={() => setPage(safePage + 1)}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </section>
          )}
          {view === "compare" && (
            <section className="panel comparison-panel">
              <PanelHeading
                eyebrow="YOUR SHORTLIST"
                title={`${comparison.length} of 4 apps selected`}
              />
              <p className="caption">
                Share links preserve selections. App ratings describe different
                reviewer populations.
              </p>
              {comparison.length ? (
                <>
                  <div className="compare-grid">
                    {comparison.map((a) => (
                      <article key={a.id}>
                        <div className="compare-card-top">
                          <AppTile app={a} />
                          <button
                            className="icon-button"
                            aria-label={`Remove ${a.name}`}
                            onClick={() => toggleCompare(a)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <h3>{a.name}</h3>
                        <span className="category-tag">
                          {label(a.category)}
                        </span>
                        <div className="comparison-rating">
                          <strong>{a.rating?.toFixed(1) ?? "—"}</strong>
                          <span>/ 5 rating</span>
                        </div>
                        <div className="rating-meter">
                          <span style={{ width: `${(a.rating ?? 0) * 20}%` }} />
                        </div>
                        <dl>
                          <div>
                            <dt>Reviews</dt>
                            <dd>{format(a.reviews)}</dd>
                          </div>
                          <div>
                            <dt>Install band</dt>
                            <dd>{a.installs}</dd>
                          </div>
                          <div>
                            <dt>Price</dt>
                            <dd>
                              {a.type === "Free" ? "Free" : money(a.price)}
                            </dd>
                          </div>
                          <div>
                            <dt>Pricing model</dt>
                            <dd>{a.type}</dd>
                          </div>
                        </dl>
                        <button onClick={() => setDetail(a)}>
                          View record <ArrowUpRight size={14} />
                        </button>
                      </article>
                    ))}
                    {comparison.length < 4 && (
                      <button
                        className="add-comparison"
                        onClick={() => navigate("explorer")}
                      >
                        <Plus size={28} />
                        <b>Add another app</b>
                        <span>Choose from the archive</span>
                      </button>
                    )}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setWorkspace((w) => ({ ...w, compare: [] }))}
                  >
                    Clear comparison
                  </button>
                </>
              ) : (
                <div className="empty-state">
                  <Columns3 size={36} />
                  <h2>Start with a few interesting apps.</h2>
                  <p>Use the + button in App explorer to build a comparison.</p>
                  <button
                    className="primary"
                    onClick={() => navigate("explorer")}
                  >
                    Find apps <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </section>
          )}
          <footer>
            <span>
              <Database size={13} /> Historical sample · updates through August
              2018
            </span>
            <button onClick={() => setMethod(true)}>
              Data & methodology <ArrowUpRight size={13} />
            </button>
            <a href="https://1huge-dhiaa.carrd.co/">Dhiaa Hamed ↗</a>
          </footer>
        </main>
        {compare.length > 0 && view !== "compare" && (
          <div className="compare-tray">
            <div className="tray-tiles">
              {comparison.map((a) => (
                <AppTile key={a.id} app={a} />
              ))}
            </div>
            <span>
              <b>{compare.length} apps</b> in your shortlist
            </span>
            <button onClick={() => navigate("compare")}>
              Compare now <ArrowRight size={14} />
            </button>
          </div>
        )}
        <div
          className={"toast " + (notice ? "visible" : "")}
          role="status"
          aria-live="polite"
        >
          {notice && (
            <>
              <Check size={16} />
              {notice}
            </>
          )}
        </div>
        <dialog
          ref={dialog}
          onCancel={() => setDetail(null)}
          onClose={() => setDetail(null)}
          aria-labelledby="record-title"
        >
          {detail && (
            <>
              <div className="modal-top">
                <p className="eyebrow">APP RECORD / #{detail.id}</p>
                <button
                  className="icon-button"
                  aria-label="Close app details"
                  onClick={() => setDetail(null)}
                >
                  <X size={20} />
                </button>
              </div>
              <AppTile app={detail} />
              <h2 id="record-title">{detail.name}</h2>
              <p>
                {label(detail.category)} · {detail.type}
              </p>
              <dl className="detail-grid">
                <div>
                  <dt>Rating</dt>
                  <dd>
                    {detail.rating === null
                      ? "Not rated"
                      : detail.rating.toFixed(1) + " / 5"}
                  </dd>
                </div>
                <div>
                  <dt>Reviews</dt>
                  <dd>{format(detail.reviews)}</dd>
                </div>
                <div>
                  <dt>Install band</dt>
                  <dd>{detail.installs}</dd>
                </div>
                <div>
                  <dt>Price</dt>
                  <dd>{money(detail.price)}</dd>
                </div>
              </dl>
              <p className="micro">
                Historical source record. Install bands are lower bounds; names
                are not verified package identifiers.
              </p>
              <button className="primary" onClick={() => toggleCompare(detail)}>
                {compare.includes(detail.id)
                  ? "Remove from comparison"
                  : "Add to comparison"}{" "}
                <Columns3 size={16} />
              </button>
            </>
          )}
        </dialog>
        <dialog
          ref={methodDialog}
          onCancel={() => setMethod(false)}
          onClose={() => setMethod(false)}
          aria-labelledby="method-title"
        >
          <div className="modal-top">
            <p className="eyebrow">SOURCE & INTERPRETATION</p>
            <button
              className="icon-button"
              aria-label="Close methodology"
              onClick={() => setMethod(false)}
            >
              <X size={20} />
            </button>
          </div>
          <h2 id="method-title">Understand the sample.</h2>
          <p>
            The 9,659 app records come from the historical Google Play dataset
            supplied with DataCamp coursework. Collection date and sampling
            design are not established; records include updates through August
            2018.
          </p>
          <ul>
            <li>
              Each rated app contributes equally to average ratings. Missing
              values are excluded, never converted to zero.
            </li>
            <li>
              Paid price is the median of paid apps in source USD. Install bands
              are not exact downloads.
            </li>
            <li>
              Scatter plots use a deterministic subset of up to 600 rated apps
              with positive review counts. Summaries and exports use every
              filtered record.
            </li>
            <li>
              Categories describe sample composition, not current market share,
              demand or profitability.
            </li>
            <li>
              Saved views stay in your browser. Share links include filters and
              compared app IDs; no account or tracking is used.
            </li>
          </ul>
          <a href="https://github.com/DhiaaHamed/google-play-analysis">
            View original analysis & dataset <ExternalLink size={14} />
          </a>
        </dialog>
      </div>
    </div>
  );
}
function AppTile({ app }: { app: AppRecord }) {
  return (
    <span className={"app-tile tone-" + (app.id % 5)} aria-hidden="true">
      {app.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
function PanelHeading({
  eyebrow,
  title,
  badge,
}: {
  eyebrow: string;
  title: string;
  badge?: string;
}) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {badge && <span className="badge">{badge}</span>}
    </div>
  );
}
function Metric({
  label: caption,
  value,
  sub,
  icon,
  accent,
  note,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  accent?: boolean;
  note?: string;
}) {
  return (
    <article className={"metric " + (accent ? "accent" : "")}>
      <div>
        <span>{caption}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <p>{sub}</p>
      {note && <small>{note}</small>}
    </article>
  );
}
