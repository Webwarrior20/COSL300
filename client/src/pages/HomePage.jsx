import { useEffect, useState } from "react";
import { sb } from "../supabase";

export default function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [msg, setMsg] = useState("");
  const LS_TEACHER_SECTION = "TEACHER_SECTION";

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (data?.session?.user) window.location.href = "/admin";
    });
  }, []);

  const login = async () => {
    if (!email || !password || !sectionName.trim()) return setMsg("Enter email, password, and section name.");
    setMsg("Logging in...");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      const m = (error.message || "").toLowerCase();
      if (m.includes("email not confirmed")) {
        setMsg("Confirm your email first (check inbox/spam), then login again.");
      } else {
        setMsg(error.message || "Login failed.");
      }
      return;
    }
    localStorage.setItem(LS_TEACHER_SECTION, sectionName.trim());
    window.location.href = "/admin";
  };

  const signup = async () => {
    if (!email || !password || !sectionName.trim()) return setMsg("Enter email, password, and section name.");
    setMsg("Signing up...");
    const { error } = await sb.auth.signUp({ email, password });
    if (error) return setMsg(error.message || "Signup failed.");
    localStorage.setItem(LS_TEACHER_SECTION, sectionName.trim());
    setMsg("Account created ✅ Now LOGIN (or confirm email if required).");
  };

  return (
    <main className="page">
      <section className="card" style={{ textAlign: "center" }}>
        <div className="logo-bubble">
          <img className="logo-image" src="/Logo.png" alt="Win Squares logo" />
        </div>
        <h1 className="headline" style={{ marginBottom: 10 }}>
  <span className="accent">Win Squares</span>
</h1>
        <p className="subhead">
          Teacher hosts the game. Students join with a <b>code</b> and complete challenges to win squares.
        </p>
        <div className="actions">
          <button className="big-btn big-btn-admin" style={{ width: "100%" }} onClick={() => { setMsg(""); setShowModal(true); }}>
            <span className="btn-icon">🧑‍🏫</span> Teacher Login / Signup
          </button>
          <button className="big-btn big-btn-adminSecondary" style={{ width: "100%" }} onClick={() => { window.location.href = "/admin-login"; }}>
            <span className="btn-icon">🛡️</span> Admin Login
          </button>
        </div>
        <div className="pill">✨ After login, you will get a game code to share with students.</div>
      </section>

      {showModal && (
        <div className="modal">
          <div className="modal-card">
            <h2>Teacher Login</h2>
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@email.com" autoComplete="email" />
            </label>
            <label className="field">
              <span>Section Name</span>
              <input value={sectionName} onChange={(e) => setSectionName(e.target.value)} type="text" placeholder="e.g., Grade 4A" />
            </label>
            <label className="field">
              <span>Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" autoComplete="current-password" />
            </label>
            <p className="msg">{msg}</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={login}>LOGIN</button>
              <button className="btn btn-ghost" onClick={signup}>SIGN UP</button>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
