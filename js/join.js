import { sb } from "./supabase.js";

const nameEl = document.getElementById("name");
const studentIdEl = document.getElementById("studentId");
const codeEl = document.getElementById("code");
const joinBtn = document.getElementById("joinBtn");
const msgEl = document.getElementById("msg");
const waitEl = document.getElementById("wait");

function setMsg(t){ msgEl.textContent = t || ""; }
function clean(s){ return String(s || "").trim(); }

let pollTimer = null;
let startChannel = null;

joinBtn.onclick = async () => {
  const name = clean(nameEl.value);
  const student_id = clean(studentIdEl.value);
  const code = clean(codeEl.value);

  if (!name) return setMsg("Please enter your name.");
  if (!student_id) return setMsg("Please enter your Student ID.");
  if (!/^\d{6}$/.test(code)) return setMsg("Game code must be 6 digits.");

  joinBtn.disabled = true;
  setMsg("Joining…");

  // Find game
  const { data: game, error: gErr } = await sb
    .from("games")
    .select("id,code,status,round")
    .eq("code", code)
    .maybeSingle();

  if (gErr || !game) {
    joinBtn.disabled = false;
    return setMsg("Game not found. Check the code.");
  }

  // Create player
  const { data: player, error: pErr } = await sb
    .from("players")
    .insert([{ game_id: game.id, name, student_id }])
    .select("id,name,game_id,student_id")
    .single();

  if (pErr || !player) {
    console.log(pErr);
    joinBtn.disabled = false;
    const msg = (pErr?.message || "").toLowerCase();
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return setMsg("That Student ID is already in this game.");
    }
    return setMsg("Could not join. Try again.");
  }

  localStorage.setItem("GAME_CODE", code);
  localStorage.setItem("PLAYER_ID", player.id);
  localStorage.setItem("PLAYER_NAME", name);
  localStorage.setItem("STUDENT_ID", student_id);

  // If already started → go now
  if (game.status === "started") {
    location.href = `./game.html?code=${encodeURIComponent(code)}&role=student`;
    return;
  }

  // Waiting UI
  setMsg("");
  waitEl.style.display = "inline-block";

  // ✅ Realtime listener (nice if it works)
  try {
    startChannel = sb.channel(`game-start-${game.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${game.id}`
      }, (payload) => {
        const row = payload.new;
        if (row?.status === "started") {
          cleanup();
          location.href = `./game.html?code=${encodeURIComponent(code)}&role=student`;
        }
      })
      .subscribe();
  } catch (e) {
    console.log("Realtime subscribe failed:", e);
  }

  // ✅ Poll fallback (THIS fixes “stuck”)
  pollTimer = setInterval(async () => {
    const { data: g2 } = await sb
      .from("games")
      .select("status")
      .eq("id", game.id)
      .maybeSingle();

    if (g2?.status === "started") {
      cleanup();
      location.href = `./game.html?code=${encodeURIComponent(code)}&role=student`;
    }
  }, 1000);

  function cleanup(){
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    if (startChannel) {
      try { sb.removeChannel(startChannel); } catch {}
      startChannel = null;
    }
  }
};
