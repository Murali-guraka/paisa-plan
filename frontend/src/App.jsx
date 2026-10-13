import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, session } from "./api";
import Auth from "./Auth";

const COLORS = { Salary: "#17714f", Food: "#b7791f", Rent: "#3b5bdb", Transport: "#0c8599", Bills: "#7048e8", Shopping: "#c2255c", Health: "#e03131", Entertainment: "#e8590c", Savings: "#2f9e44", Other: "#868e96" };
const NAMES = Object.keys(COLORS);
const dot = (c) => ({ background: COLORS[c] || COLORS.Other });
const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const pad = (n) => String(n).padStart(2, "0");
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const localDate = () => { const d = new Date(); return `${monthKey(d)}-${pad(d.getDate())}`; };
const shift = (key, delta) => { const [y, m] = key.split("-").map(Number); return monthKey(new Date(y, m - 1 + delta, 1)); };
const label = (key) => { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" }); };
const shortDate = (s) => new Date(s + "T00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const EMPTY = { income: 0, expense: 0, balance: 0, savingsRate: 0, byCategory: {} };
const Leader = () => <span className="leader" aria-hidden="true" />;

export default function Root() {
  const [user, setUser] = useState(session.get());
  const logout = useCallback(() => { session.clear(); setUser(null); }, []);
  useEffect(() => { const t = localStorage.getItem("theme"); if (t) document.documentElement.dataset.theme = t; }, []);
  return user ? <Dashboard user={user} onLogout={logout} /> : <Auth onAuthed={setUser} />;
}

function Dashboard({ user, onLogout }) {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [txs, setTxs] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [sum, setSum] = useState(EMPTY);
  const [status, setStatus] = useState("loading");
  const [dialog, setDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  const timer = useRef();

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("theme", theme); }, [theme]);
  useEffect(() => {
    const onKey = (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !typing && !document.querySelector("dialog[open]")) { e.preventDefault(); setDialog({}); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const load = useCallback(async () => {
    try {
      const [t, s, b] = await Promise.all([api.get(`/transactions?month=${month}`), api.get(`/summary?month=${month}`), api.get("/budgets")]);
      setTxs(t); setSum(s); setBudgets(b); setStatus("ready");
    } catch (e) { if (e.status === 401) onLogout(); else setStatus("error"); }
  }, [month, onLogout]);
  useEffect(() => { load(); }, [load]);

  const notify = (msg, undo) => {
    setToast({ msg, undo });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 5000);
  };

  const save = async (data) => {
    try {
      if (data.id) await api.put(`/transactions/${data.id}`, data); else await api.post("/transactions", data);
      await load(); notify(data.id ? "Changes saved" : "Transaction added");
      return true;
    } catch { notify("Couldn't save. Check that the backend is running."); return false; }
  };

  const remove = async (tx) => {
    await api.del(`/transactions/${tx.id}`); await load();
    notify("Transaction deleted", async () => {
      const { id, ...rest } = tx;
      await api.post("/transactions", rest); await load(); setToast(null);
    });
  };

  // Oldest first, like a passbook, so the running balance reads top to bottom.
  const ordered = useMemo(() => [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id), [txs]);
  const balances = useMemo(() => {
    let run = 0; const m = {};
    ordered.forEach((t) => { run += (t.type === "INCOME" ? 1 : -1) * Number(t.amount); m[t.id] = run; });
    return m;
  }, [ordered]);
  const shown = useMemo(() => ordered.filter((t) =>
    (filter === "ALL" || t.type === filter) &&
    (`${t.title} ${t.category} ${t.note || ""}`).toLowerCase().includes(q.trim().toLowerCase())), [ordered, filter, q]);
  const shownIn = shown.filter((t) => t.type === "INCOME").reduce((a, t) => a + Number(t.amount), 0);
  const shownOut = shown.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + Number(t.amount), 0);
  const loading = status === "loading";

  return (
    <div className="desk">
      <header className="topbar">
        <span className="wordmark">Paisa Plan</span>
        <nav className="month" aria-label="Choose month">
          <button className="quiet" onClick={() => setMonth(shift(month, -1))} aria-label="Previous month">‹</button>
          <span>{label(month)}</span>
          <button className="quiet" onClick={() => setMonth(shift(month, 1))} aria-label="Next month">›</button>
        </nav>
        <div className="top-actions">
          <button className="quiet" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "Light mode" : "Dark mode"}</button>
          <button className="quiet" onClick={onLogout}>Sign out</button>
          <button className="primary" title="Add transaction (N)" onClick={() => setDialog({})}>Add transaction</button>
        </div>
      </header>

      {status === "error" && (
        <div className="alert" role="alert">
          <span>Can't reach the server. Start the Spring Boot app on port 8080.</span>
          <button className="quiet" onClick={load}>Try again</button>
        </div>
      )}

      <main className="sheet">
        <section className="overview" aria-labelledby="s-h">
          <div className="overview-heading">
            <div>
              <h2 id="s-h" className="month-title">{label(month)}</h2>
              <p className="holder">Account of {user.name}</p>
            </div>
            <span className="overview-caption">MONTHLY OVERVIEW</span>
          </div>
          <div className="summary-cards">
            <article className="summary-card received-card"><span className="summary-icon" aria-hidden="true">↙</span><span className="summary-label">Received</span><strong>{inr(sum.income)}</strong><small>Money in this month</small></article>
            <article className="summary-card spent-card"><span className="summary-icon" aria-hidden="true">↗</span><span className="summary-label">Spent</span><strong>{inr(sum.expense)}</strong><small>Money out this month</small></article>
            <article className="summary-card balance-card"><span className="summary-icon" aria-hidden="true">₹</span><span className="summary-label">Left to spend</span><strong className={sum.balance < 0 ? "out" : ""}>{inr(sum.balance)}</strong><small>Available balance</small></article>
          </div>
          <Pace month={month} income={Number(sum.income)} expense={Number(sum.expense)} saved={sum.savingsRate} />
        </section>

        <SpendingChart txs={ordered} month={month} />

        <div className="insights-grid">
          <section aria-labelledby="w-h">
            <div className="section-heading"><h2 id="w-h">Where it went</h2><span className="section-kicker">SPENDING MIX</span></div>
            <Breakdown byCategory={sum.byCategory} total={Number(sum.expense)} />
          </section>
          <section aria-labelledby="b-h">
            <div className="section-heading"><h2 id="b-h">Limits</h2><span className="section-kicker">BUDGET CONTROL</span></div>
            {loading ? <Skeleton rows={3} /> : <Envelopes budgets={budgets} spent={sum.byCategory} onRemove={async (id) => { await api.del(`/budgets/${id}`); load(); }} />}
            <BudgetForm onSaved={() => { load(); notify("Budget saved"); }} />
          </section>
        </div>

        <section className="ledger" aria-labelledby="t-h">
          <div className="panel-head">
            <h2 id="t-h">Ledger</h2>
            <div className="tools">
              <div className="seg" role="group" aria-label="Filter by type">
                {[["ALL", "All"], ["EXPENSE", "Spent"], ["INCOME", "Received"]].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={filter === v} className={filter === v ? "on" : ""} onClick={() => setFilter(v)}>{l}</button>
                ))}
              </div>
              <input className="search" type="search" placeholder="Search" aria-label="Search transactions" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {loading ? <Skeleton rows={5} /> : shown.length === 0 ? (
            <div className="empty">
              <p>{txs.length === 0 ? `Nothing recorded for ${label(month)} yet.` : "No transactions match your search."}</p>
              {txs.length === 0 && <button className="primary" onClick={() => setDialog({})}>Add transaction</button>}
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Particulars</th><th className="num">Spent</th><th className="num">Received</th><th className="num col-bal">Balance</th><th><span className="sr">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((t) => (
                    <tr key={t.id}>
                      <td className="date">{shortDate(t.date)}</td>
                      <td>
                        <strong>{t.title}</strong>
                        <span className="meta"><span className="category-mark" style={dot(t.category)} aria-hidden="true">{({ Salary:"↗", Food:"●", Rent:"⌂", Transport:"↗", Bills:"▤", Shopping:"◇", Health:"+", Entertainment:"♫", Savings:"✓", Other:"•" })[t.category] || "•"}</span>{t.category}{t.note ? `, ${t.note}` : ""}</span>
                      </td>
                      <td className="num out">{t.type === "EXPENSE" ? inr(t.amount) : ""}</td>
                      <td className="num in">{t.type === "INCOME" ? inr(t.amount) : ""}</td>
                      <td className="num col-bal">{inr(balances[t.id])}</td>
                      <td className="acts">
                        <button className="quiet" onClick={() => setDialog(t)} aria-label={`Edit ${t.title}`}>Edit</button>
                        <button className="quiet danger" onClick={() => remove(t)} aria-label={`Delete ${t.title}`}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td /><td>{filter === "ALL" && !q ? "Month total" : "Total of shown rows"}</td><td className="num out">{inr(shownOut)}</td><td className="num in">{inr(shownIn)}</td><td className="col-bal" /><td /></tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      </main>

      {dialog && <TxDialog key={dialog.id || "new"} tx={dialog} onClose={() => setDialog(null)} onSave={save} />}
      {toast && (
        <div className="toast" role="status">
          <span>{toast.msg}</span>
          {toast.undo && <button onClick={toast.undo}>Undo</button>}
        </div>
      )}
    </div>
  );
}

const Skeleton = ({ rows }) => <div aria-hidden="true">{Array.from({ length: rows }, (_, i) => <div key={i} className="skel" />)}</div>;


function SpendingChart({ txs, month }) {
  const [range, setRange] = useState("month");
  const [year, monthNum] = month.split("-").map(Number);
  const monthStart = new Date(year, monthNum - 1, 1);
  const monthEnd = new Date(year, monthNum, 0);
  const today = new Date();
  const endDay = monthKey(today) === month ? today.getDate() : monthEnd.getDate();
  const chart = useMemo(() => {
    const count = range === "week" ? 7 : 5;
    const buckets = Array.from({ length: count }, (_, i) => ({ label: range === "week" ? "" : `Week ${i + 1}`, income: 0, expense: 0 }));
    txs.forEach((tx) => {
      const d = new Date(`${tx.date}T00:00:00`);
      const day = d.getDate();
      if (range === "week") {
        const start = Math.max(1, endDay - 6);
        if (day < start || day > endDay) return;
        const idx = day - start;
        buckets[idx].label = new Date(year, monthNum - 1, day).toLocaleDateString("en-IN", { weekday: "short" });
        buckets[idx][tx.type === "INCOME" ? "income" : "expense"] += Number(tx.amount);
      } else {
        const idx = Math.min(4, Math.floor((day - 1) / 7));
        buckets[idx][tx.type === "INCOME" ? "income" : "expense"] += Number(tx.amount);
      }
    });
    return buckets;
  }, [txs, range, endDay, year, monthNum]);
  const max = Math.max(1, ...chart.flatMap((b) => [b.income, b.expense]));
  const fmt = (n) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return (
    <section className="spending-chart" aria-labelledby="chart-title">
      <div className="section-heading">
        <div><h2 id="chart-title">Cash flow</h2><p className="chart-subtitle">Income compared with spending</p></div>
        <div className="seg chart-filter" role="group" aria-label="Chart time range">
          <button type="button" className={range === "week" ? "on" : ""} aria-pressed={range === "week"} onClick={() => setRange("week")}>7 days</button>
          <button type="button" className={range === "month" ? "on" : ""} aria-pressed={range === "month"} onClick={() => setRange("month")}>Month</button>
        </div>
      </div>
      <div className="chart-legend"><span><i className="chart-key income-key"/>Received</span><span><i className="chart-key expense-key"/>Spent</span></div>
      <div className="chart-bars" role="img" aria-label={`Cash flow chart for ${label(month)}. Values shown by ${range === "week" ? "day" : "week"}.`}>
        {chart.map((b, i) => <div className="chart-column" key={`${b.label}-${i}`}>
          <div className="chart-pair" title={`${b.label || `Day ${Math.max(1, endDay - 6) + i}`}: received ${inr(b.income)}, spent ${inr(b.expense)}`}>
            <i className="income-bar" style={{ height: `${Math.max(b.income ? 3 : 0, b.income / max * 100)}%` }} />
            <i className="expense-bar" style={{ height: `${Math.max(b.expense ? 3 : 0, b.expense / max * 100)}%` }} />
          </div>
          <span>{b.label || new Date(year, monthNum - 1, Math.max(1, endDay - 6) + i).toLocaleDateString("en-IN", { day: "numeric" })}</span>
        </div>)}
      </div>
      <p className="chart-footnote">Based on transactions recorded for {label(month)}.</p>
    </section>
  );
}

function Pace({ month, income, expense, saved }) {
  if (income <= 0) return <p className="pace-note">Add your income to see how your spending compares with the month.</p>;
  const now = new Date();
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  const current = monthKey(now) === month;
  const monthPct = current ? (now.getDate() / days) * 100 : 0;
  const spentPct = Math.min(100, (expense / income) * 100);
  const ahead = current && spentPct > monthPct + 5;
  return (
    <div className="pace">
      <div className="pace-track" role="img" aria-label={`${Math.round(spentPct)}% of income spent${current ? `, day ${now.getDate()} of ${days}` : ""}`}>
        <i className={ahead ? "ahead" : ""} style={{ width: `${spentPct}%` }} />
        {current && <b style={{ left: `${monthPct}%` }} />}
      </div>
      <p className="pace-note">
        {current ? `Day ${now.getDate()} of ${days}, and ${Math.round(spentPct)}% of your income is spent. ${ahead ? "You're spending faster than the month is passing." : "You're on pace."}` : `${Math.round(spentPct)}% of your income was spent.`}
        {" "}You have kept {saved}% so far.
      </p>
    </div>
  );
}

function Envelopes({ budgets, spent, onRemove }) {
  if (budgets.length === 0) return <p className="muted gap">No limits yet. Set a monthly limit for a category below.</p>;
  return (
    <ul className="envelopes">
      {budgets.map((b) => {
        const used = Number(spent[b.category] || 0);
        const pct = Math.min(100, (used / b.limitAmount) * 100);
        const state = used > b.limitAmount ? "over" : pct >= 80 ? "warn" : "ok";
        const left = b.limitAmount - used;
        return (
          <li key={b.id} className={state}>
            <div className="line">
              <strong><span className="swatch" style={dot(b.category)} aria-hidden="true" />{b.category}</strong>
              <Leader />
              <span className="left">{left >= 0 ? `${inr(left)} left` : `${inr(-left)} over`}</span>
            </div>
            <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100" aria-label={`${b.category} limit used`}><i style={{ width: `${pct}%` }} /></div>
            <div className="env-foot">
              <span>{inr(used)} of {inr(b.limitAmount)}</span>
              <span className="state">{state === "over" ? "Over the limit" : state === "warn" ? "Near the limit" : "On track"}</span>
              <button className="quiet danger" onClick={() => onRemove(b.id)}>Remove</button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Breakdown({ byCategory, total }) {
  const rows = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return <p className="muted">Spending by category will appear here once you add an expense.</p>;
  return (
    <>
      <div className="share" role="img" aria-label="Share of spending by category">
        {rows.map(([c, v]) => <i key={c} style={{ ...dot(c), width: `${(v / total) * 100}%` }} />)}
      </div>
      <ul className="legend">
        {rows.map(([c, v]) => (
          <li key={c} className="line"><span className="swatch" style={dot(c)} aria-hidden="true" /><span>{c}</span><Leader /><b>{inr(v)}</b><em>{Math.round((v / total) * 100)}%</em></li>
        ))}
      </ul>
    </>
  );
}

function BudgetForm({ onSaved }) {
  const [category, setCategory] = useState("Food");
  const [limit, setLimit] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    await api.post("/budgets", { category, limitAmount: Number(limit) });
    setLimit(""); onSaved();
  };
  return (
    <details className="setlimit">
      <summary>Set a limit</summary>
      <form className="row" onSubmit={submit}>
        <label>Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {NAMES.filter((c) => c !== "Salary").map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label>Monthly limit (₹)
          <input type="number" min="1" required inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="5000" />
        </label>
        <button className="primary" type="submit">Save limit</button>
      </form>
    </details>
  );
}

function TxDialog({ tx, onClose, onSave }) {
  const ref = useRef(null);
  const editing = Boolean(tx.id);
  const [f, setF] = useState(editing ? { ...tx, amount: String(tx.amount), note: tx.note || "" } : { title: "", amount: "", type: "EXPENSE", category: "Food", date: localDate(), note: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!ref.current.open) ref.current.showModal(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    const ok = await onSave({ ...f, amount: Number(f.amount) });
    if (ok) ref.current.close(); else setBusy(false);
  };
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === ref.current && ref.current.close()} aria-labelledby="dlg-h">
      <form className="form" onSubmit={submit}>
        <h2 id="dlg-h">{editing ? "Edit transaction" : "Add transaction"}</h2>
        <div className="seg" role="radiogroup" aria-label="Transaction type">
          {[["EXPENSE", "Spent"], ["INCOME", "Received"]].map(([t, l]) => (
            <button type="button" key={t} role="radio" aria-checked={f.type === t} className={f.type === t ? "on" : ""}
              onClick={() => setF({ ...f, type: t, category: t === "INCOME" ? "Salary" : f.category === "Salary" ? "Food" : f.category })}>{l}</button>
          ))}
        </div>
        <label>What was it for?<input autoFocus required maxLength="120" value={f.title} onChange={set("title")} placeholder="Groceries" /></label>
        <div className="row">
          <label>Amount (₹)<input type="number" min="1" step="0.01" required inputMode="decimal" value={f.amount} onChange={set("amount")} /></label>
          <label>Date<input type="date" required value={f.date} onChange={set("date")} /></label>
        </div>
        <label>Category
          <select value={f.category} onChange={set("category")}>{NAMES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label>Note (optional)<input maxLength="255" value={f.note} onChange={set("note")} /></label>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => ref.current.close()}>Cancel</button>
          <button className="primary" type="submit" disabled={busy}>{editing ? "Save changes" : "Add transaction"}</button>
        </div>
      </form>
    </dialog>
  );
}
