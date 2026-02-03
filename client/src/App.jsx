import { useEffect, useMemo, useRef, useState } from "react";
import { sb } from "./supabase";

const LS_PLAYER_ID = "PLAYER_ID";
const LS_GAME_CODE = "GAME_CODE";
const LS_STUDENT_ID = "STUDENT_ID";
const LS_GAME_ID = "ACTIVE_GAME_ID";

const VALUES = [100, 200, 300, 400, 500];

const ROUND_CONFIG = {
  1: {
    title: "Round 1 — Physical Education & Health • Wellness",
    cats: ["Nutrition", "Exercise", "Kindness", "Mindfulness", "Goals or Smart Choices"]
  },
  2: {
    title: "Round 2 — Science",
    cats: ["Waste management", "Energy", "Earth/Nature", "Body", "Space"]
  }
};

const TASKS = {
  1: {
    "Nutrition": {
      100: {
        fact: "About 20% of the energy from food is used up by the brain (yes, even when you're just sitting and not doing anything).",
        task: "Name one healthy food you ate today.",
        prize: "Soil for the seed"
      },
      200: {
        fact: "The color of the fruit or vegetable you are eating actually provides a unique blend of nutrients to your body.",
        task: "Name 3 different coloured fruits or vegetables and what their potential benefits could be.",
        prize: "Water for the seed"
      },
      300: {
        fact: "70–80% of your body is made up of water.",
        task: "Drink 7–8 cups of water today (1.8–2 litres).",
        prize: "Water for the seed"
      },
      400: {
        fact: "Canada’s Food Guide encourages eating whole foods more often than processed foods.",
        task: "Pack or draw a balanced lunch using at least 1 vegetable or fruit, 1 protein, 1 whole grain by tomorrow.",
        prize: "Silicone reusable ziplock bag or compostable resealable bag for lunch"
      },
      500: {
        fact: "High sugary foods cause energy crashes, but balanced meals give long-lasting energy.",
        task: "Design a meal plan for any 1 day this week (breakfast, lunch, or snack).",
        prize: "Cooking class / baking class / Lunchables (Sponsor ideas: local grocery stores, farmers’ markets, community health centres)"
      }
    },
    "Exercise": {
      100: {
        fact: "Moving your body helps your heart get stronger.",
        task: "Do 10 jumping jacks.",
        prize: "Soil for the seed"
      },
      200: {
        fact: "Exercise can help you feel happier and less stressed.",
        task: "Name one way exercise helps your mood.",
        prize: "Water for the seed"
      },
      300: {
        fact: "Kids should get about 60 minutes of movement every day.",
        task: "List 3 different ways you can be active (not all sports).",
        prize: "Water for the seed"
      },
      400: {
        fact: "Different exercises help different muscles.",
        task: "Create a 5-minute workout using 1 cardio move, 1 strength move, 1 stretch.",
        prize: "Jump ropes / mini yoga mats"
      },
      500: {
        fact: "Being active as a kid helps build strong bones for life.",
        task: "Do a 5-minute workout (exercises of your choice).",
        prize: "Class trip to a recreation center or climbing gym (Sponsor ideas: Jump360, Launchpad, Clip 'n Climb, Activate, Oxygen Yoga)"
      }
    },
    "Kindness": {
      100: {
        fact: "Kindness in physical education means being a good teammate. When we use kind words, listen to others and help each other, everyone feels safe and included.",
        task: "Talk to a confused student and say a kind thing to help them.",
        prize: "Sticker"
      },
      200: {
        fact: "Kindness can be part of a team’s strategy. When teammates take turns sharing ideas, respect different choices, and support each other, teams can create better plans.",
        task: "Play It Out: Choose one kind action (play safely, take turns, or give space) while playing. Answer: How did your kind choice help the game?",
        prize: "Clothing for the seed"
      },
      300: {
        fact: "Consent means accepting and respecting the answer that you get. Respecting consent makes people feel safe and included.",
        task: "Practice Consent: Ask to borrow a classmate’s belongings. If they say yes, you may use it. If they ask you to stop, you must stop and respect their choice.",
        prize: "Handsanitizer / toothbrush kit"
      },
      400: {
        fact: "Great teams don’t just play—they plan. Kindness helps teams share ideas, give helpful feedback, and notice each other’s strengths.",
        task: "Everyday Teamwork Challenge: Notice one strength in another student and show kindness by letting them take a matching role OR giving a short compliment.",
        prize: "3D printed trophy"
      },
      500: {
        fact: "Responsibility is making safe and wise choices for yourself and others. Responsible actions help keep everyone safe.",
        task: "Clean for Safety: Pick up toys/objects from your bedroom floor so no one trips. Finish by sweeping or vacuuming.",
        prize: "Sponsored tote bag"
      }
    },
    "Mindfulness": {
      100: {
        fact: "In many First Nations, Métis, and Inuit communities, special gatherings and ceremonies help people make peace, rebuild relationships, and restore balance.",
        task: "Do calm breathing 10x! It helps restore balance in your body!",
        prize: "Sticker"
      },
      200: {
        fact: "Your feelings and confidence can change as you grow — and that’s totally normal!",
        task: "Say one change that can happen as kids grow up and give ONE example (self-image, self-confidence, body image, emotions, relationships, social skills).",
        prize: "Stress ball / fidget toy"
      },
      300: {
        fact: "Bullying isn’t just about the bully and the person being bullied. Bystanders have power too.",
        task: "Tell a guardian one thing you learned about bullying. Share ONE safe action they can take. Draw or write ONE way to make school kinder.",
        prize: "Friendship bracelet kit"
      },
      400: {
        fact: "We grow in many ways — in our feelings, thinking, and spirit — by listening to others, sharing ideas, and speaking our first language with people we trust.",
        task: "Have a calm talk with someone you trust. Listen without interrupting, then share one thought or feeling. Draw or write how it helped you feel connected or confident. Get their signature as proof.",
        prize: "Notebook"
      },
      500: {
        fact: "As kids grow, their bodies can sweat more—and sweat itself doesn’t smell! Smell happens when bacteria mix with sweat.",
        task: "For one week, notice how your body changes during the day (sweating, smells, or feeling dirty). Track when you shower, change clothes, or use deodorant, then explain how these habits help you feel clean and confident.",
        prize: "Cruelty-free soap & bath bomb"
      }
    },
    "Goals or Smart Choices": {
      100: {
        fact: "Your brain can send tiny messages to other parts of your body in less than a second.",
        task: "Think of 3 things in your house that do not need to be plugged in all the time.",
        prize: "Soil for the seed"
      },
      200: {
        fact: "Goals do not happen in one big jump, they happen in small steps but your brain celebrates all the small wins.",
        task: "Think of something you want to get better at and list 3 things you can do that will help you get best.",
        prize: "Water for the seed"
      },
      300: {
        fact: "It is important to know the difference between wants and needs. Wants are things you would like to have but can live without. Needs are things you must have to live and stay healthy.",
        task: "Select whether the objects are wants or needs (see table above in sustainability).",
        prize: "Soil for the seed"
      },
      400: {
        fact: "Many of the food we eat comes in a single use package that we just throw out right after eating the food. These plastics can take hundreds of years to break down.",
        task: "For tomorrow, try to pack a well balanced meal and bring things that are not in a single use plastic.",
        prize: "TBD"
      },
      500: {
        fact: "Responsibility is making safe and wise choices for yourself and others.",
        task: "Make a list of 5 different exercises you can do and do the list every day for a week.\n\nGroup Task: As a class, take a walk outside and see all the different types of trees and make note of all the different animals or bugs you may see.",
        prize: "Dance/Zumba instructor visit; Group Prize: TBD"
      }
    }
  },
  2: {
    "Waste management": {
      100: {
        fact: "Waste is anything we throw away that we no longer use. Some stuff can still become useful, like egg shells for compost.",
        task: "What is waste? Brainstorm how to manage waste.",
        prize: "Soil for the seed"
      },
      200: {
        fact: "A simple tape or glue can patch something up and make it usable again.",
        task: "Think of 3 ways how you can repair a broken item.",
        prize: "Sunlight for the seed"
      },
      300: {
        fact: "Reusing and repurposing helps reduce waste that goes to our landfills.",
        task: "Bring old notebooks that were barely used and repurpose into a journal or a diary.",
        prize: "Lip balm / reusable utensil"
      },
      400: {
        fact: "Food waste in Edmonton goes to the EWMC where it becomes renewable energy and nutrient-rich fertilizer.",
        task: "Create your own compost bin using a plastic bottle and cut it in half.",
        prize: "Trip to the garden"
      },
      500: {
        fact: "All our waste is taken to the landfill, where staff and machines sort it to separate non-recyclables, recyclables, and food scraps.",
        task: "In a group, create a poster and develop a personal plan to reduce waste over the weekend.",
        prize: "Trip to the Ecostation (Sponsor ideas: EWMC, City of Edmonton)"
      }
    },
    "Energy": {
      100: {
        fact: "Energy makes things move, light up, or heat up.",
        task: "Name one thing that uses energy in your classroom.",
        prize: "Soil for the seed"
      },
      200: {
        fact: "The Sun is a huge source of energy for Earth (Solar Energy).",
        task: "Name 3 things that use energy from the Sun.",
        prize: "Sunlight for the seed"
      },
      300: {
        fact: "Energy can come from renewable and nonrenewable sources.",
        task: "Sort these into renewable or non-renewable energy: Wind, coal, water, oil, gasoline, fossil fuels, solar.",
        prize: "Water for the seed"
      },
      400: {
        fact: "Turning off lights and unplugging unused appliances saves energy and money.",
        task: "List 3 ways your school could save energy or do a task today at home to save energy.",
        prize: "Small solar-powered gadgets"
      },
      500: {
        fact: "Renewable energy helps protect the planet.",
        task: "List 10 harmful side effects of non-renewable energy sources.",
        prize: "Trip to a renewable energy centre or science museum (Sponsor ideas: local energy companies, environmental groups)"
      }
    },
    "Earth/Nature": {
      100: {
        fact: "Earth is the only planet we know for sure has life.",
        task: "Name a specific piece of landscape only found in Alberta.",
        prize: "Soil for the seed"
      },
      200: {
        fact: "Plants make oxygen that we need to breathe, using water, sunlight and soil.",
        task: "Name two ways plants help humans.",
        prize: "Water for the seed"
      },
      300: {
        fact: "Littering can harm animals and their habitats.",
        task: "Pick up 3 pieces of garbage today at recess.",
        prize: "Water for the seed"
      },
      400: {
        fact: "Recycling helps reduce waste in landfills and in the oceans.",
        task: "Recycle something or do not use single use plastics today.\n\nGroup Task: Trees clean the air you need to give your body oxygen. Do 10 box breaths (in 5, hold 5, out 5, hold 5).",
        prize: "Reusable water bottle or wooden toothbrush; Group Prize: Oxygen yoga"
      },
      500: {
        fact: "Small actions by many people can protect the Earth and reduce waste.",
        task: "Fill up 1 bag of garbage, 1 bag of recycling, 1 bag of compost as a class over this week.",
        prize: "Field trip to a nature centre or provincial park (Sponsor ideas: city waste programs)"
      }
    },
    "Body": {
      100: {
        fact: "Your body pumps blood around to give your body energy. Healthier foods give your body more energy!",
        task: "Create a healthy breakfast, snack, and lunch you could eat.",
        prize: "Soil for the seed"
      },
      200: {
        fact: "There are many activities that are healthy for your body other than running or lifting weights.",
        task: "List 5 different activities you can do that will help your body grow strong.",
        prize: "Play a game of freeze dance!"
      },
      300: {
        fact: "Animals all move in different ways because their bodies are shaped differently.",
        task: "Try moving like a frog, bear, and crab!",
        prize: "TBD"
      },
      400: {
        fact: "Not only does moving your body keep your body healthy, it keeps your brain happy and boosts your mood.",
        task: "Make a list of 5 different exercises you can do and do the list every day for a week.",
        prize: "Have a dance/zumba instructor come in to teach a fun class"
      },
      500: {
        fact: "As kids grow, their bodies can sweat more—and sweat itself doesn’t smell! The smell happens when bacteria mix with sweat.",
        task: "For one week, notice how your body changes during the day. Track when you shower, change clothes, or use deodorant, then explain how these habits help you feel clean, confident, and ready to learn.",
        prize: "Cruelty-free soap & bath bomb"
      }
    },
    "Space": {
      100: {
        fact: "Constellations are a collection of stars that form patterns in the night sky. Our ancestors used them to navigate before maps and GPS.",
        task: "Look at the night sky and create your own pattern using your imagination and creativity.",
        prize: "Soil for the seed"
      },
      200: {
        fact: "The sun gives off UV rays that can hurt our skin with too much exposure.",
        task: "Wear sunscreen to school.",
        prize: "Beeswax wrap"
      },
      300: {
        fact: "The moon helps control the tides in the ocean using gravity.",
        task: "List three ways to protect our ocean from pollution.",
        prize: "Reusable water bottle"
      },
      400: {
        fact: "Astronauts recycle almost everything on the space station – including their urine – using a purification system.",
        task: "Create a plan on how to make your school supplies last for an extended period of time.",
        prize: "Watch a video of how astronauts live on the space station"
      },
      500: {
        fact: "The solar system is made up of the sun and eight planets that move around it. Earth is the only planet we know that has life.",
        task: "In a group, identify the planets and draw them in order based on their distance from the sun.",
        prize: "Trip to the planetarium / TELUS World of Science (Sponsor ideas: TELUS World)"
      }
    }
  }
};

function useQuery() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => {
      if (data?.session?.user) window.location.href = "/admin";
    });
  }, []);

  const login = async () => {
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
    window.location.href = "/admin";
  };

  const signup = async () => {
    if (!email || !password) return setMsg("Enter email + password.");
    setMsg("Signing up...");
    const { error } = await sb.auth.signUp({ email, password });
    if (error) return setMsg(error.message || "Signup failed.");
    setMsg("Account created ✅ Now LOGIN (or confirm email if required).");
  };

  return (
    <main className="page">
      <section className="card" style={{ textAlign: "center" }}>
        <div className="logo-bubble"><div className="logo-emoji">🟩</div></div>
        <h1 className="headline" style={{ marginBottom: 10 }}>
          Classroom <span className="accent">Win Squares</span>
        </h1>
        <p className="subhead">
          Teacher hosts the game. Students join with a <b>code</b> and complete challenges to win squares.
        </p>
        <div className="actions">
          <button className="big-btn big-btn-admin" style={{ width: "100%" }} onClick={() => { setMsg(""); setShowModal(true); }}>
            <span className="btn-icon">🧑‍🏫</span> Teacher Login / Signup
          </button>
        </div>
        <div className="pill">✨ After login, you will get a game code to share with students.</div>
      </section>

      {showModal && (
        <div className="modal">
          <div className="modal-card">
            <h2>Teacher Login</h2>
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@email.com" autoComplete="email" />
            </label>
            <label className="field">
              <span>Password</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" autoComplete="current-password" />
            </label>
            <p className="msg">{msg}</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary" onClick={login}>LOGIN</button>
              <button className="btn btn-ghost" onClick={signup}>SIGN UP</button>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function JoinPage() {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
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
  const normStudentId = (x) => (x || "").trim().replace(/\s+/g, "");

  const getGameByCode = async (gameCode) => {
    const { data, error } = await sb
      .from("games")
      .select("id,code,status,round")
      .eq("code", gameCode)
      .maybeSingle();
    if (error) console.log("getGameByCode", error);
    return data || null;
  };

  const findExistingPlayer = async (gameId, sid) => {
    const { data, error } = await sb
      .from("players")
      .select("id,name,student_id")
      .eq("game_id", gameId)
      .eq("student_id", sid)
      .maybeSingle();
    if (error) console.log("findExistingPlayer", error);
    return data || null;
  };

  const createPlayer = async (gameId, playerName, sid) => {
    const { data, error } = await sb
      .from("players")
      .insert([{
        game_id: gameId,
        name: playerName,
        student_id: sid,
        score: 0,
        tasks_completed: 0,
        joined_at: new Date().toISOString()
      }])
      .select("id,student_id")
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

    const n = (name || "").trim();
    const sid = normStudentId(studentId);
    const c = normCode(code);

    if (!n) return setMsg("Enter your name.");
    if (!sid) return setMsg("Enter your Student ID.");
    if (c.length !== 6) return setMsg("Enter a 6-digit game code.");

    setDisabled(true);
    setMsg("Joining...");

    const game = await getGameByCode(c);
    if (!game) {
      setDisabled(false);
      return setMsg("Game not found. Check the code.");
    }

    let player = await findExistingPlayer(game.id, sid);
    if (!player) {
      player = await createPlayer(game.id, n, sid);
      if (!player) {
        setDisabled(false);
        return setMsg("Could not join (table/RLS/columns).");
      }
    } else {
      await updateNameIfNeeded(player.id, n);
    }

    localStorage.setItem(LS_PLAYER_ID, player.id);
    localStorage.setItem(LS_GAME_CODE, c);
    localStorage.setItem(LS_STUDENT_ID, sid);

    if (game.status === "started") return goStudentView(c);

    setMsg("");
    setWaiting(true);
    await subscribeToStart(game.id, c);
  };

  return (
    <main className="page">
      <section className="joinCard">
        <div className="bigTitle">Join Win Squares</div>
        <p className="sub">Enter your name, student ID, and the code your teacher gives you.</p>

        <label className="field" style={{ textAlign: "left" }}>
          <span>Your Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="e.g., Aanya" autoComplete="name" />
        </label>

        <label className="field" style={{ textAlign: "left" }}>
          <span>Student ID</span>
          <input value={studentId} onChange={(e) => setStudentId(e.target.value)} type="text" inputMode="numeric" placeholder="e.g., 123456" autoComplete="off" />
          <div className="miniHint">This links your points to your student number.</div>
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

function AdminPage() {
  const [teacherEmail, setTeacherEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [joinLink, setJoinLink] = useState("");
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);
  const channelRef = useRef(null);

  const buildJoinUrl = async () => {
    try {
      const r = await fetch("/api/ip", { cache: "no-store" });
      const j = await r.json();
      const proto = window.location.protocol || "http:";
      const port = j.port || window.location.port || 8080;
      return `${proto}//${j.ip}:${port}/join`;
    } catch {
      return window.location.origin + "/join";
    }
  };

  const loadPlayers = async (g) => {
    if (!g) return [];
    const { data, error } = await sb
      .from("players")
      .select("id,name,student_id,score,tasks_completed,joined_at")
      .eq("game_id", g.id)
      .order("joined_at", { ascending: true });
    if (error) console.log("LOAD PLAYERS ERROR:", error);
    return data || [];
  };

  const refreshLobby = async (g) => {
    const list = await loadPlayers(g);
    setPlayers(list);
  };

  const getGameById = async (id) => {
    const { data, error } = await sb
      .from("games")
      .select("id,code,status,round,created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    return data || null;
  };

  const createNewGame = async () => {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const { data: g, error } = await sb
      .from("games")
      .insert([{ code, status: "lobby", round: 1 }])
      .select("id,code,status,round")
      .single();
    if (error || !g) {
      console.log("CREATE GAME ERROR:", error);
      setMsg("Could not create game. Check Supabase tables/RLS.");
      return null;
    }

    await sb.from("board_state").upsert([{
      game_id: g.id,
      phase: "board",
      current_task: null,
      opened: []
    }]);
    return g;
  };

  const ensureLobbyGame = async () => {
    setMsg("Preparing game…");
    const savedId = localStorage.getItem(LS_GAME_ID);
    let g = null;
    if (savedId) {
      const existing = await getGameById(savedId);
      if (existing && existing.status === "lobby") g = existing;
      else localStorage.removeItem(LS_GAME_ID);
    }
    if (!g) {
      const fresh = await createNewGame();
      if (!fresh) return;
      g = fresh;
      localStorage.setItem(LS_GAME_ID, g.id);
    }
    setGame(g);
    await refreshLobby(g);
    setMsg("Share the join link + code with students.");
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await sb.auth.getSession();
      const user = data?.session?.user;
      if (!user) {
        window.location.href = "/";
        return;
      }
      if (!alive) return;
      setTeacherEmail(user.email || "Teacher");
      const url = await buildJoinUrl();
      setJoinLink(url);
      await ensureLobbyGame();
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!game) return;

    if (channelRef.current) sb.removeChannel(channelRef.current);
    channelRef.current = sb.channel(`lobby-${game.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `game_id=eq.${game.id}` }, () => refreshLobby(game))
      .subscribe();

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => refreshLobby(game), 1200);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (channelRef.current) sb.removeChannel(channelRef.current);
    };
  }, [game]);

  const startGame = async () => {
    if (!game) return;
    setMsg("Starting game…");
    const { data: updated, error } = await sb
      .from("games")
      .update({ status: "started" })
      .eq("id", game.id)
      .select("id,status,code")
      .maybeSingle();

    if (error || updated?.status !== "started") {
      console.log("START UPDATE FAILED:", error);
      setMsg("❌ Could not start game (permissions/RLS).");
      return;
    }
    localStorage.removeItem(LS_GAME_ID);
    window.location.href = `/game?code=${encodeURIComponent(game.code)}&role=teacher`;
  };

  const logout = async () => {
    try { await sb.auth.signOut(); } catch {}
    window.location.href = "/";
  };

  const sorted = [...players].sort((a, b) =>
    (b.tasks_completed ?? 0) - (a.tasks_completed ?? 0) ||
    (b.score ?? 0) - (a.score ?? 0)
  );

  return (
    <main className="page">
      <section className="card" style={{ textAlign: "center", background: "rgba(130, 190, 160, .58)", borderRadius: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap", textAlign: "left" }}>
          <div>
            <div style={{ opacity: 0.8, fontWeight: 900, color: "#21351e" }}>Teacher</div>
            <div style={{ fontWeight: 1200, color: "#21351e" }}>{teacherEmail}</div>
            <div style={{ background: "rgba(255,255,255,.28)", borderRadius: 18, padding: 12, marginTop: 10 }}>
              <div className="mini"><span className="pill">Share this join link with students</span></div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                <input value={joinLink} readOnly style={{ flex: 1, minWidth: 280, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(0,0,0,.12)", background: "rgba(255,255,255,.78)", fontWeight: 900, color: "#1b2f1a" }} />
                <button className="btn btn-ghost" onClick={async () => {
                  try { await navigator.clipboard.writeText(joinLink); setMsg("Join link copied ✅"); } catch { setMsg("Copy failed — select the link and copy manually."); }
                }}>COPY</button>
                <a className="btn btn-ghost" href={joinLink} target="_blank" rel="noopener">OPEN</a>
              </div>
              <div className="mini" style={{ marginTop: 8 }}>Students enter their name + the 6-digit game code.</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={logout}>LOG OUT</button>
        </div>

        <div style={{ fontSize: 54, fontWeight: 1200, margin: "10px 0 6px", color: "#294023" }}>Win Squares Lobby</div>
        <div style={{ fontSize: 30, fontWeight: 1100, margin: "0 0 12px", color: "#294023" }}>
          Game Code: {game?.code || "———"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div style={{ background: "rgba(255,255,255,.25)", borderRadius: 18, padding: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 1200 }}>Students Joined: {players.length}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
              {players.length === 0 && <div className="muted" style={{ gridColumn: "1/-1", textAlign: "center" }}>No students joined yet</div>}
              {players.map((p) => (
                <div key={p.id} style={{ borderRadius: 999, padding: "10px 14px", background: "rgba(16,185,129,.55)", fontWeight: 1100, color: "#0b1b12" }}>
                  {p.name}{p.student_id ? ` (${p.student_id})` : ""}
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,.25)", borderRadius: 18, padding: 12, textAlign: "left" }}>
            <div style={{ fontWeight: 1200 }}>Live Leaderboard</div>
            <div className="mini">Sorted by Tasks Completed → Score</div>
            {sorted.length === 0 && <div className="muted" style={{ marginTop: 8 }}>No data yet.</div>}
            {sorted.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 10px", borderRadius: 14, background: "rgba(255,255,255,.22)", marginTop: 8, fontWeight: 1000 }}>
                <div>{p.name}</div><div>⭐ {p.score ?? 0}</div>
              </div>
            ))}
          </div>
        </div>

        <button className="big-btn big-btn-admin" style={{ marginTop: 16 }} disabled={!game || loading} onClick={startGame}>START GAME</button>
        <p className="muted" style={{ marginTop: 12 }}>{msg}</p>
      </section>
    </main>
  );
}

function GamePage() {
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

  const dismissedTaskKeyRef = useRef(null);
  const lastAssignmentIdRef = useRef(null);

  const chBoardRef = useRef(null);
  const chGameRef = useRef(null);
  const chPlayersRef = useRef(null);
  const chAssignRef = useRef(null);
  const pollRef = useRef(null);

  const cfg = game ? (ROUND_CONFIG[game.round] || ROUND_CONFIG[1]) : ROUND_CONFIG[1];
  const cats = cfg.cats;

  const taskKey = (cat, value) => `R${game?.round || 1}|${cat}|${value}`;
  const parseKey = (k) => {
    const [r, cat, v] = String(k).split("|");
    return { round: Number(r?.replace("R", "")) || 1, cat, value: Number(v) || 100 };
  };
  const getTaskText = (k) => {
    const { round, cat, value } = parseKey(k);
    const entry = TASKS?.[round]?.[cat]?.[value];
    if (!entry) return "Task placeholder (replace later).";
    const fact = entry.fact ? `Fun Fact: ${entry.fact}` : "Fun Fact: —";
    const task = entry.task ? `Task: ${entry.task}` : "Task: —";
    const prize = entry.prize ? `Prize: ${entry.prize}` : "Prize: —";
    return `${fact}\n\n${task}\n\n${prize}`;
  };

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
      .select("id,name,student_id,score,joined_at")
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
      const list = await loadPlayers(g);
      setPlayers(list);

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
        const keys = Array.from(new Set((assigns || []).map(a => a.task_key)));
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

  const renderStudentProgress = () => {
    const pid = localStorage.getItem(LS_PLAYER_ID);
    const studentId = localStorage.getItem(LS_STUDENT_ID);
    const me = players.find((p) => p.id === pid);
    const score = Math.max(0, Math.min(10000, me?.score ?? 0));
    const pct = Math.round((score / 10000) * 100);

    let level = "Seed";
    let emoji = "🌱";
    let scale = 0.7;
    if (score >= 2000) { level = "Sprout"; emoji = "🌿"; scale = 0.9; }
    if (score >= 5000) { level = "Sapling"; emoji = "🌳"; scale = 1.05; }
    if (score >= 8000) { level = "Tree"; emoji = "🌳"; scale = 1.2; }
    if (score >= 10000) { level = "Full Tree"; emoji = "🌳"; scale = 1.35; }

    return { score, pct, level, emoji, scale, studentId };
  };

  const { score, pct, level, emoji, scale, studentId } = renderStudentProgress();

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
      updated_at: new Date().toISOString()
    }).eq("game_id", game.id);
    setMsg("");
  };

  const whoLine = isTeacher ? "Teacher View" : "Student View";
  const subTitle = (game?.status === "started")
    ? (isTeacher ? "Click a tile → Show to ALL or Assign to selected." : "Wait for your teacher to send you a challenge.")
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
            {VALUES.map((v) => cats.map((cat) => {
              const k = taskKey(cat, v);
              const isOpened = opened.has(k);
              const canStudentOpen = !isTeacher && assignedSet.has(k);
              const isDisabled = isTeacher ? isOpened : !canStudentOpen;
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
              <button className="tbtn tbtnWarn" style={{ width: "100%", marginTop: 10, display: "block" }} onClick={nextRound}>Next Round</button>
              <div className="list">
                {players.length === 0 && <div className="muted">No students yet.</div>}
                {players.map((p) => (
                  <div key={p.id} className="pRow">
                    <div>
                      <div>{p.name}</div>
                      <div className="pillMini">ID: {p.student_id || "—"}</div>
                    </div>
                    <div>⭐ {p.score ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="sideTitle">My Seed</div>
              <div className="mini">Grows as you earn points (full at 10,000).</div>
              <div className="treeBox">
                <div className="treeStage" style={{ transform: `translateX(-50%) scale(${scale})` }}>
                  <span className="seedSprite">{emoji}</span>
                </div>
                <div className="ground"></div>
              </div>
              <div className="treeLabel">
                <div>{score} / 10000</div>
                <div>{level}</div>
              </div>
              <div className="progressBar">
                <div className="progressFill" style={{ width: `${pct}%` }}></div>
              </div>
              <div className="mini" style={{ marginTop: 10 }}>Student ID: {studentId || "—"}</div>
            </div>
          )}
        </aside>
      </div>

      {overlayOpen && (
        <div id="overlay">
          <div className="taskCard" role="dialog" aria-modal="true">
            <div className="taskTop">
              <div>
                <div className="taskMeta">{activeTaskKey ? `Round ${parseKey(activeTaskKey).round} • ${parseKey(activeTaskKey).cat} • ${parseKey(activeTaskKey).value}` : "—"}</div>
                <h2 className="taskTitle">{activeTaskKey ? `${parseKey(activeTaskKey).cat} — ${parseKey(activeTaskKey).value} pts` : "—"}</h2>
              </div>
              <button className="tbtn tbtnGhost" onClick={() => {
                if (isTeacher && state?.current_task) closeTask(false);
                else {
                  dismissedTaskKeyRef.current = activeTaskKey;
                  setOverlayOpen(false);
                }
              }}>Close</button>
            </div>

            <div className="taskBody">{activeTaskKey ? getTaskText(activeTaskKey) : ""}</div>

            {isTeacher && modalMode === "select" && (
              <>
                <select
                  className="assignSelect"
                  multiple
                  value={assignIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    if (selected.length > 5) return;
                    setAssignIds(selected);
                  }}
                >
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (ID: {p.student_id || "—"})</option>
                  ))}
                </select>
                <div className="assignHint">Select up to 5 students.</div>
                <div className="taskBtns">
                  <button className="tbtn tbtnPrimary" onClick={showToAll}>Show to ALL</button>
                  <button className="tbtn tbtnPrimary" onClick={assignSelected}>Assign to Selected</button>
                  <button className="tbtn tbtnGhost" onClick={() => setOverlayOpen(false)}>Close</button>
                </div>
              </>
            )}

            {isTeacher && modalMode === "close" && (
              <div className="taskBtns">
                <button className="tbtn tbtnWarn" onClick={() => closeTask(true)}>Close (mark used)</button>
                <button className="tbtn tbtnGhost" onClick={() => closeTask(false)}>Close (do NOT mark used)</button>
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

export default function App() {
  const path = window.location.pathname;
  if (path === "/join") return <JoinPage />;
  if (path === "/admin") return <AdminPage />;
  if (path === "/game") return <GamePage />;
  return <HomePage />;
}
