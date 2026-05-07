import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { BarChart3, CalendarDays, CheckCircle2, FolderKanban, KanbanSquare, LayoutDashboard, LogOut, PanelLeft, Search, Sparkles } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", key: "Home" },
  { icon: CheckCircle2, label: "Tasks", path: "/tasks", key: "N" },
  { icon: KanbanSquare, label: "Kanban", path: "/kanban", key: "K" },
  { icon: CalendarDays, label: "Calendar", path: "/calendar", key: "C" },
  { icon: FolderKanban, label: "Projects", path: "/projects", key: "P" },
  { icon: BarChart3, label: "Analytics", path: "/analytics", key: "A" },
];

const SIDEBAR_WIDTH_KEY = "zenith-sidebar-width";
const DEFAULT_WIDTH = 292;
const MIN_WIDTH = 236;
const MAX_WIDTH = 430;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen overflow-hidden bg-[#0f172a] text-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,.25),transparent_28%),radial-gradient(circle_at_80%_10%,rgba(34,211,238,.16),transparent_24%),linear-gradient(135deg,#0f172a,#020617)]" />
        <main className="relative flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/72 p-8 shadow-2xl shadow-indigo-950/40 backdrop-blur-2xl">
            <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-300/20">
              <Sparkles className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">Enter Zenith</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sign in with Manus OAuth to unlock your personal task command center, persistent projects, Kanban boards, and analytics.
            </p>
            <Button onClick={() => (window.location.href = getLoginUrl())} size="lg" className="mt-8 h-12 w-full rounded-2xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:bg-indigo-400">
              Continue with Manus OAuth
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children, setSidebarWidth }: { children: React.ReactNode; setSidebarWidth: (width: number) => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location) ?? menuItems[0];
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-slate-700/50 bg-slate-950/95 text-slate-100 backdrop-blur-xl" disableTransition={isResizing}>
          <SidebarHeader className="h-auto border-b border-white/5 p-4">
            <div className="flex items-center gap-3">
              <button onClick={toggleSidebar} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label="Toggle navigation">
                <PanelLeft className="h-4 w-4 text-slate-300" />
              </button>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold tracking-[-0.045em] text-white">Zenith</span>
                    <Badge className="rounded-full border-cyan-300/25 bg-cyan-300/10 px-2 text-[10px] font-medium text-cyan-200">Pro</Badge>
                  </div>
                  <p className="truncate text-xs text-slate-500">Command your workday</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-500">
                <Search className="h-4 w-4" />
                <span>Press / to focus search</span>
              </div>
            )}
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-4">
            <SidebarMenu>
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={item.label} className={`mb-1 h-11 rounded-2xl font-medium transition-all ${isActive ? "bg-indigo-500/15 text-indigo-100 shadow-inner ring-1 ring-indigo-300/20" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-100"}`}>
                      <item.icon className={`h-4 w-4 ${isActive ? "text-cyan-200" : ""}`} />
                      <span>{item.label}</span>
                      {!isCollapsed && <kbd className="ml-auto rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-500">{item.key}</kbd>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-white/5 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-2 py-2 text-left transition hover:bg-slate-800/80 group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
                  <Avatar className="h-10 w-10 shrink-0 border border-indigo-300/20">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-cyan-300 text-sm font-semibold text-slate-950">
                      {(user?.name || user?.email || "Z").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                    <p className="truncate text-sm font-semibold leading-none text-slate-100">{user?.name || "Zenith User"}</p>
                    <p className="mt-1.5 truncate text-xs text-slate-500">{user?.email || "Manus OAuth session"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl border-slate-700 bg-slate-900 text-slate-100">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-300 focus:text-red-200">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-indigo-400/40 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} />
      </div>

      <SidebarInset className="bg-[#0f172a]">
        {isMobile && (
          <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-slate-950/85 px-2 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-xl bg-slate-900 text-slate-100" />
              <span className="text-sm font-semibold text-slate-100">{activeMenuItem.label}</span>
            </div>
          </div>
        )}
        <main className="relative min-h-screen flex-1 overflow-hidden p-3 text-slate-50 sm:p-5 lg:p-7">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_14%,rgba(99,102,241,.18),transparent_24%),radial-gradient(circle_at_86%_8%,rgba(34,211,238,.11),transparent_24%)]" />
          <div className="relative">{children}</div>
        </main>
      </SidebarInset>
    </>
  );
}
