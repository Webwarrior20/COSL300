import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GrowthPotAnimation from "../components/GrowthPotAnimation";

describe("GrowthPotAnimation", () => {
  it("stays a seed below 200 points and becomes a sprout at 200", () => {
    const { rerender } = render(<GrowthPotAnimation score={199} studentKey="student-1" />);

    expect(screen.getByText("Seed in pot")).toBeInTheDocument();

    rerender(<GrowthPotAnimation score={200} studentKey="student-1" />);

    expect(screen.getByText("Sprout")).toBeInTheDocument();
  });
});
