import { useEffect, useRef, useState } from "react";
import { sb } from "../supabase";

const LS_GAME_ID = "ACTIVE_GAME_ID";

export default function TeacherPage() {
  const [teacherEmail, setTeacherEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [joinLink, setJoinLink] = useState("");
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("students");
  const [rewardPlayerId, setRewardPlayerId] = useState("");
  const [rewardPoints, setRewardPoints] = useState(100);
  const pollRef = useRef(null);
  const channelRef = useRef(null);

  const buildJoinUrl = async () => {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("172.16.") ||
      host.startsWith("172.17.") ||
      host.startsWith("172.18.") ||
      host.startsWith("172.19.") ||
      host.startsWith("172.2") ||
      host.startsWith("172.30.") ||
      host.startsWith("172.31.");

    if (!isLocal) {
      return `${window.location.origin}/join`;
    }

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 1200);
      const r = await fetch("/api/ip", { cache: "no-store", signal: controller.signal });
      clearTimeout(t);
      const j = await r.json();
      const proto = window.location.protocol || "http:";
      const port = j.port || window.location.port || 8080;
      return `${proto}//${j.ip}:${port}/join`;
    } catch {
      return `${window.location.origin}/join`;
    }
  };

  const loadPlayers = async (g) => {
    if (!g) return [];
    const { data, error } = await sb
      .from("players")
      .select("id,name,student_id,score,tasks_completed,joined_at")
      .eq("game_id", g.id)
      .order("joined_at", { ascending: true });
    if (error) console.log("LOAD PLAYERS ERROR:", error);
    return data || [];
  };

  const refreshLobby = async (g) => {
    const list = await loadPlayers(g);
    setPlayers(list);
  };

  const getGameById = async (id) => {
    const { data, error } = await sb
      .from("games")
      .select("id,code,status,round,created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    return data || null;
  };

  const createNewGame = async () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data: g, error } = await sb
      .from("games")
      .insert([{ code, status: "lobby", round: 1 }])
      .select("id,code,status,round")
      .single();
    if (error || !g) {
      console.log("CREATE GAME ERROR:", error);
      setMsg("Could not create game. Check Supabase tables/RLS.");
      return null;
    }

    await sb.from("board_state").upsert([{
      game_id: g.id,
      phase: "board",
      current_task: null,
      opened: []
    }]);
    return g;
  };

  const ensureLobbyGame = async () => {
    setMsg("Preparing game…");
    const savedId = localStorage.getItem(LS_GAME_ID);
    let g = null;
    if (savedId) {
      const existing = await getGameById(savedId);
      if (existing && existing.status === "lobby") g = existing;
      else localStorage.removeItem(LS_GAME_ID);
    }
    if (!g) {
      const fresh = await createNewGame();
      if (!fresh) return;
      g = fresh;
      localStorage.setItem(LS_GAME_ID, g.id);
    }
    setGame(g);
    await refreshLobby(g);
    setMsg("Share the join link + code with students.");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await sb.auth.getSession();
      const user = data?.session?.user;
      if (!user) {
        window.location.href = "/";
        return;
      }
      if (!alive) return;
      setTeacherEmail(user.email || "Teacher");
      const url = await buildJoinUrl();
      setJoinLink(url);
      await ensureLobbyGame();
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!game) return;

    if (channelRef.current) sb.removeChannel(channelRef.current);
    channelRef.current = sb.channel(`lobby-${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_id=eq.${game.id}` }, () => refreshLobby(game))
      .subscribe();

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => refreshLobby(game), 1200);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (channelRef.current) sb.removeChannel(channelRef.current);
    };
  }, [game]);

  useEffect(() => {
    if (!players.length) {
      setRewardPlayerId("");
      return;
    }
    if (!rewardPlayerId || !players.some((p) => p.id === rewardPlayerId)) {
      setRewardPlayerId(players[0].id);
    }
  }, [players, rewardPlayerId]);

  const startGame = async () => {
    if (!game) return;
    setMsg("Starting game…");
    const { data: updated, error } = await sb
      .from("games")
      .update({ status: "started" })
      .eq("id", game.id)
      .select("id,status,code")
      .maybeSingle();

    if (error || updated?.status !== "started") {
      console.log("START UPDATE FAILED:", error);
      setMsg("❌ Could not start game (permissions/RLS).");
      return;
    }
    localStorage.removeItem(LS_GAME_ID);
    window.location.href = `/game?code=${encodeURIComponent(game.code)}&role=teacher`;
  };

  const logout = async () => {
    try { await sb.auth.signOut(); } catch {}
    window.location.href = "/";
  };

  const sorted = [...players].sort((a, b) =>
    (b.tasks_completed ?? 0) - (a.tasks_completed ?? 0) ||
    (b.score ?? 0) - (a.score ?? 0)
  );

  const copyJoinLink = async () => {
    if (!joinLink) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(joinLink);
        setMsg("Join link copied ✅");
        return;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = joinLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setMsg("Join link copied ✅");
    } catch {
      setMsg("Copy failed — select the link and copy manually.");
    }
  };

  const rewardStudent = async () => {
    if (!game || !rewardPlayerId) return;
    const target = players.find((p) => p.id === rewardPlayerId);
    if (!target) return;

    const nextScore = (target.score || 0) + Number(rewardPoints || 0);
    const { error } = await sb
      .from("players")
      .update({ score: nextScore })
      .eq("id", rewardPlayerId)
      .eq("game_id", game.id);

    if (error) {
      setMsg("Could not reward student.");
      return;
    }

    setPlayers((prev) => prev.map((p) => (
      p.id === rewardPlayerId ? { ...p, score: nextScore } : p
    )));
    setMsg(`Awarded ${rewardPoints} points to ${target.name}.`);
  };

  return (
    <main className="page">
      <button
        className="teacherMenuToggle"
        type="button"
        onClick={() => setSidebarOpen((v) => !v)}
      >
        {sidebarOpen ? "Close Panel" : "Open Panel"}
      </button>

      <aside className={`teacherSidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="teacherSidebarNav">
          <button
            type="button"
            className={`teacherSidebarItem ${sidebarTab === "students" ? "active" : ""}`}
            onClick={() => setSidebarTab("students")}
          >
            Student List
          </button>
          <button
            type="button"
            className={`teacherSidebarItem ${sidebarTab === "reward" ? "active" : ""}`}
            onClick={() => setSidebarTab("reward")}
          >
            Reward Student
          </button>
        </div>
        <div className="teacherSidebarContent">
          {sidebarTab === "students" && (
            <div>
              <div className="sideTitle">Student List</div>
              <div className="mini">Joined: {players.length}</div>
              <div className="list" style={{ maxHeight: 300 }}>
                {players.length === 0 && <div className="mini">No students yet.</div>}
                {players.map((p) => (
                  <div key={p.id} className="pRow">
                    <div>{p.name}</div>
                    <div>⭐ {p.score ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sidebarTab === "reward" && (
            <div>
              <div className="sideTitle">Reward Student</div>
              <label className="field" style={{ marginTop: 8 }}>
                <span>Student</span>
                <select
                  value={rewardPlayerId}
                  onChange={(e) => setRewardPlayerId(e.target.value)}
                  className="assignSelect"
                  style={{ minHeight: "unset", marginTop: 4 }}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Points</span>
                <select
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(Number(e.target.value))}
                  className="assignSelect"
                  style={{ minHeight: "unset", marginTop: 4 }}
                >
                  {[100, 200, 300, 400, 500].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={rewardStudent} disabled={!players.length}>
                Award Points
              </button>
            </div>
          )}
        </div>
      </aside>

      <section className="card lobby-card">
        <div className="lobby-top">
          <div className="lobby-teacher">
            <div className="lobby-label">Teacher</div>
            <div className="lobby-email">{teacherEmail}</div>
            <div className="lobby-joinbox">
              <div className="lobby-joinpill">Share this join link with students</div>
              <div className="lobby-joinrow">
                <input className="lobby-joininput" value={joinLink} readOnly />
                <button className="btn btn-ghost" onClick={copyJoinLink}>COPY</button>
                <a className="btn btn-ghost" href={joinLink} target="_blank" rel="noopener">OPEN</a>
              </div>
              <div className="mini" style={{ marginTop: 8 }}>Students enter first name + last name + the 6-digit game code.</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={logout}>LOG OUT</button>
        </div>

        <div className="lobby-title">Win Squares Lobby</div>
        <div className="lobby-code">Game Code: {game?.code || "———"}</div>

        <div className="lobby-grid">
          <div className="lobby-box">
            <div style={{ fontWeight: 1200 }}>Students Joined: {players.length}</div>
            <div className="lobby-pillgrid">
              {players.length === 0 && <div className="muted" style={{ gridColumn: "1/-1", textAlign: "center" }}>No students joined yet</div>}
              {players.map((p) => (
                <div key={p.id} className="lobby-pill">
                  {p.name}{p.student_id ? ` (${p.student_id})` : ""}
                </div>
              ))}
            </div>
          </div>
          <div className="lobby-box">
            <div style={{ fontWeight: 1200 }}>Live Leaderboard</div>
            <div className="mini">Sorted by Tasks Completed → Score</div>
            {sorted.length === 0 && <div className="muted" style={{ marginTop: 8 }}>No data yet.</div>}
            {sorted.map((p) => (
              <div key={p.id} className="lobby-row">
                <div>{p.name}</div><div>⭐ {p.score ?? 0}</div>
              </div>
            ))}
          </div>
        </div>

        <button className="big-btn big-btn-admin lobby-start" disabled={!game || loading} onClick={startGame}>START GAME</button>
        <p className="muted" style={{ marginTop: 12 }}>{msg}</p>
      </section>
    </main>
  );
}
