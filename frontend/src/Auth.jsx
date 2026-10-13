import { useState } from "react";
import { api, session } from "./api";

const MESSAGES = {
  401: "Wrong email or password.",
  409: "That email already has an account. Sign in instead.",
  400: "Check your details. The password needs at least 6 characters.",
};

export default function Auth({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const register = mode === "register";
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const res = register ? await api.register(f) : await api.login(f);
      onAuthed(session.save(res));
    } catch (err) {
      setError(MESSAGES[err.status] || "Can't reach the server. Start the Spring Boot app on port 8080.");
      setBusy(false);
    }
  };

  return (
    <div className="auth auth-single">
      <main className="auth-main">
        <section className="auth-shell" aria-label="Paisa Plan account access">
          <a className="auth-brand" href="/" aria-label="Paisa Plan home">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span>Paisa <strong>Plan</strong></span>
          </a>
          <div className="auth-intro">
            <span className="eyebrow"><span className="eyebrow-dot" /> YOUR MONEY, IN FOCUS</span>
            <h1>{register ? "Make room for your goals." : "Good to see you again."}</h1>
            <p>{register ? "Create your account and start building a clearer picture of your money." : "A clearer view of your money starts right here."}</p>
          </div>
          <form className="form auth-form" onSubmit={submit}>
            <div className="tabs" role="tablist" aria-label="Sign in or create an account">
              {[ ["login", "Sign in"], ["register", "Create account"] ].map(([m, l]) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setError(""); }}>{l}</button>
              ))}
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            {register && <label>Name<input required maxLength="80" autoComplete="name" placeholder="Your name" value={f.name} onChange={set("name")} /></label>}
            <label>Email address<input type="email" required autoFocus autoComplete="email" placeholder="you@example.com" value={f.email} onChange={set("email")} /></label>
            <label>Password
              <span className="pw">
                <input type={show ? "text" : "password"} required minLength={register ? 6 : undefined} autoComplete={register ? "new-password" : "current-password"} placeholder={register ? "At least 6 characters" : "Enter your password"} value={f.password} onChange={set("password")} />
                <button type="button" className="quiet" onClick={() => setShow(!show)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
              </span>
              {register && <span className="hint">Use at least 6 characters.</span>}
            </label>
            <button className="primary big auth-submit" type="submit" disabled={busy}>
              {busy ? (register ? "Creating account…" : "Signing in…") : register ? "Create account" : "Sign in"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
            <p className="auth-privacy"><span aria-hidden="true">⌑</span> Your personal finances deserve a little more clarity.</p>
          </form>
          <footer className="auth-footer">PAISA PLAN <span>·</span> PERSONAL FINANCE, MADE SIMPLE</footer>
        </section>
      </main>
    </div>
  );
}
