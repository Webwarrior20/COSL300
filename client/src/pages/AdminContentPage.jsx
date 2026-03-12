import { useEffect, useState } from "react";
import { sb } from "../supabase";
import { parseDocxGamePlan } from "../lib/docxImport";

const BUCKET = "game-content";

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminContentPage() {
  const [userEmail, setUserEmail] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [subject, setSubject] = useState("Physical Education & Health and Wellness");
  const [subjectMode, setSubjectMode] = useState("preset");
  const [customSubject, setCustomSubject] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [parsedRounds, setParsedRounds] = useState([]);
  const [importedSets, setImportedSets] = useState([]);
  const [importing, setImporting] = useState(false);

  const loadFiles = async () => {
    const { data, error } = await sb.storage.from(BUCKET).list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" }
    });
    if (error) {
      setMsg(`Could not read bucket '${BUCKET}'. Create it in Supabase Storage first.`);
      return;
    }
    setFiles(data || []);
  };

  const loadImportedSets = async () => {
    const { data, error } = await sb
      .from("game_content_sets")
      .select("id,title,subject,notes,published,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      setMsg("Could not read game_content_sets. Run the SQL schema first.");
      return;
    }
    setImportedSets(data || []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await sb.auth.getSession();
      const user = data?.session?.user;
      if (!user) {
        window.location.href = "/admin-login";
        return;
      }
      if (!active) return;
      setUserEmail(user.email || "Admin");
      await loadFiles();
      await loadImportedSets();
    })();
    return () => {
      active = false;
    };
  }, []);

  const uploadFile = async () => {
    if (!file) {
      setMsg("Choose a DOCX file first.");
      return;
    }

    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext !== "docx") {
      setMsg("Automatic import currently supports DOCX only.");
      return;
    }

    setUploading(true);
    setMsg("Uploading and parsing game content...");
    const chosenSubject = subjectMode === "custom" ? customSubject.trim() : subject.trim();
    if (!chosenSubject) {
      setUploading(false);
      setMsg("Please choose or enter a subject.");
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${Date.now()}-${safeName}`;

    const { error } = await sb.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

    setUploading(false);

    if (error) {
      setMsg(error.message || `Upload failed. Check bucket '${BUCKET}' and storage policies.`);
      return;
    }

    let rounds;
    try {
      rounds = await parseDocxGamePlan(file);
      setParsedRounds(rounds);
    } catch (parseError) {
      setMsg(parseError.message || "Upload succeeded, but parsing failed.");
      await loadFiles();
      return;
    }

    setImporting(true);
    const setInsert = await sb
      .from("game_content_sets")
      .insert([{
        title: title.trim() || file.name,
        subject: chosenSubject,
        notes: notes.trim() || null,
        source_file_path: path,
        uploaded_by: userEmail || null,
        published: true
      }])
      .select("id")
      .single();

    if (setInsert.error || !setInsert.data) {
      setImporting(false);
      setMsg("Upload succeeded, but saving to game_content_sets failed. Run the SQL schema first.");
      await loadFiles();
      return;
    }

    const setId = setInsert.data.id;
    const rows = rounds.flatMap((round) => round.items.map((item) => ({
      set_id: setId,
      round_number: item.roundNumber,
      round_title: item.roundTitle,
      category_name: item.categoryName,
      point_value: item.pointValue,
      fun_fact: item.funFact,
      task_text: item.taskText,
      prize_text: item.prizeText,
      sort_order: item.sortOrder
    })));

    const itemInsert = await sb.from("game_content_items").insert(rows);
    setImporting(false);

    if (itemInsert.error) {
      setMsg("Set was created, but saving task rows failed. Check game_content_items schema.");
      await loadFiles();
      await loadImportedSets();
      return;
    }

    setTitle("");
    setNotes("");
    setFile(null);
    const input = document.getElementById("admin-content-file");
    if (input) input.value = "";
    await loadFiles();
    await loadImportedSets();
    setMsg(`Game content uploaded and imported successfully (${rows.length} tasks across ${rounds.length} rounds).`);
  };

  const logout = async () => {
    try {
      await sb.auth.signOut();
    } catch {}
    window.location.href = "/";
  };

  return (
    <main className="page">
      <section className="card adminUploadCard">
        <div className="adminUploadTop">
          <div>
            <div className="lobby-label">Admin Content Upload</div>
            <div className="lobby-email">{userEmail}</div>
          </div>
          <div className="row" style={{ marginTop: 0 }}>
            <button className="btn btn-ghost" onClick={() => { window.location.href = "/admin"; }}>Teacher Lobby</button>
            <button className="btn btn-ghost" onClick={logout}>LOG OUT</button>
          </div>
        </div>

        <h1 className="headline adminHeadline">
          <span className="accent">Upload Game Content</span>
        </h1>
        <p className="subhead">
          Upload the master DOCX in the approved game-plan format. This page stores the file, parses the rounds, and publishes the imported content for the teacher board.
        </p>

        <div className="adminUploadGrid">
          <div className="adminUploadPanel">
            <label className="field">
              <span>Subject</span>
              <select
                className="assignSelect"
                style={{ minHeight: "unset" }}
                value={subjectMode === "custom" ? "__custom__" : subject}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setSubjectMode("custom");
                  } else {
                    setSubjectMode("preset");
                    setSubject(e.target.value);
                  }
                }}
              >
                <option value="Physical Education & Health and Wellness">Physical Education & Health and Wellness</option>
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Language Arts">Language Arts</option>
                <option value="Social Studies">Social Studies</option>
                <option value="__custom__">Other (custom)</option>
              </select>
            </label>
            {subjectMode === "custom" && (
              <label className="field">
                <span>Custom Subject</span>
                <input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Enter subject name"
                />
              </label>
            )}
            <label className="field">
              <span>Document Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., WIN Game Plans - Round Set 1" />
            </label>
            <label className="field">
              <span>Notes</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional admin note" />
            </label>
            <label className="field">
              <span>Upload DOCX</span>
              <input id="admin-content-file" type="file" accept=".docx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <div className="miniHint">Expected format: round heading, category headers, 100-500 values, and sections for Fun Fact, Task, and Prize.</div>
            <div className="msg">{msg}</div>
            <div className="row" style={{ justifyContent: "flex-start" }}>
              <button className="btn btn-primary" onClick={uploadFile} disabled={uploading || importing}>
                {uploading || importing ? "PROCESSING..." : "UPLOAD + IMPORT"}
              </button>
            </div>
            {parsedRounds.length > 0 && (
              <div className="mini" style={{ marginTop: 10 }}>
                Parsed preview: {parsedRounds.map((round) => `${round.roundTitle} (${round.items.length} tasks)`).join(" • ")}
              </div>
            )}
          </div>

          <div className="adminUploadPanel">
            <div className="sideTitle">Uploaded Files</div>
            <div className="mini">Bucket: {BUCKET}</div>
            <div className="list" style={{ maxHeight: 340, marginTop: 10 }}>
              {files.length === 0 && <div className="mini">No files uploaded yet.</div>}
              {files.map((item) => (
                <div key={item.name} className="pRow">
                  <div>
                    <div style={{ fontWeight: 1000 }}>{item.name}</div>
                    <div className="mini">{formatBytes(item.metadata?.size || item.metadata?.contentLength || 0)}</div>
                  </div>
                  <div className="mini">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</div>
                </div>
              ))}
            </div>
            <div className="sideTitle" style={{ marginTop: 16 }}>Imported Content Sets</div>
            <div className="list" style={{ maxHeight: 220, marginTop: 10 }}>
              {importedSets.length === 0 && <div className="mini">No imported sets yet.</div>}
              {importedSets.map((item) => (
                <div key={item.id} className="pRow">
                  <div>
                    <div style={{ fontWeight: 1000 }}>{item.title}</div>
                    <div className="mini">{item.subject || "General"}</div>
                    <div className="mini">{item.notes || "No notes"}</div>
                  </div>
                  <div className="mini">{item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
