import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentPage from "../pages/StudentPage";

const { taskAnswerInsert, sbMock } = vi.hoisted(() => {
  const taskAnswerInsert = vi.fn(async () => ({ error: null }));

  const sbMock = {
    from: vi.fn(),
    channel: vi.fn(() => {
      const channel = {
        on: vi.fn(() => channel),
        subscribe: vi.fn(() => channel)
      };
      return channel;
    }),
    removeChannel: vi.fn(),
    auth: {
      signOut: vi.fn(async () => ({}))
    }
  };

  return { taskAnswerInsert, sbMock };
});

const mockContent = {
  roundConfig: {
    1: {
      title: "Round 1 - Test",
      cats: ["Nutrition"]
    }
  },
  taskMap: {
    1: {
      Nutrition: {
        100: {
          fact: "Fact 100",
          task: "Task 100",
          prize: ""
        },
        200: {
          fact: "Fact 200",
          task: "Task 200",
          prize: ""
        }
      }
    }
  }
};

vi.mock("../lib/gameContent", () => ({
  loadPublishedGameContent: vi.fn(async () => mockContent),
  getRoundConfig: vi.fn((content, roundNumber) => content?.roundConfig?.[roundNumber] || { title: "Round", cats: [] }),
  getTaskEntry: vi.fn((content, roundNumber, categoryName, pointValue) => (
    content?.taskMap?.[roundNumber]?.[categoryName]?.[pointValue] || null
  )),
  getTaskTextFromEntry: vi.fn((entry) => {
    if (!entry) return "";
    return [`Fun Fact: ${entry.fact}`, `Task: ${entry.task}`, entry.prize ? `Prize: ${entry.prize}` : ""]
      .filter(Boolean)
      .join("\n\n");
  })
}));

function makeChain(table) {
  const state = {
    filters: []
  };

  const result = () => {
    if (table === "games") {
      return {
        data: {
          id: "game-1",
          code: "123456",
          status: "started",
          round: 1,
          section_name: "Grade 4A",
          teacher_email: "teacher@example.com"
        },
        error: null
      };
    }

    if (table === "board_state") {
      return {
        data: {
          game_id: "game-1",
          phase: "board",
          current_task: null,
          opened: [],
          day_column: 0
        },
        error: null
      };
    }

    if (table === "players") {
      return {
        data: [
          { id: "player-1", name: "Test Student", score: 0, tasks_completed: 0, joined_at: "2026-04-02T12:00:00Z" },
          { id: "player-2", name: "Other Student", score: 0, tasks_completed: 0, joined_at: "2026-04-02T12:01:00Z" }
        ],
        error: null
      };
    }

    if (table === "class_progress") {
      return {
        data: {
          class_points: 0,
          goal_points: 25000
        },
        error: null
      };
    }

    if (table === "task_assignments") {
      return {
        data: [
          { task_key: "R1|Nutrition|100" }
        ],
        error: null
      };
    }

    if (table === "task_answers") {
      return {
        data: [],
        error: null
      };
    }

    return { data: [], error: null };
  };

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn((column, value) => {
      state.filters.push([column, value]);
      return chain;
    }),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => result()),
    maybeSingle: vi.fn(async () => result()),
    single: vi.fn(async () => result()),
    insert: vi.fn(async (rows) => {
      if (table === "task_answers") {
        return taskAnswerInsert(rows);
      }
      return { error: null, data: rows };
    }),
    update: vi.fn(async () => ({ error: null })),
    upsert: vi.fn(async () => ({ error: null })),
    then: (resolve, reject) => Promise.resolve(result()).then(resolve, reject)
  };

  return chain;
}

vi.mock("../supabase", () => ({
  sb: sbMock
}));

describe("StudentPage", () => {
  beforeEach(() => {
    taskAnswerInsert.mockClear();
    sbMock.from.mockImplementation((table) => makeChain(table));
    window.history.pushState({}, "", "/game?code=123456&role=teacher");
    vi.stubGlobal("setInterval", vi.fn(() => 1));
    vi.stubGlobal("clearInterval", vi.fn());
  });

  it("shows the reward panel controls with 100/200/300/400/500, do all, deselect, and 25000 class goal", async () => {
    render(<StudentPage />);

    await screen.findByText("Reward points & manage game");

    fireEvent.click(screen.getByText("Reward points & manage game"));
    fireEvent.click(await screen.findByRole("button", { name: "Reward Student" }));

    expect(screen.getByText("Do All")).toBeInTheDocument();
    expect(screen.getByText("Deselect")).toBeInTheDocument();
    expect(screen.getByText(/Earn 25000 points to unlock the class prize/i)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "100" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "200" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "300 (Group Activity)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "400 (Collaboration)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "500" })).toBeInTheDocument();
  });

  it("submits a student answer for a 100-point task", async () => {
    window.history.pushState({}, "", "/game?code=123456&role=student");
    localStorage.setItem("PLAYER_ID", "player-1");
    localStorage.setItem("GAME_CODE", "123456");
    localStorage.setItem("STUDENT_NAME", "Test Student");
    localStorage.setItem("STUDENT_NAME_KEY", "test student");

    render(<StudentPage />);

    const cell100 = await screen.findByText("100");
    fireEvent.click(cell100);

    const answerBox = await screen.findByPlaceholderText("Type your answer here...");
    fireEvent.change(answerBox, { target: { value: "Bananas" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Answer" }));

    await waitFor(() => {
      expect(taskAnswerInsert).toHaveBeenCalledTimes(1);
    });

    expect(taskAnswerInsert.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        game_id: "game-1",
        player_id: "player-1",
        player_name: "Test Student",
        task_key: "R1|Nutrition|100",
        answer_text: "Bananas"
      })
    ]);

    expect(await screen.findByText("Answer saved ✅")).toBeInTheDocument();
  });
});
