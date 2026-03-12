"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";

type CheckinData = { mood: string; message: string } | null;

const QUESTIONS = [
  "Quel est le souvenir où tu t'es senti le plus proche de moi ?",
  "Qu'est-ce qui te manque le plus en ce moment ?",
  "Quel est le moment de notre journée à distance que tu préfères ?",
  "Qu'est-ce que tu ferais si on était ensemble là maintenant ?",
  "Quelle est la chose que tu veux me dire depuis longtemps ?",
  "Quel est ton rêve pour nous deux dans 2 ans ?",
  "Qu'est-ce qui te fait sourire quand tu penses à moi ?",
  "Quel est le voyage que tu veux qu'on fasse ensemble ?",
  "Qu'est-ce que tu as appris sur toi-même depuis qu'on est ensemble ?",
  "Quel est le moment de nos retrouvailles que tu attends le plus ?",
  "Comment tu te sens quand tu reçois un message de moi le matin ?",
  "Quelle est la chose la plus belle que tu as faite pour quelqu'un ?",
  "Quel est le livre ou film qui t'a le plus marqué ces derniers temps ?",
  "Qu'est-ce que tu fais pour prendre soin de toi cette semaine ?",
  "Quelle qualité chez moi t'a touché en premier ?",
  "Si tu pouvais me téléporter là maintenant, où irions-nous ?",
  "Quelle est ta chanson du moment et pourquoi ?",
  "Quel est le petit geste que je fais qui te touche le plus ?",
  "Qu'est-ce que la distance t'a appris sur l'amour ?",
  "Quel est ton endroit préféré sur Terre, et pourquoi ?",
  "Comment imagines-tu notre vie dans 5 ans ?",
  "Quel est le moment où tu as eu le plus peur de me perdre ?",
  "Quelle est la chose dont tu es le plus fier en ce moment ?",
  "Qu'est-ce qui te donne de l'énergie quand tu te sens bas ?",
  "Quel est le meilleur repas qu'on a partagé ensemble ?",
  "Quelle est la chose que tu veux qu'on apprenne ensemble ?",
  "Si tu devais décrire notre relation en un mot, lequel ce serait ?",
  "Qu'est-ce que tu gardes de nos conversations du soir ?",
  "Quel rêve tu as fait récemment dont tu te souviens ?",
  "Qu'est-ce que tu veux me dire simplement, ce soir ?",
];


function getDailyQuestion() {
  const start = new Date("2024-01-01").getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const idx = Math.floor((today.getTime() - start) / 86400000) % QUESTIONS.length;
  return QUESTIONS[idx];
}

const MOODS: Record<string, string> = {
  great: "🌟", good: "😊", okay: "😐", low: "😔", hard: "🌧️",
};

// Calcule le décompte
function getCountdown(date: Date) {
  const diff = date.getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  if (days < 2) {
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { type: "hours" as const, hours, minutes, seconds };
  }
  return { type: "days" as const, days };
}

function formatDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [userName, setUserName] = useState<string | null>(null);
  const [partner, setPartner] = useState<{ name: string } | null>(null);
  const [myCheckin, setMyCheckin] = useState<CheckinData>(undefined as unknown as CheckinData);
  const [partnerCheckin, setPartnerCheckin] = useState<CheckinData>(undefined as unknown as CheckinData);

  const [partnerPhotoPosted, setPartnerPhotoPosted] = useState(false);
  const [myPhotoPosted, setMyPhotoPosted] = useState(false);

  const [dataLoaded, setDataLoaded] = useState(false);

  // Countdown
  const [nextReunion, setNextReunion] = useState<Date | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<ReturnType<typeof getCountdown>>(null);

  // Éditeur de date
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("00:00");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (isDemo) { setDataLoaded(true); return; }
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; } // Added router.push

    // Profil
    const { data: profile } = await supabase
      .from("profiles").select("name").eq("id", user.id).single();
    setUserName(profile?.name || user.email?.split("@")[0] || "toi");

    // Partenaire
    const { data: partnerData } = await supabase.rpc("get_partner_profile");
    if (partnerData) setPartner({ name: partnerData.name });

    // Check-ins du jour
    const { data: checkins } = await supabase.rpc("get_today_checkins");
    setMyCheckin(checkins?.my_checkin ?? null);
    setPartnerCheckin(checkins?.partner_checkin ?? null);

    // Actions photos du jour
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: photos } = await supabase
      .from("daily_photos")
      .select("user_id")
      .eq("photo_date", todayStr);

    if (photos) {
      setMyPhotoPosted(photos.some(p => p.user_id === user.id));
      setPartnerPhotoPosted(photos.some(p => p.user_id !== user.id));
    }

    // Couple + next_reunion_at
    const { data: member } = await supabase
      .from("couple_members").select("couple_id").eq("user_id", user.id).single();
    if (member) {
      setCoupleId(member.couple_id);
      const { data: couple } = await supabase
        .from("couples").select("next_reunion_at").eq("id", member.couple_id).single();
      if (couple?.next_reunion_at) {
        setNextReunion(new Date(couple.next_reunion_at));
      }
    }

    setDataLoaded(true);
  }, [isDemo, router, setUserName, setPartner, setMyCheckin, setPartnerCheckin, setMyPhotoPosted, setPartnerPhotoPosted, setCoupleId, setNextReunion, setDataLoaded]); // Added dependencies for useCallback

  useEffect(() => {
    loadData();

    // Rafraîchissement automatique depuis AutoRefreshListener
    window.addEventListener("app:refresh_data", loadData);
    return () => window.removeEventListener("app:refresh_data", loadData);
  }, [loadData]); // Corrected useEffect dependency to loadData

  // Ticker — mise à jour du countdown chaque seconde
  useEffect(() => {
    if (!nextReunion) return;
    setCountdown(getCountdown(nextReunion));
    const id = setInterval(() => setCountdown(getCountdown(nextReunion)), 1000);
    return () => clearInterval(id);
  }, [nextReunion]);

  async function handleSaveReunion() {
    if (!editDate || !coupleId) return;
    setSaving(true);
    const dt = new Date(`${editDate}T${editTime || "00:00"}`);
    const supabase = createClient();
    await supabase.from("couples").update({ next_reunion_at: dt.toISOString() }).eq("id", coupleId);
    setNextReunion(dt);
    setEditing(false);
    setSaving(false);
  }

  function openEditor() {
    if (nextReunion) {
      setEditDate(nextReunion.toISOString().split("T")[0]);
      setEditTime(nextReunion.toTimeString().slice(0, 5));
    } else {
      setEditDate("");
      setEditTime("00:00");
    }
    setEditing(true);
  }

  const displayName = isDemo ? "Hugo" : (userName ?? "...");
  const partnerName = isDemo ? "Léa" : (partner?.name ?? "Partenaire");

  // Écran de chargement premium (masque le rendu partiel/flickering)
  // On ne bloque pas si c'est le mode isDemo car les données sont quasi-immédiates,
  // mais on peut le bloquer pour tous
  if (!dataLoaded && !isDemo) {
    return (
      <div className="fixed inset-0 bg-[#FDF8F5] flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
          {/* Logo officiel qui bat */}
          <div className="w-20 h-20 bg-white rounded-3xl shadow-md shadow-rose-100/50 flex items-center justify-center p-3 animate-heartbeat">
            <Image
              src="/logo.png"
              alt="Closer logo"
              width={56}
              height={56}
              className="object-contain filter drop-shadow-sm select-none"
              priority
            />
          </div>

          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Closer</h1>
            <p className="text-stone-400 text-sm font-medium tracking-wide">Préparation de votre espace...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 bg-[#FDF8F5]">
      {/* Bandeau démo */}
      {isDemo && (
        <div className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center gap-2">
          <span className="text-base">🧪</span>
          <p className="text-amber-600 text-xs font-medium flex-1">Mode démo — données fictives</p>
          <Link href="/" className="text-amber-400 text-xs font-semibold hover:text-amber-600 transition-colors">Quitter</Link>
        </div>
      )}

      <div className="pt-8 px-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-stone-400 text-sm">
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-2xl font-bold text-stone-800 mt-0.5">Bonjour, {displayName} 💛</h1>
          </div>
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm overflow-hidden flex-shrink-0">
            <Image src="/logo.png" alt="Closer" width={128} height={128} className="w-full h-full object-cover scale-[1.6] translate-y-[8%]" />
          </div>
        </div>

        {/* Countdown — cliquable */}
        <button
          onClick={openEditor}
          className="w-full text-left relative overflow-hidden bg-gradient-to-br from-rose-400 to-rose-600 rounded-3xl p-6 text-white shadow-lg shadow-rose-200/50 active:scale-[0.98] transition-all"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-start justify-between">
            <p className="text-rose-100 text-xs font-semibold uppercase tracking-widest">
              Prochaines retrouvailles
            </p>
            <span className="text-white/40 text-xs">✏️ modifier</span>
          </div>

          {countdown ? (
            countdown.type === "days" ? (
              // Mode jours
              <>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-6xl font-bold leading-none">{countdown.days}</span>
                  <span className="text-xl font-medium text-rose-200">jours</span>
                </div>
                <p className="text-rose-200 text-sm mt-2">{formatDate(nextReunion!)} ✈️</p>
              </>
            ) : (
              // Mode heures (J-2)
              <>
                <p className="text-rose-200 text-xs mt-1 mb-1">C'est bientôt ! ✈️</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-4xl font-bold tabular-nums">
                    {String(countdown.hours).padStart(2, "0")}
                  </span>
                  <span className="text-lg text-rose-200">h</span>
                  <span className="text-4xl font-bold tabular-nums">
                    {String(countdown.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-lg text-rose-200">m</span>
                  <span className="text-4xl font-bold tabular-nums">
                    {String(countdown.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-lg text-rose-200">s</span>
                </div>
                <p className="text-rose-200 text-sm mt-2">{formatDate(nextReunion!)} 💛</p>
              </>
            )
          ) : (
            // Pas de date définie
            <div className="mt-3">
              <p className="text-white text-lg font-semibold">Définir une date</p>
              <p className="text-rose-200 text-sm mt-1">Appuie pour ajouter vos retrouvailles</p>
            </div>
          )}
        </button>

        {/* Modal éditeur de date */}
        {editing && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <h2 className="text-xl font-bold text-stone-800">Prochaines retrouvailles ✈️</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-widest block mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 focus:outline-none focus:border-rose-300 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-widest block mb-1">
                    Heure <span className="text-stone-300 font-normal">(optionnel)</span>
                  </label>
                  <input
                    type="time"
                    value={editTime}
                    onChange={e => setEditTime(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 focus:outline-none focus:border-rose-300 transition-colors"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 py-3 border border-stone-200 rounded-2xl text-stone-500 font-medium hover:bg-stone-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveReunion}
                  disabled={!editDate || saving}
                  className={`flex-1 py-3 rounded-2xl font-semibold text-white transition-all ${!editDate || saving ? "bg-rose-300 cursor-not-allowed" : "bg-rose-500 hover:bg-rose-600 active:scale-[0.98]"
                    }`}
                >
                  {saving ? "Sauvegarde..." : "Enregistrer 💛"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rappel Photo du jour */}
        {partnerPhotoPosted && !myPhotoPosted && (
          <Link href="/photo" className="block animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-gradient-to-r from-rose-500 to-rose-400 rounded-3xl p-5 shadow-lg shadow-rose-200 flex items-center justify-between active:scale-[0.98] transition-all">
              <div className="text-white space-y-1">
                <p className="font-bold text-lg">📸 {partnerName} t'attend !</p>
                <p className="text-rose-50 text-sm font-medium">Il/Elle a posté sa vue du jour. Et toi ?</p>
              </div>
              <div className="bg-white/20 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </Link>
        )}

        {/* Check-in du jour */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">Check-in du jour</p>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 flex items-center gap-3 bg-stone-50 rounded-2xl p-3">
              <span className="text-2xl">{!dataLoaded ? "🫥" : (partnerCheckin ? MOODS[partnerCheckin.mood] ?? "❓" : "🫥")}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-600 truncate">{partnerName}</p>
                <p className={`text-xs font-medium ${partnerCheckin ? "text-green-400" : "text-stone-300"}`}>
                  {!dataLoaded ? "..." : (partnerCheckin ? "Check-in fait ✓" : "En attente")}
                </p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-3 bg-rose-50 rounded-2xl p-3">
              <span className="text-2xl">{!dataLoaded ? "🫥" : (myCheckin ? MOODS[myCheckin.mood] ?? "❓" : "🫥")}</span>
              <div>
                <p className="text-xs font-semibold text-stone-600">{displayName === "..." ? "Toi" : displayName}</p>
                <p className={`text-xs font-medium ${myCheckin ? "text-green-400" : "text-rose-400"}`}>
                  {!dataLoaded ? "..." : (myCheckin ? "Check-in fait ✓" : "En attente")}
                </p>
              </div>
            </div>
          </div>
          <Link href="/checkin" className="block w-full text-center bg-rose-500 text-white py-3 rounded-2xl text-sm font-semibold shadow-md shadow-rose-100 hover:bg-rose-600 active:scale-[0.98] transition-all">
            {myCheckin ? "Voir le check-in →" : "Faire mon check-in →"}
          </Link>
        </div>

        {/* Question du jour */}
        <Link href="/questions">
          <div className="bg-white rounded-3xl p-5 shadow-sm active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💬</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">Question du jour</p>
            </div>
            <p className="text-stone-700 font-medium leading-relaxed text-sm">{getDailyQuestion()}</p>
            <p className="text-amber-400 text-sm mt-3 font-semibold">Répondre →</p>
          </div>
        </Link>

        {/* Journal */}
        <Link href="/journal">
          <div className="bg-white rounded-3xl p-5 shadow-sm active:scale-[0.98] transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📓</span>
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Journal</p>
            </div>
            <p className="text-stone-400 text-sm">Aucune entrée pour le moment.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center">Chargement...</div>}>
      <HomeContent />
    </Suspense>
  );
}
