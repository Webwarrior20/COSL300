import { sb } from "./supabase.js";

const CHARACTERS = [
  { id: "wizard", name: "Wizard", emoji: "🧙‍♂️" },
  { id: "knight", name: "Knight", emoji: "🛡️" },
  { id: "astronaut", name: "Astronaut", emoji: "🧑‍🚀" },
  { id: "detective", name: "Detective", emoji: "🕵️" },
  { id: "ninja", name: "Ninja", emoji: "🥷" },
  { id: "scientist", name: "Scientist", emoji: "🧑‍🔬" }
];

const grid = document.getElementById("grid");
const msg = document.getElementById("msg");
const who = document.getElementById("who");
const saveBtn = document.getElementById("saveBtn");

let selectedId = null;
let uid = null;

document.getElementById("logoutBtn").onclick = async () => {
  await sb.auth.signOut();
  location.href = "./index.html";
};

function render() {
  grid.innerHTML = "";
  for (const c of CHARACTERS) {
    const div = document.createElement("div");
    div.className = "char" + (c.id === selectedId ? " selected" : "");
    div.innerHTML = `<div class="emoji">${c.emoji}</div><div>${c.name}</div>`;
    div.onclick = () => {
      selectedId = c.id;
      saveBtn.disabled = false;
      render();
    };
    grid.appendChild(div);
  }
}

saveBtn.onclick = async () => {
  msg.textContent = "";
  if (!uid || !selectedId) return;

  const { error } = await sb.from("profiles").update({ character_id: selectedId }).eq("user_id", uid);
  if (error) {
    console.log(error);
    msg.textContent = error.message || "Could not save character.";
    return;
  }
  location.href = "./student.html";
};

(async function boot() {
  const { data } = await sb.auth.getSession();
  const user = data?.session?.user;
  if (!user) {
    location.href = "./index.html";
    return;
  }
  uid = user.id;

  const { data: prof } = await sb
    .from("profiles")
    .select("full_name, email, character_id")
    .eq("user_id", uid)
    .single();

  who.textContent = `Welcome, ${prof?.full_name || user.email}!`;
  selectedId = prof?.character_id || null;
  saveBtn.disabled = !selectedId;

  render();
})();
