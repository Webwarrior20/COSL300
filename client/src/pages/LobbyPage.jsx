import { useEffect, useRef, useState } from "react";
import { sb } from "../supabase";

const LS_PLAYER_ID = "PLAYER_ID";
const LS_GAME_CODE = "GAME_CODE";
const LS_STUDENT_NAME = "STUDENT_NAME";
const LS_STUDENT_NAME_KEY = "STUDENT_NAME_KEY";

export default function LobbyPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [waiting, setWaiting] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const statusChannelRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (statusChannelRef.current) sb.removeChannel(statusChannelRef.current);
    };
  }, []);

  const normCode = (x) => (x || "").trim().replace(/\s+/g, "").slice(0, 6);
  const normalizeNameKey = (x) => (x || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");
  const fullName = `${(firstName || "").trim()} ${(lastName || "").trim()}`.trim();
  const nameKey = normalizeNameKey(fullName);

  const getGameByCode = async (gameCode) => {
    const { data, error } = await sb
      .from("games")
      .select("id,code,status,round")
      .eq("code", gameCode)
      .maybeSingle();
    if (error) console.log("getGameByCode", error);
    return data || null;
  };

  const findExistingPlayer = async (gameId, currentNameKey) => {
    const { data, error } = await sb
      .from("players")
      .select("id,name")
      .eq("game_id", gameId)
      .order("joined_at", { ascending: true });
    if (error) console.log("findExistingPlayer", error);
    return (data || []).find((p) => normalizeNameKey(p.name) === currentNameKey) || null;
  };

  const loadStudentTotals = async (currentNameKey) => {
    const { data, error } = await sb
      .from("student_totals")
      .select("total_points,tasks_completed,full_name")
      .eq("name_key", currentNameKey)
      .maybeSingle();
    if (error) {
      console.log("loadStudentTotals", error);
      return { total_points: 0, tasks_completed: 0 };
    }
    return data || { total_points: 0, tasks_completed: 0 };
  };

  const createPlayer = async (gameId, playerName, totals) => {
    const { data, error } = await sb
      .from("players")
      .insert([{
        game_id: gameId,
        name: playerName,
        score: totals?.total_points || 0,
        tasks_completed: totals?.tasks_completed || 0,
        joined_at: new Date().toISOString()
      }])
      .select("id,name")
      .single();
    if (error) {
      console.log("createPlayer", error);
      return null;
    }
    return data || null;
  };

  const updateNameIfNeeded = async (playerId, playerName) => {
    const { error } = await sb.from("players").update({ name: playerName }).eq("id", playerId);
    if (error) console.log("updateNameIfNeeded", error);
  };

  const goStudentView = (gameCode) => {
    localStorage.setItem(LS_GAME_CODE, gameCode);
    window.location.href = `/game?code=${encodeURIComponent(gameCode)}&role=student`;
  };

  const subscribeToStart = async (gameId, gameCode) => {
    if (statusChannelRef.current) await sb.removeChannel(statusChannelRef.current);
    statusChannelRef.current = sb.channel(`game-status-${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` }, (p) => {
        const g = p.new;
        if (g?.status === "started") goStudentView(gameCode);
      })
      .subscribe();

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const g = await getGameByCode(gameCode);
      if (g?.status === "started") goStudentView(gameCode);
    }, 1000);
  };

  const join = async () => {
    setMsg("");
    setWaiting(false);

    const n = fullName;
    const c = normCode(code);

    if (!firstName.trim() || !lastName.trim()) return setMsg("Enter first and last name.");
    if (c.length !== 6) return setMsg("Enter a 6-digit game code.");

    setDisabled(true);
    setMsg("Joining...");

    const game = await getGameByCode(c);
    if (!game) {
      setDisabled(false);
      return setMsg("Game not found. Check the code.");
    }

    const totals = await loadStudentTotals(nameKey);
    let player = await findExistingPlayer(game.id, nameKey);
    if (!player) {
      player = await createPlayer(game.id, n, totals);
      if (!player) {
        setDisabled(false);
        return setMsg("Could not join (table/RLS/columns).");
      }
    } else {
      await updateNameIfNeeded(player.id, n);
    }

    localStorage.setItem(LS_PLAYER_ID, player.id);
    localStorage.setItem(LS_GAME_CODE, c);
    localStorage.setItem(LS_STUDENT_NAME, n);
    localStorage.setItem(LS_STUDENT_NAME_KEY, nameKey);

    if (game.status === "started") return goStudentView(c);

    setMsg("");
    setWaiting(true);
    await subscribeToStart(game.id, c);
  };

  return (
    <main className="page">
      <section className="joinCard">
        <div className="bigTitle">Join Win Squares</div>
        <p className="sub">Enter your first and last name plus the game code.</p>

        <label className="field" style={{ textAlign: "left" }}>
          <span>First Name</span>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} type="text" placeholder="e.g., Aanya" autoComplete="given-name" />
        </label>

        <label className="field" style={{ textAlign: "left" }}>
          <span>Last Name</span>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} type="text" placeholder="e.g., Patel" autoComplete="family-name" />
          <div className="miniHint">Points are tracked by first + last name.</div>
        </label>

        <label className="field" style={{ textAlign: "left" }}>
          <span>Game Code</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} type="text" inputMode="numeric" placeholder="6 digits" maxLength={6} autoComplete="off" />
        </label>

        <button className="btn btn-primary" style={{ width: "100%", marginTop: 10 }} onClick={join} disabled={disabled}>JOIN</button>
        <p className="msg">{msg}</p>

        {waiting && (
          <div><div className="waitPill">Waiting for teacher to start…</div></div>
        )}
      </section>
    </main>
  );
}
