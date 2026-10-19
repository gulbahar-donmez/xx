import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Database, ImageUp, Loader2, PencilLine, Plus, Sparkles, Trash2, X } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiUpload } from "@/lib/api";
import type { FigureUploadOut, QuestionAdmin, QuestionDraft, QuestionGenerateIn } from "@/lib/types";
import { PageHeader, QuestionFigure, SUBJECTS, errorText, fieldClass } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

const EMPTY = { subject: SUBJECTS[0], topic: "", level: 2, kind: "new_gen" as "practice" | "new_gen", context: "", prompt: "", options: ["", "", "", "", ""], correct_index: 0, explanation: "", source: "", figure: "" };

const darkField = "h-10 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none placeholder:text-slate-500 transition-[border-color,box-shadow] focus:border-sky-400 focus:ring-3 focus:ring-sky-400/20";

export default function QuestionBank() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [filter, setFilter] = useState({ subject: "", kind: "" });
  const bank = useQuery({ queryKey: ["question-bank", filter], queryFn: () => apiGet<QuestionAdmin[]>(`/questions/bank?${new URLSearchParams(Object.entries(filter).filter(([, v]) => v)).toString()}`) });
  const refresh = () => ["question-bank", "new-gen", "practice"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  const create = useMutation({ mutationFn: () => { const options = form.options[4].trim() ? form.options : form.options.slice(0, 4); return apiPost<QuestionAdmin>("/questions", { ...form, options, correct_index: Math.min(form.correct_index, options.length - 1) }); }, onSuccess: () => { toast.success("Soru havuza eklendi"); setForm({ ...EMPTY, subject: form.subject, kind: form.kind }); refresh(); }, onError: (e) => toast.error(errorText(e, "Soru eklenemedi; tüm alanları doldur")) });
  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`/questions/${id}`), onSuccess: () => { toast.success("Soru silindi"); refresh(); }, onError: (e) => toast.error(errorText(e, "Silinemedi")) });
  const submit = (e: FormEvent) => { e.preventDefault(); create.mutate(); };
  const [gen, setGen] = useState<QuestionGenerateIn>({ subject: SUBJECTS[0], topic: "", level: 2, kind: "new_gen", notes: "" });
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const generate = useMutation({ mutationFn: () => apiPost<QuestionDraft>("/questions/generate", gen), onSuccess: (d) => { setDraft(d); toast.success("Gemini taslağı hazır; kontrol edip ekleyebilirsin"); }, onError: (e) => toast.error(errorText(e, "Taslak üretilemedi")) });
  const addDraft = useMutation({ mutationFn: (d: QuestionDraft) => apiPost<QuestionAdmin>("/questions", d), onSuccess: () => { toast.success("Taslak havuza eklendi"); setDraft(null); refresh(); }, onError: (e) => toast.error(errorText(e, "Taslak eklenemedi")) });
  const toForm = (d: QuestionDraft) => { setForm({ ...d, options: [...d.options, "", "", "", "", ""].slice(0, 5) }); setDraft(null); toast.message("Taslak forma aktarıldı; düzenleyip ekleyebilirsin"); };
  const upload = useMutation({ mutationFn: (file: File) => { const fd = new FormData(); fd.append("file", file); return apiUpload<FigureUploadOut>("/questions/figure", fd); }, onSuccess: (d) => { setForm((f) => ({ ...f, figure: d.url })); toast.success("Görsel yüklendi"); }, onError: (e) => toast.error(errorText(e, "Görsel yüklenemedi")) });
  const list = bank.isError ? [] : bank.data ?? [];

  return (
    <div className="space-y-8" data-testid="bank-view">
      <PageHeader testId="bank-header" eyebrow="Soru havuzu yönetimi" title="Maarif uyumlu soru ekle ve seviye etiketle" description="Bağlam (senaryo, tablo, grafik verisi) + soru kökü + 4-5 seçenek. Eklediğin yeni nesil sorular öğrencilerin “Yeni nesil sorular” sekmesinde, pratik soruları seviye bazlı pratikte görünür." />
      <Card className="relative overflow-hidden border-0 bg-slate-900 text-white shadow-xl" data-testid="ai-gen-card">
        <div className="pointer-events-none absolute -left-10 -top-20 size-64 rounded-full bg-sky-500/20 blur-3xl" />
        <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[.9fr_1.1fr]">
          <form onSubmit={(e) => { e.preventDefault(); generate.mutate(); }} className="space-y-3" data-testid="ai-gen-form">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-300"><Sparkles className="size-4" /> Gemini ile soru taslağı</div>
            <p className="text-sm leading-6 text-slate-300">Ders, konu ve seviye seç; Gemini Maarif uyumlu özgün bir taslak yazsın. Kontrol et, tek tıkla havuza ekle ya da forma aktarıp düzenle.</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <select value={gen.subject} onChange={(e) => setGen({ ...gen, subject: e.target.value })} className={darkField} data-testid="ai-gen-subject">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
              <select value={gen.level} onChange={(e) => setGen({ ...gen, level: Number(e.target.value) })} className={darkField} data-testid="ai-gen-level"><option value={1}>Seviye 1</option><option value={2}>Seviye 2</option><option value={3}>Seviye 3</option></select>
              <select value={gen.kind} onChange={(e) => setGen({ ...gen, kind: e.target.value as "practice" | "new_gen" })} className={`${darkField} col-span-2 sm:col-span-1`} data-testid="ai-gen-kind"><option value="new_gen">Yeni nesil</option><option value="practice">Pratik</option></select>
            </div>
            <input required minLength={2} value={gen.topic} onChange={(e) => setGen({ ...gen, topic: e.target.value })} placeholder="Konu (ör. Oran-orantı, Paragrafta ana düşünce)" className={darkField} data-testid="ai-gen-topic" />
            <input value={gen.notes} onChange={(e) => setGen({ ...gen, notes: e.target.value })} maxLength={300} placeholder="Ek not (isteğe bağlı): ör. market alışverişi bağlamı, tablo kullan" className={darkField} data-testid="ai-gen-notes" />
            <Button type="submit" disabled={generate.isPending} className="h-10 w-full rounded-xl bg-sky-400 font-bold text-slate-950 hover:bg-sky-300" data-testid="ai-gen-submit">{generate.isPending ? <><Loader2 className="size-4 animate-spin" /> Gemini yazıyor…</> : <><Sparkles className="size-4" /> Taslak üret</>}</Button>
          </form>
          <div className="min-h-[220px] rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur" data-testid="ai-draft-panel">
            {!draft ? <div className="flex h-full items-center justify-center text-center text-sm text-slate-400" data-testid="ai-draft-empty">{generate.isPending ? "Soru taslağı hazırlanıyor…" : "Üretilen taslak burada önizlenir."}</div> : (
              <div className="space-y-3" data-testid="ai-draft">
                <div className="flex flex-wrap gap-2 text-[11px] font-bold"><span className="rounded-full bg-white/10 px-2.5 py-1">{draft.subject} · {draft.topic}</span><span className="rounded-full bg-white/10 px-2.5 py-1">Seviye {draft.level}</span><span className="rounded-full bg-sky-400/20 px-2.5 py-1 text-sky-200">{draft.kind === "new_gen" ? "Yeni nesil" : "Pratik"}</span><button type="button" onClick={() => setDraft(null)} className="ml-auto rounded-lg p-1 text-slate-400 hover:text-white" data-testid="ai-draft-discard"><X className="size-4" /></button></div>
                <p className="text-sm leading-6 whitespace-pre-line text-slate-200" data-testid="ai-draft-context">{draft.context}</p>
                <p className="font-heading font-semibold text-white" data-testid="ai-draft-prompt">{draft.prompt}</p>
                <div className="grid gap-1.5 sm:grid-cols-2">{draft.options.map((o, i) => <div key={i} className={`rounded-lg px-3 py-2 text-sm ${i === draft.correct_index ? "bg-emerald-400/20 font-bold text-emerald-200" : "bg-white/5 text-slate-300"}`} data-testid={`ai-draft-option-${i}`}>{String.fromCharCode(65 + i)}) {o}</div>)}</div>
                <p className="text-xs leading-5 text-slate-400"><strong className="text-slate-200">Çözüm:</strong> {draft.explanation}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={() => addDraft.mutate(draft)} disabled={addDraft.isPending} className="rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300" data-testid="ai-draft-add"><Plus className="size-4" /> Tek tıkla havuza ekle</Button>
                  <Button variant="outline" onClick={() => toForm(draft)} className="rounded-xl border-white/20 bg-transparent text-white hover:bg-white/10" data-testid="ai-draft-edit"><PencilLine className="size-4" /> Forma aktar</Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
              <div className="flex gap-2">
                <input value={form.figure} onChange={(e) => setForm({ ...form, figure: e.target.value })} placeholder="Şekil: dosya yükle veya https:// bağlantı (isteğe bağlı)" className={fieldClass} data-testid="bank-figure-input" />
                <label className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 transition-colors hover:border-amber-400 hover:bg-amber-50 ${upload.isPending ? "pointer-events-none opacity-60" : ""}`} data-testid="bank-figure-upload-label">
                  {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />} Görsel yükle
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} data-testid="bank-figure-file" />
                </label>
              </div>
              {form.figure && <div className="relative"><QuestionFigure figure={form.figure} testId="bank-figure-preview" /><button type="button" onClick={() => setForm({ ...form, figure: "" })} className="absolute right-2 top-2 rounded-lg bg-white p-1 text-slate-400 shadow hover:text-red-600" data-testid="bank-figure-remove"><X className="size-4" /></button></div>}
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
