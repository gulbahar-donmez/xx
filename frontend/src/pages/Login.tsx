import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, BrainCircuit, GraduationCap, ShieldCheck, Target, Users } from "lucide-react";
import { apiPost } from "@/lib/api";
import { beginSession } from "@/lib/session";
import { meKey, useMe } from "@/hooks/useMe";
import type { PublicUser } from "@/lib/types";
import { errorText, fieldClass } from "@/components/common";
import { Button } from "@/components/ui/button";

const DEMO = [
  { label: "Öğrenci", email: "elif@akademi.ai", password: "Ogrenci123!" },
  { label: "Yeni öğrenci", email: "deniz@akademi.ai", password: "Ogrenci123!" },
  { label: "Öğretmen", email: "zeynep@akademi.ai", password: "Ogretmen123!" },
  { label: "Yönetici", email: "admin@akademi.ai", password: "Admin123!" },
];

export default function Login() {
  const me = useMe();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", target: "" });
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value });

  const auth = useMutation({
    mutationFn: () => mode === "login" ? apiPost<PublicUser>("/auth/login", { email: form.email, password: form.password }) : apiPost<PublicUser>("/auth/register", form),
    onSuccess: (user) => { beginSession(); queryClient.setQueryData(meKey, user); navigate("/", { replace: true }); },
  });

  if (me.data) return <Navigate to="/" replace />;
  const submit = (event: FormEvent) => { event.preventDefault(); auth.mutate(); };

  return (
    <div className="grid min-h-screen bg-[#f8fafc] lg:grid-cols-[1.05fr_1fr]" data-testid="login-page">
      <section className="relative hidden overflow-hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col" data-testid="login-hero">
        <div className="absolute -right-24 -top-24 size-96 rounded-full border-[48px] border-amber-400/10" />
        <div className="absolute bottom-10 left-1/3 size-64 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-900"><GraduationCap className="size-5" /></div>
          <div><div className="font-heading text-lg font-bold" data-testid="login-brand">AkademiAI</div><div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">YKS çalışma koçu</div></div>
        </div>
        <div className="relative mt-auto max-w-lg">
          <h1 className="font-heading text-5xl font-bold leading-[1.08] tracking-tight" data-testid="login-hero-title">Seviyeni bil.<br /><span className="text-amber-300">Planını yapalım.</span></h1>
          <p className="mt-6 text-base leading-7 text-slate-300">Seviye tespit sınavıyla başla; sana uygun konu anlatımı, bağlam temelli sorular, öğretmeninle canlı ders ve arkadaşlarınla soru paylaşımı tek yerde.</p>
          <div className="mt-10 grid grid-cols-3 gap-4 text-sm">
            {[{ icon: Target, t: "Seviye testi" }, { icon: BrainCircuit, t: "AI koç" }, { icon: Users, t: "Canlı sınıf" }].map(({ icon: Icon, t }) => (
              <div key={t} className="rounded-2xl border border-white/10 bg-white/5 p-4"><Icon className="mb-3 size-5 text-amber-300" /><div className="font-semibold">{t}</div></div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><div className="font-heading text-2xl font-bold text-slate-900">AkademiAI</div></div>
          <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1" data-testid="auth-mode-switch">
            {(["login", "register"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); auth.reset(); }} className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${mode === m ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`} data-testid={`auth-mode-${m}`}>{m === "login" ? "Giriş yap" : "Öğrenci kaydı"}</button>
            ))}
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900" data-testid="auth-title">{mode === "login" ? "Tekrar hoş geldin" : "Hesabını oluştur"}</h2>
          <p className="mt-2 text-sm text-slate-500" data-testid="auth-subtitle">{mode === "login" ? "Öğrenci, öğretmen veya yönetici hesabınla giriş yap." : "Kayıttan sonra seni kısa bir seviye tespit sınavı karşılayacak."}</p>

          <form onSubmit={submit} className="mt-8 space-y-4" data-testid="auth-form">
            {mode === "register" && (
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Ad soyad</span><input required value={form.name} onChange={set("name")} className={fieldClass} placeholder="Adın ve soyadın" data-testid="auth-name-input" /></label>
            )}
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">E-posta</span><input required type="email" value={form.email} onChange={set("email")} className={fieldClass} placeholder="ornek@okul.com" data-testid="auth-email-input" /></label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Şifre</span><input required type="password" minLength={6} value={form.password} onChange={set("password")} className={fieldClass} placeholder="En az 6 karakter" data-testid="auth-password-input" /></label>
            {mode === "register" && (
              <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Hedef bölüm (isteğe bağlı)</span><input value={form.target} onChange={set("target")} className={fieldClass} placeholder="Örn. ODTÜ Bilgisayar Müh." data-testid="auth-target-input" /></label>
            )}
            {auth.isError && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" data-testid="auth-error">{errorText(auth.error, "Bağlantı kurulamadı, lütfen tekrar dene.")}</div>}
            <Button type="submit" disabled={auth.isPending} className="h-11 w-full rounded-xl bg-amber-500 font-bold text-slate-950 hover:bg-amber-400" data-testid="auth-submit-button">
              {auth.isPending ? "Bekleyin..." : mode === "login" ? "Giriş yap" : "Kaydol ve teste başla"} <ArrowRight className="size-4" />
            </Button>
          </form>

          {mode === "login" && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4" data-testid="demo-accounts">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500"><ShieldCheck className="size-4 text-emerald-600" /> Demo hesaplar</div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO.map((d) => (
                  <button key={d.email} type="button" onClick={() => setForm({ ...form, email: d.email, password: d.password })} className="rounded-xl border border-slate-200 px-3 py-2 text-left transition-colors hover:border-amber-300 hover:bg-amber-50" data-testid={`demo-account-${d.email.split("@")[0]}`}>
                    <div className="text-xs font-bold text-slate-800">{d.label}</div><div className="truncate text-[11px] text-slate-500">{d.email}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
