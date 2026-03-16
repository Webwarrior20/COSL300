import { useEffect, useMemo, useRef, useState } from "react";
import { sb } from "../supabase";
import { VALUES, parseTaskKey } from "../assets/task";
import { getRoundConfig, getTaskEntry, getTaskTextFromEntry, loadPublishedGameContent } from "../lib/gameContent";
import GrowthPotAnimation from "../components/GrowthPotAnimation";

const LS_PLAYER_ID = "PLAYER_ID";
const LS_GAME_CODE = "GAME_CODE";
const LS_STUDENT_NAME = "STUDENT_NAME";
const LS_STUDENT_NAME_KEY = "STUDENT_NAME_KEY";
const LS_GROUPS_PREFIX = "TEACHER_GROUPS_";

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

function parseTaskSections(rawText) {
  const text = String(rawText || "");
  const factMatch = text.match(/Fun Fact:\s*([\s\S]*?)(?:\n\nTask:|$)/i);
  const taskMatch = text.match(/Task:\s*([\s\S]*?)(?:\n\nPrize:|$)/i);
  const prizeMatch = text.match(/Prize:\s*([\s\S]*?)$/i);

  return {
    fact: (factMatch?.[1] || "—").trim(),
    task: (taskMatch?.[1] || "—").trim(),
    prize: (prizeMatch?.[1] || "—").trim()
  };
}

export default function StudentPage() {
  const query = useQuery();
  const role = query.get("role") || "student";
  const isTeacher = role === "teacher";
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
  const [studentGrowthTestIndex, setStudentGrowthTestIndex] = useState(-1);
  const [teacherSidebarOpen, setTeacherSidebarOpen] = useState(false);
  const [teacherSidebarTab, setTeacherSidebarTab] = useState("students");
  const [rewardPlayerIds, setRewardPlayerIds] = useState([]);
  const [rewardPoints, setRewardPoints] = useState(300);
  const [groupName, setGroupName] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState([]);
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [contentData, setContentData] = useState(null);
  const [studentAnswerText, setStudentAnswerText] = useState("");
  const [answerBusy, setAnswerBusy] = useState(false);
  const [teacherAnswers, setTeacherAnswers] = useState([]);
  const [selectedAnswerIds, setSelectedAnswerIds] = useState([]);
  const [answerDirty, setAnswerDirty] = useState(false);

  const dismissedTaskKeyRef = useRef(null);
  const lastAssignmentIdRef = useRef(null);

  const chBoardRef = useRef(null);
  const chGameRef = useRef(null);
  const chPlayersRef = useRef(null);
  const chAssignRef = useRef(null);
  const chAnswersRef = useRef(null);
  const pollRef = useRef(null);
  const loadedAnswerTaskRef = useRef("");

  const cfg = getRoundConfig(contentData, game?.round || 1);
  const cats = cfg.cats;
  const dayColumn = Math.min(Math.max(state?.day_column ?? 0, 0), Math.max(cats.length - 1, 0));

  const taskKey = (cat, value) => `R${game?.round || 1}|${cat}|${value}`;

  const loadGame = async () => {
    const { data, error } = await sb
      .from("games")
      .select("id,code,status,round,section_name,teacher_email")
      .eq("code", code)
      .maybeSingle();
    if (error) console.log(error);
    return data || null;
  };

  const loadContent = async () => {
    const content = await loadPublishedGameContent(sb);
    setContentData(content);
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

  const syncSectionTotals = async (g, totalPoints) => {
    if (!g?.section_name) return;
    const { error } = await sb
      .from("class_totals")
      .upsert([{
        section_name: g.section_name,
        teacher_email: g.teacher_email || null,
        total_points: totalPoints,
        goal_points: classGoal || 5000,
        updated_at: new Date().toISOString()
      }], { onConflict: "section_name" });
    if (error) console.log("syncSectionTotals", error);
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

  const loadTaskAnswers = async (g) => {
    if (!g) return [];
    const { data, error } = await sb
      .from("task_answers")
      .select("id,player_id,player_name,task_key,answer_text,updated_at")
      .eq("game_id", g.id)
      .order("updated_at", { ascending: false });
    if (error) {
      console.log("loadTaskAnswers", error);
      return [];
    }
    return data || [];
  };

  const loadMyAnswerForTask = async (g, taskK) => {
    if (!g || !taskK || role !== "student") return;
    const pid = localStorage.getItem(LS_PLAYER_ID);
    if (!pid) return;
    const { data, error } = await sb
      .from("task_answers")
      .select("id,answer_text")
      .eq("game_id", g.id)
      .eq("player_id", pid)
      .eq("task_key", taskK)
      .order("id", { ascending: false })
      .limit(1);
    if (error) {
      console.log("loadMyAnswerForTask", error);
      return;
    }
    if (!answerDirty) {
      setStudentAnswerText(data?.[0]?.answer_text || "");
    }
  };

  const submitStudentAnswer = async () => {
    if (!game || !activeTaskKey) return;
    const text = studentAnswerText.trim();
    if (!text) {
      setTaskMsg("Please enter an answer first.");
      return;
    }
    const pid = localStorage.getItem(LS_PLAYER_ID);
    const pname = localStorage.getItem(LS_STUDENT_NAME) || "Student";
    if (!pid) {
      setTaskMsg("Missing student identity. Please rejoin.");
      return;
    }

    setAnswerBusy(true);
    try {
      const { data: existing, error: findErr } = await sb
        .from("task_answers")
        .select("id")
        .eq("game_id", game.id)
        .eq("player_id", pid)
        .eq("task_key", activeTaskKey)
        .order("id", { ascending: false })
        .limit(1);
      if (findErr) {
        console.log("find answer", findErr);
        setTaskMsg("Could not save answer.");
        return;
      }
      const row = {
        game_id: game.id,
        player_id: pid,
        player_name: pname,
        task_key: activeTaskKey,
        answer_text: text,
        updated_at: new Date().toISOString()
      };
      if (existing?.[0]?.id) {
        const { error: updateErr } = await sb
          .from("task_answers")
          .update(row)
          .eq("id", existing[0].id);
        if (updateErr) {
          console.log("update answer", updateErr);
          setTaskMsg("Could not update answer.");
          return;
        }
      } else {
        const { error: insertErr } = await sb.from("task_answers").insert([row]);
        if (insertErr) {
          console.log("insert answer", insertErr);
          setTaskMsg("Could not save answer.");
          return;
        }
      }
      setTaskMsg("Answer saved ✅");
      setAnswerDirty(false);
      loadedAnswerTaskRef.current = activeTaskKey;
    } finally {
      setAnswerBusy(false);
    }
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
      await loadContent();
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
      if (role === "teacher") {
        const answers = await loadTaskAnswers(g);
        setTeacherAnswers(answers);
      }

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

    if (role === "teacher") {
      if (chAnswersRef.current) sb.removeChannel(chAnswersRef.current);
      chAnswersRef.current = sb.channel(`answers-${game.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_answers", filter: `game_id=eq.${game.id}` }, async () => {
          const answers = await loadTaskAnswers(game);
          setTeacherAnswers(answers);
        })
        .subscribe();
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
        if (role === "teacher") {
          const answers = await loadTaskAnswers(game);
          setTeacherAnswers(answers);
        }

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
      if (chAnswersRef.current) sb.removeChannel(chAnswersRef.current);
    };
  }, [game, role]);

  useEffect(() => {
    if (!overlayOpen || isTeacher || !game || !activeTaskKey) return;
    const parsed = parseTaskKey(activeTaskKey);
    const value = parsed?.value || 0;
    if (![100, 200].includes(value)) return;
    if (loadedAnswerTaskRef.current === activeTaskKey && answerDirty) return;
    loadedAnswerTaskRef.current = activeTaskKey;
    setAnswerDirty(false);
    loadMyAnswerForTask(game, activeTaskKey);
  }, [overlayOpen, isTeacher, activeTaskKey, game?.id]);

  useEffect(() => {
    if (!isTeacher || teacherSidebarTab !== "answers" || !game) return;
    loadTaskAnswers(game).then(setTeacherAnswers);
  }, [isTeacher, teacherSidebarTab, game?.id]);

  useEffect(() => {
    setSelectedAnswerIds((prev) => prev.filter((id) => teacherAnswers.some((a) => a.id === id)));
  }, [teacherAnswers]);

  useEffect(() => {
    if (!game) return;
    const total = players.reduce((sum, p) => sum + (p.score ?? 0), 0);
    setClassPoints(total);
    if (role === "teacher") {
      syncClassProgress(game, total);
      syncSectionTotals(game, total);
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
      setRewardPlayerIds([]);
      return;
    }
    setRewardPlayerIds((prev) => prev.filter((id) => players.some((p) => p.id === id)));
  }, [players, role]);

  useEffect(() => {
    if (!game?.id) return;
    const raw = localStorage.getItem(`${LS_GROUPS_PREFIX}${game.id}`);
    if (!raw) {
      setTeacherGroups([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setTeacherGroups(Array.isArray(parsed) ? parsed : []);
    } catch {
      setTeacherGroups([]);
    }
  }, [game?.id]);

  useEffect(() => {
    if (!isTeacher || !game?.id) return;
    localStorage.setItem(`${LS_GROUPS_PREFIX}${game.id}`, JSON.stringify(teacherGroups));
  }, [isTeacher, game?.id, teacherGroups]);

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
  const studentPlayerId = localStorage.getItem(LS_PLAYER_ID);
  const studentGroup = !isTeacher
    ? teacherGroups.find(
        (group) =>
          group.memberIds?.includes(studentPlayerId) ||
          group.memberNames?.some((name) => String(name).trim().toLowerCase() === String(studentName).trim().toLowerCase())
      ) || null
    : null;
  const studentTestScores = [0, 2000, 5000, 8000, 10000];
  const displayStudentScore = studentGrowthTestIndex >= 0 ? studentTestScores[studentGrowthTestIndex] : score;
  const displayStudentPct = Math.round((displayStudentScore / 10000) * 100);
  const displayStudentLevel =
    displayStudentScore >= 10000 ? "Full Bloom" :
    displayStudentScore >= 8000 ? "Flowering Plant" :
    displayStudentScore >= 5000 ? "Growing Plant" :
    displayStudentScore >= 2000 ? "Sprout" : "Seed";

  const displayClassPoints = classPoints;
  const classPct = Math.min(100, Math.round((displayClassPoints / Math.max(1, classGoal)) * 100));
  const classUnlocked = displayClassPoints >= classGoal;
  const teacherAnswerRows = teacherAnswers.filter((a) => {
    const value = parseTaskKey(a.task_key)?.value;
    return value === 100 || value === 200;
  });

  const opened = new Set(state?.opened || []);
  const assignedSet = new Set(assignedKeys);

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
    setGame((g) => (g ? { ...g, round: 2 } : g));
    setState((s) => ({ ...(s || {}), phase: "board", current_task: null, opened: [], day_column: 0 }));
    setMsg("Moved to Round 2.");
  };

  const undoNextRound = async () => {
    if (!game) return;
    if ((game.round || 1) <= 1) {
      setMsg("Already at Round 1.");
      return;
    }
    const prevRound = (game.round || 1) - 1;
    setMsg(`Switching back to Round ${prevRound}...`);
    await sb.from("games").update({ round: prevRound }).eq("id", game.id);
    await sb.from("board_state").update({
      phase: "board",
      current_task: null,
      opened: [],
      day_column: 0,
      updated_at: new Date().toISOString()
    }).eq("game_id", game.id);
    setGame((g) => (g ? { ...g, round: prevRound } : g));
    setState((s) => ({ ...(s || {}), phase: "board", current_task: null, opened: [], day_column: 0 }));
    setMsg(`Moved back to Round ${prevRound}.`);
  };

  const updateSelectedStudentsScoreFromSidebar = async (delta) => {
    if (!game) return null;
    const selectedPlayers = players.filter((p) => rewardPlayerIds.includes(p.id));
    if (!selectedPlayers.length) {
      setMsg("Select at least one student.");
      return null;
    }
    const add = Number(delta) || 0;
    const rows = selectedPlayers.map((p) => ({
      id: p.id,
      score: Math.max(0, (p.score || 0) + add),
      tasks_completed: add >= 0
        ? (p.tasks_completed || 0) + 1
        : Math.max(0, (p.tasks_completed || 0) - 1)
    }));
    const results = await Promise.all(rows.map((r) => (
      sb.from("players").update({
        score: r.score,
        tasks_completed: r.tasks_completed
      }).eq("id", r.id).eq("game_id", game.id)
    )));
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      console.log("updateSelectedStudentsScoreFromSidebar", firstError);
      const details = [firstError.code, firstError.message, firstError.details].filter(Boolean).join(" — ");
      setMsg(details || "Could not update selected students.");
      return null;
    }
    setPlayers((prev) => prev.map((p) => {
      const next = rows.find((r) => r.id === p.id);
      return next ? { ...p, score: next.score, tasks_completed: next.tasks_completed } : p;
    }));
    await Promise.all(selectedPlayers.map((p) => {
      const next = rows.find((r) => r.id === p.id);
      return upsertStudentTotals(normalizeNameKey(p.name), p.name, next?.score || 0, next?.tasks_completed || 0);
    }));
    return { count: selectedPlayers.length, add };
  };

  const rewardStudentFromSidebar = async () => {
    const result = await updateSelectedStudentsScoreFromSidebar(Number(rewardPoints) || 0);
    if (result) setMsg(`Awarded ${Math.abs(result.add)} points to ${result.count} selected student(s).`);
  };

  const takeBackRewardFromSidebar = async () => {
    const result = await updateSelectedStudentsScoreFromSidebar(-(Number(rewardPoints) || 0));
    if (result) setMsg(`Took back ${Math.abs(result.add)} points from ${result.count} selected student(s).`);
  };

  const toggleRewardStudent = (playerId) => {
    setRewardPlayerIds((prev) => (
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    ));
  };

  const toggleSelectedAnswer = (answerId) => {
    setSelectedAnswerIds((prev) => (
      prev.includes(answerId) ? prev.filter((id) => id !== answerId) : [...prev, answerId]
    ));
  };

  const awardSelectedAnswers = async () => {
    if (!game) return;
    const selected = teacherAnswers.filter((a) => selectedAnswerIds.includes(a.id));
    if (!selected.length) {
      setMsg("Select at least one answer to reward.");
      return;
    }
    const rewardMap = new Map();
    selected.forEach((a) => {
      const parsed = parseTaskKey(a.task_key);
      const value = parsed?.value;
      if (![100, 200].includes(value)) return;
      const playerKey = String(a.player_id);
      const current = rewardMap.get(playerKey) || { points: 0, taskCount: 0 };
      rewardMap.set(playerKey, {
        points: current.points + value,
        taskCount: current.taskCount + 1
      });
    });
    if (!rewardMap.size) {
      setMsg("Selected answers are not 100/200 tasks.");
      return;
    }

    const rows = players
      .filter((p) => rewardMap.has(String(p.id)))
      .map((p) => {
        const reward = rewardMap.get(String(p.id));
        return {
        id: p.id,
        game_id: game.id,
        score: Math.max(0, (p.score || 0) + (reward?.points || 0)),
        tasks_completed: (p.tasks_completed || 0) + (reward?.taskCount || 0)
      };
      });
    if (!rows.length) {
      setMsg("Could not match selected answers to joined students.");
      return;
    }
    const results = await Promise.all(rows.map((r) => (
      sb.from("players")
        .update({ score: r.score, tasks_completed: r.tasks_completed })
        .eq("id", r.id)
        .eq("game_id", game.id)
    )));
    const firstError = results.find((r) => r.error)?.error;
    if (firstError) {
      console.log("awardSelectedAnswers", firstError);
      const details = [firstError.code, firstError.message, firstError.details].filter(Boolean).join(" — ");
      setMsg(details || "Could not reward selected answers.");
      return;
    }
    setPlayers((prev) => prev.map((p) => {
      const next = rows.find((r) => r.id === p.id);
      return next ? { ...p, score: next.score, tasks_completed: next.tasks_completed } : p;
    }));
    await Promise.all(rows.map((r) => {
      const p = players.find((x) => x.id === r.id);
      return upsertStudentTotals(normalizeNameKey(p?.name || ""), p?.name || "", r.score, r.tasks_completed);
    }));
    setSelectedAnswerIds([]);
    setMsg("Awarded points to students with selected correct answers.");
  };

  const toggleGroupMember = (playerId) => {
    setGroupMemberIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= 5) return prev;
      return [...prev, playerId];
    });
  };

  const createGroup = () => {
    const selected = players.filter((p) => groupMemberIds.includes(p.id));
    if (selected.length < 2 || selected.length > 5) {
      setMsg("Select between 2 and 5 students to create a group.");
      return;
    }
    const cleanName = groupName.trim() || `Group ${teacherGroups.length + 1}`;
    const newGroup = {
      id: `${Date.now()}`,
      name: cleanName,
      memberIds: selected.map((p) => p.id),
      memberNames: selected.map((p) => p.name)
    };
    setTeacherGroups((prev) => [...prev, newGroup]);
    setGroupName("");
    setGroupMemberIds([]);
    setMsg(`Created group "${cleanName}" with ${selected.length} students.`);
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

  const undoDayColumn = async () => {
    if (!game || !state) return;
    const prev = Math.max(dayColumn - 1, 0);
    if (prev === dayColumn) {
      setMsg("Already at Day 1.");
      return;
    }
    await updateBoardState(game, { day_column: prev });
    setState((s) => ({ ...(s || {}), day_column: prev }));
    setMsg("Moved back one day.");
  };

  const whoLine = isTeacher ? "Teacher View" : "Student View";
  const subTitle = (game?.status === "started")
    ? (isTeacher ? "One column per day (left to right). 500-point tiles are take-home for all students." : "Wait for your teacher to send you a challenge.")
    : "Waiting for teacher to start the game…";
  const activeTaskValue = activeTaskKey ? parseTaskKey(activeTaskKey).value : 0;
  const activeTaskParts = activeTaskKey ? parseTaskKey(activeTaskKey) : null;
  const activeTaskEntry = activeTaskParts
    ? getTaskEntry(contentData, activeTaskParts.round, activeTaskParts.cat, activeTaskParts.value)
    : null;
  const taskSections = parseTaskSections(getTaskTextFromEntry(activeTaskEntry));

  return (
    <main className="page gamePage" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
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
              const inTodayColumn = colIdx === dayColumn;
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
              <div className="mini">Round: {game?.round || 1}</div>
              <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.6)", border: "1px solid rgba(0,0,0,.08)" }}>
                <div style={{ fontWeight: 1200 }}>Class Goal</div>
                <div className="mini">Earn {classGoal} points to unlock the class prize</div>
                <div className="progressBar">
                  <div className="progressFill" style={{ width: `${classPct}%` }}></div>
                </div>
                <div className="treeLabel" style={{ marginTop: 8 }}>
                  <div>{displayClassPoints} / {classGoal}</div>
                  <div>{classUnlocked ? "Class Prize Unlocked 🎉" : "Enter‑to‑Win"}</div>
                </div>
              </div>
              <div className="list">
                {players.length === 0 && <div className="muted">No students yet.</div>}
                {players.map((p) => (
                  <div key={p.id} className="pRow">
                    <div>{p.name}</div>
                    <div>⭐ {p.score ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="sideTitle">My Seed</div>
              <div className="mini">Seed in pot: grows as points increase (full at 10,000).</div>
              <GrowthPotAnimation score={displayStudentScore} studentKey={studentName} />
              <div className="treeLabel">
                <div>{displayStudentScore} / 10000</div>
                <div>{displayStudentLevel}</div>
              </div>
              <div className="progressBar">
                <div className="progressFill" style={{ width: `${displayStudentPct}%` }}></div>
              </div>
              <div className="mini" style={{ marginTop: 10 }}>Student: {studentName}</div>
              <div style={{ marginTop: 12, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.6)", border: "1px solid rgba(0,0,0,.08)" }}>
                <div style={{ fontWeight: 1200 }}>My Group</div>
                {studentGroup ? (
                  <>
                    <div className="mini" style={{ marginTop: 4 }}>{studentGroup.name}</div>
                    <div className="mini" style={{ marginTop: 6 }}>
                      {studentGroup.memberNames?.join(", ")}
                    </div>
                  </>
                ) : (
                  <div className="mini" style={{ marginTop: 4 }}>You are not in a group yet.</div>
                )}
              </div>

              <div style={{ marginTop: 14, padding: 10, borderRadius: 14, background: "rgba(255,255,255,.6)", border: "1px solid rgba(0,0,0,.08)" }}>
                <div style={{ fontWeight: 1200 }}>Class Goal</div>
                <div className="mini">Earn {classGoal} points to unlock the class prize</div>
                <div className="progressBar">
                  <div className="progressFill" style={{ width: `${classPct}%` }}></div>
                </div>
                <div className="treeLabel" style={{ marginTop: 8 }}>
                  <div>{displayClassPoints} / {classGoal}</div>
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
                className={`teacherSidebarItem ${teacherSidebarTab === "game" ? "active" : ""}`}
                onClick={() => setTeacherSidebarTab("game")}
              >
                Game Controls
              </button>
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
              <button
                type="button"
                className={`teacherSidebarItem ${teacherSidebarTab === "groups" ? "active" : ""}`}
                onClick={() => setTeacherSidebarTab("groups")}
              >
                Groups (2-5)
              </button>
              <button
                type="button"
                className={`teacherSidebarItem ${teacherSidebarTab === "answers" ? "active" : ""}`}
                onClick={() => setTeacherSidebarTab("answers")}
              >
                Student Answers
              </button>
            </div>
            <div className="teacherSidebarContent">
              {teacherSidebarTab === "game" && (
                <div>
                  <div className="sideTitle">Game Controls</div>
                  <div className="mini">Today Column: {dayColumn + 1} / {cats.length} ({cats[dayColumn] || "—"})</div>
                  <button className="tbtn tbtnPrimary" style={{ width: "100%", marginTop: 10, display: "block" }} onClick={nextDayColumn}>Next Day (Next Column)</button>
                  <button className="tbtn tbtnGhost" style={{ width: "100%", marginTop: 8, display: "block" }} onClick={undoDayColumn}>Undo Day (Previous Column)</button>
                  <button className="tbtn tbtnWarn" style={{ width: "100%", marginTop: 10, display: "block" }} onClick={nextRound}>Next Round</button>
                  <button className="tbtn tbtnGhost" style={{ width: "100%", marginTop: 8, display: "block" }} onClick={undoNextRound}>Undo Next Round</button>
                </div>
              )}
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
                    <span>Select Students (multiple)</span>
                    <div className="list" style={{ maxHeight: 220, marginTop: 8 }}>
                      {players.map((p) => (
                        <label key={p.id} className="pRow" style={{ cursor: "pointer" }}>
                          <div>{p.name}</div>
                          <input
                            type="checkbox"
                            checked={rewardPlayerIds.includes(p.id)}
                            onChange={() => toggleRewardStudent(p.id)}
                          />
                        </label>
                      ))}
                      {players.length === 0 && <div className="mini">No students yet.</div>}
                    </div>
                  </label>
                  <label className="field">
                    <span>Points</span>
                    <select
                      value={rewardPoints}
                      onChange={(e) => setRewardPoints(Number(e.target.value))}
                      className="assignSelect"
                      style={{ minHeight: "unset", marginTop: 4 }}
                    >
                      {[300, 400, 500].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </label>
                  <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={rewardStudentFromSidebar} disabled={!rewardPlayerIds.length}>
                    Award Points
                  </button>
                  <button className="btn btn-ghost" style={{ width: "100%", marginTop: 8 }} onClick={takeBackRewardFromSidebar} disabled={!rewardPlayerIds.length}>
                    Take Back Award
                  </button>
                </div>
              )}
              {teacherSidebarTab === "groups" && (
                <div>
                  <div className="sideTitle">Create Group (2-5)</div>
                  <label className="field" style={{ marginTop: 8 }}>
                    <span>Group Name</span>
                    <input
                      className="input"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g., Team Maple"
                    />
                  </label>
                  <div className="mini" style={{ marginTop: 6 }}>Select between 2 and 5 students</div>
                  <div className="list" style={{ maxHeight: 240, marginTop: 8 }}>
                    {players.map((p) => (
                      <label key={p.id} className="pRow" style={{ cursor: "pointer" }}>
                        <div>{p.name}</div>
                        <input
                          type="checkbox"
                          checked={groupMemberIds.includes(p.id)}
                          onChange={() => toggleGroupMember(p.id)}
                        />
                      </label>
                    ))}
                    {players.length === 0 && <div className="mini">No students yet.</div>}
                  </div>
                  <button className="btn btn-primary" style={{ width: "100%", marginTop: 8 }} onClick={createGroup}>
                    Create Group
                  </button>

                  <div className="mini" style={{ marginTop: 10, fontWeight: 1200 }}>Saved Groups</div>
                  <div className="list" style={{ maxHeight: 220, marginTop: 6 }}>
                    {teacherGroups.map((g) => (
                      <div key={g.id} className="pill">
                        <div style={{ fontWeight: 1200 }}>{g.name}</div>
                        <div className="pillMini">{g.memberNames.join(", ")}</div>
                      </div>
                    ))}
                    {teacherGroups.length === 0 && <div className="mini">No groups created yet.</div>}
                  </div>
                </div>
              )}
              {teacherSidebarTab === "answers" && (
                <div>
                  <div className="sideTitle">Student Answers (100/200)</div>
                  <div className="mini">Latest submitted answers from students.</div>
                  <div className="row" style={{ justifyContent: "flex-start", marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={awardSelectedAnswers} disabled={!selectedAnswerIds.length}>
                      Reward Selected Correct Answers
                    </button>
                  </div>
                  <div className="list" style={{ maxHeight: 380, marginTop: 10 }}>
                    {teacherAnswerRows.length === 0 && <div className="mini">No answers submitted yet.</div>}
                    {teacherAnswerRows.map((a) => {
                      const parts = parseTaskKey(a.task_key);
                      const label = parts ? `${parts.cat} ${parts.value}` : a.task_key;
                      return (
                        <label key={a.id} className="pRow" style={{ display: "block", cursor: "pointer" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                            <div style={{ fontWeight: 1100 }}>{a.player_name || "Student"} • {label}</div>
                            <input
                              type="checkbox"
                              checked={selectedAnswerIds.includes(a.id)}
                              onChange={() => toggleSelectedAnswer(a.id)}
                            />
                          </div>
                          <div className="mini" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{a.answer_text || "—"}</div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {overlayOpen && (
        <div id="overlay">
          <div className="taskCard taskCardGame" role="dialog" aria-modal="true">
            <div className="taskTop">
              <div>
                <div className="taskMeta">{activeTaskKey ? `Round ${parseTaskKey(activeTaskKey).round} • ${parseTaskKey(activeTaskKey).cat} • ${parseTaskKey(activeTaskKey).value}` : "—"}</div>
                <h2 className="taskTitle">{activeTaskKey ? `${parseTaskKey(activeTaskKey).cat} — ${parseTaskKey(activeTaskKey).value} pts` : "—"}</h2>
              </div>
              <button className="taskCloseBtn" onClick={() => {
                if (isTeacher && state?.current_task) closeTask(false);
                else {
                  dismissedTaskKeyRef.current = activeTaskKey;
                  setOverlayOpen(false);
                }
              }}>✕</button>
            </div>

            <div className="taskSectionCard">
              <div className="taskSectionTitle">Fun Fact</div>
              <div className="taskBody">{taskSections.fact}</div>
            </div>

            <div className="taskSectionCard">
              <div className="taskSectionTitle">Task</div>
              <div className="taskBody">{taskSections.task}</div>
            </div>

            <div className="taskPrizePanel">
              <div className="taskPrizeIcon">🏆</div>
              <div>
                <div className="taskPrizeLabel">Prize</div>
                <div className="taskPrizeText">{taskSections.prize}</div>
                <div className="taskPrizePoints">{activeTaskValue || "—"} Points</div>
              </div>
            </div>

            {isTeacher && modalMode === "select" && (
              <>
                {activeTaskValue !== 500 && (
                  <div className="assignHint">100-400: in-school tasks. This task will be shown to all students.</div>
                )}
                {activeTaskValue === 500 && (
                  <div className="assignHint">500-point task: take-home assignment, sent to all students.</div>
                )}
                <div className="taskBtns">
                  <button className="tbtn tbtnPrimary" onClick={showToAll}>
                    {activeTaskValue === 500 ? "Assign Take-Home to ALL" : "Show to ALL"}
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
              <>
                {[100, 200].includes(activeTaskValue) && (
                  <div className="taskSectionCard" style={{ marginTop: 10 }}>
                    <div className="taskSectionTitle">Your Answer</div>
                    <textarea
                      className="assignSelect"
                      style={{ minHeight: 96 }}
                      value={studentAnswerText}
                      onChange={(e) => {
                        setStudentAnswerText(e.target.value);
                        setAnswerDirty(true);
                      }}
                      placeholder="Type your answer here..."
                    />
                    <div className="taskBtns" style={{ marginTop: 10 }}>
                      <button className="tbtn tbtnPrimary" onClick={submitStudentAnswer} disabled={answerBusy}>
                        {answerBusy ? "Saving..." : "Submit Answer"}
                      </button>
                    </div>
                  </div>
                )}
                <div className="taskBtns">
                  <button className="tbtn tbtnGhost" onClick={() => {
                    dismissedTaskKeyRef.current = activeTaskKey;
                    setOverlayOpen(false);
                  }}>Close</button>
                </div>
              </>
            )}

            <div className="muted" style={{ marginTop: 10 }}>{taskMsg}</div>
          </div>
        </div>
      )}
    </main>
  );
}
