import { describe, expect, it, vi } from "vitest";
import { buildWorkspaceAnalytics } from "./routers";

const fixedNow = new Date("2026-05-07T15:00:00.000Z");

function task(overrides: Record<string, unknown>) {
  return {
    id: 1,
    userId: 1,
    projectId: 10,
    title: "Task",
    description: null,
    status: "todo",
    priority: "medium",
    dueDate: null,
    tags: [],
    position: 0,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    completedAt: null,
    ...overrides,
  } as never;
}

function project(overrides: Record<string, unknown>) {
  return {
    id: 10,
    userId: 1,
    name: "Launch Plan",
    color: "#6366f1",
    description: null,
    createdAt: fixedNow,
    updatedAt: fixedNow,
    totalTasks: 3,
    doneTasks: 2,
    ...overrides,
  } as never;
}

describe("buildWorkspaceAnalytics", () => {
  it("calculates dashboard stats, upcoming deadlines, and project progress", () => {
    vi.setSystemTime(fixedNow);
    const tasks = [
      task({ id: 1, status: "done", priority: "urgent", dueDate: fixedNow.getTime(), completedAt: fixedNow }),
      task({ id: 2, status: "todo", priority: "high", dueDate: fixedNow.getTime() + 86_400_000 }),
      task({ id: 3, status: "review", priority: "low", dueDate: fixedNow.getTime() - 86_400_000 }),
    ];

    const result = buildWorkspaceAnalytics(tasks, [project({})]);

    expect(result.stats.total).toBe(3);
    expect(result.stats.completed).toBe(1);
    expect(result.stats.active).toBe(2);
    expect(result.stats.overdue).toBe(1);
    expect(result.stats.completionRate).toBe(33);
    expect(result.upcoming.map(item => item.id)).toEqual([2]);
    expect(result.projectProgress[0]).toMatchObject({ name: "Launch Plan", progress: 67 });
    expect(result.byPriority.find(item => item.priority === "urgent")?.count).toBe(1);
  });
});
