import mysql from "mysql2/promise";
import pg from "pg";
import { ENV } from "./_core/env";
import type { InsertUser, User } from "../drizzle/schema";

const { Pool } = pg;

type Dialect = "postgres" | "mysql";
type QueryResult<T = Record<string, unknown>> = { rows: T[]; insertId?: number };

type TaskStatus = "todo" | "in-progress" | "review" | "done";
type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ZenithProject = {
  id: number;
  userId: number;
  name: string;
  color: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ZenithTask = {
  id: number;
  userId: number;
  projectId: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: number | null;
  tags: string[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export type ZenithActivity = {
  id: number;
  userId: number;
  taskId: number | null;
  projectId: number | null;
  action: string;
  detail: string;
  createdAt: Date;
};

type DbClient = {
  dialect: Dialect;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
};

let clientPromise: Promise<DbClient | null> | null = null;
let initialized = false;

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.ZENITH_DATABASE_URL || "";
}

function detectDialect(url: string): Dialect {
  return url.startsWith("postgres://") || url.startsWith("postgresql://") ? "postgres" : "mysql";
}

function mysqlSql(sql: string) {
  return sql.replace(/\$(\d+)/g, "?");
}

async function createClient(): Promise<DbClient | null> {
  const url = databaseUrl();
  if (!url) {
    console.warn("[Database] DATABASE_URL is not configured; persistence is disabled.");
    return null;
  }

  const dialect = detectDialect(url);
  if (dialect === "postgres") {
    const pool = new Pool({ connectionString: url, ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined });
    return {
      dialect,
      async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
        const result = await pool.query(sql, params);
        return { rows: result.rows as T[] };
      },
    };
  }

  const pool = mysql.createPool(url);
  return {
    dialect,
    async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
      const [result] = await pool.execute(mysqlSql(sql), params);
      if (Array.isArray(result)) return { rows: result as T[] };
      const header = result as mysql.ResultSetHeader;
      return { rows: [], insertId: header.insertId };
    },
  };
}

export async function getDb() {
  if (!clientPromise) clientPromise = createClient();
  const db = await clientPromise;
  if (db && !initialized) {
    await initializeDatabase(db);
    initialized = true;
  }
  return db;
}

async function initializeDatabase(db: DbClient) {
  if (db.dialect === "postgres") {
    await db.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      "openId" VARCHAR(64) NOT NULL UNIQUE,
      name TEXT,
      email VARCHAR(320),
      "loginMethod" VARCHAR(64),
      role VARCHAR(16) NOT NULL DEFAULT 'user',
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "lastSignedIn" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(140) NOT NULL,
      color VARCHAR(32) NOT NULL DEFAULT '#6366f1',
      description TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "projectId" INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      title VARCHAR(220) NOT NULL,
      description TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'todo',
      priority VARCHAR(24) NOT NULL DEFAULT 'medium',
      "dueDate" BIGINT,
      tags JSONB NOT NULL DEFAULT '[]'::jsonb,
      position INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "completedAt" TIMESTAMPTZ
    )`);
    await db.query(`CREATE TABLE IF NOT EXISTS task_activity (
      id SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      "taskId" INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
      "projectId" INTEGER REFERENCES projects(id) ON DELETE SET NULL,
      action VARCHAR(64) NOT NULL,
      detail TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await db.query(`CREATE INDEX IF NOT EXISTS tasks_user_status_idx ON tasks ("userId", status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS tasks_user_due_idx ON tasks ("userId", "dueDate")`);
    return;
  }

  await db.query(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    openId VARCHAR(64) NOT NULL UNIQUE,
    name TEXT,
    email VARCHAR(320),
    loginMethod VARCHAR(64),
    role VARCHAR(16) NOT NULL DEFAULT 'user',
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    name VARCHAR(140) NOT NULL,
    color VARCHAR(32) NOT NULL DEFAULT '#6366f1',
    description TEXT,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX projects_user_idx (userId)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    projectId INT NULL,
    title VARCHAR(220) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'todo',
    priority VARCHAR(24) NOT NULL DEFAULT 'medium',
    dueDate BIGINT NULL,
    tags JSON NOT NULL,
    position INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completedAt TIMESTAMP NULL,
    INDEX tasks_user_status_idx (userId, status),
    INDEX tasks_user_due_idx (userId, dueDate)
  )`);
  await db.query(`CREATE TABLE IF NOT EXISTS task_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    taskId INT NULL,
    projectId INT NULL,
    action VARCHAR(64) NOT NULL,
    detail TEXT NOT NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX activity_user_idx (userId, createdAt)
  )`);
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return value.split(",").map(tag => tag.trim()).filter(Boolean);
    }
  }
  return [];
}

function mapTask(row: Record<string, unknown>): ZenithTask {
  return { ...row, tags: normalizeTags(row.tags), dueDate: row.dueDate == null ? null : Number(row.dueDate) } as ZenithTask;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  if (db.dialect === "postgres") {
    await db.query(`INSERT INTO users ("openId", name, email, "loginMethod", role, "lastSignedIn")
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT ("openId") DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, "loginMethod" = EXCLUDED."loginMethod", role = EXCLUDED.role, "lastSignedIn" = NOW(), "updatedAt" = NOW()`,
      [user.openId, user.name ?? null, user.email ?? null, user.loginMethod ?? null, role]);
    return;
  }
  await db.query(`INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON DUPLICATE KEY UPDATE name = VALUES(name), email = VALUES(email), loginMethod = VALUES(loginMethod), role = VALUES(role), lastSignedIn = CURRENT_TIMESTAMP`,
    [user.openId, user.name ?? null, user.email ?? null, user.loginMethod ?? null, role]);
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const quote = db.dialect === "postgres" ? '"openId"' : "openId";
  const result = await db.query<User>(`SELECT * FROM users WHERE ${quote} = $1 LIMIT 1`, [openId]);
  return result.rows[0];
}

export async function ensureStarterData(userId: number) {
  const db = await getDb();
  if (!db) return;
  const existing = await db.query<{ count: string | number }>(`SELECT COUNT(*) as count FROM projects WHERE ${db.dialect === "postgres" ? '"userId"' : "userId"} = $1`, [userId]);
  if (Number(existing.rows[0]?.count ?? 0) > 0) return;
  const project = await createProject(userId, { name: "Launch Plan", color: "#6366f1", description: "Your refined starting workspace." });
  await createTask(userId, { title: "Design Zenith command center", description: "Review the dashboard, shortcuts, Kanban, calendar, and analytics views.", priority: "high", status: "in-progress", dueDate: Date.now() + 86400000, tags: ["design", "onboarding"], projectId: project.id });
  await createTask(userId, { title: "Plan next weekly sprint", description: "Use projects, priorities, and the calendar to map upcoming work.", priority: "medium", status: "todo", dueDate: Date.now() + 3 * 86400000, tags: ["planning"], projectId: project.id });
}

export async function listProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.query<ZenithProject & { totalTasks: number; doneTasks: number }>(`SELECT p.*, COUNT(t.id) as totalTasks, SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as doneTasks FROM projects p LEFT JOIN tasks t ON t.${db.dialect === "postgres" ? '"projectId"' : "projectId"} = p.id WHERE p.${db.dialect === "postgres" ? '"userId"' : "userId"} = $1 GROUP BY p.id ORDER BY p.${db.dialect === "postgres" ? '"createdAt"' : "createdAt"} ASC`, [userId]);
  return rows.rows.map(row => ({ ...row, totalTasks: Number(row.totalTasks ?? 0), doneTasks: Number(row.doneTasks ?? 0) }));
}

export async function createProject(userId: number, input: { name: string; color: string; description?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (db.dialect === "postgres") {
    const result = await db.query<ZenithProject>(`INSERT INTO projects ("userId", name, color, description) VALUES ($1, $2, $3, $4) RETURNING *`, [userId, input.name, input.color, input.description ?? null]);
    await addActivity(userId, null, result.rows[0].id, "project.created", `Created project ${input.name}`);
    return result.rows[0];
  }
  const result = await db.query(`INSERT INTO projects (userId, name, color, description) VALUES ($1, $2, $3, $4)`, [userId, input.name, input.color, input.description ?? null]);
  const project = (await db.query<ZenithProject>(`SELECT * FROM projects WHERE id = $1`, [result.insertId])).rows[0];
  await addActivity(userId, null, project.id, "project.created", `Created project ${input.name}`);
  return project;
}

export async function updateProject(userId: number, input: { id: number; name: string; color: string; description?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const userCol = db.dialect === "postgres" ? '"userId"' : "userId";
  const updatedAt = db.dialect === "postgres" ? ', "updatedAt" = NOW()' : "";
  await db.query(`UPDATE projects SET name = $1, color = $2, description = $3${updatedAt} WHERE id = $4 AND ${userCol} = $5`, [input.name, input.color, input.description ?? null, input.id, userId]);
  await addActivity(userId, null, input.id, "project.updated", `Updated project ${input.name}`);
  return true;
}

export async function deleteProject(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const userCol = db.dialect === "postgres" ? '"userId"' : "userId";
  const projectCol = db.dialect === "postgres" ? '"projectId"' : "projectId";
  await db.query(`UPDATE tasks SET ${projectCol} = NULL WHERE ${projectCol} = $1 AND ${userCol} = $2`, [id, userId]);
  await db.query(`DELETE FROM projects WHERE id = $1 AND ${userCol} = $2`, [id, userId]);
  await addActivity(userId, null, id, "project.deleted", "Deleted project");
  return true;
}

export async function listTasks(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const userCol = db.dialect === "postgres" ? '"userId"' : "userId";
  const dueCol = db.dialect === "postgres" ? '"dueDate"' : "dueDate";
  const result = await db.query<Record<string, unknown>>(`SELECT * FROM tasks WHERE ${userCol} = $1 ORDER BY COALESCE(${dueCol}, 9999999999999), position ASC, id DESC`, [userId]);
  return result.rows.map(mapTask);
}

export async function createTask(userId: number, input: Partial<ZenithTask> & { title: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const tags = JSON.stringify(input.tags ?? []);
  const status = input.status ?? "todo";
  const priority = input.priority ?? "medium";
  if (db.dialect === "postgres") {
    const result = await db.query<Record<string, unknown>>(`INSERT INTO tasks ("userId", "projectId", title, description, status, priority, "dueDate", tags, position, "completedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10) RETURNING *`, [userId, input.projectId ?? null, input.title, input.description ?? null, status, priority, input.dueDate ?? null, tags, input.position ?? 0, status === "done" ? new Date() : null]);
    const task = mapTask(result.rows[0]);
    await addActivity(userId, task.id, task.projectId, "task.created", `Created task ${task.title}`);
    return task;
  }
  const result = await db.query(`INSERT INTO tasks (userId, projectId, title, description, status, priority, dueDate, tags, position, completedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, CAST($8 AS JSON), $9, $10)`, [userId, input.projectId ?? null, input.title, input.description ?? null, status, priority, input.dueDate ?? null, tags, input.position ?? 0, status === "done" ? new Date() : null]);
  const task = mapTask((await db.query<Record<string, unknown>>(`SELECT * FROM tasks WHERE id = $1`, [result.insertId])).rows[0]);
  await addActivity(userId, task.id, task.projectId, "task.created", `Created task ${task.title}`);
  return task;
}

export async function updateTask(userId: number, input: Partial<ZenithTask> & { id: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const row = (await db.query<Record<string, unknown>>(`SELECT * FROM tasks WHERE id = $1 AND ${db.dialect === "postgres" ? '"userId"' : "userId"} = $2`, [input.id, userId])).rows[0];
  if (!row) throw new Error("Task not found");
  const nextStatus = input.status ?? (row.status as TaskStatus);
  const completedAt = nextStatus === "done" ? (row.completedAt ?? new Date()) : null;
  const userCol = db.dialect === "postgres" ? '"userId"' : "userId";
  const projectCol = db.dialect === "postgres" ? '"projectId"' : "projectId";
  const dueCol = db.dialect === "postgres" ? '"dueDate"' : "dueDate";
  const completedCol = db.dialect === "postgres" ? '"completedAt"' : "completedAt";
  const updatedCol = db.dialect === "postgres" ? ', "updatedAt" = NOW()' : "";
  const tagsParam = JSON.stringify(input.tags ?? normalizeTags(row.tags));
  const castTags = db.dialect === "postgres" ? "$8::jsonb" : "CAST($8 AS JSON)";
  await db.query(`UPDATE tasks SET ${projectCol} = $1, title = $2, description = $3, status = $4, priority = $5, ${dueCol} = $6, position = $7, tags = ${castTags}, ${completedCol} = $9${updatedCol} WHERE id = $10 AND ${userCol} = $11`, [input.projectId ?? row.projectId ?? null, input.title ?? row.title, input.description ?? row.description ?? null, nextStatus, input.priority ?? row.priority, input.dueDate ?? row.dueDate ?? null, input.position ?? row.position ?? 0, tagsParam, completedAt, input.id, userId]);
  const task = mapTask((await db.query<Record<string, unknown>>(`SELECT * FROM tasks WHERE id = $1`, [input.id])).rows[0]);
  await addActivity(userId, task.id, task.projectId, nextStatus === "done" ? "task.completed" : "task.updated", `${nextStatus === "done" ? "Completed" : "Updated"} task ${task.title}`);
  return task;
}

export async function deleteTask(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const userCol = db.dialect === "postgres" ? '"userId"' : "userId";
  await db.query(`DELETE FROM tasks WHERE id = $1 AND ${userCol} = $2`, [id, userId]);
  await addActivity(userId, id, null, "task.deleted", "Deleted task");
  return true;
}

export async function addActivity(userId: number, taskId: number | null, projectId: number | null, action: string, detail: string) {
  const db = await getDb();
  if (!db) return;
  const cols = db.dialect === "postgres" ? '("userId", "taskId", "projectId", action, detail)' : "(userId, taskId, projectId, action, detail)";
  await db.query(`INSERT INTO task_activity ${cols} VALUES ($1, $2, $3, $4, $5)`, [userId, taskId, projectId, action, detail]);
}

export async function listActivity(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const userCol = db.dialect === "postgres" ? '"userId"' : "userId";
  const createdCol = db.dialect === "postgres" ? '"createdAt"' : "createdAt";
  return (await db.query<ZenithActivity>(`SELECT * FROM task_activity WHERE ${userCol} = $1 ORDER BY ${createdCol} DESC LIMIT 12`, [userId])).rows;
}
