import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Flame, FolderPlus, KanbanSquare, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocation } from "wouter";

type Task = {
  id: number;
  userId: number;
  projectId: number | null;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  dueDate: number | null;
  tags: string[];
  position: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

type Project = {
  id: number;
  userId: number;
  name: string;
  color: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  totalTasks: number;
  doneTasks: number;
};

type OverviewData = {
  tasks: Task[];
  projects: Project[];
  activity: Array<{ id: number; detail: string; createdAt: Date }>;
  analytics: {
    stats: { total: number; completed: number; active: number; overdue: number; dueToday: number; completionRate: number; streak: number };
    upcoming: Task[];
    dailyTrend: Array<{ label: string; completed: number; created: number }>;
    projectProgress: Array<{ id: number; name: string; color: string; total: number; done: number; progress: number }>;
    byStatus: Array<{ status: string; count: number }>;
    byPriority: Array<{ priority: string; count: number }>;
  };
};
type Status = "todo" | "in-progress" | "review" | "done";
type Priority = "low" | "medium" | "high" | "urgent";

const columns: Array<{ id: Status; label: string }> = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

const priorityTone: Record<Priority, string> = {
  low: "bg-emerald-400/12 text-emerald-200 ring-emerald-300/20",
  medium: "bg-cyan-400/12 text-cyan-200 ring-cyan-300/20",
  high: "bg-amber-400/12 text-amber-200 ring-amber-300/20",
  urgent: "bg-rose-400/12 text-rose-200 ring-rose-300/20",
};

const projectColors = ["#6366f1", "#22d3ee", "#a78bfa", "#fb7185", "#34d399", "#f59e0b"];

function useRouteName() {
  const [location] = useLocation();
  if (location === "/tasks") return "tasks";
  if (location === "/kanban") return "kanban";
  if (location === "/calendar") return "calendar";
  if (location === "/projects") return "projects";
  if (location === "/analytics") return "analytics";
  return "dashboard";
}

export default function Home() {
  const route = useRouteName();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const overview = trpc.workspace.overview.useQuery(undefined, { staleTime: 15000 });
  const createTask = trpc.workspace.createTask.useMutation({ onSuccess: () => utils.workspace.overview.invalidate() });
  const updateTask = trpc.workspace.updateTask.useMutation({ onSuccess: () => utils.workspace.overview.invalidate() });
  const deleteTask = trpc.workspace.deleteTask.useMutation({ onSuccess: () => utils.workspace.overview.invalidate() });
  const createProject = trpc.workspace.createProject.useMutation({ onSuccess: () => utils.workspace.overview.invalidate() });
  const updateProject = trpc.workspace.updateProject.useMutation({ onSuccess: () => utils.workspace.overview.invalidate() });
  const deleteProject = trpc.workspace.deleteProject.useMutation({ onSuccess: () => utils.workspace.overview.invalidate() });

  const [taskModal, setTaskModal] = useState<{ open: boolean; task?: Task }>({ open: false });
  const [projectModal, setProjectModal] = useState<{ open: boolean; project?: Project }>({ open: false });
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | Status>("all");
  const [priority, setPriority] = useState<"all" | Priority>("all");
  const [projectId, setProjectId] = useState<"all" | string>("all");
  const [sort, setSort] = useState("due");
  const searchRef = useRef<HTMLInputElement>(null);

  const data = overview.data as OverviewData | undefined;
  const tasks = data?.tasks ?? [];
  const projects = data?.projects ?? [];
  const stats = data?.analytics.stats;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (event.target as HTMLElement).tagName.toLowerCase();
      const typing = ["input", "textarea", "select"].includes(tag);
      if (typing && event.key !== "Escape") return;
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setTaskModal({ open: true });
      }
      if (event.key.toLowerCase() === "k") {
        event.preventDefault();
        setLocation("/kanban");
      }
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        setLocation("/calendar");
      }
      if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "?") {
        event.preventDefault();
        setShortcutOpen(true);
      }
      if (event.key === "Escape") {
        setTaskModal({ open: false });
        setProjectModal({ open: false });
        setShortcutOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setLocation]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tasks
      .filter(task => !query || [task.title, task.description ?? "", task.tags.join(" ")].join(" ").toLowerCase().includes(query))
      .filter(task => status === "all" || task.status === status)
      .filter(task => priority === "all" || task.priority === priority)
      .filter(task => projectId === "all" || String(task.projectId ?? "") === projectId)
      .sort((a, b) => {
        if (sort === "priority") return priorityScore(b.priority) - priorityScore(a.priority);
        if (sort === "created") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return (a.dueDate ?? Number.MAX_SAFE_INTEGER) - (b.dueDate ?? Number.MAX_SAFE_INTEGER);
      });
  }, [tasks, search, status, priority, projectId, sort]);

  async function saveTask(input: TaskFormValues) {
    try {
      if (taskModal.task) {
        await updateTask.mutateAsync({ ...input, id: taskModal.task.id });
        toast.success("Task refined", { description: "Your changes are saved." });
      } else {
        await createTask.mutateAsync(input);
        toast.success("Task created", { description: "A new task joined your workspace." });
      }
      setTaskModal({ open: false });
    } catch (error) {
      toast.error("Task could not be saved", { description: error instanceof Error ? error.message : "Please try again." });
    }
  }

  async function completeTask(task: Task, checked: boolean) {
    await updateTask.mutateAsync({ id: task.id, status: checked ? "done" : "todo" });
    toast(checked ? "Task completed" : "Task reopened", { description: checked ? "Momentum added to your streak." : "Moved back to To Do." });
  }

  if (overview.isLoading) return <WorkspaceSkeleton />;

  return (
    <div className="mx-auto max-w-[1580px] space-y-6">
      <Header route={route} onNewTask={() => setTaskModal({ open: true })} onShortcuts={() => setShortcutOpen(true)} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <AnimatePresence mode="wait">
          <motion.section key={route} initial={{ opacity: 0, y: 18, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.99 }} transition={{ duration: 0.28, ease: "easeOut" }} className="min-w-0">
            {route === "dashboard" && <DashboardView data={data} tasks={tasks} projects={projects} onEditTask={task => setTaskModal({ open: true, task })} onCompleteTask={completeTask} />}
            {route === "tasks" && <TasksView tasks={filteredTasks} projects={projects} filters={{ search, status, priority, projectId, sort }} setters={{ setSearch, setStatus, setPriority, setProjectId, setSort }} searchRef={searchRef} onEdit={task => setTaskModal({ open: true, task })} onDelete={id => deleteTask.mutateAsync({ id })} onComplete={completeTask} />}
            {route === "kanban" && <KanbanView tasks={filteredTasks} projects={projects} onDropTask={(id, nextStatus) => updateTask.mutateAsync({ id, status: nextStatus })} onEdit={task => setTaskModal({ open: true, task })} />}
            {route === "calendar" && <CalendarView tasks={tasks} onEdit={task => setTaskModal({ open: true, task })} />}
            {route === "projects" && <ProjectsView projects={projects} tasks={tasks} onNew={() => setProjectModal({ open: true })} onEdit={project => setProjectModal({ open: true, project })} onDelete={id => deleteProject.mutateAsync({ id })} />}
            {route === "analytics" && <AnalyticsView data={data} />}
          </motion.section>
        </AnimatePresence>
        <ProjectRail projects={projects} tasks={tasks} stats={stats} onNew={() => setProjectModal({ open: true })} />
      </div>
      <TaskDialog open={taskModal.open} task={taskModal.task} projects={projects} onOpenChange={open => setTaskModal({ open })} onSave={saveTask} />
      <ProjectDialog open={projectModal.open} project={projectModal.project} onOpenChange={open => setProjectModal({ open })} onSave={async input => { projectModal.project ? await updateProject.mutateAsync({ ...input, id: projectModal.project.id }) : await createProject.mutateAsync(input); setProjectModal({ open: false }); toast.success("Project saved"); }} />
      <ShortcutDialog open={shortcutOpen} onOpenChange={setShortcutOpen} />
    </div>
  );
}

function Header({ route, onNewTask, onShortcuts }: { route: string; onNewTask: () => void; onShortcuts: () => void }) {
  const title = route === "dashboard" ? "Today’s command center" : route.charAt(0).toUpperCase() + route.slice(1);
  return (
    <div className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-200"><Sparkles className="h-3.5 w-3.5" /> Premium workspace</div>
        <h1 className="text-3xl font-semibold tracking-[-0.055em] text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">A refined dark-mode system for projects, tasks, deadlines, streaks, and focused execution.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={onShortcuts} className="rounded-2xl border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.07]">Shortcuts</Button>
        <Button onClick={onNewTask} className="rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"><Plus className="mr-2 h-4 w-4" /> New task</Button>
      </div>
    </div>
  );
}

function DashboardView({ data, tasks, projects, onEditTask, onCompleteTask }: { data: OverviewData | undefined; tasks: Task[]; projects: Project[]; onEditTask: (task: Task) => void; onCompleteTask: (task: Task, checked: boolean) => void }) {
  const stats = data?.analytics.stats;
  const jpChars = ['禅', '道', '心', '光', '月', '霧', '風', '水'];
  const randomJp = jpChars[Math.floor(Math.random() * jpChars.length)];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Completion" value={`${stats?.completionRate ?? 0}%`} detail={`${stats?.completed ?? 0} of ${stats?.total ?? 0} tasks done`} />
        <StatCard icon={Flame} label="Productivity streak" value={`${stats?.streak ?? 0}d`} detail="Consecutive completion days" />
        <StatCard icon={Clock3} label="Due today" value={stats?.dueToday ?? 0} detail={`${stats?.overdue ?? 0} overdue tasks`} />
        <StatCard icon={FolderPlus} label="Projects" value={projects.length} detail="Active workstreams" />
      </div>
      <div className="text-center text-xs text-slate-600 flicker-text-slow">✦ {randomJp} ✦</div>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
        <Panel title="Upcoming deadlines ✦" subtitle="Sorted by nearest due date">
          <div className="space-y-3">
            {(data?.analytics.upcoming ?? []).length ? data?.analytics.upcoming.map(task => <TaskRow key={task.id} task={task} projects={projects} onEdit={onEditTask} onComplete={onCompleteTask} />) : <EmptyState title="No upcoming deadlines" description="Create a task with a due date to populate this focus lane." />}
          </div>
        </Panel>
        <Panel title="Recent activity ✦" subtitle="Workspace motion trail">
          <div className="space-y-3">
            {(data?.activity ?? []).map(activity => <div key={activity.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="text-sm text-slate-200">{activity.detail}</p><p className="mt-1 text-xs text-slate-500">{format(new Date(activity.createdAt), "MMM d, h:mm a")}</p></div>)}
          </div>
        </Panel>
      </div>
      <AnalyticsCharts data={data} compact />
    </div>
  );
}

function TasksView({ tasks, projects, filters, setters, searchRef, onEdit, onDelete, onComplete }: { tasks: Task[]; projects: Project[]; filters: any; setters: any; searchRef: React.RefObject<HTMLInputElement | null>; onEdit: (task: Task) => void; onDelete: (id: number) => Promise<unknown>; onComplete: (task: Task, checked: boolean) => void }) {
  return (
    <Panel title="Task studio" subtitle="Filter, sort, edit, complete, and orchestrate every detail.">
      <div className="mb-5 grid gap-3 md:grid-cols-[1fr_repeat(4,160px)]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><Input ref={searchRef} value={filters.search} onChange={e => setters.setSearch(e.target.value)} placeholder="Search title, description, or tag" className="h-11 rounded-2xl border-white/10 bg-slate-950/70 pl-9 text-slate-100" /></div>
        <FilterSelect value={filters.status} onChange={setters.setStatus} options={["all", "todo", "in-progress", "review", "done"]} />
        <FilterSelect value={filters.priority} onChange={setters.setPriority} options={["all", "low", "medium", "high", "urgent"]} />
        <FilterSelect value={filters.projectId} onChange={setters.setProjectId} options={["all", ...projects.map(p => String(p.id))]} labels={Object.fromEntries(projects.map(p => [String(p.id), p.name]))} />
        <FilterSelect value={filters.sort} onChange={setters.setSort} options={["due", "priority", "created"]} />
      </div>
      <div className="space-y-3">{tasks.length ? tasks.map(task => <TaskRow key={task.id} task={task} projects={projects} onEdit={onEdit} onDelete={onDelete} onComplete={onComplete} />) : <EmptyState title="No matching tasks" description="Adjust filters or press N to create a new task." />}</div>
    </Panel>
  );
}

function KanbanView({ tasks, projects, onDropTask, onEdit }: { tasks: Task[]; projects: Project[]; onDropTask: (id: number, status: Status) => Promise<unknown>; onEdit: (task: Task) => void }) {
  return (
    <div className="grid min-h-[680px] gap-4 xl:grid-cols-4">
      {columns.map(column => (
        <div key={column.id} onDragOver={event => event.preventDefault()} onDrop={event => { const id = Number(event.dataTransfer.getData("task-id")); if (id) onDropTask(id, column.id).then(() => toast.success(`Moved to ${column.label}`)); }} className="rounded-[2rem] border border-white/10 bg-slate-900/55 p-4 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold tracking-[-0.03em] text-white">{column.label}</h2><Badge className="rounded-full bg-white/[0.06] text-slate-300">{tasks.filter(task => task.status === column.id).length}</Badge></div>
          <div className="space-y-3">
            {tasks.filter(task => task.status === column.id).map(task => <KanbanCard key={task.id} task={task} project={projects.find(project => project.id === task.projectId)} onEdit={onEdit} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarView({ tasks, onEdit }: { tasks: Task[]; onEdit: (task: Task) => void }) {
  const [cursor, setCursor] = useState(new Date());
  const [mode, setMode] = useState<"month" | "week">("month");
  const start = mode === "month" ? startOfWeek(startOfMonth(cursor)) : startOfWeek(cursor);
  const end = mode === "month" ? endOfWeek(endOfMonth(cursor)) : endOfWeek(cursor);
  const days: Date[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) days.push(day);
  return (
    <Panel title="Calendar" subtitle="Navigate work by due date in month or week mode." action={<div className="flex gap-2"><Button variant="outline" className="rounded-xl border-white/10 bg-white/[0.03]" onClick={() => setMode(mode === "month" ? "week" : "month")}>{mode}</Button><Button variant="outline" className="rounded-xl border-white/10 bg-white/[0.03]" onClick={() => setCursor(addDays(cursor, mode === "month" ? -30 : -7))}>Prev</Button><Button variant="outline" className="rounded-xl border-white/10 bg-white/[0.03]" onClick={() => setCursor(addDays(cursor, mode === "month" ? 30 : 7))}>Next</Button></div>}>
      <div className="mb-4 text-xl font-semibold tracking-[-0.04em] text-white">{format(cursor, mode === "month" ? "MMMM yyyy" : "MMM d, yyyy")}</div>
      <div className="grid grid-cols-7 gap-2">{days.map(day => <div key={day.toISOString()} className={`min-h-32 rounded-2xl border p-3 ${isSameMonth(day, cursor) || mode === "week" ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.015] opacity-50"}`}><div className={`mb-2 text-xs ${isSameDay(day, new Date()) ? "text-cyan-200" : "text-slate-500"}`}>{format(day, "EEE d")}</div>{tasks.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), day)).slice(0, 3).map(task => <button key={task.id} onClick={() => onEdit(task)} className="mb-1 w-full rounded-xl bg-indigo-400/12 px-2 py-1 text-left text-xs text-indigo-100 ring-1 ring-indigo-300/10">{task.title}</button>)}</div>)}</div>
    </Panel>
  );
}

function ProjectsView({ projects, tasks, onNew, onEdit, onDelete }: { projects: Project[]; tasks: Task[]; onNew: () => void; onEdit: (project: Project) => void; onDelete: (id: number) => Promise<unknown> }) {
  return <Panel title="Projects ✦" subtitle="Color-coded workstreams with live task counts and progress." action={<Button onClick={onNew} className="rounded-2xl bg-indigo-500 text-white"><Plus className="mr-2 h-4 w-4" /> New project</Button>}><div className="grid gap-4 md:grid-cols-2">{projects.map(project => { const total = project.totalTasks; const done = project.doneTasks; const progress = total ? Math.round(done / total * 100) : 0; return <Card key={project.id} className="rounded-[2rem] border-white/10 bg-slate-950/45 p-5"><div className="flex items-start justify-between gap-4"><div><span className="mb-3 block h-3 w-12 rounded-full" style={{ background: project.color }} /><h3 className="text-lg font-semibold text-white">{project.name}</h3><p className="mt-1 text-sm text-slate-500">{project.description || "No description yet."}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" className="rounded-xl border-white/10 bg-white/[0.03]" onClick={() => onEdit(project)}>Edit</Button><Button size="sm" variant="ghost" className="rounded-xl text-red-300" onClick={() => onDelete(project.id).then(() => toast.success("Project deleted"))}><Trash2 className="h-4 w-4" /></Button></div></div><Progress value={progress} className="mt-5 h-2" /><p className="mt-3 text-xs text-slate-500">{done}/{total} tasks complete · {progress}%</p></Card>; })}</div></Panel>;
}

function AnalyticsView({ data }: { data: OverviewData | undefined }) {
  return <div className="space-y-6"><AnalyticsCharts data={data} /><Panel title="Project progress ✦" subtitle="Completion health by workstream"><div className="space-y-4">{(data?.analytics.projectProgress ?? []).map(project => <div key={project.id}><div className="mb-2 flex justify-between text-sm"><span className="text-slate-200">{project.name}</span><span className="text-slate-500">{project.progress}%</span></div><Progress value={project.progress} className="h-2" /></div>)}</div></Panel></div>;
}

function AnalyticsCharts({ data, compact = false }: { data: OverviewData | undefined; compact?: boolean }) {
  return <div className={`grid gap-6 ${compact ? "lg:grid-cols-2" : "xl:grid-cols-2"}`}><Panel title="Completion trends" subtitle="Created vs completed over seven days"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data?.analytics.dailyTrend ?? []}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" /><XAxis dataKey="label" stroke="#64748b" /><YAxis stroke="#64748b" allowDecimals={false} /><Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16 }} /><Line type="monotone" dataKey="completed" stroke="#22d3ee" strokeWidth={3} dot={false} /><Line type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div></Panel><Panel title="Priority mix" subtitle="Workload intensity"><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.analytics.byPriority ?? []}><CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.12)" /><XAxis dataKey="priority" stroke="#64748b" /><YAxis stroke="#64748b" allowDecimals={false} /><Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16 }} /><Bar dataKey="count" fill="#6366f1" radius={[12, 12, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel></div>;
}

function ProjectRail({ projects, tasks, stats, onNew }: { projects: Project[]; tasks: Task[]; stats: any; onNew: () => void }) {
  return <aside className="space-y-6"><Panel title="Projects sidebar" subtitle="Live portfolio health" action={<Button size="sm" variant="outline" onClick={onNew} className="rounded-xl border-white/10 bg-white/[0.03]"><Plus className="h-4 w-4" /></Button>}><div className="space-y-4">{projects.map(project => { const total = project.totalTasks; const done = project.doneTasks; const progress = total ? Math.round(done / total * 100) : 0; return <div key={project.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-200"><span className="h-2.5 w-2.5 rounded-full" style={{ background: project.color }} />{project.name}</span><span className="text-xs text-slate-500">{total}</span></div><Progress value={progress} className="h-1.5" /></div>; })}</div></Panel><Panel title="Focus pulse" subtitle="Today’s operating numbers"><div className="grid grid-cols-2 gap-3"><MiniStat label="Active" value={stats?.active ?? 0} /><MiniStat label="Done" value={stats?.completed ?? 0} /><MiniStat label="Overdue" value={stats?.overdue ?? 0} /><MiniStat label="Streak" value={`${stats?.streak ?? 0}d`} /></div></Panel></aside>;
}

function TaskRow({ task, projects, onEdit, onDelete, onComplete }: { task: Task; projects: Project[]; onEdit: (task: Task) => void; onDelete?: (id: number) => Promise<unknown>; onComplete: (task: Task, checked: boolean) => void }) {
  const project = projects.find(p => p.id === task.projectId);
  return <motion.div layout className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.055] hover:shadow-xl hover:shadow-slate-950/20"><div className="flex gap-3"><Checkbox checked={task.status === "done"} onCheckedChange={checked => onComplete(task, Boolean(checked))} className="mt-1" /><button onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left"><div className="flex flex-wrap items-center gap-2"><h3 className={`font-medium text-white ${task.status === "done" ? "line-through decoration-slate-500" : ""}`}>{task.title}</h3><Badge className={`rounded-full px-2 py-0.5 text-[10px] ring-1 ${priorityTone[task.priority as Priority]}`}>{task.priority}</Badge>{project && <Badge className="rounded-full bg-white/[0.06] text-slate-300"><span className="mr-1.5 h-2 w-2 rounded-full" style={{ background: project.color }} />{project.name}</Badge>}</div>{task.description && <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>}<div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">{task.dueDate && <span>{format(new Date(task.dueDate), "MMM d")}</span>}{task.tags.map((tag: string) => <span key={tag} className="rounded-full bg-slate-800 px-2 py-0.5">#{tag}</span>)}</div></button>{onDelete && <Button size="icon" variant="ghost" onClick={() => onDelete(task.id).then(() => toast.success("Task deleted"))} className="opacity-0 text-red-300 transition group-hover:opacity-100"><Trash2 className="h-4 w-4" /></Button>}</div></motion.div>;
}

function KanbanCard({ task, project, onEdit }: { task: Task; project?: Project; onEdit: (task: Task) => void }) {
  return <motion.button draggable onDragStart={event => (event as unknown as React.DragEvent<HTMLButtonElement>).dataTransfer.setData("task-id", String(task.id))} onClick={() => onEdit(task)} whileHover={{ y: -3, scale: 1.01 }} className="w-full rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-left shadow-lg shadow-slate-950/20"><div className="mb-3 flex items-center justify-between"><Badge className={`rounded-full text-[10px] ring-1 ${priorityTone[task.priority as Priority]}`}>{task.priority}</Badge>{project && <span className="h-2.5 w-2.5 rounded-full" style={{ background: project.color }} />}</div><h3 className="font-medium text-white">{task.title}</h3>{task.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{task.description}</p>}<div className="mt-4 flex flex-wrap gap-1.5">{task.tags.map((tag: string) => <span key={tag} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] text-slate-400">#{tag}</span>)}</div></motion.button>;
}

type TaskFormValues = { title: string; description?: string | null; status: Status; priority: Priority; dueDate?: number | null; tags: string[]; projectId?: number | null; position?: number };

function TaskDialog({ open, task, projects, onOpenChange, onSave }: { open: boolean; task?: Task; projects: Project[]; onOpenChange: (open: boolean) => void; onSave: (input: TaskFormValues) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<Status>("todo");
  const [priority, setPriority] = useState<Priority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [projectId, setProjectId] = useState("");
  useEffect(() => { if (open) { setTitle(task?.title ?? ""); setDescription(task?.description ?? ""); setStatus((task?.status as Status) ?? "todo"); setPriority((task?.priority as Priority) ?? "medium"); setDueDate(task?.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""); setTags(task?.tags.join(", ") ?? ""); setProjectId(task?.projectId ? String(task.projectId) : ""); } }, [open, task]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-[2rem] border-white/10 bg-slate-950 text-slate-100 shadow-2xl"><DialogHeader><DialogTitle className="text-2xl tracking-[-0.04em]">{task ? "Edit task" : "New task"}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={event => { event.preventDefault(); onSave({ title, description, status, priority, dueDate: dueDate ? new Date(`${dueDate}T12:00:00`).getTime() : null, tags: tags.split(",").map(tag => tag.trim()).filter(Boolean), projectId: projectId ? Number(projectId) : null }); }}><Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title" className="rounded-2xl border-white/10 bg-slate-900" /><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="min-h-28 rounded-2xl border-white/10 bg-slate-900" /><div className="grid gap-3 sm:grid-cols-2"><NativeSelect value={status} onChange={value => setStatus(value as Status)} options={["todo", "in-progress", "review", "done"]} /><NativeSelect value={priority} onChange={value => setPriority(value as Priority)} options={["low", "medium", "high", "urgent"]} /><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-2xl border-white/10 bg-slate-900" /><NativeSelect value={projectId} onChange={setProjectId} options={["", ...projects.map(p => String(p.id))]} labels={{ "": "No project", ...Object.fromEntries(projects.map(p => [String(p.id), p.name])) }} /></div><Input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags separated by commas" className="rounded-2xl border-white/10 bg-slate-900" /><Button className="h-11 w-full rounded-2xl bg-indigo-500 text-white hover:bg-indigo-400">Save task</Button></form></DialogContent></Dialog>;
}

function ProjectDialog({ open, project, onOpenChange, onSave }: { open: boolean; project?: Project; onOpenChange: (open: boolean) => void; onSave: (input: { name: string; color: string; description?: string | null }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(projectColors[0]);
  const [description, setDescription] = useState("");
  useEffect(() => { if (open) { setName(project?.name ?? ""); setColor(project?.color ?? projectColors[0]); setDescription(project?.description ?? ""); } }, [open, project]);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-[2rem] border-white/10 bg-slate-950 text-slate-100"><DialogHeader><DialogTitle>{project ? "Edit project" : "New project"}</DialogTitle></DialogHeader><form className="space-y-4" onSubmit={event => { event.preventDefault(); onSave({ name, color, description }); }}><Input required value={name} onChange={e => setName(e.target.value)} placeholder="Project name" className="rounded-2xl border-white/10 bg-slate-900" /><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Project description" className="rounded-2xl border-white/10 bg-slate-900" /><div className="flex flex-wrap gap-2">{projectColors.map(option => <button type="button" key={option} onClick={() => setColor(option)} className={`h-9 w-9 rounded-full ring-2 ${color === option ? "ring-white" : "ring-transparent"}`} style={{ background: option }} />)}</div><Button className="h-11 w-full rounded-2xl bg-indigo-500 text-white">Save project</Button></form></DialogContent></Dialog>;
}

function ShortcutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const rows = [{ key: "N", action: "Create a new task" }, { key: "K", action: "Open Kanban" }, { key: "C", action: "Open Calendar" }, { key: "/", action: "Focus search" }, { key: "?", action: "Show shortcuts" }];
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="rounded-[2rem] border-white/10 bg-slate-950 text-slate-100"><DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader><div className="space-y-2">{rows.map(row => <div key={row.key} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3"><span className="text-slate-300">{row.action}</span><kbd className="rounded-lg border border-white/10 bg-slate-900 px-3 py-1 text-sm text-cyan-200">{row.key}</kbd></div>)}</div></DialogContent></Dialog>;
}

function Panel({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) { return <Card className="rounded-[2rem] border-white/10 bg-slate-900/58 p-5 text-slate-100 shadow-2xl shadow-slate-950/20 backdrop-blur-xl"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold tracking-[-0.04em] text-white">{title}</h2>{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}</div>{action}</div>{children}</Card>; }
function StatCard({ icon: Icon, label, value, detail }: { icon: any; label: string; value: string | number; detail: string }) { return <Card className="rounded-[2rem] border-white/10 bg-slate-900/58 p-5 shadow-2xl shadow-slate-950/20"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-400/12 text-cyan-200 ring-1 ring-indigo-300/20"><Icon className="h-5 w-5" /></div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-white">{value}</p><p className="mt-2 text-xs text-slate-500">{detail}</p></Card>; }
function MiniStat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-white">{value}</p></div>; }
function EmptyState({ title, description }: { title: string; description: string }) { return <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center"><Sparkles className="mx-auto mb-3 h-8 w-8 text-cyan-200" /><h3 className="font-semibold text-white">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div>; }
function FilterSelect({ value, onChange, options, labels = {} }: { value: string; onChange: (value: any) => void; options: string[]; labels?: Record<string, string> }) { return <NativeSelect value={value} onChange={onChange} options={options} labels={labels} />; }
function NativeSelect({ value, onChange, options, labels = {} }: { value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) { return <select value={value} onChange={e => onChange(e.target.value)} className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none ring-0 transition focus:border-cyan-300/40">{options.map(option => <option key={option || "none"} value={option}>{labels[option] ?? option}</option>)}</select>; }
function WorkspaceSkeleton() { return <div className="mx-auto max-w-[1580px] space-y-6"><Skeleton className="h-40 rounded-[2rem] bg-slate-800" /><div className="grid gap-4 md:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-40 rounded-[2rem] bg-slate-800" />)}</div><Skeleton className="h-[520px] rounded-[2rem] bg-slate-800" /></div>; }
function priorityScore(priority: string) { return { urgent: 4, high: 3, medium: 2, low: 1 }[priority] ?? 0; }
