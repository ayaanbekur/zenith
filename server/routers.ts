import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const statusSchema = z.enum(["todo", "in-progress", "review", "done"]);
const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);

const taskInput = z.object({
  id: z.number().optional(),
  title: z.string().min(1).max(220),
  description: z.string().optional().nullable(),
  status: statusSchema.default("todo"),
  priority: prioritySchema.default("medium"),
  dueDate: z.number().nullable().optional(),
  tags: z.array(z.string()).default([]),
  projectId: z.number().nullable().optional(),
  position: z.number().optional(),
});

const projectInput = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(140),
  color: z.string().min(4).max(32).default("#6366f1"),
  description: z.string().optional().nullable(),
});

function startOfDay(ts: number) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function buildWorkspaceAnalytics(tasks: Awaited<ReturnType<typeof db.listTasks>>, projects: Awaited<ReturnType<typeof db.listProjects>>) {
  const now = Date.now();
  const today = startOfDay(now);
  const weekAgo = today - 6 * 86400000;
  const done = tasks.filter(task => task.status === "done");
  const overdue = tasks.filter(task => task.status !== "done" && task.dueDate != null && task.dueDate < today);
  const dueToday = tasks.filter(task => task.dueDate != null && startOfDay(task.dueDate) === today);
  const upcoming = tasks.filter(task => task.status !== "done" && task.dueDate != null && task.dueDate >= today).sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0)).slice(0, 8);
  const dailyTrend = Array.from({ length: 7 }, (_, index) => {
    const day = weekAgo + index * 86400000;
    return {
      label: new Date(day).toLocaleDateString("en", { weekday: "short" }),
      completed: done.filter(task => task.completedAt && startOfDay(new Date(task.completedAt).getTime()) === day).length,
      created: tasks.filter(task => startOfDay(new Date(task.createdAt).getTime()) === day).length,
    };
  });
  const productiveDays = new Set(done.filter(task => task.completedAt).map(task => startOfDay(new Date(task.completedAt as Date).getTime())));
  let streak = 0;
  for (let day = today; productiveDays.has(day); day -= 86400000) streak += 1;
  const projectProgress = projects.map(project => ({
    id: project.id,
    name: project.name,
    color: project.color,
    total: project.totalTasks,
    done: project.doneTasks,
    progress: project.totalTasks ? Math.round((project.doneTasks / project.totalTasks) * 100) : 0,
  }));
  const byStatus = ["todo", "in-progress", "review", "done"].map(status => ({ status, count: tasks.filter(task => task.status === status).length }));
  const byPriority = ["low", "medium", "high", "urgent"].map(priority => ({ priority, count: tasks.filter(task => task.priority === priority).length }));
  return {
    stats: {
      total: tasks.length,
      completed: done.length,
      active: tasks.length - done.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      completionRate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
      streak,
    },
    upcoming,
    dailyTrend,
    projectProgress,
    byStatus,
    byPriority,
  };
}

const workspaceRouter = router({
  overview: protectedProcedure.query(async ({ ctx }) => {
    await db.ensureStarterData(ctx.user.id);
    const [tasks, projects, activity] = await Promise.all([
      db.listTasks(ctx.user.id),
      db.listProjects(ctx.user.id),
      db.listActivity(ctx.user.id),
    ]);
    return { tasks, projects, activity, analytics: buildWorkspaceAnalytics(tasks, projects) };
  }),
  projects: protectedProcedure.query(async ({ ctx }) => {
    await db.ensureStarterData(ctx.user.id);
    return db.listProjects(ctx.user.id);
  }),
  createProject: protectedProcedure.input(projectInput).mutation(({ ctx, input }) => db.createProject(ctx.user.id, input)),
  updateProject: protectedProcedure.input(projectInput.extend({ id: z.number() })).mutation(({ ctx, input }) => db.updateProject(ctx.user.id, input)),
  deleteProject: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteProject(ctx.user.id, input.id)),
  tasks: protectedProcedure.query(async ({ ctx }) => {
    await db.ensureStarterData(ctx.user.id);
    return db.listTasks(ctx.user.id);
  }),
  createTask: protectedProcedure.input(taskInput).mutation(({ ctx, input }) => db.createTask(ctx.user.id, input)),
  updateTask: protectedProcedure.input(taskInput.extend({ id: z.number() }).partial().required({ id: true })).mutation(({ ctx, input }) => db.updateTask(ctx.user.id, input)),
  deleteTask: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => db.deleteTask(ctx.user.id, input.id)),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  workspace: workspaceRouter,
});

export type AppRouter = typeof appRouter;
