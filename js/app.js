import { sb } from "./supabase.js";

const authModal = document.getElementById("authModal");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const authMsg = document.getElementById("authMsg");

const adminBtn = document.getElementById("adminBtn");
const closeBtn = document.getElementById("closeBtn");
const loginBtn = document.getElementById("loginBtn");
const createBtn = document.getElementById("createBtn");

function setMsg(t){ authMsg.textContent = t || ""; }

adminBtn.onclick = () => {
  setMsg("");
  emailEl.value = "";
  passEl.value = "";
  authModal.classList.remove("hidden");
};

closeBtn.onclick = () => authModal.classList.add("hidden");

loginBtn.onclick = async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;
  if (!email || !password) return setMsg("Enter email + password.");

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

  authModal.classList.add("hidden");
  location.href = "./admin.html";
};

createBtn.onclick = async () => {
  const email = emailEl.value.trim();
  const password = passEl.value;
  if (!email || !password) return setMsg("Enter email + password.");

  setMsg("Signing up...");
  const { error } = await sb.auth.signUp({ email, password });
  if (error) return setMsg(error.message || "Signup failed.");

  setMsg("Account created ✅ Now LOGIN (or confirm email if required).");
};

(async function boot(){
  const { data } = await sb.auth.getSession();
  if (data?.session?.user) location.href = "./admin.html";
})();
