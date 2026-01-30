import { sb } from "./supabase.js";

const teacherEmail = document.getElementById("teacherEmail");
const codeLine = document.getElementById("codeLine");
const pills = document.getElementById("pills");
const startBtn = document.getElementById("startBtn");
const msg = document.getElementById("msg");
const leaderRows = document.getElementById("leaderRows");
const logoutBtn = document.getElementById("logoutBtn");
const studentCountEl = document.getElementById("studentCount");

const joinLinkEl = document.getElementById("joinLink");
const copyJoinBtn = document.getElementById("copyJoinBtn");
const openJoinBtn = document.getElementById("openJoinBtn");

let game = null;
let channel = null;
let pollTimer = null;

const LS_GAME_ID = "ACTIVE_GAME_ID";

function setMsg(t){ msg.textContent = t || ""; }

function randCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// LAN join link via server.js (/api/ip)
async function buildJoinUrl() {
  try {
    const r = await fetch("/api/ip", { cache: "no-store" });
    const j = await r.json();
    const proto = window.location.protocol || "http:";
    const port = j.port || window.location.port || 8080;
    return `${proto}//${j.ip}:${port}/html/join.html`;
  } catch {
    return window.location.origin + "/html/join.html";
  }
}

async function setupJoinLink() {
  const joinUrl = await buildJoinUrl();
  joinLinkEl.value = joinUrl;
  openJoinBtn.href = joinUrl;

  copyJoinBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setMsg("Join link copied ✅");
    } catch {
      setMsg("Copy failed — select the link and copy manually.");
    }
  };

  const h = window.location.hostname;
  if (h === "127.0.0.1" || h === "localhost") {
    setMsg("⚠️ You opened on localhost. Students cannot join. Use the LAN URL printed by server.js.");
  }
}

function renderPills(players) {
  pills.innerHTML = "";
  const list = players || [];

  if (studentCountEl) studentCountEl.textContent = String(list.length);

  if (list.length === 0) {
    pills.innerHTML = `<div class="muted" style="grid-column:1/-1;text-align:center;">No students joined yet</div>`;
    return;
  }

  for (const p of list) {
    const d = document.createElement("div");
    d.className = "namePill";
    d.textContent = p.name;
    pills.appendChild(d);
  }
}

function renderLeaderboard(players) {
  leaderRows.innerHTML = "";
  const list = [...(players || [])];

  list.sort((a,b)=>{
    const tc = (b.tasks_completed ?? 0) - (a.tasks_completed ?? 0);
    if (tc !== 0) return tc;
    return (b.score ?? 0) - (a.score ?? 0);
  });

  if (list.length === 0) {
    leaderRows.innerHTML = `<div class="muted" style="margin-top:8px;">No data yet.</div>`;
    return;
  }

  for (const p of list) {
    const r = document.createElement("div");
    r.className = "rowL";
    r.innerHTML = `<div>${p.name}</div><div>✅ ${p.tasks_completed ?? 0} &nbsp;|&nbsp; ⭐ ${p.score ?? 0}</div>`;
    leaderRows.appendChild(r);
  }
}

async function loadPlayers() {
  if (!game) return [];
  const { data, error } = await sb
    .from("players")
    .select("id,name,score,tasks_completed,joined_at")
    .eq("game_id", game.id)
    .order("joined_at", { ascending: true });

  if (error) console.log("LOAD PLAYERS ERROR:", error);
  return data || [];
}

async function refreshLobby() {
  const players = await loadPlayers();
  renderPills(players);
  renderLeaderboard(players);
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refreshLobby, 1200);
}

async function subscribeRealtime() {
  if (!game) return;

  try { if (channel) await sb.removeChannel(channel); } catch {}

  channel = sb.channel(`lobby-${game.id}`)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "players",
      filter: `game_id=eq.${game.id}`
    }, refreshLobby)
    .on("postgres_changes", {
      event: "*", schema: "public", table: "task_events",
      filter: `game_id=eq.${game.id}`
    }, refreshLobby)
    .subscribe();

  // fallback so you NEVER need refresh
  startPolling();
}

async function getGameById(id) {
  const { data, error } = await sb
    .from("games")
    .select("id,code,status,round,created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

async function createNewGame() {
  const code = randCode();

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

  // Ensure board_state exists
  await sb.from("board_state").upsert([{
    game_id: g.id,
    phase: "lobby",
    current_task: null,
    opened: []
  }]);

  return g;
}

async function ensureLobbyGame() {
  setMsg("Preparing game...");

  const savedId = localStorage.getItem(LS_GAME_ID);
  if (savedId) {
    const existing = await getGameById(savedId);
    if (existing && existing.status === "lobby") game = existing;
    else localStorage.removeItem(LS_GAME_ID);
  }

  if (!game) {
    const fresh = await createNewGame();
    if (!fresh) return;
    game = fresh;
    localStorage.setItem(LS_GAME_ID, game.id);
  }

  codeLine.textContent = `Game Code: ${game.code}`;
  startBtn.disabled = false;

  await refreshLobby();
  await subscribeRealtime();

  setMsg("Share the join link + code with students.");
}

startBtn.onclick = async () => {
  if (!game) return;

  setMsg("Starting game...");
  startBtn.disabled = true;

  const { data: updated, error } = await sb
    .from("games")
    .update({ status: "started" })
    .eq("id", game.id)
    .select("id,status,code")
    .maybeSingle();

  if (error || updated?.status !== "started") {
    console.log("START UPDATE FAILED:", error);
    setMsg("❌ Could not start game (permissions/RLS).");
    startBtn.disabled = false;
    return;
  }

  await sb.from("board_state")
    .update({ phase: "board", updated_at: new Date().toISOString() })
    .eq("game_id", game.id);

  localStorage.removeItem(LS_GAME_ID);

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;

  location.href = `./game.html?code=${encodeURIComponent(game.code)}&role=teacher`;
};

logoutBtn.onclick = async () => {
  try { await sb.auth.signOut(); } catch {}
  if (pollTimer) clearInterval(pollTimer);
  location.href = "./index.html";
};

(async function boot(){
  await setupJoinLink();

  const { data } = await sb.auth.getSession();
  const user = data?.session?.user;
  if (!user) return (location.href = "./index.html");

  teacherEmail.textContent = user.email || "Teacher";
  await ensureLobbyGame();
})();
