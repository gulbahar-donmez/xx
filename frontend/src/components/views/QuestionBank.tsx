import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Database, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import type { QuestionAdmin } from "@/lib/types";
import { PageHeader, SUBJECTS, errorText, fieldClass } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const EMPTY = { subject: SUBJECTS[0], topic: "", level: 2, kind: "new_gen" as "practice" | "new_gen", context: "", prompt: "", options: ["", "", "", "", ""], correct_index: 0, explanation: "", source: "", figure: "" };

export default function QuestionBank() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState({ subject: "", kind: "" });
  const bank = useQuery({ queryKey: ["question-bank", filter], queryFn: () => apiGet<QuestionAdmin[]>(`/questions/bank?${new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString()}`) });
  const refresh = () => ["question-bank", "new-gen", "practice"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  const create = useMutation({ mutationFn: () => { const options = form.options[4].trim() ? form.options : form.options.slice(0, 4); return apiPost<QuestionAdmin>("/questions", { ...form, options, correct_index: Math.min(form.correct_index, options.length - 1) }); }, onSuccess: () => { toast.success("Soru havuza eklendi"); setForm({ ...EMPTY, subject: form.subject, kind: form.kind }); refresh(); }, onError: (e) => toast.error(errorText(e, "Soru eklenemedi; tüm alanları doldur")) });
  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`/questions/${id}`), onSuccess: () => { toast.success("Soru silindi"); refresh(); }, onError: (e) => toast.error(errorText(e, "Silinemedi")) });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };
  const list = bank.isError ? [] : bank.data ?? [];

  return (
    <div className="space-y-8" data-testid="bank-view">
      <PageHeader testId="bank-header" eyebrow="Soru havuzu yönetimi" title="Maarif uyumlu soru ekle ve seviye etiketle" description="Bağlam (senaryo, tablo, grafik verisi) + soru kökü + 4-5 seçenek. Eklediğin yeni nesil sorular öğrencilerin “Yeni nesil sorular” sekmesinde, pratik soruları seviye bazlı pratikte görünür." />
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="border-slate-200/80 bg-white" data-testid="bank-form-card">
          <CardContent className="p-6">
            <form onSubmit={submit} className="space-y-3" data-testid="bank-form">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={fieldClass} data-testid="bank-subject-select">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
                <select value={form.level} onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} className={fieldClass} data-testid="bank-level-select"><option value={1}>Seviye 1 · Başlangıç</option><option value={2}>Seviye 2 · Gelişen</option><option value={3}>Seviye 3 · Yetkin</option></select>
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "practice" | "new_gen" })} className={fieldClass} data-testid="bank-kind-select"><option value="new_gen">Yeni nesil</option><option value="practice">Pratik</option></select>
                <input required minLength={2} value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Konu" className={fieldClass} data-testid="bank-topic-input" />
              </div>
              <Textarea required minLength={10} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} placeholder="Bağlam: gerçek hayat senaryosu, tablo veya veri (satır atlayabilirsin)" className="min-h-[90px] rounded-xl" data-testid="bank-context-input" />
              <input required minLength={5} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="Soru kökü" className={fieldClass} data-testid="bank-prompt-input" />
              <div className="space-y-2" data-testid="bank-options">
                {form.options.map((o, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input type="radio" name="correct" checked={form.correct_index === i} onChange={() => setForm({ ...form, correct_index: i })} data-testid={`bank-correct-${i}`} />
                    <span className="w-5 text-sm font-bold text-slate-500">{String.fromCharCode(65 + i)}</span>
                    <input required={i < 4} value={o} onChange={(e) => setForm({ ...form, options: form.options.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={i === 4 ? "E seçeneği (isteğe bağlı)" : `${String.fromCharCode(65 + i)} seçeneği`} className={fieldClass} data-testid={`bank-option-${i}`} />
                  </label>
                ))}
              </div>
              <Textarea required minLength={5} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Çözüm açıklaması" className="min-h-[70px] rounded-xl" data-testid="bank-explanation-input" />
              <input type="url" value={form.figure} onChange={(e) => setForm({ ...form, figure: e.target.value })} placeholder="Şekil / grafik görsel bağlantısı (https://..., isteğe bağlı)" className={fieldClass} data-testid="bank-figure-input" />
              <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="Kaynak (ör. MEB ÖDSGM örnek kitapçık 2025, sayfa 12)" className={fieldClass} data-testid="bank-source-input" />
              <Button type="submit" disabled={create.isPending} className="h-10 w-full rounded-xl bg-amber-500 font-bold text-slate-950 hover:bg-amber-400" data-testid="bank-submit-button"><Plus className="size-4" /> Havuza ekle</Button>
            </form>
          </CardContent>
        </Card>
        <div className="space-y-3" data-testid="bank-list">
          <div className="flex flex-wrap items-center gap-2"><Database className="size-5 text-amber-600" /><span className="font-heading text-lg font-bold text-slate-900">Havuz · {list.length} soru</span>
            <select value={filter.subject} onChange={(e) => setFilter({ ...filter, subject: e.target.value })} className={`${fieldClass.replace("w-full", "")} ml-auto w-32`} data-testid="bank-filter-subject"><option value="">Tüm dersler</option>{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
            <select value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })} className={`${fieldClass.replace("w-full", "")} w-32`} data-testid="bank-filter-kind"><option value="">Tüm türler</option><option value="new_gen">Yeni nesil</option><option value="practice">Pratik</option></select>
          </div>
          <div className="max-h-[900px] space-y-2 overflow-y-auto pr-1">
            {list.map((q) => (
              <Card key={q.id} className="border-slate-200/80 bg-white" data-testid={`bank-item-${q.id}`}>
                <CardContent className="p-4">
                  <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold"><Badge className="border-slate-200 bg-slate-50 text-slate-700">{q.subject}</Badge><span className="text-slate-500">{q.topic} · Seviye {q.level}</span><Badge className={q.kind === "new_gen" ? "border-sky-200 bg-sky-50 text-sky-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>{q.kind === "new_gen" ? "Yeni nesil" : "Pratik"}</Badge>{q.origin === "teacher" && <Badge className="border-amber-200 bg-amber-50 text-amber-800">{q.created_by_name}</Badge>}
                    {q.origin === "teacher" && <button onClick={() => remove.mutate(q.id)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" data-testid={`bank-delete-${q.id}`}><Trash2 className="size-4" /></button>}</div>
                  {q.figure && <span className="mb-1 inline-block rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700">Şekilli</span>}
                  <p className="text-sm font-semibold text-slate-800">{q.prompt}</p>
                  <p className="mt-1 text-xs text-emerald-700">Doğru: {String.fromCharCode(65 + q.correct_index)}) {q.options[q.correct_index]} · Kaynak: {q.source}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
