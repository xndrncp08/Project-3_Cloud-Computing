// src/pages/DashboardPage.jsx
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import Header from "../components/Header";
import StatCard from "../components/StatCard";
import ChartSection from "../components/ChartSection";
import RecipeTable from "../components/RecipeTable";
import Spinner from "../components/Spinner";
import styles from "./DashboardPage.module.css";

export default function DashboardPage() {
  const { authFetch } = useAuth();

  // Chart data (pre-computed, from Redis)
  const [chartData, setChartData] = useState(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState("");

  // Recipe data (paginated, filtered)
  const [recipes, setRecipes] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState("");

  // Filters / search / pagination state
  const [keyword, setKeyword] = useState("");
  const [dietType, setDietType] = useState("All");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // ── Fetch chart data once on mount ──────────────────────────────────────────
  useEffect(() => {
    async function loadCharts() {
      try {
        const res = await authFetch("/api/chartData");
        if (!res.ok) throw new Error((await res.json()).error || "Failed to load charts");
        setChartData(await res.json());
      } catch (err) {
        setChartError(err.message);
      } finally {
        setChartLoading(false);
      }
    }
    loadCharts();
  }, [authFetch]);

  // ── Fetch recipes on filter/search/page change ───────────────────────────
  const fetchRecipes = useCallback(async () => {
    setRecipesLoading(true);
    setRecipesError("");
    try {
      const params = new URLSearchParams({
        page,
        pageSize: PAGE_SIZE,
        ...(keyword.trim() && { keyword: keyword.trim() }),
        ...(dietType !== "All" && { dietType }),
      });
      const res = await authFetch(`/api/recipes?${params}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load recipes");
      const data = await res.json();
      setRecipes(data.recipes);
      setPagination(data.pagination);
    } catch (err) {
      setRecipesError(err.message);
    } finally {
      setRecipesLoading(false);
    }
  }, [authFetch, keyword, dietType, page]);

  useEffect(() => { fetchRecipes(); }, [fetchRecipes]);

  // Reset to page 1 when filter/search changes
  function handleSearch(val) { setKeyword(val); setPage(1); }
  function handleDietType(val) { setDietType(val); setPage(1); }

  const dietTypes = chartData?.dietTypes || [];

  return (
    <div className={styles.layout}>
      <Header />

      <main className={styles.main}>
        {/* ── Stats row ─────────────────────────────────────────────────────── */}
        <section className={styles.stats}>
          <StatCard
            label="Total Recipes"
            value={chartData?.totalRecipes ?? "—"}
            icon="◈"
            color="accent"
            loading={chartLoading}
          />
          <StatCard
            label="Diet Types"
            value={chartData?.dietTypes?.length ?? "—"}
            icon="⬡"
            color="green"
            loading={chartLoading}
          />
          <StatCard
            label="Avg Calories"
            value={chartData?.avgMacros ? `${Math.round(
              (chartData.avgMacros.protein * 4 + chartData.avgMacros.carbs * 4 + chartData.avgMacros.fat * 9)
            )} kcal` : "—"}
            icon="◉"
            color="amber"
            loading={chartLoading}
          />
          <StatCard
            label="Last Updated"
            value={chartData?.lastUpdated
              ? new Date(chartData.lastUpdated).toLocaleDateString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
              : "—"}
            icon="◷"
            color="text"
            loading={chartLoading}
          />
        </section>

        {/* ── Charts ────────────────────────────────────────────────────────── */}
        {chartError ? (
          <div className={styles.errorCard}>
            <strong>Chart data unavailable:</strong> {chartError}
          </div>
        ) : (
          <ChartSection chartData={chartData} loading={chartLoading} />
        )}

        {/* ── Recipe explorer ────────────────────────────────────────────────── */}
        <section className={styles.explorerSection}>
          <div className={styles.explorerHeader}>
            <h2 className={styles.sectionTitle}>Recipe Explorer</h2>
            {pagination && (
              <span className={styles.resultCount}>
                {pagination.totalCount.toLocaleString()} results
              </span>
            )}
          </div>

          {/* Search + filter bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>⌕</span>
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search recipes, cuisines, ingredients…"
                value={keyword}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {keyword && (
                <button className={styles.clearBtn} onClick={() => handleSearch("")}>✕</button>
              )}
            </div>

            <select
              className={styles.select}
              value={dietType}
              onChange={(e) => handleDietType(e.target.value)}
            >
              <option value="All">All diet types</option>
              {dietTypes.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {recipesError ? (
            <div className={styles.errorCard}>{recipesError}</div>
          ) : (
            <RecipeTable
              recipes={recipes}
              loading={recipesLoading}
              keyword={keyword}
            />
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={!pagination.hasPrev}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </button>

              <div className={styles.pageNumbers}>
                {buildPageNumbers(pagination.page, pagination.totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
                  ) : (
                    <button
                      key={p}
                      className={`${styles.pageNum} ${p === pagination.page ? styles.pageNumActive : ""}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  )
                )}
              </div>

              <button
                className={styles.pageBtn}
                disabled={!pagination.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push("…");
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}
