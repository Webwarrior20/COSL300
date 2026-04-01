import JSZip from "jszip";

function byLocalName(node, name) {
  return Array.from(node.childNodes || []).filter((child) => child.nodeType === 1 && child.localName === name);
}

function descendantText(node) {
  return Array.from(node.getElementsByTagName("w:t")).map((n) => n.textContent || "").join("").trim();
}

function paragraphTexts(cell) {
  return byLocalName(cell, "p")
    .map((p) => descendantText(p))
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function extractSection(text, labels, nextLabels) {
  const startRegex = new RegExp(`(?:^|\\n)(?:${labels.join("|")}):?\\s*`, "i");
  const start = text.search(startRegex);
  if (start === -1) return "";
  const rest = text.slice(start).replace(startRegex, "");
  const endRegex = nextLabels.length
    ? new RegExp(`(?:\\n|^)(?:${nextLabels.join("|")}):?\\s*`, "i")
    : null;
  const end = endRegex ? rest.search(endRegex) : -1;
  return (end === -1 ? rest : rest.slice(0, end)).replace(/\s+/g, " ").trim();
}

function parseCell(lines, fallbackValue) {
  const joined = lines.join("\n");
  const numeric = joined.match(/(^|\n)\s*([1-5]00)\b/);
  const pointValue = Number(numeric?.[2] || fallbackValue || 100);
  const fact = extractSection(joined, ["Fun Fact", "Fun fact", "Fact"], ["Task", "Tasks", "Prize"]);
  const task = extractSection(joined, ["Task", "Tasks"], ["Prize"]);
  const prize = extractSection(joined, ["Prize"], []);
  return {
    pointValue,
    funFact: fact || "—",
    taskText: task || "—",
    prizeText: prize || ""
  };
}

export async function parseDocxGamePlan(file) {
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("Could not read DOCX document.xml.");

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const body = doc.getElementsByTagName("w:body")[0];
  if (!body) throw new Error("Invalid DOCX body.");

  const rounds = [];
  let pendingTitle = "";

  for (const child of Array.from(body.childNodes || [])) {
    if (child.nodeType !== 1) continue;

    if (child.localName === "p") {
      const text = descendantText(child).replace(/\s+/g, " ").trim();
      if (text) pendingTitle = text;
      continue;
    }

    if (child.localName !== "tbl") continue;

    const rows = byLocalName(child, "tr");
    if (!rows.length) continue;

    const headerCells = byLocalName(rows[0], "tc");
    const categories = headerCells.map((cell) => paragraphTexts(cell).join(" ").trim()).filter(Boolean);
    if (!categories.length) continue;

    const roundNumber = rounds.length + 1;
    const roundTitle = pendingTitle || `Round ${roundNumber}`;
    const items = [];

    rows.slice(1).forEach((row, rowIndex) => {
      const cells = byLocalName(row, "tc");
      cells.forEach((cell, colIndex) => {
        const categoryName = categories[colIndex];
        if (!categoryName) return;
        const lines = paragraphTexts(cell);
        if (!lines.length) return;
        const parsed = parseCell(lines, [100, 200, 300, 400, 500][rowIndex] || 100);
        items.push({
          roundNumber,
          roundTitle,
          categoryName,
          pointValue: parsed.pointValue,
          funFact: parsed.funFact,
          taskText: parsed.taskText,
          prizeText: parsed.prizeText,
          sortOrder: rowIndex * 10 + colIndex
        });
      });
    });

    if (items.length) {
      rounds.push({
        roundNumber,
        roundTitle,
        categories,
        items
      });
    }
  }

  if (!rounds.length) throw new Error("No round tables were found in the DOCX file.");
  return rounds;
}
