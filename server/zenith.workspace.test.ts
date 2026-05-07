import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMock = vi.hoisted(() => ({
  ensureStarterData: vi.fn(),
  listTasks: vi.fn(),
  listProjects: vi.fn(),
  listActivity: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock("./db", () => dbMock);

const { appRouter } = await import("./routers");

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 42,
    openId: "zenith-test-user",
    email: "zenith@example.com",
    name: "Zenith Tester",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-01T00:00:00.000Z"),
    lastSignedIn: new Date("2026-05-01T00:00:00.000Z"),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("workspace procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.ensureStarterData.mockResolvedValue(undefined);
    dbMock.listTasks.mockResolvedValue([]);
    dbMock.listProjects.mockResolvedValue([]);
    dbMock.listActivity.mockResolvedValue([]);
  });

  it("creates projects for the authenticated Manus user", async () => {
    const created = { id: 7, userId: 42, name: "Launch Plan", color: "#6366f1", description: "Roadmap", totalTasks: 0, doneTasks: 0 };
    dbMock.createProject.mockResolvedValue(created);

    const caller = appRouter.createCaller(createContext());
    const result = await caller.workspace.createProject({ name: "Launch Plan", color: "#6366f1", description: "Roadmap" });

    expect(result).toBe(created);
    expect(dbMock.createProject).toHaveBeenCalledWith(42, { name: "Launch Plan", color: "#6366f1", description: "Roadmap" });
  });

  it("creates, completes, and deletes tasks through user-scoped procedures", async () => {
    const createdTask = {
      id: 11,
      userId: 42,
      title: "Design command center",
      description: "Refine the dashboard surface",
      status: "todo",
      priority: "high",
      dueDate: 1778112000000,
      tags: ["design", "dashboard"],
      projectId: 7,
      position: 0,
      createdAt: new Date("2026-05-07T10:00:00.000Z"),
      updatedAt: new Date("2026-05-07T10:00:00.000Z"),
      completedAt: null,
    };
    dbMock.createTask.mockResolvedValue(createdTask);
    dbMock.updateTask.mockResolvedValue({ ...createdTask, status: "done", completedAt: new Date("2026-05-07T11:00:00.000Z") });
    dbMock.deleteTask.mockResolvedValue({ success: true });

    const caller = appRouter.createCaller(createContext());
    const saved = await caller.workspace.createTask({
      title: "Design command center",
      description: "Refine the dashboard surface",
      status: "todo",
      priority: "high",
      dueDate: 1778112000000,
      tags: ["design", "dashboard"],
      projectId: 7,
    });
    const completed = await caller.workspace.updateTask({ id: 11, status: "done" });
    const deleted = await caller.workspace.deleteTask({ id: 11 });

    expect(saved).toBe(createdTask);
    expect(completed.status).toBe("done");
    expect(deleted).toEqual({ success: true });
    expect(dbMock.createTask).toHaveBeenCalledWith(42, expect.objectContaining({ title: "Design command center", tags: ["design", "dashboard"] }));
    expect(dbMock.updateTask).toHaveBeenCalledWith(42, expect.objectContaining({ id: 11, status: "done" }));
    expect(dbMock.deleteTask).toHaveBeenCalledWith(42, 11);
  });
});
