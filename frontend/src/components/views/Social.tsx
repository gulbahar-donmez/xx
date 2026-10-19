import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Send, Trophy, Users } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { meKey } from "@/hooks/useMe";
import type { LeaderEntry, Post, PublicUser } from "@/lib/types";
import { EmptyState, LevelIcon, PageHeader, SUBJECTS, errorText, fieldClass } from "@/components/common";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function Social({ me }: { me: PublicUser }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ subject: SUBJECTS[0], text: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const posts = useQuery({ queryKey: ["posts"], queryFn: () => apiGet<Post[]>("/social/posts"), refetchInterval: 15000 });
  const leaders = useQuery({ queryKey: ["leaderboard"], queryFn: () => apiGet<LeaderEntry[]>("/leaderboard") });
  const refresh = () => { ["posts", "leaderboard", "profile"].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })); queryClient.invalidateQueries({ queryKey: meKey }); };
  const create = useMutation({ mutationFn: () => apiPost<Post>("/social/posts", draft), onSuccess: () => { setDraft({ ...draft, text: "" }); toast.success("Sorun paylaşıldı · +5 puan"); refresh(); }, onError: (e) => toast.error(errorText(e, "Paylaşılamadı (en az 5 karakter)")) });
  const answer = useMutation({ mutationFn: (postId: string) => apiPost<Post>(`/social/posts/${postId}/answers`, { text: answers[postId] }), onSuccess: (post) => { setAnswers({ ...answers, [post.id]: "" }); toast.success(post.author.id === me.id ? "Yanıt eklendi" : "Arkadaşına yardım ettin · +15 puan"); refresh(); }, onError: (e) => toast.error(errorText(e, "Yanıt gönderilemedi")) });

  return (
    <div className="space-y-8" data-testid="social-view">
      <PageHeader testId="social-header" eyebrow="Soru paylaşım ortamı" title="Birbirinize soru sorun, birlikte çözün" description="Takıldığın soruyu paylaş (+5 puan), arkadaşlarının sorularını yanıtla (+15 puan). Herkesin yanında seviye ikonu görünür." />
      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="space-y-5">
          <Card className="border-slate-200/80 bg-white" data-testid="social-compose">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-3"><LevelIcon level={me.overall_level} testId="social-my-level" /><span className="text-sm font-bold text-slate-800">{me.name}</span><select value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} className={`${fieldClass.replace("w-full", "")} ml-auto w-36`} data-testid="social-subject-select">{SUBJECTS.map((s) => <option key={s}>{s}</option>)}</select></div>
              <Textarea value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="Sorunu ve nerede takıldığını yaz..." className="min-h-[90px] rounded-xl" data-testid="social-post-input" />
              <div className="flex justify-end"><Button onClick={() => create.mutate()} disabled={create.isPending || draft.text.trim().length < 5} className="rounded-xl bg-amber-500 font-bold text-slate-950 hover:bg-amber-400" data-testid="social-post-button"><Send className="size-4" /> Paylaş</Button></div>
            </CardContent>
          </Card>
          {(posts.data ?? []).length === 0 && <EmptyState icon={Users} title="Henüz soru paylaşılmadı" text="İlk soruyu sen paylaş, sınıf arkadaşların yanıtlasın." testId="social-empty" />}
          {(posts.data ?? []).map((p) => (
            <Card key={p.id} className="border-slate-200/80 bg-white" data-testid={`post-${p.id}`}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3"><LevelIcon level={p.author.overall_level} testId={`post-author-level-${p.id}`} /><div><div className="text-sm font-bold text-slate-900" data-testid={`post-author-${p.id}`}>{p.author.name}</div><div className="text-[11px] text-slate-400">{p.author.points} puan · {new Date(p.created_at).toLocaleDateString("tr-TR")}</div></div><Badge className="ml-auto border-slate-200 bg-slate-50 text-slate-700">{p.subject}</Badge></div>
                <p className="text-sm leading-7 text-slate-700" data-testid={`post-text-${p.id}`}>{p.text}</p>
                <div className="space-y-2 border-l-2 border-amber-200 pl-4">
                  {p.answers.map((a) => (
                    <div key={a.id} className="rounded-xl bg-slate-50 p-3" data-testid={`answer-${a.id}`}><div className="mb-1 flex items-center gap-2 text-xs font-bold text-slate-700"><LevelIcon level={a.author.overall_level} className="size-5" />{a.author.name}{a.author.role === "teacher" && <Badge className="border-slate-200 bg-slate-900 text-white">Öğretmen</Badge>}</div><p className="text-sm leading-6 text-slate-600">{a.text}</p></div>
                  ))}
                  <div className="flex gap-2">
                    <input value={answers[p.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [p.id]: e.target.value })} placeholder="Yanıtını veya ipucunu yaz..." className={fieldClass} data-testid={`answer-input-${p.id}`} />
                    <Button onClick={() => answer.mutate(p.id)} disabled={answer.isPending || (answers[p.id] ?? "").trim().length < 2} className="h-10 rounded-xl bg-slate-900 text-white" data-testid={`answer-button-${p.id}`}><MessageCircle className="size-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-fit border-slate-200/80 bg-white" data-testid="leaderboard">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2 font-heading text-base font-bold text-slate-900"><Trophy className="size-5 text-amber-500" /> Haftanın liderleri</div>
            <div className="space-y-2">
              {(leaders.data ?? []).map((l, i) => (
                <div key={l.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${l.id === me.id ? "bg-amber-50 ring-1 ring-amber-200" : "bg-slate-50"}`} data-testid={`leader-${i + 1}`}>
                  <span className={`w-5 text-center text-sm font-bold ${i < 3 ? "text-amber-600" : "text-slate-400"}`}>{i + 1}</span><LevelIcon level={l.overall_level} /><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{l.name}</span><span className="text-sm font-bold text-slate-900" data-testid={`leader-points-${i + 1}`}>{l.points}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
