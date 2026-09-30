import React, { useEffect, useState, Suspense } from "react";
import { createRoot } from "react-dom/client";
import Dashboard from "./Dashboard";
import "./theme.css";
import dataUrl from "./apps.json?url";
import type { AppRecord } from "./analytics";
function Loader() {
  const [apps, setApps] = useState<AppRecord[] | null>(null),
    [error, setError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    fetch(dataUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw Error("Dataset unavailable");
        return r.json();
      })
      .then((data) => {
        if (!Array.isArray(data) || data.length !== 9659)
          throw Error("Invalid dataset");
        setApps(data);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [attempt]);
  return apps ? (
    <Suspense fallback={<Loading />}>
      <Dashboard apps={apps} />
    </Suspense>
  ) : error ? (
    <div className="loading-screen">
      <h1>The archive couldn’t be loaded.</h1>
      <p>Check your connection and try again.</p>
      <button onClick={() => setAttempt((n) => n + 1)}>Retry</button>
    </div>
  ) : (
    <Loading />
  );
}
function Loading() {
  return (
    <div className="loading-screen" role="status">
      <span className="loading-mark">am</span>
      <h2>Opening your workspace</h2>
      <p>Preparing the historical app archive…</p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Loader />
  </React.StrictMode>,
);
