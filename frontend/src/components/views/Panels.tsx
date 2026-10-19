import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ClipboardList, Plus, ShieldCheck, Users } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { AdminOverview, Assignment, StudentRow } from "@/lib/types";
import { EmptyState, LevelIcon, PageHeader, SUBJECTS, errorText, fieldClass } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function TeacherPanel() {
  const queryClient = useQueryClient();
  const students = useQuery({ queryKey: ["teacher-students"], queryFn: () => apiGet<StudentRow[]>("/teacher/students") });
  const assignments = useQuery({ queryKey: ["assignments"], queryFn: () => apiGet<Assignment[]>("/assignments") });
  const due = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const [form, setForm] = useState({ title: "", subject: SUBJECTS[0], topic: "", question_count: 20, due_date: due, target_all: true, student_ids: [] as string[] });
  const create = useMutation({ mutationFn: () => apiPost<Assignment>("/assignments", form), onSuccess: (a) => { toast.success(`Ödev ${a.assignee_count} öğrenciye atandı`); setForm({ ...form, title: "", topic: "", student_ids: [] }); queryClient.invalidateQueries({ queryKey: ["assignments"] }); }, onError: (e) => toast.error(errorText(e, "Ödev atanamadı")) });
  const toggle = (id: string) => setForm({ ...form, student_ids: form.student_ids.includes(id) ? form.student_ids.filter((x) => x !== id) : [...form.student_ids, id] });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };
  const list = students.data ?? [];

  return (
    <div className="space-y-8" data-testid="teacher-view">
      <PageHeader testId="teacher-header" eyebrow="Öğretmen paneli" title="Ödev ata, sınıfını takip et" description="Tek bir öğrenciye veya tüm sınıfa konu, soru sayısı ve teslim tarihiyle ödev ata. Öğrenciler planlarında görür ve tamamlandı olarak işaretler." />
      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Card className="border-slate-200/80 bg-white" data-testid="assignment-form-card">
          <CardContent className="p-6">
            <form onSubmit={submit} className="space-y-3" data-testid="assignment-form">
              <div className="flex items-center gap-2 font-heading text-base font-bold text-slate-900"><ClipboardList className="size-5 text-amber-600" /> Yeni ödev</div>
              <input required minLength={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Başlık (ör. Fonksiyonlar tekrar seti)" className={fieldClass} data-testid="assignment-title-input" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={fieldClass} data-testid="assignment-subject-select">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
                <input required minLength={2} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Konu" className={fieldClass} data-testid="assignment-topic-input" />
                <label className="text-xs font-bold text-slate-600">Soru sayısı<input type="number" min={1} max={200} value={form.question_count} onChange={(e) => setForm({ ...form, question_count: Number(e.target.value) || 1 })} className={`${fieldClass} mt-1`} data-testid="assignment-count-input" /></label>
                <label className="text-xs font-bold text-slate-600">Teslim tarihi<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className={`${fieldClass} mt-1`} data-testid="assignment-due-input" /></label>
              </div>
              <div className="flex rounded-xl border border-slate-200 p-1" data-testid="assignment-target-switch">
                {[{ v: true, l: "Tüm sınıf" }, { v: false, l: "Öğrenci seç" }].map((o) => <button type="button" key={o.l} onClick={() => setForm({ ...form, target_all: o.v })} className={`flex-1 rounded-lg py-2 text-xs font-bold ${form.target_all === o.v ? "bg-slate-900 text-white" : "text-slate-500"}`} data-testid={`assignment-target-${o.v ? "all" : "select"}`}>{o.l}</button>)}
              </div>
              {!form.target_all && <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2" data-testid="assignment-student-picker">{list.map((s) => <label key={s.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"><input type="checkbox" checked={form.student_ids.includes(s.id)} onChange={() => toggle(s.id)} data-testid={`assignment-student-${s.email.split("@")[0]}`} /><LevelIcon level={s.overall_level} className="size-5" /><span className="text-sm text-slate-700">{s.name}</span></label>)}</div>}
              <Button type="submit" disabled={create.isPending || (!form.target_all && !form.student_ids.length)} className="h-10 w-full rounded-xl bg-amber-500 font-bold text-slate-950 hover:bg-amber-400" data-testid="assignment-submit-button"><Plus className="size-4" /> Ödevi ata</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-3" data-testid="teacher-assignments">
          <h2 className="font-heading text-lg font-bold text-slate-900">Atanan ödevler</h2>
          {(assignments.data ?? []).length === 0 && <EmptyState icon={ClipboardList} title="Henüz ödev yok" text="Soldaki formdan ilk ödevini ata." testId="teacher-assignments-empty" />}
          {(assignments.data ?? []).map((a) => (
            <Card key={a.id} className="border-slate-200/80 bg-white" data-testid={`teacher-assignment-${a.id}`}><CardContent className="flex items-center gap-4 p-4">
              <div className="min-w-0 flex-1"><div className="font-heading font-bold text-slate-900">{a.title}</div><div className="text-sm text-slate-500">{a.subject} · {a.topic} · {a.question_count} soru · {new Date(a.due_date).toLocaleDateString("tr-TR")}</div></div>
              <Badge className="border-slate-200 bg-slate-50 text-slate-700">{a.target_all ? "Tüm sınıf" : "Seçili"}</Badge>
              <span className="text-sm font-bold text-emerald-700" data-testid={`teacher-assignment-progress-${a.id}`}>{a.completed_count}/{a.assignee_count}</span>
            </CardContent></Card>
          ))}
        </div>
      </div>
      <Card className="border-slate-200/80 bg-white" data-testid="teacher-students"><CardContent className="overflow-x-auto p-6">
        <div className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-slate-900"><Users className="size-5 text-amber-600" /> Öğrencilerim</div>
        <table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs font-bold uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Öğrenci</th><th className="pb-3">Sınıf</th><th className="pb-3">Seviye testi</th><th className="pb-3">Son deneme</th><th className="pb-3">Puan</th></tr></thead>
          <tbody>{list.map((s) => <tr key={s.id} className="border-t border-slate-100" data-testid={`teacher-student-${s.email.split("@")[0]}`}><td className="py-3"><span className="flex items-center gap-2 font-semibold text-slate-800"><LevelIcon level={s.overall_level} />{s.name}</span></td><td className="py-3 text-slate-500">{s.class_name}</td><td className="py-3">{s.placement_done ? <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Tamamlandı</Badge> : <Badge className="border-amber-200 bg-amber-50 text-amber-700">Bekliyor</Badge>}</td><td className="py-3 font-bold text-slate-900">{s.last_net ?? "—"}</td><td className="py-3 font-bold text-slate-900">{s.points}</td></tr>)}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

const COUNT_LABELS: Record<string, string> = { students: "Öğrenci", teachers: "Öğretmen", admins: "Yönetici", placements: "Seviye testi", exams: "Deneme analizi", posts: "Paylaşılan soru", active_classrooms: "Aktif canlı sınıf", assignments: "Ödev", pomodoros: "Pomodoro" };
const ROLE_LABELS: Record<string, string> = { student: "Öğrenci", teacher: "Öğretmen", admin: "Yönetici" };

export function AdminPanel() {
  const overview = useQuery({ queryKey: ["admin-overview"], queryFn: () => apiGet<AdminOverview>("/admin/overview") });
  const data = overview.isError ? undefined : overview.data;
  return (
    <div className="space-y-8" data-testid="admin-view">
      <PageHeader testId="admin-header" eyebrow="Yönetici paneli" title="Platformun genel görünümü" description="Kullanıcılar, rol bazlı erişim ve öğrenme etkinlikleri tek bakışta." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" data-testid="admin-counts">{Object.entries(data?.counts ?? {}).map(([k, v]) => <Card key={k} className="border-slate-200/80 bg-white" data-testid={`admin-count-${k}`}><CardContent className="p-4"><div className="font-heading text-2xl font-bold text-slate-900">{v}</div><div className="text-xs text-slate-500">{COUNT_LABELS[k] ?? k}</div></CardContent></Card>)}</div>
      <Card className="border-slate-200/80 bg-white" data-testid="admin-users"><CardContent className="overflow-x-auto p-6">
        <div className="mb-4 flex items-center gap-2 font-heading text-lg font-bold text-slate-900"><ShieldCheck className="size-5 text-emerald-600" /> Kullanıcılar ve yetkiler</div>
        <table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs font-bold uppercase tracking-wider text-slate-400"><tr><th className="pb-3">Ad</th><th className="pb-3">E-posta</th><th className="pb-3">Rol</th><th className="pb-3">Seviye</th><th className="pb-3">Puan</th></tr></thead>
          <tbody>{(data?.users ?? []).map((u) => <tr key={u.id} className="border-t border-slate-100" data-testid={`admin-user-${u.email.split("@")[0]}`}><td className="py-3 font-semibold text-slate-800"><span className="flex items-center gap-2"><LevelIcon level={u.overall_level} />{u.name}</span></td><td className="py-3 text-slate-500">{u.email}</td><td className="py-3"><Badge className="border-slate-200 bg-slate-50 text-slate-700">{ROLE_LABELS[u.role]}</Badge></td><td className="py-3 text-slate-600">{u.role === "student" ? u.overall_level || "—" : "—"}</td><td className="py-3 font-bold">{u.points}</td></tr>)}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}
