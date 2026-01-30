import { sb } from "./supabase.js";

const params = new URLSearchParams(location.search);
const code = params.get("code") || localStorage.getItem("GAME_CODE");
const role = params.get("role") || "student";

const whoLine = document.getElementById("whoLine");
const codeLine = document.getElementById("codeLine");
const roundTitle = document.getElementById("roundTitle");
const catRow = document.getElementById("catRow");
const board = document.getElementById("board");
const msg = document.getElementById("msg");

const overlay = document.getElementById("overlay");
const taskMeta = document.getElementById("taskMeta");
const taskTitle = document.getElementById("taskTitle");
const taskText = document.getElementById("taskText");
const choicesEl = document.getElementById("choices");
const taskMsg = document.getElementById("taskMsg");
const closeTaskBtn = document.getElementById("closeTaskBtn");

const reqFab = document.getElementById("reqFab");
const reqDrawer = document.getElementById("reqDrawer");
const reqClose = document.getElementById("reqClose");
const reqList = document.getElementById("reqList");

let game = null;
let player = null;
let state = null;

let chBoard = null;
let chReq = null;
let chAssign = null;

let pollTimer = null;
let pollReqTimer = null;

const CATS = ["Kindness","Waste Reduction","Wellness","Sustainability","Smart Choices"];
const VALUES = [100,200,300,400,500];

function setMsg(t){ msg.textContent = t || ""; }
function showOverlay(b){ overlay.style.display = b ? "flex" : "none"; }
function openReq(){ reqDrawer.style.left = "0px"; }
function closeReq(){ reqDrawer.style.left = "-380px"; }

if (reqFab) reqFab.onclick = openReq;
if (reqClose) reqClose.onclick = closeReq;

function taskKeyFor(cat, value){
  return `Round${game.round}|${cat}|${value}`;
}
function parseKey(taskKey){
  const [r, cat, v] = String(taskKey).split("|");
  return { cat, value: Number(v) || 100 };
}

/* Sample tasks (just for now) */
const TASK_BANK = {
  "Kindness": {
    100: "Say one kind thing to someone near you (or type it).",
    200: "Give a compliment to a classmate about their work.",
    300: "Write 2 ways you can help at home this week.",
    400: "Include someone: name 1 way you can invite someone to join your group.",
    500: "Make a kindness plan: 3 kind actions you will do this week."
  },
  "Waste Reduction": {
    100: "Name 1 item you can reuse instead of throwing away.",
    200: "Name 1 way to reduce trash in your lunch.",
    300: "Name 2 things that go in recycling and 1 that doesn’t.",
    400: "Plan a ‘low-waste’ snack: what would you pack it in?",
    500: "Explain the 3Rs (Reduce, Reuse, Recycle) in your own words."
  },
  "Wellness": {
    100: "Do 3 slow breaths. How do you feel after?",
    200: "Stretch safely for 10 seconds (arms up, shoulders relaxed).",
    300: "Name 3 healthy snacks you like.",
    400: "Make a 10-minute movement plan you can do today.",
    500: "Why is sleep important for kids? Give 2 reasons."
  },
  "Sustainability": {
    100: "Name 1 way to save water at home.",
    200: "Name 1 way to save electricity at home.",
    300: "Name 1 way to help nature in your neighborhood.",
    400: "Pick: walk/bike/bus/carpool. How does it help the planet?",
    500: "Create 1 ‘green classroom rule’ and explain why it matters."
  },
  "Smart Choices": {
    100: "Name 1 smart choice you can make during recess.",
    200: "If you forget homework, what’s a smart next step?",
    300: "Make a plan: homework first or screen time first? Why?",
    400: "Name 2 calm ways to solve a disagreement.",
    500: "Write 1 learning goal for today + how you’ll try."
  }
};

function getTaskContent(taskKey){
  const { cat, value } = parseKey(taskKey);
  const text = TASK_BANK?.[cat]?.[value] || "Mini activity placeholder.";
  return { title: `${cat} • ${value} pts`, text };
}

function renderCats(){
  catRow.innerHTML = "";
  CATS.forEach(c=>{
    const d = document.createElement("div");
    d.className = "cat";
    d.textContent = c.toLowerCase();
    catRow.appendChild(d);
  });
}

function renderBoard(){
  board.innerHTML = "";
  const opened = new Set(state?.opened || []);

  VALUES.forEach(v=>{
    CATS.forEach(cat=>{
      const key = taskKeyFor(cat, v);
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.textContent = v;

      if (opened.has(key)) cell.classList.add("opened");

      cell.onclick = async () => {
        if (opened.has(key)) return;

        if (role === "teacher") {
          // Teacher does NOT broadcast to everyone anymore.
          // Teacher assigns to ONE student via requests drawer.
          openTeacherPreview(key);
        } else {
          // Student clicks -> sends a REQUEST (doesn't see task yet)
          await openStudentRequest(key);
        }
      };

      board.appendChild(cell);
    });
  });
}

/* -------------------------
   Student: request a task
-------------------------- */
async function openStudentRequest(taskKey){
  const content = getTaskContent(taskKey);

  taskMeta.textContent = taskKey;
  taskTitle.textContent = "Request This Question?";
  taskText.textContent =
    `${content.title}\n\nClick REQUEST. Your teacher will send this activity to you if approved.`;

  taskMsg.textContent = "";
  choicesEl.innerHTML = "";

  const reqBtn = document.createElement("button");
  reqBtn.className = "tbtn tbtnPrimary";
  reqBtn.textContent = "📩 REQUEST";
  reqBtn.onclick = async () => {
    if (!player?.id) { taskMsg.textContent = "Player missing. Re-join."; return; }

    taskMsg.textContent = "Sending request…";
    const { error } = await sb.from("task_requests").insert([{
      game_id: game.id,
      player_id: player.id,
      task_key: taskKey
    }]);

    if (error) {
      console.log(error);
      taskMsg.textContent = "Request failed (RLS or table not ready).";
      return;
    }

    taskMsg.textContent = "Requested ✅ Wait for teacher…";
  };

  const closeBtn = document.createElement("button");
  closeBtn.className = "tbtn tbtnGhost";
  closeBtn.textContent = "Close";
  closeBtn.onclick = () => showOverlay(false);

  choicesEl.appendChild(reqBtn);
  choicesEl.appendChild(closeBtn);
  showOverlay(true);
}

/* -------------------------
   Student: receive assignment (view only)
-------------------------- */
function openStudentTaskView(taskKey){
  const content = getTaskContent(taskKey);

  taskMeta.textContent = taskKey;
  taskTitle.textContent = content.title;
  taskText.textContent = content.text;

  // ✅ Students can ONLY VIEW
  taskMsg.textContent = "Read the activity and do it now ✅";
  choicesEl.innerHTML = "";

  const closeBtn = document.createElement("button");
  closeBtn.className = "tbtn tbtnGhost";
  closeBtn.textContent = "Close";
  closeBtn.onclick = () => showOverlay(false);

  choicesEl.appendChild(closeBtn);
  showOverlay(true);
}

/* -------------------------
   Teacher: preview only
-------------------------- */
function openTeacherPreview(taskKey){
  const content = getTaskContent(taskKey);

  taskMeta.textContent = taskKey;
  taskTitle.textContent = content.title;
  taskText.textContent =
    `${content.text}\n\n(Students will NOT see this until you Assign it to one student.)`;

  taskMsg.textContent = "Tip: open 📥 Requests and click Assign for a student.";
  choicesEl.innerHTML = "";

  const closeBtn = document.createElement("button");
  closeBtn.className = "tbtn tbtnGhost";
  closeBtn.textContent = "Close";
  closeBtn.onclick = () => showOverlay(false);

  choicesEl.appendChild(closeBtn);
  showOverlay(true);
}

closeTaskBtn.onclick = () => showOverlay(false);

/* -------------------------
   Teacher: Requests drawer
-------------------------- */
async function loadRequests(){
  const { data, error } = await sb
    .from("task_requests")
    .select("id,task_key,created_at,player_id,players(name)")
    .eq("game_id", game.id)
    .order("created_at", { ascending:false });

  if (error) {
    console.log("loadRequests", error);
    return [];
  }
  return data || [];
}

function renderRequests(list){
  reqList.innerHTML = "";
  if (!list.length) {
    reqList.innerHTML = `<div class="muted">No requests yet.</div>`;
    return;
  }

  for (const r of list) {
    const name = r.players?.name || "Student";
    const card = document.createElement("div");
    card.className = "reqCard";
    card.innerHTML = `
      <div class="reqName">${name}</div>
      <div class="reqKey">${r.task_key}</div>
      <div class="reqBtns"></div>
    `;

    const btns = card.querySelector(".reqBtns");

    const assignBtn = document.createElement("button");
    assignBtn.className = "tbtn tbtnPrimary";
    assignBtn.textContent = "Assign (only this student)";
    assignBtn.onclick = async () => {
      // Create assignment row
      const { error: aErr } = await sb.from("task_assignments").insert([{
        game_id: game.id,
        player_id: r.player_id,
        task_key: r.task_key
      }]);
      if (aErr) { console.log(aErr); alert("Assign failed (RLS/table)."); return; }

      // Mark board as opened (so no one else picks same cell)
      const opened = [...(state?.opened || [])];
      if (!opened.includes(r.task_key)) opened.push(r.task_key);
      await sb.from("board_state").update({ opened }).eq("game_id", game.id);
      state = { ...(state||{}), opened };
      renderBoard();

      // Remove the request so it doesn't repeat
      await sb.from("task_requests").delete().eq("id", r.id);

      await refreshRequests();
    };

    const dismissBtn = document.createElement("button");
    dismissBtn.className = "tbtn tbtnGhost";
    dismissBtn.textContent = "Dismiss";
    dismissBtn.onclick = async () => {
      await sb.from("task_requests").delete().eq("id", r.id);
      await refreshRequests();
    };

    btns.appendChild(assignBtn);
    btns.appendChild(dismissBtn);

    reqList.appendChild(card);
  }
}

async function refreshRequests(){
  const list = await loadRequests();
  renderRequests(list);
}

/* -------------------------
   Realtime + fallback polling
-------------------------- */
async function subscribeTeacherRealtime(){
  // board_state updates (opened list)
  if (chBoard) { try{ await sb.removeChannel(chBoard);}catch{} }
  chBoard = sb.channel(`board-${game.id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"board_state", filter:`game_id=eq.${game.id}` }, (p)=>{
      state = p.new;
      renderBoard();
    })
    .subscribe();

  // requests live updates
  if (chReq) { try{ await sb.removeChannel(chReq);}catch{} }
  chReq = sb.channel(`req-${game.id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"task_requests", filter:`game_id=eq.${game.id}` }, refreshRequests)
    .subscribe();

  // fallback polling (in case realtime drops)
  if (pollReqTimer) clearInterval(pollReqTimer);
  pollReqTimer = setInterval(refreshRequests, 1200);
}

async function subscribeStudentRealtime(){
  // student listens ONLY to their own assignments
  if (chAssign) { try{ await sb.removeChannel(chAssign);}catch{} }
  chAssign = sb.channel(`assign-${player.id}`)
    .on("postgres_changes", {
      event:"INSERT",
      schema:"public",
      table:"task_assignments",
      filter:`player_id=eq.${player.id}`
    }, async (payload)=>{
      const row = payload.new;
      if (row?.task_key) {
        openStudentTaskView(row.task_key);

        // mark viewed (optional)
        await sb.from("task_assignments")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", row.id);
      }
    })
    .subscribe();

  // board state subscription only to update opened/locking UI
  if (chBoard) { try{ await sb.removeChannel(chBoard);}catch{} }
  chBoard = sb.channel(`board-${game.id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"board_state", filter:`game_id=eq.${game.id}` }, (p)=>{
      state = p.new;
      renderBoard();
    })
    .subscribe();

  // fallback polling for assignments (realtime sometimes fails on school networks)
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(async ()=>{
    const { data } = await sb
      .from("task_assignments")
      .select("id,task_key,created_at,viewed_at")
      .eq("game_id", game.id)
      .eq("player_id", player.id)
      .order("created_at", { ascending:false })
      .limit(1);

    const last = data?.[0];
    if (last && !last.viewed_at) {
      openStudentTaskView(last.task_key);
      await sb.from("task_assignments")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", last.id);
    }
  }, 1200);
}

/* -------------------------
   Boot
-------------------------- */
async function boot(){
  if (!code) return setMsg("Missing game code. Re-join.");

  codeLine.textContent = `Code: ${code}`;
  whoLine.textContent = role === "teacher" ? "Teacher view" : "Student view";

  const { data: g } = await sb.from("games").select("*").eq("code", code).maybeSingle();
  if (!g) return setMsg("Game not found.");
  game = g;

  const { data: s } = await sb.from("board_state").select("*").eq("game_id", game.id).maybeSingle();
  if (!s) return setMsg("Board state missing.");
  state = s;

  renderCats();
  roundTitle.textContent = `Round ${game.round}`;
  renderBoard();

  if (role === "teacher") {
    reqFab.style.display = "inline-block";
    await refreshRequests();
    await subscribeTeacherRealtime();
    setMsg("Students click a tile to REQUEST. Open 📥 Requests to assign to one student.");
  } else {
    const pid = localStorage.getItem("PLAYER_ID");
    if (!pid) return setMsg("Missing player. Re-join.");

    const { data: p } = await sb.from("players").select("*").eq("id", pid).maybeSingle();
    if (!p) return setMsg("Player not found. Re-join.");
    player = p;

    await subscribeStudentRealtime();
    setMsg("Click a tile to REQUEST it. Wait for your teacher to send you the activity.");
  }
}

boot();
