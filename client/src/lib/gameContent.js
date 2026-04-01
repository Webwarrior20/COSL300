import { ROUND_CONFIG as FALLBACK_ROUND_CONFIG, TASKS as FALLBACK_TASKS } from "../assets/task";

function buildFallbackItems() {
  const rows = [];
  Object.entries(FALLBACK_TASKS).forEach(([roundKey, categories]) => {
    Object.entries(categories).forEach(([categoryName, values]) => {
      Object.entries(values).forEach(([pointValue, entry]) => {
        rows.push({
          round_number: Number(roundKey),
          round_title: FALLBACK_ROUND_CONFIG?.[roundKey]?.title || `Round ${roundKey}`,
          category_name: categoryName,
          point_value: Number(pointValue),
          fun_fact: entry.fact || "—",
          task_text: entry.task || "—",
          prize_text: entry.prize || "—"
        });
      });
    });
  });
  return rows;
}

function buildContentMaps(items) {
  const roundConfig = {};
  const taskMap = {};

  items.forEach((item) => {
    const round = Number(item.round_number) || 1;
    const category = item.category_name;
    const value = Number(item.point_value) || 100;

    if (!roundConfig[round]) {
      roundConfig[round] = {
        title: item.round_title || `Round ${round}`,
        cats: []
      };
    }
    if (!roundConfig[round].cats.includes(category)) {
      roundConfig[round].cats.push(category);
    }
    if (!taskMap[round]) taskMap[round] = {};
    if (!taskMap[round][category]) taskMap[round][category] = {};
    taskMap[round][category][value] = {
      fact: item.fun_fact || "—",
      task: item.task_text || "—",
      prize: item.prize_text || ""
    };
  });

  return { roundConfig, taskMap };
}

export async function loadPublishedGameContent(sb) {
  const setResult = await sb
    .from("game_content_sets")
    .select("id,title,subject,notes,published,created_at")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (setResult.error || !setResult.data) {
    return {
      source: "fallback",
      set: null,
      ...buildContentMaps(buildFallbackItems())
    };
  }

  const itemsResult = await sb
    .from("game_content_items")
    .select("round_number,round_title,category_name,point_value,fun_fact,task_text,prize_text,sort_order")
    .eq("set_id", setResult.data.id)
    .order("round_number", { ascending: true })
    .order("sort_order", { ascending: true });

  if (itemsResult.error || !(itemsResult.data || []).length) {
    return {
      source: "fallback",
      set: null,
      ...buildContentMaps(buildFallbackItems())
    };
  }

  return {
    source: "supabase",
    set: setResult.data,
    ...buildContentMaps(itemsResult.data)
  };
}

export function getRoundConfig(content, roundNumber) {
  return content?.roundConfig?.[roundNumber] || FALLBACK_ROUND_CONFIG[roundNumber] || FALLBACK_ROUND_CONFIG[1];
}

export function getTaskEntry(content, roundNumber, categoryName, pointValue) {
  return content?.taskMap?.[roundNumber]?.[categoryName]?.[pointValue]
    || FALLBACK_TASKS?.[roundNumber]?.[categoryName]?.[pointValue]
    || null;
}

export function getTaskTextFromEntry(entry) {
  if (!entry) return "Task placeholder (replace later).";
  const fact = entry.fact ? `Fun Fact: ${entry.fact}` : "Fun Fact: —";
  const task = entry.task ? `Task: ${entry.task}` : "Task: —";
  const sections = [fact, task];
  if (entry.prize) sections.push(`Prize: ${entry.prize}`);
  return sections.join("\n\n");
}
