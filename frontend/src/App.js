import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import LoginPage from "./LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import RegisterPage from "./RegisterPage";
import newsBackground from "./news-bg.svg";

const API_BASE_URL = "http://localhost:8080/api/news";

function getPredictionClass(prediction) {
  if (!prediction) return "";
  return prediction.toUpperCase() === "REAL" ? "real" : "fake";
}

function getConfidenceValue(confidence) {
  if (confidence === null || confidence === undefined || Number.isNaN(Number(confidence))) {
    return 0;
  }

  const numericConfidence = Number(confidence);

  if (numericConfidence <= 1) {
    return Math.round(numericConfidence * 100);
  }

  return Math.round(numericConfidence);
}

function getCurrentAffairsClass(score) {
  if (score >= 75) return "real";
  if (score >= 55) return "";
  return "fake";
}

function getSourceReliabilityClass(score) {
  if (score >= 80) return "real";
  if (score >= 60) return "";
  return "fake";
}

function getFriendlyAnalyzeError(message) {
  if (!message) {
    return "Something went wrong.";
  }

  const normalizedMessage = String(message).toLowerCase();

  if (
    normalizedMessage.includes("does not appear to be a news article") ||
    normalizedMessage.includes("not a news article")
  ) {
    return "This is not a news article URL.";
  }

  return String(message);
}

function FiltersBar({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  credibilityFilter,
  setCredibilityFilter,
  dateFilter,
  setDateFilter,
  categories,
  resultCount,
}) {
  return (
    <div className="filters-bar">
      <div className="filter-group filter-search">
        <label htmlFor="history-search">Search</label>
        <input
          id="history-search"
          type="text"
          placeholder="Search title, source, summary, or tags"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="category-filter">Category</label>
        <select
          id="category-filter"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="credibility-filter">Credibility</label>
        <select
          id="credibility-filter"
          value={credibilityFilter}
          onChange={(event) => setCredibilityFilter(event.target.value)}
        >
          <option value="all">All signals</option>
          <option value="REAL">REAL</option>
          <option value="FAKE">FAKE</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="date-filter">Date</label>
        <select
          id="date-filter"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
        >
          <option value="all">All dates</option>
          <option value="today">Today</option>
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
        </select>
      </div>

      <div className="filter-results">
        <span>{resultCount}</span>
        <p>matching records</p>
      </div>
    </div>
  );
}

function OverviewPage({ totalChecks, realCount, fakeCount }) {
  return (
    <>
      <section className="stats-grid">
        <div className="stat-card">
          <span>Total Analyses</span>
          <h3>{totalChecks}</h3>
        </div>

        <div className="stat-card">
          <span>Reliable Signals</span>
          <h3>{realCount}</h3>
        </div>

        <div className="stat-card">
          <span>Risk Flags</span>
          <h3>{fakeCount}</h3>
        </div>
      </section>

      <section className="overview-grid">
        <div className="panel">
          <h2>Workspace Overview</h2>
          <p className="panel-subtext">
            Move through focused current-affairs pages instead of scrolling one long screen.
          </p>

          <div className="overview-links">
            <NavLink to="/dashboard/analyze" className="overview-link-card">
              <span>Analyze URL</span>
              <strong>Run a new credibility check</strong>
            </NavLink>
            <NavLink to="/dashboard/result" className="overview-link-card">
              <span>Latest Result</span>
              <strong>Review the newest prediction</strong>
            </NavLink>
            <NavLink to="/dashboard/history" className="overview-link-card">
              <span>History</span>
              <strong>Browse previous analyses</strong>
            </NavLink>
            <NavLink to="/dashboard/analytics" className="overview-link-card">
              <span>Analytics</span>
              <strong>See chart-based trends</strong>
            </NavLink>
          </div>
        </div>

        <div className="panel">
          <h2>Current-Affairs Snapshot</h2>
          <p className="panel-subtext">A quick summary of how your current-affairs workspace is performing.</p>

          <div className="snapshot-list">
            <div className="snapshot-item">
              <span>Most common result</span>
              <strong>
                {realCount === fakeCount
                  ? "Balanced"
                  : realCount > fakeCount
                    ? "REAL leads"
                    : "FAKE leads"}
              </strong>
            </div>
            <div className="snapshot-item">
              <span>History status</span>
              <strong>{totalChecks ? `${totalChecks} records saved` : "No saved records yet"}</strong>
            </div>
            <div className="snapshot-item">
              <span>Next recommended step</span>
              <strong>{totalChecks ? "Review analytics" : "Analyze your first URL"}</strong>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function AnalyzePage({ url, setUrl, handleAnalyze, loading, error }) {
  return (
    <section className="single-panel-layout">
      <div className="panel analyzer-panel">
        <div className="analyzer-hero">
          <div className="analyzer-hero-copy">
            <span className="analyzer-kicker">URL Intelligence</span>
            <h2>Analyze News by URL</h2>
            <p className="panel-subtext">
              Paste a current-affairs article URL to extract the story, summarize it, and score
              its relevance.
            </p>
          </div>

          <div className="analyzer-hero-badge">
            <span>Checks</span>
            <strong>News only</strong>
            <p>Rejects pages that are not real article URLs.</p>
          </div>
        </div>

        <div className="analyzer-grid">
          <div className="analyzer-input-card">
            <div className="analyzer-input-header">
              <h3>Submit Article Link</h3>
              <p>Use a direct article URL from a news or legal-current-affairs website.</p>
            </div>

            <form onSubmit={handleAnalyze} className="analyze-form">
              <label className="analyze-input-label" htmlFor="analyze-url-input">
                News Article URL
              </label>
              <div className="analyze-input-shell">
                <span className="analyze-input-prefix">https://</span>
                <input
                  id="analyze-url-input"
                  type="text"
                  placeholder="example.com/news/article-title"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </div>

              <div className="analyze-form-actions">
                <button type="submit" disabled={loading}>
                  {loading ? "Analyzing..." : "Analyze URL"}
                </button>
                <span className="analyze-helper-text">
                  Best results come from a direct article page, not a homepage or search result.
                </span>
              </div>
            </form>

            {error && (
              <div className="warning-popup" role="alert" aria-live="polite">
                <div className="warning-popup-title">Warning</div>
                <div className="warning-popup-text">{error}</div>
              </div>
            )}
          </div>

          <aside className="analyzer-side-panel">
            <div className="analyzer-info-card">
              <h3>What We Check</h3>
              <ul className="analyzer-check-list">
                <li>Article extraction from the linked page</li>
                <li>Credibility signal using the trained news model</li>
                <li>Current-affairs scoring, category, and summary</li>
              </ul>
            </div>

            <div className="analyzer-info-card analyzer-tip-card">
              <h3>Good URL Examples</h3>
              <div className="analyzer-example-list">
                <span>Indian Express article pages</span>
                <span>The Hindu article pages</span>
                <span>LiveLaw and legal news article links</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function ResultPage({
  result,
  latestConfidence,
  resultPreview,
  explanationPoints,
}) {
  return (
    <section className="single-panel-layout">
      <div className="panel latest-panel">
        <h2>Latest Result</h2>

        {!result ? (
          <div className="empty-state">
            <p>No recent result yet.</p>
            <span>Run an analysis to see article insights here.</span>
          </div>
        ) : (
          <div className="result-card">
            <div className="result-hero">
              <div className="result-hero-main">
                <span className="result-kicker">Analysis Report</span>
                <h3 className="result-headline">{result.title || "No title available"}</h3>
                <p className="result-summary-lead">
                  {result.summary || "No summary available."}
                </p>
              </div>

              <div className="result-hero-badges">
                <span className={`prediction-badge ${getPredictionClass(result.prediction)}`}>
                  {result.prediction || "N/A"}
                </span>
                <span
                  className={`prediction-badge ${getCurrentAffairsClass(result.current_affairs_score)}`}
                >
                  {result.current_affairs_score ?? 0}% {result.current_affairs_label || ""}
                </span>
              </div>
            </div>

            <div className="result-metrics-grid">
              <div className="result-metric-card">
                <span>Model Confidence</span>
                <strong>{latestConfidence}%</strong>
              </div>
              <div className="result-metric-card">
                <span>Source Reliability</span>
                <strong>{result.source_reliability_score ?? 0}%</strong>
              </div>
              <div className="result-metric-card">
                <span>Source Name</span>
                <strong>{result.source_name || "Direct Input"}</strong>
              </div>
              <div className="result-metric-card">
                <span>Category</span>
                <strong>{result.news_category || "General Current Affairs"}</strong>
              </div>
            </div>

            <div className="result-row">
              <span className="label">Source Reliability Signal</span>
              <div className="tag-list">
                <span
                  className={`prediction-badge ${getSourceReliabilityClass(result.source_reliability_score)}`}
                >
                  {result.source_reliability_label || "Source reliability pending"}
                </span>
                <span className="topic-tag muted-tag">{result.sourceType || "TEXT"}</span>
              </div>
            </div>

            <div className="result-confidence-panel">
              <div className="result-row">
                <span className="label">Confidence Meter</span>
                <p>{latestConfidence}% confidence in the current credibility signal.</p>
              </div>

              <div className="progress-bar">
                <div
                  className={`progress-fill ${getPredictionClass(result.prediction)}`}
                  style={{ width: `${latestConfidence}%` }}
                ></div>
              </div>
            </div>

            <div className="result-row">
              <span className="label">Content Preview</span>
              <p className="preview-text">{resultPreview}</p>
            </div>

            {Array.isArray(result.main_claims) && result.main_claims.length > 0 && (
              <div className="ai-explanation">
                <h3>Main Claims</h3>
                <ul>
                  {result.main_claims.map((claim, index) => (
                    <li key={index}>{claim}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(result.topic_tags) && result.topic_tags.length > 0 && (
              <div className="result-row">
                <span className="label">Topic Tags</span>
                <div className="tag-list">
                  {result.topic_tags.map((tag) => (
                    <span key={tag} className="topic-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(result.extracted_entities) && result.extracted_entities.length > 0 && (
              <div className="result-row">
                <span className="label">Named Entities</span>
                <div className="tag-list">
                  {result.extracted_entities.map((entity) => (
                    <span key={entity} className="topic-tag">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(result.source_notes) && result.source_notes.length > 0 && (
              <div className="ai-explanation">
                <h3>Source Reliability Notes</h3>
                <ul>
                  {result.source_notes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(result.event_date_hints) && result.event_date_hints.length > 0 && (
              <div className="result-row">
                <span className="label">Date Hints</span>
                <div className="tag-list">
                  {result.event_date_hints.map((dateHint) => (
                    <span key={dateHint} className="topic-tag muted-tag">
                      {dateHint}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {Array.isArray(result.key_points) && result.key_points.length > 0 && (
              <div className="ai-explanation">
                <h3>Key Developments</h3>
                <ul>
                  {result.key_points.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="ai-explanation">
              <h3>Credibility Signals</h3>
              <ul>
                {explanationPoints.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>

            <div className="disclaimer">
              This prediction is based on learned text patterns and may not always reflect
              real-world factual truth. Use it as an assistive AI signal, not final verification.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryPage({
  history,
  deleteItem,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  credibilityFilter,
  setCredibilityFilter,
  dateFilter,
  setDateFilter,
  categories,
}) {
  return (
    <section className="single-panel-layout">
      <div className="panel history-panel">
        <div className="history-header">
          <div>
            <h2>Analysis History</h2>
            <p>Recent analyzed articles and predictions</p>
          </div>
        </div>

        <FiltersBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          credibilityFilter={credibilityFilter}
          setCredibilityFilter={setCredibilityFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          categories={categories}
          resultCount={history.length}
        />

        {history.length === 0 ? (
          <div className="empty-state">
            <p>No history available.</p>
            <span>Your analyzed articles will appear here.</span>
          </div>
        ) : (
          <div className="history-records">
            {history.map((item, index) => {
              const itemKey = item.id || `history-${index}`;
              const compactPreview =
                item.summary ||
                (item.content
                  ? `${String(item.content).slice(0, 120)}${String(item.content).length > 120 ? "..." : ""}`
                  : "No summary available.");

              return (
                <article
                  key={itemKey}
                  className="history-record-card"
                >
                  <div className="history-compact-row">
                    <div className="history-compact-main">
                      <div className="history-card-meta">
                        <span className="history-source-chip">
                          {item.source_name || item.sourceType || "Direct Input"}
                        </span>
                        <span className="history-category-chip">
                          {item.news_category || "General"}
                        </span>
                      </div>

                      <h3 className="history-card-title">
                        {item.title || "Untitled Article"}
                      </h3>

                      <p className="history-compact-preview">{compactPreview}</p>
                    </div>

                    <div className="history-compact-stats">
                      <div className="history-inline-stat">
                        <span>Current Affairs</span>
                        <strong>{item.current_affairs_score ?? 0}%</strong>
                      </div>
                      <div className="history-inline-stat">
                        <span>Credibility</span>
                        <strong>{getConfidenceValue(item.confidence)}%</strong>
                      </div>
                      <div className="history-inline-stat">
                        <span>Source Reliability</span>
                        <strong>{item.source_reliability_score ?? 0}%</strong>
                      </div>
                    </div>
                  </div>

                  <div className="history-card-footer">
                    <div className="history-footer-badges">
                      <span
                        className={`prediction-badge ${getCurrentAffairsClass(item.current_affairs_score)}`}
                      >
                        {item.current_affairs_label || "Current Affairs"}
                      </span>
                      <span className={`prediction-badge ${getPredictionClass(item.prediction)}`}>
                        {item.prediction || "N/A"}
                      </span>
                      <span
                        className={`prediction-badge ${getSourceReliabilityClass(item.source_reliability_score)}`}
                      >
                        {item.source_reliability_label || "Source Reliability"}
                      </span>
                    </div>

                    <div className="history-card-actions">
                      <button
                        className="delete-btn"
                        onClick={() => deleteItem(item.id)}
                        disabled={!item.id}
                        title={!item.id ? "ID not available" : "Delete history item"}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function AnalyticsPage({
  totalChecks,
  chartData,
  trendData,
  realCount,
  fakeCount,
  exportCSV,
  averageCurrentAffairsScore,
  averageSourceReliability,
  topCategory,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  credibilityFilter,
  setCredibilityFilter,
  dateFilter,
  setDateFilter,
  categories,
}) {
  return (
    <section className="analytics-page-grid">
      <div className="panel chart-panel">
        <div className="section-header">
          <div>
            <h2>Prediction Analytics</h2>
            <p>Distribution of credibility signals across your current-affairs checks</p>
          </div>
        </div>

        <FiltersBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          credibilityFilter={credibilityFilter}
          setCredibilityFilter={setCredibilityFilter}
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          categories={categories}
          resultCount={totalChecks}
        />

        {totalChecks === 0 ? (
          <div className="empty-state">
            <p>No chart data available.</p>
            <span>Analyze some articles to generate analytics.</span>
          </div>
        ) : (
          <div className="chart-box">
            <div className="chart-stage">
              <div className="chart-orbit chart-orbit-one"></div>
              <div className="chart-orbit chart-orbit-two"></div>
              <div className="chart-glow"></div>
              <div className="chart-total-badge">
                <span>Total</span>
                <strong>{totalChecks}</strong>
              </div>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  innerRadius={52}
                  label
                  isAnimationActive
                  animationBegin={120}
                  animationDuration={1400}
                  animationEasing="ease-out"
                >
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "14px",
                    border: "1px solid rgba(148, 163, 184, 0.35)",
                    boxShadow: "0 14px 26px rgba(15, 23, 42, 0.14)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            </div>

            <div className="chart-legend">
              <div className="legend-item">
                <span className="legend-dot real-dot"></span>
                <span>REAL: {realCount}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot fake-dot"></span>
                <span>FAKE: {fakeCount}</span>
              </div>
            </div>

            <div className="analytics-highlights">
              <div className="analytics-highlight real-highlight">
                <span>Reliable Signal</span>
                <strong>{totalChecks ? Math.round((realCount / totalChecks) * 100) : 0}%</strong>
              </div>
              <div className="analytics-highlight neutral-highlight">
                <span>Current Affairs Avg</span>
                <strong>{averageCurrentAffairsScore}%</strong>
              </div>
              <div className="analytics-highlight fake-highlight">
                <span>Risk Signal</span>
                <strong>{totalChecks ? Math.round((fakeCount / totalChecks) * 100) : 0}%</strong>
              </div>
            </div>

            <div className="trend-chart-card">
              <div className="section-header">
                <div>
                  <h3>Trend Over Time</h3>
                  <p>Average current-affairs and source-reliability scores by day</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.22)" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="currentAffairs"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sourceReliability"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="panel actions-panel">
        <h2>Analytics Actions</h2>
        <p className="panel-subtext">Track current-affairs quality and export a lightweight report.</p>

        <div className="snapshot-list">
          <div className="snapshot-item">
            <span>Total records</span>
            <strong>{totalChecks}</strong>
          </div>
          <div className="snapshot-item">
            <span>Average current-affairs score</span>
            <strong>{averageCurrentAffairsScore}%</strong>
          </div>
          <div className="snapshot-item">
            <span>Average source reliability</span>
            <strong>{averageSourceReliability}%</strong>
          </div>
          <div className="snapshot-item">
            <span>Top category</span>
            <strong>{topCategory}</strong>
          </div>
          <div className="snapshot-item">
            <span>REAL share</span>
            <strong>{totalChecks ? Math.round((realCount / totalChecks) * 100) : 0}%</strong>
          </div>
        </div>

        <div className="action-buttons">
          <button className="export-btn" onClick={exportCSV}>
            Export Report
          </button>
        </div>
      </div>
    </section>
  );
}

function AnalyzerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch (error) {
      console.error("Failed to parse user from localStorage:", error);
      return null;
    }
  }, []);
  const userId = user?.id;
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("latestResult") || "null");
    } catch (error) {
      console.error("Failed to parse latest result from localStorage:", error);
      return null;
    }
  });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("darkMode") === "true");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [credibilityFilter, setCredibilityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const fetchHistory = useCallback(async () => {
    if (!userId) {
      setHistory([]);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/history?userId=${encodeURIComponent(userId)}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchHistory();
    }
  }, [fetchHistory, userId]);

  useEffect(() => {
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (result) {
      localStorage.setItem("latestResult", JSON.stringify(result));
    } else {
      localStorage.removeItem("latestResult");
    }
  }, [result]);

  const handleAnalyze = async (event) => {
    event.preventDefault();

    if (!url.trim()) {
      setError("Please enter a news URL.");
      return;
    }

    if (!userId) {
      setError("Please log in before analyzing a URL.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, url }),
      });

      if (!response.ok) {
        let message = "Analysis failed. Check backend and URL.";

        try {
          const errorData = await response.json();
          message =
            errorData?.message ||
            errorData?.detail ||
            errorData?.error ||
            message;
        } catch (parseError) {
          console.error("Failed to parse analyze-url error response:", parseError);
        }

        throw new Error(message);
      }

      const data = await response.json();
      setResult(data);
      setUrl("");
      fetchHistory();
      navigate("/dashboard/result");
    } catch (err) {
      setError(getFriendlyAnalyzeError(err.message || "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete history item");
      }

      if (result && result.id === id) {
        setResult(null);
      }

      fetchHistory();
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Delete failed.");
    }
  };

  const exportCSV = () => {
    if (!history.length) {
      setError("No history available to export.");
      return;
    }

    const headers = [
      "Title",
      "Category",
      "Current Affairs Score",
      "Source Reliability Score",
      "Prediction",
      "Confidence",
      "Source",
    ];
    const rows = filteredHistory.map((item) => [
      `"${(item.title || "Untitled Article").replace(/"/g, '""')}"`,
      item.news_category || "General",
      `${item.current_affairs_score ?? 0}%`,
      `${item.source_reliability_score ?? 0}%`,
      item.prediction || "N/A",
      `${getConfidenceValue(item.confidence)}%`,
      item.source_name || item.sourceType || "TEXT",
    ]);

    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const fileUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = fileUrl;
    link.setAttribute("download", "news_analysis_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const availableCategories = useMemo(
    () =>
      [...new Set(history.map((item) => item.news_category).filter(Boolean))].sort(
        (left, right) => left.localeCompare(right)
      ),
    [history]
  );
  const filteredHistory = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const now = new Date();

    return history.filter((item) => {
      const matchesSearch =
        !normalizedQuery ||
        [
          item.title,
          item.source_name,
          item.summary,
          item.news_category,
          ...(item.topic_tags || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesCategory =
        categoryFilter === "all" || item.news_category === categoryFilter;

      const matchesCredibility =
        credibilityFilter === "all" || item.prediction?.toUpperCase() === credibilityFilter;

      let matchesDate = true;
      if (dateFilter !== "all") {
        const itemDate = item.createdAt ? new Date(item.createdAt) : null;
        if (!itemDate || Number.isNaN(itemDate.getTime())) {
          matchesDate = false;
        } else if (dateFilter === "today") {
          matchesDate =
            itemDate.getFullYear() === now.getFullYear() &&
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getDate() === now.getDate();
        } else {
          const diffInMs = now.getTime() - itemDate.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
          if (dateFilter === "7days") {
            matchesDate = diffInDays <= 7;
          } else if (dateFilter === "30days") {
            matchesDate = diffInDays <= 30;
          }
        }
      }

      return matchesSearch && matchesCategory && matchesCredibility && matchesDate;
    });
  }, [history, searchQuery, categoryFilter, credibilityFilter, dateFilter]);

  const totalChecks = filteredHistory.length;
  const realCount = filteredHistory.filter((item) => item.prediction?.toUpperCase() === "REAL").length;
  const fakeCount = filteredHistory.filter((item) => item.prediction?.toUpperCase() === "FAKE").length;
  const averageCurrentAffairsScore = totalChecks
    ? Math.round(
        filteredHistory.reduce((sum, item) => sum + Number(item.current_affairs_score || 0), 0) / totalChecks
      )
    : 0;
  const averageSourceReliability = totalChecks
    ? Math.round(
        filteredHistory.reduce((sum, item) => sum + Number(item.source_reliability_score || 0), 0) / totalChecks
      )
    : 0;
  const topCategory =
    Object.entries(
      filteredHistory.reduce((accumulator, item) => {
        const category = item.news_category || "General";
        accumulator[category] = (accumulator[category] || 0) + 1;
        return accumulator;
      }, {})
    ).sort((left, right) => right[1] - left[1])[0]?.[0] || "No category yet";
  const chartData = useMemo(
    () => [
      { name: "REAL", value: realCount },
      { name: "FAKE", value: fakeCount },
    ],
    [realCount, fakeCount]
  );
  const trendData = useMemo(() => {
    const grouped = filteredHistory.reduce((accumulator, item) => {
      const rawDate = item.createdAt ? new Date(item.createdAt) : null;
      const safeDate = rawDate && !Number.isNaN(rawDate.getTime()) ? rawDate : null;
      const dateKey = safeDate
        ? safeDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
        : "Unknown";

      if (!accumulator[dateKey]) {
        accumulator[dateKey] = {
          date: dateKey,
          currentAffairsTotal: 0,
          sourceReliabilityTotal: 0,
          count: 0,
          sortValue: safeDate ? safeDate.getTime() : 0,
        };
      }

      accumulator[dateKey].currentAffairsTotal += Number(item.current_affairs_score || 0);
      accumulator[dateKey].sourceReliabilityTotal += Number(item.source_reliability_score || 0);
      accumulator[dateKey].count += 1;

      return accumulator;
    }, {});

    return Object.values(grouped)
      .sort((left, right) => left.sortValue - right.sortValue)
      .map((entry) => ({
        date: entry.date,
        currentAffairs: Math.round(entry.currentAffairsTotal / entry.count),
        sourceReliability: Math.round(entry.sourceReliabilityTotal / entry.count),
      }));
  }, [filteredHistory]);

  const latestConfidence = result ? getConfidenceValue(result.confidence) : 0;
  const resultPreview =
    result?.contentPreview ||
    (result?.content
      ? `${String(result.content).slice(0, 240)}${String(result.content).length > 240 ? "..." : ""}`
      : "No preview available");

  const explanationPoints = useMemo(() => {
    if (!result) return [];

    const prediction = result.prediction?.toUpperCase();

    if (prediction === "REAL") {
      return [
        "The text structure appears closer to standard news reporting patterns.",
        "The article content shows lower signs of sensational or misleading phrasing.",
        "The prediction confidence suggests the model found more real-news style indicators.",
      ];
    }

    return [
      "The text may contain unusual or sensational language patterns.",
      "The model detected writing signals often associated with misleading content.",
      "This result should be reviewed manually because AI prediction is not the same as fact-check verification.",
    ];
  }, [result]);

  const pageMeta = {
    "/dashboard": {
      title: "Current Affairs Intelligence Dashboard",
      subtitle: "A focused home base for tracking and evaluating current-affairs coverage.",
    },
    "/dashboard/analyze": {
      title: "Analyze Current Affairs URL",
      subtitle: "Submit an article link to extract, summarize, and score the story.",
    },
    "/dashboard/result": {
      title: "Latest Current Affairs Result",
      subtitle: "Inspect the newest story summary, relevance score, and credibility signal.",
    },
    "/dashboard/history": {
      title: "Current Affairs History",
      subtitle: "Browse and manage your saved current-affairs analyses.",
    },
    "/dashboard/analytics": {
      title: "Current Affairs Analytics",
      subtitle: "Review credibility patterns, relevance scores, and export reports.",
    },
  };

  const currentPage = pageMeta[location.pathname] || pageMeta["/dashboard"];

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("latestResult");
    navigate("/login");
  };

  return (
    <div className={darkMode ? "app dark" : "app"}>
      <aside className={`sidebar ${isMobileNavOpen ? "mobile-open" : ""}`}>
        <div>
          <div className="brand">
            <div className="brand-icon">AI</div>
            <div>
              <h2>News Analyzer</h2>
              <p>AI Fake News Analyzer</p>
            </div>
          </div>

          <nav className="nav-links">
            <NavLink to="/dashboard" end className="nav-item">
              Dashboard
            </NavLink>
            <NavLink to="/dashboard/analyze" className="nav-item">
              Analyze URL
            </NavLink>
            <NavLink to="/dashboard/result" className="nav-item">
              Latest Result
            </NavLink>
            <NavLink to="/dashboard/history" className="nav-item">
              History
            </NavLink>
            <NavLink to="/dashboard/analytics" className="nav-item">
              Analytics
            </NavLink>
          </nav>
        </div>

        <div className="sidebar-footer">
          <p>Signed in as {user?.name || "User"}</p>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <img
          src={newsBackground}
          alt=""
          aria-hidden="true"
          className="dashboard-background-art"
        />
        <header className="topbar">
          <div>
            <h1>{currentPage.title}</h1>
            <p>{currentPage.subtitle}</p>
          </div>

          <div className="topbar-actions">
            <button
              className="nav-toggle"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-label="Toggle navigation"
            >
              {isMobileNavOpen ? "Close Menu" : "Menu"}
            </button>
            <button className="dark-toggle" onClick={() => setDarkMode(!darkMode)}>
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>

            <div className="status-badge">System Active</div>
          </div>
        </header>

        <Routes>
          <Route
            index
            element={
              <OverviewPage
                totalChecks={totalChecks}
                realCount={realCount}
                fakeCount={fakeCount}
              />
            }
          />
          <Route
            path="analyze"
            element={
              <AnalyzePage
                url={url}
                setUrl={setUrl}
                handleAnalyze={handleAnalyze}
                loading={loading}
                error={error}
              />
            }
          />
          <Route
            path="result"
            element={
              <ResultPage
                result={result}
                latestConfidence={latestConfidence}
                resultPreview={resultPreview}
                explanationPoints={explanationPoints}
              />
            }
          />
          <Route
            path="history"
            element={
              <HistoryPage
                history={filteredHistory}
                deleteItem={deleteItem}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                credibilityFilter={credibilityFilter}
                setCredibilityFilter={setCredibilityFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                categories={availableCategories}
              />
            }
          />
          <Route
            path="analytics"
            element={
              <AnalyticsPage
                totalChecks={totalChecks}
                chartData={chartData}
                trendData={trendData}
                realCount={realCount}
                fakeCount={fakeCount}
                exportCSV={exportCSV}
                averageCurrentAffairsScore={averageCurrentAffairsScore}
                averageSourceReliability={averageSourceReliability}
                topCategory={topCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                credibilityFilter={credibilityFilter}
                setCredibilityFilter={setCredibilityFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                categories={availableCategories}
              />
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const hasUser = Boolean(localStorage.getItem("user"));

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={hasUser ? "/dashboard" : "/login"} replace />}
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <AnalyzerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={<Navigate to={hasUser ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}

export default App;
