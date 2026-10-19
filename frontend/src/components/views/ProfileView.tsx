import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Award, Save, Trophy } from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { Profile, PublicUser } from "@/lib/types";
import { LevelBadge, LevelIcon, PageHeader, SUBJECTS, errorText, fieldClass, levelName } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ProfileView({ me }: { me: PublicUser }) {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => apiGet<Profile>("/profile") });
  const [form, setForm] = useState({ name: me.name, grade: me.grade, target: me.target, bio: me.bio });
  const save = useMutation({ mutationFn: () => apiPatch<PublicUser>("/profile", form), onSuccess: (u) => { queryClient.setQueryData(meKey, u); queryClient.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profil güncellendi"); }, onError: (e) => toast.error(errorText(e, "Kaydedilemedi")) });
  const p = profile.isError ? undefined : profile.data;
  const stats = p ? [["Çözülen soru", p.stats.practice_solved], ["Doğru", p.stats.practice_correct], ["Pomodoro", p.stats.pomodoros], ["Odak dakikası", p.stats.focus_minutes], ["Paylaşılan soru", p.stats.posts], ["Verilen yanıt", p.stats.answers], ["Biten ödev", p.stats.assignments_done], ["Deneme", p.stats.exams]] as const : [];
  const field = (key: keyof typeof form, label: string) => <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span><input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className={fieldClass} data-testid={`profile-${key}-input`} /></label>;

  return (
    <div className="space-y-8" data-testid="profile-view">
      <PageHeader testId="profile-header" eyebrow="Öğrenci profili" title="Profilin ve gelişimin" />
      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="border-0 bg-slate-900 text-white" data-testid="profile-card">
          <CardContent className="p-8">
            <div className="flex items-center gap-5">
              <div className="relative"><div className="flex size-20 items-center justify-center rounded-3xl bg-amber-400 font-heading text-3xl font-bold text-slate-900" data-testid="profile-avatar">{me.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div><LevelIcon level={me.overall_level} className="absolute -bottom-2 -right-2 size-8 rounded-xl ring-2 ring-slate-900" testId="profile-level-icon" /></div>
              <div><div className="font-heading text-2xl font-bold" data-testid="profile-name">{me.name}</div><div className="text-sm text-slate-400">{me.grade} · {me.class_name || me.role}</div><div className="mt-1 text-sm text-amber-300">{me.target}</div></div>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white/5 p-3"><div className="font-heading text-2xl font-bold" data-testid="profile-points">{me.points}</div><div className="text-[11px] text-slate-400">Puan</div></div>
              <div className="rounded-2xl bg-white/5 p-3"><div className="font-heading text-2xl font-bold" data-testid="profile-rank">#{p?.rank ?? "—"}</div><div className="text-[11px] text-slate-400">Sıralama</div></div>
              <div className="rounded-2xl bg-white/5 p-3"><div className="font-heading text-lg font-bold" data-testid="profile-level-name">{levelName(me.overall_level)}</div><div className="text-[11px] text-slate-400">Seviye</div></div>
            </div>
            {me.bio && <p className="mt-6 text-sm leading-6 text-slate-300" data-testid="profile-bio">{me.bio}</p>}
            <div className="mt-6 flex flex-wrap gap-2" data-testid="profile-badges">{(p?.badges ?? []).map((b) => <span key={b} className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300"><Award className="size-3.5" /> {b}</span>)}{p && !p.badges.length && <span className="text-xs text-slate-500">Rozetler pratik ve pomodoro ile açılır.</span>}</div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="profile-stats">{stats.map(([label, value]) => <Card key={label} className="border-slate-200/80 bg-white"><CardContent className="p-4"><div className="font-heading text-2xl font-bold text-slate-900">{value}</div><div className="text-xs text-slate-500">{label}</div></CardContent></Card>)}</div>
          {me.role === "student" && <Card className="border-slate-200/80 bg-white" data-testid="profile-subject-levels"><CardContent className="grid gap-2 p-5 sm:grid-cols-2">{SUBJECTS.map((s) => <div key={s} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"><span className="font-semibold text-slate-700">{s} {me.subject_scores[s] !== undefined && <span className="text-slate-400">%{me.subject_scores[s]}</span>}</span><LevelBadge level={me.subject_levels[s] ?? 0} /></div>)}</CardContent></Card>}
          <Card className="border-slate-200/80 bg-white" data-testid="profile-form"><CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 font-heading text-base font-bold text-slate-900"><Trophy className="size-5 text-amber-500" /> Bilgilerini düzenle</div>
            <div className="grid gap-4 sm:grid-cols-2">{field("name", "Ad soyad")}{field("grade", "Sınıf")}{field("target", "Hedef bölüm")}{field("bio", "Kısa tanıtım")}</div>
            <Button onClick={() => save.mutate()} disabled={save.isPending} className="rounded-xl bg-slate-900 text-white" data-testid="profile-save-button"><Save className="size-4" /> Kaydet</Button>
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
