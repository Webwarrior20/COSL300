import { useEffect, useState } from "react";
import { sb } from "../supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (data?.session?.user) window.location.href = "/admin-content";
    });
  }, []);

  const login = async () => {
    if (!email || !password) {
      setMsg("Enter email and password.");
      return;
    }

    setMsg("Logging in...");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      const text = (error.message || "").toLowerCase();
      if (text.includes("email not confirmed")) {
        setMsg("Confirm your email first, then login again.");
      } else {
        setMsg(error.message || "Login failed.");
      }
      return;
    }

    window.location.href = "/admin-content";
  };

  const signup = async () => {
    if (!email || !password) {
      setMsg("Enter email and password.");
      return;
    }

    setMsg("Creating account...");
    const { error } = await sb.auth.signUp({ email, password });
    if (error) {
      setMsg(error.message || "Signup failed.");
      return;
    }

    setMsg("Account created. Login now, or confirm email first if Supabase requires it.");
  };

  return (
    <main className="page">
      <section className="card adminLoginCard">
        <div className="logo-bubble"><div className="logo-emoji">🛡️</div></div>
        <h1 className="headline adminHeadline">Admin Login</h1>
        <p className="subhead">Use your admin or teacher account to open the control panel for Win Squares.</p>

        <div className="adminLoginForm">
          <label className="field">
            <span>Email</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@email.com"
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <p className="msg">{msg}</p>

          <div className="row adminLoginActions">
            <button className="btn btn-primary" onClick={login}>LOGIN</button>
            <button className="btn btn-ghost" onClick={signup}>SIGN UP</button>
            <button className="btn btn-ghost" onClick={() => { window.location.href = "/"; }}>BACK</button>
          </div>
        </div>
      </section>
    </main>
  );
}
