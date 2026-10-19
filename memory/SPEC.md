# AkademiAI — Living Spec

## Purpose
Türkçe YKS hazırlık platformu. Öğrenci kayıt olunca **zorunlu seviye tespit sınavı** çözer; ders bazlı seviyesi (Başlangıç/Gelişen/Yetkin/Uzman, ikonlu) belirlenir. Sonra seviyesine göre öneriler, pratik soruları, YKS dağılımına göre deneme analizi, öğretmen ödevleri, canlı sınıf, soru paylaşım ortamı, pomodoro ile puan ve profil.

## Stack (zorunlu: Python + JavaScript)
- Backend: Python 3.11 · FastAPI · Pydantic v2 · MongoDB (motor). Tüm route'lar `/api` altında (`backend/routers/*`).
- Frontend: React 19 + TypeScript (JavaScript ekosistemi) · Vite · Tailwind v4 · shadcn/ui · TanStack Query · Recharts.
- Not: Proje dokümanı PostgreSQL diyor; şablon MongoDB ile çalışıyor (spec deviation).

## Auth & roller
- E-posta/şifre, bcrypt hash, httpOnly `akademi_session` JWT cookie (7 gün, `JWT_SECRET` .env).
- `/api/auth/register` (yalnızca öğrenci kaydı), `/login`, `/logout`, `/me`.
- Roller: `student`, `teacher`, `admin`. `require_roles` ile backend'de zorlanır (öğrenci → admin 403).
- Demo hesaplar: `memory/test_credentials.md`.

## Key flows
1. **Seviye testi** (`/api/placement/test|submit|latest`): 15 bağlam temelli soru (5 ders × 3 zorluk). Puanlama: zorluk ağırlıklı (1/2/3), 4 yanlış 1 doğru. Ders skoru % → seviye: <40 Başlangıç, 40-69 Gelişen, 70-89 Yetkin, ≥90 Uzman. İlk tamamlamada +100 puan. Test bitmeden öğrenci menüsü kilitli.
2. **Soru bankası** `backend/lib/question_bank.py`: 30 özgün soru, Türkiye Yüzyılı Maarif Modeli bağlam temelli soru yazım kılavuzuna (MEB, Mart 2026) uygun yazıldı. `correct_index` istemciye gönderilmez.
3. **Pratik** (`/api/practice?subject=`, `/practice/answer`): öğrencinin ders seviyesi ve bir üstü bandından sorular; ilk doğru çözüm +10 puan, açıklama döner.
4. **Öneriler** (`/api/recommendations`, dashboard): en zayıf 2 ders + en güçlü ders (koruma), seviyeye göre plan metni; son denemeden YKS ağırlıklı en büyük net potansiyelli ders öne eklenir.
5. **Deneme analizi** (`/api/exams/distributions|parse|`): TYT (Türkçe 40, Tarih/Coğrafya/Felsefe/Din 5'er, Matematik 40, Fizik 7, Kimya 7, Biyoloji 6 = 120), AYT-SAY (Mat 40, Fiz 14, Kim 13, Bio 13), AYT-EA (Mat 40, Edebiyat 24, Tarih-1 10, Coğ-1 6), AYT-SÖZ. Excel/CSV otomatik okunur, PDF metin katmanından okunur, okunamazsa dağılıma göre boş form. Doğru+yanlış > soru sayısı → 422. Ders başına net, %başarı, seviye, seviye tavsiyesi; tahmini ham puan (yaklaşık). +15 puan.
6. **Ödevler** (`/api/assignments`, `/assignments/mine`, `/assignments/{id}/complete`): öğretmen tek/çoklu öğrenci veya tüm sınıfa; öğrenci tamamlar (+50).
7. **Canlı sınıf** (`/api/classrooms`, `/join`, `/{id}`, `/{id}/messages`, `/{id}/end`): 6 haneli kod, katılımcı listesi, mesaj/soru akışı (3 sn polling), Jitsi Meet video (`JITSI_DOMAIN`, varsayılan meet.jit.si; yeni sekmede veya sayfada iframe). Katılmayan kullanıcı odayı göremez (403).
8. **Soru paylaşımı** (`/api/social/posts`, `/answers`) + `/api/leaderboard`: soru +5, başkasına yanıt +15; herkesin yanında seviye ikonu.
9. **Pomodoro** (`/api/pomodoro/complete`): 25/50/1 dk preset, tamamlanınca +25 ve 5 dk mola.
10. **Profil** (`/api/profile` GET/PATCH): seviye ikonu, puan, sıralama, istatistikler, rozetler.
11. **AI koç** (`/api/chat/stream`, SSE): `GEMINI_API_KEY` varsa Gemini `gemini-3-flash-preview` (öğrencinin seviyeleri sistem mesajında), yoksa **MOCK** yanıtlar. Anahtar kullanıcı tarafından sağlandı ve `.env`'de; yanıtlar düz metin + Unicode matematik (Markdown/LaTeX yok).
12. **Admin** (`/api/admin/overview`): sayaçlar + kullanıcı/rol listesi.

## v3 additions
13. **Soru bankası Mongo'da** (`questions`): açılışta `sync_bank()` ile 99 sistem sorusu upsert edilir (15 seviye testi, 45 pratik = her ders×seviye 4 adet [`lib/question_bank_extra.py`], 39 yeni nesil; bunların 14'ü SVG şekilli [`lib/question_bank_figures.py`]). Sorular özgündür; ÖSYM/yayınevi soruları telif nedeniyle kopyalanmaz (kullanıcının yüklediği Çap PDF'i yalnızca tarz referansıdır).
14. **Yeni nesil sorular** (`/api/questions/new-gen?subject=`): şekilli filtre, kaynak etiketi, resmî kaynak linkleri (ÖSYM çıkmış sorular, OGM Materyal, ÖDSGM). Cevap `/api/practice/answer` ile.
15. **Soru havuzu yönetimi** (öğretmen/admin): `GET /api/questions/bank`, `POST /api/questions` (seviye 1-3, tür practice|new_gen, 4-5 seçenek, kaynak, isteğe bağlı https görsel URL), `DELETE /api/questions/{id}` (yalnızca öğretmen soruları; öğretmen yalnız kendi sorusunu siler).
16. **Konu kartları** (`/api/topics?subject=&level=`, `lib/topic_cards.py`): ders×seviye 15 kart; pratik ekranında "Önce kısa özet".
17. **Haftalık lig** (`/api/league?scope=class|all`): tüm puanlar `lib/points.award()` ile `points_log`'a ISO hafta anahtarıyla yazılır; lig yalnızca pomodoro + yanıt (yardım) puanlarını sayar. Geçen haftanın ilk 3'ü `league_awards`'a altın/gümüş/bronz olarak yazılır; profil `frame` ve `medals` döner.

## Collections
users, questions, points_log, league_awards, placement_results, practice_attempts, pomodoros, assignments, classrooms, exam_results, posts, chat_messages — string uuid `id`, ISO tarih stringleri. Seed: `cd backend && python seed.py` (idempotent).

## v4 additions
18. **Yanlış defteri** (`/api/mistakes`, `/api/mistakes/review`, `lib/mistakes.record_answer`): seviye testi + pratik yanlışları `mistakes` koleksiyonuna (user+question) upsert edilir; sonra doğru çözülen soru `resolved=True` ("Öğrenildi"). Haftalık tekrar testi `mistake_reviews`'ta ISO hafta başına bir kez, en eski 10 açık yanlıştan dondurulur; cevaplar `/api/practice/answer` ile.
19. **AI soru üretimi** (`POST /api/questions/generate`, öğretmen/admin): Gemini (`lib/ai.gemini_chat`) JSON taslak döner → `QuestionIn` ile doğrulanır (geçersizse 502, anahtar yoksa 503). UI'da önizleme, "Tek tıkla havuza ekle" (`POST /api/questions`) veya "Forma aktar".
20. **Şekil yükleme** (`POST /api/questions/figure`, multipart, ≤2 MB, PNG/JPG/WEBP/GIF magic-byte kontrolü; SVG yok) → `figures` koleksiyonu, `GET /api/figures/{id}` (oturum gerekli). `QuestionIn.figure` artık `https://…` veya `/api/figures/<32hex>` kabul eder.
21. **Kamp Ustası** (`lib/points.pomodoro_streak`, `GET /api/pomodoro/streak`): bugün (yoksa dün) biten ardışık pomodoro günleri. Seri 7'nin katına ulaştığı gün ilk pomodoroda `camp_awards` + `award(100, "camp")` (günde bir kez). "camp" lig nedenidir; lig satırında `camp_points`, `camp_master`; profilde "Kamp Ustası" rozeti, `pomodoro_streak`, `camp_awards`. Seed: Elif'e önceki 6 gün pomodoro + 4 Matematik yanlışı.
