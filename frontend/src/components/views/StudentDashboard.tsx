import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, BrainCircuit, Flame, Play, Sparkles, Timer, Upload, Zap } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "@/lib/recharts";
import { apiGet } from "@/lib/api";
import type { Dashboard as DashboardData, PublicUser } from "@/lib/types";
import type { View } from "@/pages/Home";
import { EmptyState, LevelBadge, LevelIcon, toneClass } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentDashboard({ me, onView }: { me: PublicUser; onView: (view: View, subject?: string) => void }) {
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => apiGet<DashboardData>("/dashboard") });
  const data = dash.isError ? undefined : dash.data;
  return (
    <div className="space-y-8" data-testid="dashboard-view">
      <section className="relative overflow-hidden rounded-[28px] bg-slate-900 px-6 py-8 text-white shadow-xl sm:px-10 lg:py-10" data-testid="dashboard-hero">
        <div className="absolute -right-20 -top-28 size-72 rounded-full border-[38px] border-amber-400/10" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-300"><Sparkles className="size-4" /> {me.target || "Hedefini profilinden ekle"}</div>
            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl" data-testid="dashboard-greeting">Merhaba {me.name.split(" ")[0]}.<br /><span className="text-slate-300">Bugün seviyene uygun {data?.recommendations.length ?? 3} hamlen hazır.</span></h1>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button onClick={() => onView("practice")} className="h-11 rounded-xl bg-amber-500 px-5 font-bold text-slate-950 hover:bg-amber-400" data-testid="dashboard-practice-button"><Play className="size-4 fill-current" /> Seviyeme göre soru çöz</Button>
              <Button onClick={() => onView("pomodoro")} variant="outline" className="h-11 rounded-xl border-slate-600 bg-slate-800/60 px-5 font-bold text-white hover:bg-slate-700" data-testid="dashboard-pomodoro-button"><Timer className="size-4" /> Pomodoro başlat</Button>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5" data-testid="dashboard-level-card">
            <LevelIcon level={me.overall_level} className="size-14 rounded-2xl [&_svg]:size-7" testId="dashboard-level-icon" />
            <div><div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Genel seviye</div><div className="font-heading text-2xl font-bold" data-testid="dashboard-level-name">{data?.metrics[1]?.value ?? "—"}</div><div className="flex items-center gap-1 text-sm text-amber-300" data-testid="dashboard-points"><Flame className="size-4" /> {me.points} puan</div></div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="dashboard-metrics">
        {(data?.metrics ?? []).map((m, i) => (
          <Card key={m.label} className="metric-card border-slate-200/80 bg-white shadow-sm" data-testid={`dashboard-metric-${i}`}>
            <CardContent className="p-5"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{m.label}</div><div className="mt-3 flex items-end justify-between gap-2"><strong className="font-heading text-2xl font-bold text-slate-900" data-testid={`dashboard-metric-value-${i}`}>{m.value}</strong><Badge className={toneClass(m.tone)}>{m.hint}</Badge></div></CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="border-slate-200/80 bg-white" data-testid="dashboard-subject-levels">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between"><h2 className="font-heading text-lg font-bold text-slate-900">Ders bazlı seviyelerin</h2><Button variant="ghost" size="sm" onClick={() => onView("placement")} data-testid="dashboard-retake-button">Testi tekrarla</Button></div>
            <div className="space-y-4">
              {(data?.subject_scores ?? []).map((s) => (
                <div key={s.subject} data-testid={`dashboard-subject-${s.subject}`}>
                  <div className="mb-2 flex items-center justify-between text-sm"><span className="font-bold text-slate-800">{s.subject}</span><span className="flex items-center gap-2"><span className="font-bold text-slate-900">%{s.score}</span><LevelBadge level={s.level} /></span></div>
                  <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500 transition-[width] duration-700" style={{ width: `${s.score}%` }} /></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white" data-testid="dashboard-trend-card">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="font-heading text-lg font-bold text-slate-900">Deneme net trendi</h2><Button variant="ghost" size="sm" onClick={() => onView("exams")} data-testid="dashboard-upload-button"><Upload className="size-4" /> Deneme yükle</Button></div>
            {data?.trend.length ? (
              <div className="h-52" data-testid="dashboard-trend-chart">
                <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.trend}><defs><linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} /><YAxis hide /><Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} /><Area type="monotone" dataKey="net" stroke="#d97706" strokeWidth={3} fill="url(#netFill)" /></AreaChart></ResponsiveContainer>
              </div>
            ) : <EmptyState icon={BarChart3} title="Henüz deneme yok" text="Excel veya PDF deneme sonucunu yükle; netlerin burada grafiğe dönüşsün." testId="dashboard-trend-empty" />}
          </CardContent>
        </Card>
      </section>

      <section data-testid="dashboard-recommendations">
        <div className="mb-5 flex items-end justify-between"><div><div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">Seviyene göre öneriler</div><h2 className="font-heading text-2xl font-bold tracking-tight text-slate-900">Bugün için en değerli hamleler</h2></div><Button variant="ghost" onClick={() => onView("coach")} className="hidden gap-1 sm:flex" data-testid="dashboard-coach-button"><BrainCircuit className="size-4" /> AI koça sor</Button></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {(data?.recommendations ?? []).map((r) => (
            <Card key={r.id} className="group border-slate-200/80 bg-white shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg" data-testid={`recommendation-${r.id}`}>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between"><Badge className={toneClass(r.tone)}>{r.tag}</Badge><LevelIcon level={r.level} /></div>
                <h3 className="font-heading text-lg font-bold leading-snug text-slate-900">{r.title}</h3>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-500">{r.detail}</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="flex items-center gap-1.5 text-sm font-bold text-emerald-700"><Zap className="size-4" /> {r.gain} · {r.duration}</span><button onClick={() => onView("practice", r.subject)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900" data-testid={`recommendation-start-${r.id}`}><ArrowRight className="size-4" /></button></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
