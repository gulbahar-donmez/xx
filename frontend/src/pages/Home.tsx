import { useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3, BookOpen, BrainCircuit, ChevronRight, ClipboardList, GraduationCap, LayoutDashboard, Lock, LogOut, Menu, MessagesSquare, ShieldCheck, Target, Timer, UserRound, Video, X } from "lucide-react";
import { endSession } from "@/lib/session";
import { useMe } from "@/hooks/useMe";
import type { PublicUser, Role } from "@/lib/types";
import { LevelIcon, levelName } from "@/components/common";
import Placement from "@/components/views/Placement";
import StudentDashboard from "@/components/views/StudentDashboard";
import Practice from "@/components/views/Practice";
import StudyPlan from "@/components/views/StudyPlan";
import ExamUpload from "@/components/views/ExamUpload";
import Classroom from "@/components/views/Classroom";
import Social from "@/components/views/Social";
import Pomodoro from "@/components/views/Pomodoro";
import ProfileView from "@/components/views/ProfileView";
import Coach from "@/components/views/Coach";
import { AdminPanel, TeacherPanel } from "@/components/views/Panels";
import { Toaster } from "@/components/ui/sonner";

export type View = "dashboard" | "placement" | "practice" | "plan" | "exams" | "classroom" | "social" | "pomodoro" | "coach" | "profile" | "teacher" | "admin";

const NAV: Record<Role, { id: View; label: string; icon: typeof LayoutDashboard }[]> = {
  student: [
    { id: "dashboard", label: "Panelim", icon: LayoutDashboard }, { id: "practice", label: "Seviyeme göre soru", icon: Target },
    { id: "plan", label: "Ödev & plan", icon: ClipboardList }, { id: "exams", label: "Deneme analizi", icon: BarChart3 },
    { id: "classroom", label: "Canlı sınıf", icon: Video }, { id: "social", label: "Soru paylaşımı", icon: MessagesSquare },
    { id: "pomodoro", label: "Pomodoro", icon: Timer }, { id: "coach", label: "AI koç", icon: BrainCircuit },
    { id: "placement", label: "Seviye testi", icon: BookOpen }, { id: "profile", label: "Profilim", icon: UserRound },
  ],
  teacher: [
    { id: "teacher", label: "Öğretmen paneli", icon: ClipboardList }, { id: "classroom", label: "Canlı sınıf", icon: Video },
    { id: "social", label: "Soru paylaşımı", icon: MessagesSquare }, { id: "coach", label: "AI koç", icon: BrainCircuit }, { id: "profile", label: "Profilim", icon: UserRound },
  ],
  admin: [
    { id: "admin", label: "Yönetici paneli", icon: ShieldCheck }, { id: "teacher", label: "Öğretmen araçları", icon: ClipboardList },
    { id: "classroom", label: "Canlı sınıflar", icon: Video }, { id: "social", label: "Soru paylaşımı", icon: MessagesSquare }, { id: "profile", label: "Profilim", icon: UserRound },
  ],
};
const ROLE_LABEL: Record<Role, string> = { student: "Öğrenci", teacher: "Öğretmen", admin: "Yönetici" };

export default function Home() {
  const me = useMe();
  if (me.isPending) return <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]" data-testid="app-loading"><div className="flex items-center gap-3 font-heading text-lg font-bold text-slate-900"><GraduationCap className="size-6 animate-pulse text-amber-500" /> AkademiAI</div></div>;
  if (me.isError || !me.data) return <Navigate to="/login" replace />;
  return <Shell me={me.data} />;
}

function Shell({ me }: { me: PublicUser }) {
  const locked = me.role === "student" && !me.placement_done;
  const [view, setView] = useState<View>(me.role === "student" ? "dashboard" : me.role === "teacher" ? "teacher" : "admin");
  const [subject, setSubject] = useState<string | undefined>();
  const [navOpen, setNavOpen] = useState(false);
  const go = (next: View, nextSubject?: string) => { setView(next); setSubject(nextSubject); setNavOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const items = NAV[me.role];
  const current = locked ? "placement" : view;
  const title = items.find((i) => i.id === current)?.label ?? "Seviye testi";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900" data-testid="app-shell">
      <Toaster richColors />
      <div className="flex min-h-screen">
        {navOpen && <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden" onClick={() => setNavOpen(false)} />}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-slate-200 bg-[#f8fafc] px-4 py-5 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${navOpen ? "translate-x-0" : "-translate-x-full"}`} data-testid="sidebar">
          <div className="mb-8 flex items-center justify-between px-3">
            <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-2xl bg-slate-900 text-amber-300 shadow-lg shadow-slate-900/15"><GraduationCap className="size-5" /></div><div><div className="font-heading text-[17px] font-bold tracking-tight" data-testid="sidebar-brand">AkademiAI</div><div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{ROLE_LABEL[me.role]} alanı</div></div></div>
            <button className="rounded-lg p-2 text-slate-500 lg:hidden" onClick={() => setNavOpen(false)} data-testid="sidebar-close"><X className="size-4" /></button>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto" data-testid="sidebar-nav">
            {items.map((item) => {
              const Icon = item.icon;
              const disabled = locked && item.id !== "placement";
              const selected = current === item.id;
              return (
                <button key={item.id} disabled={disabled} onClick={() => go(item.id)} className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-[background-color,color,transform] duration-200 ${selected ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" : disabled ? "cursor-not-allowed text-slate-300" : "text-slate-600 hover:translate-x-0.5 hover:bg-white hover:text-slate-900"}`} data-testid={`nav-${item.id}`}>
                  <Icon className={`size-[18px] ${selected ? "text-amber-300" : disabled ? "text-slate-300" : "text-slate-400 group-hover:text-amber-600"}`} />{item.label}
                  {disabled ? <Lock className="ml-auto size-3.5" /> : selected && <ChevronRight className="ml-auto size-4 text-slate-400" />}
                </button>
              );
            })}
          </nav>
          {locked && <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800" data-testid="sidebar-locked-note">Diğer bölümler seviye tespit sınavını tamamladığında açılır.</div>}
          <div className="rounded-2xl border border-slate-200 bg-white p-3" data-testid="sidebar-profile">
            <div className="flex items-center gap-3"><div className="relative"><div className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-800">{me.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>{me.role === "student" && <LevelIcon level={me.overall_level} className="absolute -bottom-1.5 -right-1.5 size-5 rounded-md ring-2 ring-white" testId="sidebar-level-icon" />}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-bold" data-testid="sidebar-user-name">{me.name}</div><div className="text-[11px] text-slate-500" data-testid="sidebar-user-meta">{me.role === "student" ? `${levelName(me.overall_level)} · ${me.points} puan` : ROLE_LABEL[me.role]}</div></div>
              <button onClick={() => endSession("/login")} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-600" title="Çıkış yap" data-testid="logout-button"><LogOut className="size-4" /></button>
            </div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-8" data-testid="top-header">
            <div className="flex items-center gap-3"><button onClick={() => setNavOpen(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden" data-testid="sidebar-open"><Menu className="size-5" /></button><div className="flex items-center gap-2 text-sm font-semibold text-slate-500" data-testid="breadcrumb"><span className="hidden sm:inline">AkademiAI</span><ChevronRight className="hidden size-3 sm:inline" /><span className="text-slate-900">{title}</span></div></div>
            {me.role === "student" && <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800" data-testid="header-points"><LevelIcon level={me.overall_level} className="size-5" /> {me.points} puan</div>}
          </header>
          <main className="mx-auto max-w-[1360px] px-4 py-7 sm:px-8 lg:py-10" data-testid="main-content">
            {current === "placement" && <Placement firstTime={locked} onDone={() => go("dashboard")} />}
            {current === "dashboard" && <StudentDashboard me={me} onView={go} />}
            {current === "practice" && <Practice key={subject ?? "auto"} initialSubject={subject} />}
            {current === "plan" && <StudyPlan onView={go} />}
            {current === "exams" && <ExamUpload />}
            {current === "classroom" && <Classroom me={me} />}
            {current === "social" && <Social me={me} />}
            {current === "pomodoro" && <Pomodoro />}
            {current === "coach" && <Coach me={me} />}
            {current === "profile" && <ProfileView me={me} />}
            {current === "teacher" && <TeacherPanel />}
            {current === "admin" && <AdminPanel />}
          </main>
        </div>
      </div>
    </div>
  );
}
