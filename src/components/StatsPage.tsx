import { Fragment, useEffect, useState } from "react";

type CountRow = {
  country?: string;
  device?: string;
  count: number;
};

// Only the fields read directly are typed; `select=*` returns every column, so
// an index signature lets the expandable detail panel render all of them.
type RecentVisit = {
  created_at: string;
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  isp: string | null;
  org: string | null;
  browser: string | null;
  os: string | null;
  gpu: string | null;
  device_type: string | null;
  connection_type: string | null;
  downlink: number | null;
  dwell_ms: number | null;
  sections_viewed: string | null;
  chat_used: boolean | null;
  utm_source: string | null;
  referrer: string | null;
  is_bot: boolean | null;
  is_hosting: boolean | null;
  [key: string]: unknown;
};

type ChatUsageRow = {
  ip: string;
  day: string;
  count: number;
};

type ChatMessage = {
  created_at: string;
  ip: string | null;
  session_id: string | null;
  question: string | null;
  answer: string | null;
  model: string | null;
};

type StatsResponse = {
  total: number;
  today: number;
  uniqueIps: number;
  byCountry: CountRow[];
  byDevice: CountRow[];
  recent: RecentVisit[];
  chat?: {
    messagesToday: number;
    messagesTotal: number;
    recent: ChatUsageRow[];
    messages?: ChatMessage[];
  };
};

const STORAGE_KEY = "stats:key";
const VISIT_COLS = 11;

/** Render a value, falling back to an em-dash for null/empty/whitespace. */
function display(value: unknown): string {
  if (value === null || value === undefined) return "—";
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : "—";
}

/** Generic value formatter for the detail grid (handles bool/number/null). */
function fmt(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return display(value);
}

/** Join city / region / country into one label, skipping blanks. */
function locationLabel(visit: RecentVisit): string {
  const parts = [visit.city, visit.region, visit.country]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function yesNo(value: boolean | null | undefined): string {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

/** Milliseconds → "1m 23s" / "45s" / em-dash. */
function dwellLabel(ms: unknown): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** Network summary, e.g. "4g · 8.5Mbps". */
function networkLabel(visit: RecentVisit): string {
  const type = (visit.connection_type ?? "").trim();
  const dl = typeof visit.downlink === "number" ? `${visit.downlink}Mbps` : "";
  return [type, dl].filter(Boolean).join(" · ") || "—";
}

/** Format an ISO timestamp as a readable local datetime, tolerating bad input. */
function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return display(value);
  return date.toLocaleString();
}

const StatsPage = () => {
  const [statsKey, setStatsKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Restore a previously-entered key so the gate is skipped on revisit.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setStatsKey(saved);
    } catch {
      // sessionStorage may be unavailable (private mode); fall back to the gate.
    }
  }, []);

  // Fetch whenever we have a key (initial restore, submit, or refresh).
  useEffect(() => {
    if (!statsKey) return;

    const controller = new AbortController();
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stats", {
          headers: { "x-stats-key": statsKey },
          signal: controller.signal,
        });

        if (res.status === 401) {
          try {
            sessionStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
          if (!active) return;
          setStatsKey(null);
          setData(null);
          setError("Incorrect key");
          return;
        }

        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }

        const json = (await res.json()) as StatsResponse;
        if (!active) return;
        setData(json);
      } catch (err) {
        if (controller.signal.aborted || !active) return;
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [statsKey]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      // Proceed even if persistence fails — the key still lives in state.
    }
    setError(null);
    setData(null);
    setStatsKey(trimmed);
    setKeyInput("");
  };

  // Direct refetch used by the refresh button (key is unchanged, so the effect
  // dependency wouldn't fire on its own).
  const refetch = async () => {
    if (!statsKey) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats", {
        headers: { "x-stats-key": statsKey },
      });
      if (res.status === 401) {
        try {
          sessionStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
        setStatsKey(null);
        setData(null);
        setError("Incorrect key");
        return;
      }
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as StatsResponse;
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  if (!statsKey) {
    return (
      <main className="stats-page">
        <form className="stats-gate" onSubmit={handleSubmit}>
          <h1>Visitor analytics</h1>
          <label htmlFor="stats-key">Enter access key</label>
          <input
            id="stats-key"
            type="password"
            autoComplete="off"
            value={keyInput}
            onChange={(event) => setKeyInput(event.target.value)}
            placeholder="Access key"
          />
          <button type="submit">Unlock</button>
          {error && <p className="stats-error">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="stats-page">
      <header className="stats-header">
        <h1>Visitor analytics</h1>
        <button
          type="button"
          className="stats-refresh"
          onClick={refetch}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && <p className="stats-error">{error}</p>}

      {!data && loading && <p className="stats-loading">Loading…</p>}

      {data && (
        <>
          <section className="stats-summary">
            <div className="stat-card">
              <span className="stat-value">{data.total.toLocaleString()}</span>
              <span className="stat-label">Total visits</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{data.today.toLocaleString()}</span>
              <span className="stat-label">Today</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{data.uniqueIps.toLocaleString()}</span>
              <span className="stat-label">Unique IPs</span>
            </div>
          </section>

          <div className="stats-breakdown">
            <section>
              <h2>Top countries</h2>
              {data.byCountry.length > 0 ? (
                <ul>
                  {data.byCountry.map((row, index) => (
                    <li key={`${row.country ?? "unknown"}-${index}`}>
                      <span>{display(row.country)}</span>
                      <span>{row.count.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>—</p>
              )}
            </section>
            <section>
              <h2>Devices</h2>
              {data.byDevice.length > 0 ? (
                <ul>
                  {data.byDevice.map((row, index) => (
                    <li key={`${row.device ?? "unknown"}-${index}`}>
                      <span>{display(row.device)}</span>
                      <span>{row.count.toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>—</p>
              )}
            </section>
          </div>

          <section>
            <h2>Recent visits</h2>
            <p className="stats-hint">Click a row to see every captured field.</p>
            <div className="stats-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>IP</th>
                    <th>Location</th>
                    <th>ISP / Org</th>
                    <th>Browser / OS</th>
                    <th>GPU</th>
                    <th>Network</th>
                    <th>Dwell</th>
                    <th>Sections</th>
                    <th>Chat</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.length > 0 ? (
                    data.recent.map((visit, index) => (
                      <Fragment key={`${visit.created_at}-${index}`}>
                        <tr
                          className={`stats-row${visit.is_bot ? " is-bot" : ""}`}
                          onClick={() => setExpanded(expanded === index ? null : index)}
                        >
                          <td>
                            {expanded === index ? "▾ " : "▸ "}
                            {formatDateTime(visit.created_at)}
                          </td>
                          <td>{display(visit.ip)}</td>
                          <td>{locationLabel(visit)}</td>
                          <td>{display(visit.org ?? visit.isp)}</td>
                          <td>
                            {display(visit.browser)} / {display(visit.os)}
                          </td>
                          <td>{display(visit.gpu)}</td>
                          <td>{networkLabel(visit)}</td>
                          <td>{dwellLabel(visit.dwell_ms)}</td>
                          <td>{display(visit.sections_viewed)}</td>
                          <td>{yesNo(visit.chat_used)}</td>
                          <td>{display(visit.utm_source ?? visit.referrer)}</td>
                        </tr>
                        {expanded === index && (
                          <tr key={`${visit.created_at}-${index}-detail`} className="stats-detail-row">
                            <td colSpan={VISIT_COLS}>
                              <dl className="stats-detail">
                                {Object.entries(visit).map(([field, value]) => (
                                  <div key={field}>
                                    <dt>{field}</dt>
                                    <dd>{fmt(value)}</dd>
                                  </div>
                                ))}
                              </dl>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={VISIT_COLS}>—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {data.chat && (
            <section className="stats-chat">
              <h2>Chat usage</h2>
              <div className="stats-summary">
                <div className="stat-card">
                  <span className="stat-value">
                    {data.chat.messagesToday.toLocaleString()}
                  </span>
                  <span className="stat-label">Messages today</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">
                    {data.chat.messagesTotal.toLocaleString()}
                  </span>
                  <span className="stat-label">Messages total</span>
                </div>
              </div>
              <div className="stats-table">
                <table>
                  <thead>
                    <tr>
                      <th>IP</th>
                      <th>Day</th>
                      <th>Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.chat.recent.length > 0 ? (
                      data.chat.recent.map((row, index) => (
                        <tr key={`${row.ip}-${row.day}-${index}`}>
                          <td>{display(row.ip)}</td>
                          <td>{display(row.day)}</td>
                          <td>{row.count.toLocaleString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>—</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {data.chat?.messages && (
            <section className="stats-chatlog">
              <h2>Chat transcripts</h2>
              <div className="stats-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>IP</th>
                      <th>Question</th>
                      <th>Answer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.chat.messages.length > 0 ? (
                      data.chat.messages.map((m, index) => (
                        <tr key={`${m.created_at}-${index}`}>
                          <td>{formatDateTime(m.created_at)}</td>
                          <td>{display(m.ip)}</td>
                          <td className="stats-msg">{display(m.question)}</td>
                          <td className="stats-msg">{display(m.answer)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4}>—</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="stats-note">
            Visitor IP, geolocation, device/network details and on-site activity
            are recorded for the site owner's analytics.
          </p>
        </>
      )}
    </main>
  );
};

export default StatsPage;
