import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GrowthPotAnimation from "../components/GrowthPotAnimation";

describe("GrowthPotAnimation", () => {
  it("stays a seed below 500 points and becomes a sprout at 500", () => {
    const { rerender } = render(<GrowthPotAnimation score={499} studentKey="student-1" />);

    expect(screen.getByText("Seed in pot")).toBeInTheDocument();

    rerender(<GrowthPotAnimation score={500} studentKey="student-1" />);

    expect(screen.getByText("Sprout")).toBeInTheDocument();
  });
});
