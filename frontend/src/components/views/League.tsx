import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HeartHandshake, Medal as MedalIcon, Timer, Trophy } from "lucide-react";
import { apiGet } from "@/lib/api";
import type { League as LeagueData, Medal, PublicUser } from "@/lib/types";
import { EmptyState, LevelIcon, PageHeader } from "@/components/common";
import { Card, CardContent } from "@/components/ui/card";

export const MEDAL_STYLE: Record<Exclude<Medal, "">, { label: string; ring: string; chip: string }> = {
  gold: { label: "Altın", ring: "ring-4 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,.45)]", chip: "bg-amber-100 text-amber-800" },
  silver: { label: "Gümüş", ring: "ring-4 ring-slate-300 shadow-[0_0_20px_rgba(148,163,184,.45)]", chip: "bg-slate-100 text-slate-700" },
  bronze: { label: "Bronz", ring: "ring-4 ring-orange-400/80 shadow-[0_0_20px_rgba(251,146,60,.4)]", chip: "bg-orange-100 text-orange-800" },
};

export default function League({ me }: { me: PublicUser }) {
  const [scope, setScope] = useState<"class" | "all">(me.role === "student" ? "class" : "all");
  const league = useQuery({ queryKey: ["league", scope], queryFn: () => apiGet<LeagueData>(`/league?scope=${scope}`) });
  const data = league.isError ? undefined : league.data;
  const top = data?.entries.slice(0, 3) ?? [];

  return (
    <div className="space-y-8" data-testid="league-view">
      <PageHeader testId="league-header" eyebrow={`Haftalık lig · ${data?.week ?? ""}`} title="Odaklan, yardım et, madalyayı kap" description="Lig puanı yalnızca pomodoro (+25) ve arkadaşlarının sorularına verdiğin yanıtlardan (+15) gelir. Hafta bitince ilk 3'e altın, gümüş, bronz madalya ve profil çerçevesi verilir." action={
        <div className="flex rounded-xl border border-slate-200 bg-white p-1" data-testid="league-scope-switch">{([["class", "Sınıfım"], ["all", "Tüm platform"]] as const).map(([v, l]) => <button key={v} onClick={() => setScope(v)} className={`rounded-lg px-4 py-2 text-xs font-bold ${scope === v ? "bg-slate-900 text-white" : "text-slate-500"}`} data-testid={`league-scope-${v}`}>{l}</button>)}</div>
      } />
      {top.length > 0 && (
        <section className="grid items-end gap-4 sm:grid-cols-3" data-testid="league-podium">
          {[1, 0, 2].filter((i) => top[i]).map((i) => {
            const e = top[i]; const m = MEDAL_STYLE[e.medal as Exclude<Medal, "">];
            return (
              <Card key={e.id} className={`border-slate-200/80 bg-white text-center ${i === 0 ? "sm:-translate-y-4" : ""}`} data-testid={`league-podium-${e.rank}`}>
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <div className={`flex size-16 items-center justify-center rounded-full bg-slate-900 font-heading text-xl font-bold text-white ${m.ring}`}>{e.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>
                  <div className="font-heading text-base font-bold text-slate-900">{e.name}</div>
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${m.chip}`}><MedalIcon className="size-3.5" /> {m.label} · {e.total} puan</span>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
        <Card className="border-slate-200/80 bg-white" data-testid="league-table">
          <CardContent className="overflow-x-auto p-6">
            <div className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-slate-900"><Trophy className="size-5 text-amber-500" /> {data?.scope_label ?? "Lig"}</div>
            {!data?.entries.length ? <EmptyState icon={Trophy} title="Bu hafta henüz puan yok" text="Bir pomodoro tamamla veya bir arkadaşının sorusunu yanıtla; lige ilk sen gir." testId="league-empty" /> : (
              <table className="w-full min-w-[520px] text-left text-sm"><thead className="text-xs font-bold uppercase tracking-wider text-slate-400"><tr><th className="pb-3">#</th><th className="pb-3">Öğrenci</th><th className="pb-3"><Timer className="inline size-3.5" /> Pomodoro</th><th className="pb-3"><HeartHandshake className="inline size-3.5" /> Yardım</th><th className="pb-3">Toplam</th></tr></thead>
                <tbody>{data.entries.map((e) => <tr key={e.id} className={`border-t border-slate-100 ${e.id === me.id ? "bg-amber-50/70" : ""}`} data-testid={`league-row-${e.rank}`}><td className="py-3 font-bold text-slate-500">{e.rank}</td><td className="py-3"><span className="flex items-center gap-2 font-semibold text-slate-800"><LevelIcon level={e.overall_level} />{e.name}<span className="text-xs font-normal text-slate-400">{e.class_name}</span></span></td><td className="py-3">{e.pomodoro_points}</td><td className="py-3">{e.help_points}</td><td className="py-3 font-bold text-slate-900" data-testid={`league-total-${e.rank}`}>{e.total}</td></tr>)}</tbody>
              </table>
            )}
          </CardContent>
        </Card>
        <Card className="h-fit border-slate-200/80 bg-[#fffbf2]" data-testid="league-last-week">
          <CardContent className="space-y-3 p-5">
            <div className="font-heading text-base font-bold text-slate-900">Geçen haftanın madalyalıları</div>
            {!data?.last_week.length && <p className="text-sm text-slate-500">Geçen hafta bu ligde puan toplanmadı.</p>}
            {data?.last_week.map((e) => { const m = MEDAL_STYLE[e.medal as Exclude<Medal, "">]; return <div key={e.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-amber-100" data-testid={`league-last-${e.rank}`}><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${m.chip}`}>{m.label}</span><span className="flex-1 text-sm font-semibold text-slate-800">{e.name}</span><span className="text-sm font-bold">{e.total}</span></div>; })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
