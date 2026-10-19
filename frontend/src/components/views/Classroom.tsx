import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CircleHelp, Copy, ExternalLink, LogIn, MessageSquare, Plus, Radio, Send, Video, X } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import type { ClassroomDetail, ClassroomSummary, PublicUser } from "@/lib/types";
import { EmptyState, LevelIcon, PageHeader, SUBJECTS, errorText, fieldClass } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Classroom({ me }: { me: PublicUser }) {
  const queryClient = useQueryClient();
  const isTeacher = me.role !== "student";
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", subject: SUBJECTS[0], code: "" });
  const rooms = useQuery({ queryKey: ["classrooms"], queryFn: () => apiGet<ClassroomSummary[]>("/classrooms") });
  const open = (room: ClassroomDetail) => { queryClient.setQueryData(["classroom", room.id], room); queryClient.invalidateQueries({ queryKey: ["classrooms"] }); setSelected(room.id); };
  const create = useMutation({ mutationFn: () => apiPost<ClassroomDetail>("/classrooms", { title: form.title, subject: form.subject }), onSuccess: (r) => { toast.success(`Oda açıldı · Kod: ${r.code}`); open(r); }, onError: (e) => toast.error(errorText(e, "Oda açılamadı")) });
  const join = useMutation({ mutationFn: () => apiPost<ClassroomDetail>("/classrooms/join", { code: form.code }), onSuccess: (r) => { toast.success("Sınıfa katıldın"); open(r); }, onError: (e) => toast.error(errorText(e, "Katılım başarısız")) });

  if (selected) return <LiveRoom id={selected} me={me} onBack={() => setSelected(null)} />;
  const submit = (e: FormEvent) => { e.preventDefault(); if (isTeacher) create.mutate(); else join.mutate(); };

  return (
    <div className="space-y-8" data-testid="classroom-view">
      <PageHeader testId="classroom-header" eyebrow="Canlı classroom" title={isTeacher ? "Canlı soru çözüm odası başlat" : "Öğretmeninin canlı dersine katıl"} description={isTeacher ? "Oda açıldığında öğrencilere paylaşacağın 6 haneli bir kod oluşur. Görüntülü ders, katılımcı listesi ve soru akışı tek ekranda." : "Öğretmeninden aldığın 6 haneli oda kodunu gir; görüntülü derse, katılımcı listesine ve soru akışına eriş."} />
      <Card className="border-slate-200/80 bg-white" data-testid="classroom-form-card">
        <CardContent className="p-6">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]" data-testid="classroom-form">
            {isTeacher ? (
              <>
                <input required minLength={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ders başlığı (ör. TYT Problemler kliniği)" className={fieldClass} data-testid="classroom-title-input" />
                <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className={`${fieldClass} sm:w-40`} data-testid="classroom-subject-select">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select>
                <Button type="submit" disabled={create.isPending} className="h-10 rounded-xl bg-amber-500 font-bold text-slate-950 hover:bg-amber-400" data-testid="classroom-create-button"><Plus className="size-4" /> Odayı başlat</Button>
              </>
            ) : (
              <>
                <input required minLength={4} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Oda kodu (ör. K7M2QP)" className={`${fieldClass} font-mono tracking-[0.3em] sm:col-span-2`} data-testid="classroom-code-input" />
                <Button type="submit" disabled={join.isPending} className="h-10 rounded-xl bg-amber-500 font-bold text-slate-950 hover:bg-amber-400" data-testid="classroom-join-button"><LogIn className="size-4" /> Katıl</Button>
              </>
            )}
          </form>
        </CardContent>
      </Card>
      <section className="space-y-3" data-testid="classroom-list">
        <h2 className="font-heading text-lg font-bold text-slate-900">{isTeacher ? "Açtığın odalar" : "Katıldığın odalar"}</h2>
        {(rooms.data ?? []).length === 0 && <EmptyState icon={Video} title="Henüz oda yok" text={isTeacher ? "İlk canlı dersini başlat; kod otomatik oluşur." : "Oda koduyla katıldığın dersler burada listelenir."} testId="classroom-list-empty" />}
        <div className="grid gap-3 md:grid-cols-2">
          {(rooms.data ?? []).map((r) => (
            <button key={r.id} onClick={() => setSelected(r.id)} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md" data-testid={`classroom-item-${r.code}`}>
              <div className={`flex size-11 items-center justify-center rounded-2xl ${r.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}><Radio className="size-5" /></div>
              <div className="min-w-0 flex-1"><div className="truncate font-heading font-bold text-slate-900">{r.title}</div><div className="text-sm text-slate-500">{r.subject} · {r.teacher_name} · {r.participant_count} kişi</div></div>
              <Badge className={r.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}>{r.status === "active" ? r.code : "Bitti"}</Badge>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function LiveRoom({ id, me, onBack }: { id: string; me: PublicUser; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"message" | "question">("message");
  const [embed, setEmbed] = useState(false);
  const room = useQuery({ queryKey: ["classroom", id], queryFn: () => apiGet<ClassroomDetail>(`/classrooms/${id}`), refetchInterval: 3000 });
  const send = useMutation({ mutationFn: () => apiPost<ClassroomDetail>(`/classrooms/${id}/messages`, { text, kind }), onSuccess: (r) => { queryClient.setQueryData(["classroom", id], r); setText(""); }, onError: (e) => toast.error(errorText(e, "Mesaj gönderilemedi")) });
  const end = useMutation({ mutationFn: () => apiPost(`/classrooms/${id}/end`), onSuccess: () => { toast.success("Oturum sonlandırıldı"); queryClient.invalidateQueries({ queryKey: ["classroom", id] }); queryClient.invalidateQueries({ queryKey: ["classrooms"] }); } });
  const r = room.data;
  if (!r) return <EmptyState icon={Video} title="Oda yükleniyor" text="Canlı sınıf bilgileri alınıyor." testId="live-room-loading" action={<Button variant="outline" onClick={onBack}>Geri</Button>} />;
  const active = r.status === "active";
  const videoUrl = `${r.video_url}#userInfo.displayName=${encodeURIComponent(`"${me.name}"`)}&config.prejoinPageEnabled=false`;

  return (
    <div className="space-y-6" data-testid="live-room">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <button onClick={onBack} className="mb-2 text-sm font-semibold text-slate-500 hover:text-slate-900" data-testid="live-room-back">← Odalar</button>
          <h1 className="font-heading text-2xl font-bold text-slate-900" data-testid="live-room-title">{r.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500"><span className={`size-2 rounded-full ${active ? "animate-pulse bg-emerald-500" : "bg-slate-300"}`} /> {active ? "Canlı" : "Oturum bitti"} · {r.subject} · {r.teacher_name}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { navigator.clipboard?.writeText(r.code); toast.success("Kod kopyalandı"); }} className="flex items-center gap-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 px-4 py-2 font-mono text-lg font-bold tracking-[0.3em] text-amber-800" data-testid="live-room-code">{r.code} <Copy className="size-4" /></button>
          {r.is_teacher && active && <Button variant="destructive" onClick={() => end.mutate()} className="h-11 rounded-xl" data-testid="live-room-end-button"><X className="size-4" /> Bitir</Button>}
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]">
        <div className="space-y-4">
          <Card className="overflow-hidden border-slate-200/80 bg-slate-900 text-white" data-testid="live-room-video">
            {embed && active ? (
              <iframe src={videoUrl} title="Canlı ders" allow="camera; microphone; fullscreen; display-capture; autoplay" className="h-[460px] w-full border-0" data-testid="live-room-iframe" />
            ) : (
              <CardContent className="flex h-[300px] flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300"><Video className="size-7" /></div>
                <div className="font-heading text-xl font-bold">{active ? "Görüntülü ders hazır" : "Bu oturum sona erdi"}</div>
                <p className="max-w-md text-sm text-slate-400">Jitsi Meet ile kamera ve mikrofon açarak katıl. Kesintisiz deneyim için yeni sekmede açman önerilir.</p>
                {active && <div className="flex flex-wrap justify-center gap-2"><a href={videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 hover:bg-amber-400" data-testid="live-room-open-video"><ExternalLink className="size-4" /> Videoya katıl</a><Button variant="outline" onClick={() => setEmbed(true)} className="h-10 rounded-xl border-slate-600 bg-transparent text-white hover:bg-slate-800" data-testid="live-room-embed-button">Sayfada aç</Button></div>}
              </CardContent>
            )}
          </Card>
          <Card className="border-slate-200/80 bg-white" data-testid="live-room-chat">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3 font-heading text-sm font-bold text-slate-900"><MessageSquare className="size-4 text-amber-600" /> Soru & mesaj akışı</div>
              <div className="max-h-[340px] space-y-3 overflow-y-auto p-5" data-testid="live-room-messages">
                {r.messages.length === 0 && <p className="text-sm text-slate-400" data-testid="live-room-messages-empty">Henüz mesaj yok. İlk soruyu sen sor!</p>}
                {r.messages.map((m) => (
                  <div key={m.id} className={`rounded-xl p-3 text-sm ${m.kind === "question" ? "border border-amber-200 bg-amber-50" : "bg-slate-50"}`} data-testid={`live-message-${m.id}`}>
                    <div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-600"><LevelIcon level={m.overall_level} className="size-5" />{m.user_name}{m.role !== "student" && <Badge className="border-slate-200 bg-slate-900 text-white">Öğretmen</Badge>}{m.kind === "question" && <span className="flex items-center gap-1 text-amber-700"><CircleHelp className="size-3.5" /> Soru</span>}<span className="ml-auto font-normal text-slate-400">{new Date(m.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span></div>
                    <p className="leading-6 text-slate-700">{m.text}</p>
                  </div>
                ))}
              </div>
              {active && (
                <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) send.mutate(); }} className="flex gap-2 border-t border-slate-100 p-4" data-testid="live-room-form">
                  <select value={kind} onChange={(e) => setKind(e.target.value as "message" | "question")} className={`${fieldClass.replace("w-full", "")} w-28 shrink-0`} data-testid="live-room-kind-select"><option value="message">Mesaj</option><option value="question">Soru</option></select>
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Yaz..." className={fieldClass} data-testid="live-room-message-input" />
                  <Button type="submit" disabled={send.isPending || !text.trim()} className="h-10 rounded-xl bg-slate-900 text-white" data-testid="live-room-send-button"><Send className="size-4" /></Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
        <Card className="h-fit border-slate-200/80 bg-white" data-testid="live-room-participants">
          <CardContent className="p-5">
            <div className="mb-4 font-heading text-sm font-bold text-slate-900">Katılımcılar · {r.participants.length}</div>
            <div className="space-y-2">
              {r.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2" data-testid={`participant-${p.id}`}><LevelIcon level={p.overall_level} /><span className="text-sm font-semibold text-slate-800">{p.name}</span>{p.role !== "student" && <span className="ml-auto text-[11px] font-bold uppercase text-amber-700">Öğretmen</span>}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
