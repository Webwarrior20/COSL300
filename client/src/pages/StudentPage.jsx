import { useEffect, useMemo, useRef, useState } from "react";
import { sb } from "../supabase";
import { ROUND_CONFIG, VALUES, getTaskTextByKey, parseTaskKey } from "../assets/task";
import GrowthPotAnimation from "../components/GrowthPotAnimation";

const LS_PLAYER_ID = "PLAYER_ID";
const LS_GAME_CODE = "GAME_CODE";
const LS_STUDENT_NAME = "STUDENT_NAME";
const LS_STUDENT_NAME_KEY = "STUDENT_NAME_KEY";

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

export default function StudentPage() {
  const query = useQuery();
  const role = query.get("role") || "student";
  const code = query.get("code") || localStorage.getItem(LS_GAME_CODE);

  const [game, setGame] = useState(null);
  const [state, setState] = useState(null);
  const [players, setPlayers] = useState([]);
  const [msg, setMsg] = useState("");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activeTaskKey, setActiveTaskKey] = useState(null);
  const [taskMsg, setTaskMsg] = useState("");
  const [assignIds, setAssignIds] = useState([]);
  const [modalMode, setModalMode] = useState("select");
  const [assignedKeys, setAssignedKeys] = useState([]);
  const [classPoints, setClassPoints] = useState(0);
  const [classGoal, setClassGoal] = useState(5000);
  const [teacherSidebarOpen, setTeacherSidebarOpen] = useState(false);
  const [teacherSidebarTab, setTeacherSidebarTab] = useState("students");
  const [rewardPlayerId, setRewardPlayerId] = useState("");
  const [rewardPoints, setRewardPoints] = useState(100);

  const dismissedTaskKeyRef = useRef(null);
  const lastAssignmentIdRef = useRef(null);

  const chBoardRef = useRef(null);
  const chGameRef = useRef(null);
  const chPlayersRef = useRef(null);
  const chAssignRef = useRef(null);
  const pollRef = useRef(null);

  const cfg = game ? (ROUND_CONFIG[game.round] || ROUND_CONFIG[1]) : ROUND_CONFIG[1];
  const cats = cfg.cats;
  const dayColumn = Math.min(Math.max(state?.day_column ?? 0, 0), Math.max(cats.length - 1, 0));

  const taskKey = (cat, value) => `R${game?.round || 1}|${cat}|${value}`;

  const loadGame = async () => {
    const { data, error } = await sb
      .from("games")
      .select("id,code,status,round")
      .eq("code", code)
      .maybeSingle();
    if (error) console.log(error);
    return data || null;
  };

  const loadState = async (g) => {
    const { data, error } = await sb
      .from("board_state")
      .select("*")
      .eq("game_id", g.id)
      .maybeSingle();
    if (error) console.log(error);
    return data || null;
  };

  const loadPlayers = async (g) => {
    const { data, error } = await sb
      .from("players")
      .select("id,name,score,tasks_completed,joined_at")
      .eq("game_id", g.id)
      .order("joined_at", { ascending: true });
    if (error) console.log(error);
    return data || [];
  };

  const updateBoardState = async (g, patch) => {
    const { error } = await sb
      .from("board_state")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("game_id", g.id);
    if (error) console.log("updateBoardState", error);
  };

  const loadClassProgress = async (g) => {
    const { data, error } = await sb
      .from("class_progress")
      .select("class_points, goal_points")
      .eq("game_id", g.id)
      .maybeSingle();
    if (error) {
      console.log("loadClassProgress", error);
      return { class_points: 0, goal_points: 5000 };
    }
    if (!data) {
      const insert = await sb.from("class_progress").insert([{
        game_id: g.id,
        class_points: 0,
        goal_points: 5000
      }]).select("class_points, goal_points").single();
      return insert.data || { class_points: 0, goal_points: 5000 };
    }
    return data;
  };

  const syncClassProgress = async (g, totalPoints) => {
    const { error } = await sb
      .from("class_progress")
      .upsert([{
        game_id: g.id,
        class_points: totalPoints,
        goal_points: classGoal || 5000
      }], { onConflict: "game_id" });
    if (error) console.log("syncClassProgress", error);
  };

  const upsertStudentTotals = async (nameKey, fullName, score, tasksCompleted = 0) => {
    if (!nameKey) return;
    const { error } = await sb.from("student_totals").upsert([{
      name_key: nameKey,
      full_name: fullName || null,
      total_points: score || 0,
      tasks_completed: tasksCompleted || 0,
      updated_at: new Date().toISOString()
    }], { onConflict: "name_key" });
    if (error) console.log("upsertStudentTotals", error);
  };
  const normalizeNameKey = (x) => (x || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ");

  const openStudentTask = (k, force = false) => {
    if (!force && dismissedTaskKeyRef.current === k) return;
    setActiveTaskKey(k);
    setTaskMsg("Do the activity now ✅");
    setOverlayOpen(true);
  };

  const openTeacherModal = (k) => {
    setActiveTaskKey(k);
    setTaskMsg("");
    setAssignIds([]);
    setModalMode("select");
    setOverlayOpen(true);
  };

  const closeTask = async (markUsed) => {
    if (!game) return;
    const key = activeTaskKey || state?.current_task;
    if (!key) return;

    let opened = [...(state?.opened || [])];
    if (markUsed) {
      if (!opened.includes(key)) opened.push(key);
    } else {
      opened = opened.filter((k) => k !== key);
    }
    await updateBoardState(game, { current_task: null, opened, phase: "board" });
    setState((s) => ({ ...(s || {}), current_task: null, opened, phase: "board" }));
    setOverlayOpen(false);
  };

  const showToAll = async () => {
    if (!game) return;
    if (!players.length) return setTaskMsg("No students joined yet.");
    setTaskMsg("Showing to all...");

    const rows = players.map((p) => ({
      game_id: game.id,
      task_key: activeTaskKey,
      player_id: p.id
    }));

    const { error } = await sb.from("task_assignments").insert(rows);
    if (error) {
      console.log(error);
      setTaskMsg("Show failed (check table/RLS).");
      return;
    }

    const opened = [...(state?.opened || [])];
    if (!opened.includes(activeTaskKey)) opened.push(activeTaskKey);
    await updateBoardState(game, { opened, current_task: activeTaskKey, phase: "task" });
    setState((s) => ({ ...(s || {}), opened, current_task: activeTaskKey, phase: "task" }));
    setModalMode("close");
    setTaskMsg("Showing to all ✅");
  };

  const assignSelected = async () => {
    if (!game) return;
    if (!players.length) return setTaskMsg("No students joined yet.");
    if (!assignIds.length) return setTaskMsg("Select at least one student.");
    if (assignIds.length > 5) return setTaskMsg("Select up to 5 students.");

    setTaskMsg("Assigning...");
    const rows = assignIds.map((pid) => ({
      game_id: game.id,
      task_key: activeTaskKey,
      player_id: pid
    }));

    const { error } = await sb.from("task_assignments").insert(rows);
    if (error) {
      console.log(error);
      setTaskMsg("Assign failed (check table/RLS).");
      return;
    }

    const opened = [...(state?.opened || [])];
    if (!opened.includes(activeTaskKey)) opened.push(activeTaskKey);
    await updateBoardState(game, { opened, current_task: activeTaskKey, phase: "task" });
    setState((s) => ({ ...(s || {}), opened, current_task: activeTaskKey, phase: "task" }));
    setModalMode("close");
    setTaskMsg("Assigned ✅");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!code) {
        setMsg("Missing game code. Re-join.");
        return;
      }

      const g = await loadGame();
      if (!g) {
        setMsg("Game not found.");
        return;
      }
      if (!alive) return;
      setGame(g);
      const s = await loadState(g);
      if (!s) {
        setMsg("Board state missing. (Create board_state row for this game.)");
        return;
      }
      setState(s);
      if (typeof s.day_column !== "number") {
        await updateBoardState(g, { day_column: 0 });
        setState((prev) => ({ ...(prev || s), day_column: 0 }));
      }
      const list = await loadPlayers(g);
      setPlayers(list);
      const cp = await loadClassProgress(g);
      setClassPoints(cp.class_points ?? 0);
      setClassGoal(cp.goal_points ?? 5000);

      if (role === "student") {
        const pid = localStorage.getItem(LS_PLAYER_ID);
        if (!pid) {
          setMsg("Missing player. Re-join.");
          return;
        }

        const { data: assigns } = await sb
          .from("task_assignments")
          .select("task_key")
          .eq("game_id", g.id)
          .eq("player_id", pid);
        const keys = Array.from(new Set((assigns || []).map((a) => a.task_key)));
        setAssignedKeys(keys);
      }
    })();
    return () => { alive = false; };
  }, [code, role]);

  useEffect(() => {
    if (!game) return;

    if (chBoardRef.current) sb.removeChannel(chBoardRef.current);
    chBoardRef.current = sb.channel(`board-${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "board_state", filter: `game_id=eq.${game.id}` }, (p) => {
        setState(p.new);
        if (role === "student") {
          if (p.new?.current_task) {
            setAssignedKeys((prev) => {
              if (prev.includes(p.new.current_task)) return prev;
              return [...prev, p.new.current_task];
            });
            if (dismissedTaskKeyRef.current !== p.new.current_task) {
              setActiveTaskKey(p.new.current_task);
              setTaskMsg("Do the activity now ✅");
              setOverlayOpen(true);
            }
          } else {
            dismissedTaskKeyRef.current = null;
            setOverlayOpen(false);
          }
        }
      })
      .subscribe();

    if (chGameRef.current) sb.removeChannel(chGameRef.current);
    chGameRef.current = sb.channel(`game-${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "games", filter: `id=eq.${game.id}` }, (p) => setGame(p.new))
      .subscribe();

    if (chPlayersRef.current) sb.removeChannel(chPlayersRef.current);
    chPlayersRef.current = sb.channel(`players-${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_id=eq.${game.id}` }, async () => {
        const list = await loadPlayers(game);
        setPlayers(list);
      })
      .subscribe();

    if (role === "student") {
      const pid = localStorage.getItem(LS_PLAYER_ID);
      if (pid) {
        if (chAssignRef.current) sb.removeChannel(chAssignRef.current);
        chAssignRef.current = sb.channel(`assign-${pid}`)
          .on("postgres_changes", { event: "INSERT", schema: "public", table: "task_assignments" }, (p) => {
            const row = p.new;
            if (!row) return;
            if (row.game_id !== game.id) return;
            if (row.player_id && row.player_id !== pid) return;
            setAssignedKeys((prev) => {
              if (prev.includes(row.task_key)) return prev;
              return [...prev, row.task_key];
            });
            setActiveTaskKey(row.task_key);
            setTaskMsg("Do the activity now ✅");
            setOverlayOpen(true);
          })
          .subscribe();
      }
    }

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const g2 = await loadGame();
        if (g2) setGame(g2);
        const s2 = await loadState(game);
        if (s2) setState(s2);
        const list = await loadPlayers(game);
        setPlayers(list);

        if (role === "student") {
          if (state?.current_task && dismissedTaskKeyRef.current !== state.current_task) {
            setActiveTaskKey(state.current_task);
            setTaskMsg("Do the activity now ✅");
            setOverlayOpen(true);
          }
          const pid = localStorage.getItem(LS_PLAYER_ID);
          if (pid) {
            try {
              const { data } = await sb
                .from("task_assignments")
                .select("id,task_key")
                .eq("game_id", game.id)
                .eq("player_id", pid)
                .order("id", { ascending: false })
                .limit(1);
              const row = data?.[0];
              if (row && row.id !== lastAssignmentIdRef.current) {
                lastAssignmentIdRef.current = row.id;
                setAssignedKeys((prev) => {
                  if (prev.includes(row.task_key)) return prev;
                  return [...prev, row.task_key];
                });
                if (dismissedTaskKeyRef.current !== row.task_key) {
                  setActiveTaskKey(row.task_key);
                  setTaskMsg("Do the activity now ✅");
                  setOverlayOpen(true);
                }
              }
            } catch {}
          }
        }
      } catch (e) {
        console.log("poll error", e);
      }
    }, 1200);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (chBoardRef.current) sb.removeChannel(chBoardRef.current);
      if (chGameRef.current) sb.removeChannel(chGameRef.current);
      if (chPlayersRef.current) sb.removeChannel(chPlayersRef.current);
      if (chAssignRef.current) sb.removeChannel(chAssignRef.current);
    };
  }, [game, role]);

  useEffect(() => {
    if (!game) return;
    const total = players.reduce((sum, p) => sum + (p.score ?? 0), 0);
    setClassPoints(total);
    if (role === "teacher") {
      syncClassProgress(game, total);
    }
  }, [players, game, role]);

  useEffect(() => {
    if (role !== "student") return;
    const pid = localStorage.getItem(LS_PLAYER_ID);
    const nameKey = localStorage.getItem(LS_STUDENT_NAME_KEY);
    const fullName = localStorage.getItem(LS_STUDENT_NAME);
    if (!pid || !nameKey) return;
    const me = players.find((p) => p.id === pid);
    if (!me) return;
    upsertStudentTotals(nameKey, fullName || me.name, me.score || 0, me.tasks_completed || 0);
  }, [players, role]);

  useEffect(() => {
    if (role !== "teacher") return;
    if (!players.length) {
      setRewardPlayerId("");
      return;
    }
    if (!rewardPlayerId || !players.some((p) => p.id === rewardPlayerId)) {
      setRewardPlayerId(players[0].id);
    }
  }, [players, role, rewardPlayerId]);

  const renderStudentProgress = () => {
    const pid = localStorage.getItem(LS_PLAYER_ID);
    const studentName = localStorage.getItem(LS_STUDENT_NAME);
    const me = players.find((p) => p.id === pid);
    const score = Math.max(0, Math.min(10000, me?.score ?? 0));
    const pct = Math.round((score / 10000) * 100);

    let level = "Seed";
    if (score >= 2000) level = "Sprout";
    if (score >= 5000) level = "Growing Plant";
    if (score >= 8000) level = "Flowering Plant";
    if (score >= 10000) level = "Full Bloom";

    return { score, pct, level, studentName: studentName || me?.name || "—" };
  };

  const { score, pct, level, studentName } = renderStudentProgress();
  const classPct = Math.min(100, Math.round((classPoints / Math.max(1, classGoal)) * 100));
  const classUnlocked = classPoints >= classGoal;

  const opened = new Set(state?.opened || []);
  const assignedSet = new Set(assignedKeys);
  const isTeacher = role === "teacher";

  const nextRound = async () => {
    if (!game) return;
    if ((game.round || 1) >= 2) {
      setMsg("This game has only 2 rounds.");
      return;
    }
    setMsg("Switching to Round 2...");
    await sb.from("games").update({ round: 2 }).eq("id", game.id);
    await sb.from("board_state").update({
      phase: "board",
      current_task: null,
      opened: [],
      day_column: 0,
      updated_at: new Date().toISOString()
    }).eq("game_id", game.id);
    setMsg("");
  };

  const rewardStudentFromSidebar = async () => {
    if (!game || !rewardPlayerId) return;
    const target = players.find((p) => p.id === rewardPlayerId);
    if (!target) return;
    const add = Number(rewardPoints) || 0;
    const nextScore = (target.score || 0) + add;
    const nextTasks = (target.tasks_completed || 0) + 1;
    const { error } = await sb
      .from("players")
      .update({ score: nextScore, tasks_completed: nextTasks })
      .eq("id", rewardPlayerId)
      .eq("game_id", game.id);
    if (error) {
      setMsg("Could not reward student.");
      return;
    }
    setPlayers((prev) => prev.map((p) => (
      p.id === rewardPlayerId ? { ...p, score: nextScore, tasks_completed: nextTasks } : p
    )));
    await upsertStudentTotals(normalizeNameKey(target.name), target.name, nextScore, nextTasks);
    setMsg(`Awarded ${add} points to ${target.name}.`);
  };

  const nextDayColumn = async () => {
    if (!game || !state) return;
    const next = Math.min(dayColumn + 1, cats.length - 1);
    if (next === dayColumn) {
      setMsg("Already at the last column for this round.");
      return;
    }
    await updateBoardState(game, { day_column: next });
    setState((s) => ({ ...(s || {}), day_column: next }));
    setMsg("");
  };

  const whoLine = isTeacher ? "Teacher View" : "Student View";
  const subTitle = (game?.status === "started")
    ? (isTeacher ? "One column per day (left to right). 500-point tiles are take-home for all students." : "Wait for your teacher to send you a challenge.")
    : "Waiting for teacher to start the game…";

  return (
    <main className="page" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
      <div className="wrap">
        <section className="boardShell">
          <div className="topLine">
            <div style={{ fontWeight: 1200 }}>{whoLine}</div>
            <div>Code: {code || "—"}</div>
          </div>
          <div className="topMeta">
            <div>{cfg.title}</div>
            <div className="muted" style={{ textAlign: "right" }}>{subTitle}</div>
          </div>
          <div className="cats">
            {cats.map((c) => <div key={c} className="cat">{c}</div>)}
          </div>
          <div className="grid">
            {VALUES.map((v) => cats.map((cat, colIdx) => {
              const k = taskKey(cat, v);
              const isOpened = opened.has(k);
              const inTodayColumn = colIdx <= dayColumn;
              const canStudentOpen = !isTeacher && assignedSet.has(k);
              const isDisabled = isTeacher ? (isOpened || !inTodayColumn) : !canStudentOpen;
              return (
                <div
                  key={`${cat}-${v}`}
                  className={`cell ${isOpened ? "opened" : ""} ${isDisabled ? "disabled" : ""}`}
                  onClick={() => {
                    if (isTeacher && !isOpened) openTeacherModal(k);
                    if (!isTeacher && assignedSet.has(k)) openStudentTask(k, true);
                  }}
                >
                  {v}
                </div>
              );
            }))}
          </div>
          <div className="muted" style={{ marginTop: 10, textAlign: "center" }}>{msg}</div>
        </section>

        <aside className="side">
          {isTeacher ? (
            <div>
              <div className="sideTitle">Players</div>
              <div className="mini">Joined: {players.length}</div>
              <div className="mini">Today Column: {dayColumn + 1} / {cats.length} ({cats[dayColumn] || "—"})</div>
              <button className="tbtn tbtnPrimary" style={{ width: "100%", marginTop: 10, display: "block" }} onClick={nextDayColumn}>Next Day (Next Column)</button>
              <button className="tbtn tbtnWarn" style={{ width: "100%", marginTop: 10, display: "block" }} onClick={nextRound}>Next Round</button>
              <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.6)", border: "1px solid rgba(0,0,0,.08)" }}>
                <div style={{ fontWeight: 1200 }}>Class Goal</div>
                <div className="mini">Earn {classGoal} points to unlock the class prize</div>
                <div className="progressBar">
                  <div className="progressFill" style={{ width: `${classPct}%` }}></div>
                </div>
                <div className="treeLabel" style={{ marginTop: 8 }}>
                  <div>{classPoints} / {classGoal}</div>
                  <div>{classUnlocked ? "Class Prize Unlocked 🎉" : "Enter‑to‑Win"}</div>
                </div>
              </div>
              <div className="list">
                {players.length === 0 && <div className="muted">No students yet.</div>}
                {players.map((p) => (
                  <div key={p.id} className="pRow">
                    <div>
                      <div>{p.name}</div>
                    </div>
                    <div>⭐ {p.score ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="sideTitle">My Seed</div>
              <div className="mini">Seed in pot: grows as points increase (full at 10,000).</div>
              <GrowthPotAnimation score={score} />
              <div className="treeLabel">
                <div>{score} / 10000</div>
                <div>{level}</div>
              </div>
              <div className="progressBar">
                <div className="progressFill" style={{ width: `${pct}%` }}></div>
              </div>
              <div className="mini" style={{ marginTop: 10 }}>Student: {studentName}</div>

              <div style={{ marginTop: 14, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.6)", border: "1px solid rgba(0,0,0,.08)" }}>
                <div style={{ fontWeight: 1200 }}>Class Goal</div>
                <div className="mini">Earn {classGoal} points to unlock the class prize</div>
                <div className="progressBar">
                  <div className="progressFill" style={{ width: `${classPct}%` }}></div>
                </div>
                <div className="treeLabel" style={{ marginTop: 8 }}>
                  <div>{classPoints} / {classGoal}</div>
                  <div>{classUnlocked ? "Class Prize Unlocked 🎉" : "Enter‑to‑Win"}</div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      {isTeacher && (
        <>
          <button
            className={`teacherMenuToggle ${teacherSidebarOpen ? "open" : ""}`}
            type="button"
            onClick={() => setTeacherSidebarOpen((v) => !v)}
          >
            {teacherSidebarOpen ? "Close Panel" : "Open Panel"}
          </button>
          <aside className={`teacherSidebar ${teacherSidebarOpen ? "open" : ""}`}>
            <div className="teacherSidebarNav">
              <button
                type="button"
                className={`teacherSidebarItem ${teacherSidebarTab === "students" ? "active" : ""}`}
                onClick={() => setTeacherSidebarTab("students")}
              >
                Student List
              </button>
              <button
                type="button"
                className={`teacherSidebarItem ${teacherSidebarTab === "reward" ? "active" : ""}`}
                onClick={() => setTeacherSidebarTab("reward")}
              >
                Reward Student
              </button>
            </div>
            <div className="teacherSidebarContent">
              {teacherSidebarTab === "students" && (
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
              {teacherSidebarTab === "reward" && (
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
                  <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={rewardStudentFromSidebar} disabled={!players.length}>
                    Award Points
                  </button>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {overlayOpen && (
        <div id="overlay">
          <div className="taskCard" role="dialog" aria-modal="true">
            <div className="taskTop">
              <div>
                <div className="taskMeta">{activeTaskKey ? `Round ${parseTaskKey(activeTaskKey).round} • ${parseTaskKey(activeTaskKey).cat} • ${parseTaskKey(activeTaskKey).value}` : "—"}</div>
                <h2 className="taskTitle">{activeTaskKey ? `${parseTaskKey(activeTaskKey).cat} — ${parseTaskKey(activeTaskKey).value} pts` : "—"}</h2>
              </div>
              <button className="tbtn tbtnGhost" onClick={() => {
                if (isTeacher && state?.current_task) closeTask(false);
                else {
                  dismissedTaskKeyRef.current = activeTaskKey;
                  setOverlayOpen(false);
                }
              }}>Close</button>
            </div>

            <div className="taskBody">{activeTaskKey ? getTaskTextByKey(activeTaskKey) : ""}</div>

            {isTeacher && modalMode === "select" && (
              <>
                {parseTaskKey(activeTaskKey || "").value !== 500 && (
                  <div className="assignHint">100-400: in-school tasks. This task will be shown to all students.</div>
                )}
                {parseTaskKey(activeTaskKey || "").value === 500 && (
                  <div className="assignHint">500-point task: take-home assignment, sent to all students.</div>
                )}
                <div className="taskBtns">
                  <button className="tbtn tbtnPrimary" onClick={showToAll}>
                    {parseTaskKey(activeTaskKey || "").value === 500 ? "Assign Take-Home to ALL" : "Show to ALL"}
                  </button>
                </div>
              </>
            )}

            {isTeacher && modalMode === "close" && (
              <div className="taskBtns">
                <button className="tbtn tbtnWarn" onClick={() => closeTask(true)}>Mark as Closed</button>
              </div>
            )}

            {!isTeacher && (
              <div className="taskBtns">
                <button className="tbtn tbtnGhost" onClick={() => {
                  dismissedTaskKeyRef.current = activeTaskKey;
                  setOverlayOpen(false);
                }}>Close</button>
              </div>
            )}

            <div className="muted" style={{ marginTop: 10 }}>{taskMsg}</div>
          </div>
        </div>
      )}
    </main>
  );
}
