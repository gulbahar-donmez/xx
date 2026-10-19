import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Coffee, Flame, Pause, Play, RotateCcw, Tent, Timer } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { PomodoroOut, PomodoroStreak } from "@/lib/types";
import { PageHeader, SUBJECTS, fieldClass } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PRESETS = [{ label: "Odak 25 dk", minutes: 25 }, { label: "Derin 50 dk", minutes: 50 }, { label: "Deneme 1 dk", minutes: 1 }];

export default function Pomodoro() {
  const queryClient = useQueryClient();
  const [minutes, setMinutes] = useState(25);
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [breakTime, setBreakTime] = useState(false);
  const [today, setToday] = useState<number | null>(null);
  const done = useRef(false);
  const streak = useQuery({ queryKey: ["pomodoro-streak"], queryFn: () => apiGet<PomodoroStreak>("/pomodoro/streak") });
  const st = streak.isError ? undefined : streak.data;
  const complete = useMutation({
    mutationFn: () => apiPost<PomodoroOut>("/pomodoro/complete", { minutes, subject }),
    onSuccess: (d) => { setToday(d.today_count); if (d.camp_bonus) toast.success(`Kamp Ustası rozeti! ${d.streak} gün üst üste · +${d.camp_bonus} lig bonusu`, { duration: 6000 }); toast.success(`Pomodoro tamamlandı · +${d.points_awarded - d.camp_bonus} puan`); ["dashboard", "profile", "leaderboard", "pomodoro-streak", "league"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })); queryClient.invalidateQueries({ queryKey: meKey }); },
  });

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (left > 0 || !running || done.current) return;
    done.current = true;
    setRunning(false);
    if (!breakTime) { complete.mutate(); setBreakTime(true); setLeft(5 * 60); } else { setBreakTime(false); setLeft(minutes * 60); toast.message("Mola bitti, yeni oturuma hazırsın"); }
  }, [left, running, breakTime, minutes, complete]);

  const choose = (m: number) => { setMinutes(m); setLeft(m * 60); setRunning(false); setBreakTime(false); };
  const total = (breakTime ? 5 : minutes) * 60;
  const pct = ((total - left) / total) * 360;
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="space-y-8" data-testid="pomodoro-view">
      <PageHeader testId="pomodoro-header" eyebrow="Pomodoro tekniği" title="Odaklan, mola ver, puan kazan" description="Her tamamlanan odak oturumu 25 puan kazandırır ve 5 dakikalık mola başlar. Puanların liderlik tablosuna yansır." />
      <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <Card className="border-0 bg-slate-900 text-white shadow-xl" data-testid="pomodoro-timer-card">
          <CardContent className="flex flex-col items-center gap-8 p-10">
            <div className="relative size-64 rounded-full" style={{ background: `conic-gradient(${breakTime ? "#34d399" : "#f59e0b"} ${pct}deg, rgba(255,255,255,.08) ${pct}deg)` }} data-testid="pomodoro-ring">
              <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-slate-900">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{breakTime ? <><Coffee className="size-4" /> Mola</> : <><Timer className="size-4" /> {subject}</>}</div>
                <div className="font-heading text-6xl font-bold tabular-nums" data-testid="pomodoro-time">{mm}:{ss}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => { done.current = false; setRunning(!running); }} className="h-12 rounded-xl bg-amber-500 px-6 font-bold text-slate-950 hover:bg-amber-400" data-testid="pomodoro-toggle-button">{running ? <><Pause className="size-4" /> Duraklat</> : <><Play className="size-4" /> Başlat</>}</Button>
              <Button variant="outline" onClick={() => choose(minutes)} className="h-12 rounded-xl border-slate-600 bg-transparent text-white hover:bg-slate-800" data-testid="pomodoro-reset-button"><RotateCcw className="size-4" /> Sıfırla</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200/80 bg-white" data-testid="pomodoro-settings">
          <CardContent className="space-y-5 p-6">
            <div><div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Süre</div><div className="flex flex-wrap gap-2">{PRESETS.map((p) => <button key={p.minutes} onClick={() => choose(p.minutes)} className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${minutes === p.minutes ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:border-amber-300"}`} data-testid={`pomodoro-preset-${p.minutes}`}>{p.label}</button>)}</div></div>
            <div><div className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Çalışılan ders</div><select value={subject} onChange={(e) => setSubject(e.target.value)} className={fieldClass} data-testid="pomodoro-subject-select">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
            {st && <CampStreak st={st} />}
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900" data-testid="pomodoro-today">{today === null ? "Bugünkü oturum sayın ilk tamamlamada görünecek." : `Bugün ${today} pomodoro tamamladın.`}</div>
            <ul className="space-y-2 text-sm text-slate-500"><li>• Oturum boyunca telefon bildirimlerini kapat.</li><li>• Mola sırasında ekrandan uzaklaş, su iç.</li><li>• 4 oturumdan sonra 20 dakikalık uzun mola ver.</li></ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CampStreak({ st }: { st: PomodoroStreak }) {
  const inCycle = st.streak % st.target === 0 && st.streak > 0 && st.today_done ? st.target : st.streak % st.target;
  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4" data-testid="camp-streak-card">
      <div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold text-orange-900"><Tent className="size-4" /> Ders kampı</div><div className="flex items-center gap-1 text-sm font-bold text-orange-700" data-testid="camp-streak-count"><Flame className="size-4" /> {st.streak} gün seri</div></div>
      <div className="flex gap-1.5" data-testid="camp-streak-days">{Array.from({ length: st.target }, (_, i) => <div key={i} className={`h-2.5 flex-1 rounded-full transition-colors duration-500 ${i < inCycle ? "bg-orange-500" : "bg-orange-200/60"}`} />)}</div>
      <p className="mt-3 text-xs leading-5 text-orange-900/80" data-testid="camp-streak-hint">{st.camp_awards > 0 && st.today_done && st.streak > 0 && st.streak % st.target === 0 ? `Kamp Ustası oldun! Bonus +${st.bonus} lig puanı hesabına eklendi.` : `${st.target} gün üst üste en az bir pomodoro yap; “Kamp Ustası” rozeti ve +${st.bonus} lig bonusu kazan. ${st.today_done ? "Bugünkü gün tamam." : "Bugünkü pomodoronu yapmayı unutma."}`}{st.camp_awards > 0 && ` · ${st.camp_awards} kez kamp tamamladın.`}</p>
    </div>
  );
}
