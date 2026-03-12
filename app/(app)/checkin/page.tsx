"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const MOODS = [
  { key: "great", emoji: "🌟", label: "Rayonnant·e" },
  { key: "good",  emoji: "😊", label: "Bien" },
  { key: "okay",  emoji: "😐", label: "Moyen" },
  { key: "low",   emoji: "😔", label: "Bas" },
  { key: "hard",  emoji: "🌧️", label: "Difficile" },
];

type State = "loading" | "form" | "done";

export default function CheckinPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [myCheckin, setMyCheckin] = useState<{ mood: string; message: string } | null>(null);
  const [partnerCheckin, setPartnerCheckin] = useState<{ mood: string; message: string } | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Obtenir couple_id
      const { data: member } = await supabase
        .from("couple_members")
        .select("couple_id")
        .eq("user_id", user.id)
        .single();
      if (member) setCoupleId(member.couple_id);

      // Charger les check-ins du jour
      const { data: checkins } = await supabase.rpc("get_today_checkins");
      if (checkins?.my_checkin) {
        setMyCheckin(checkins.my_checkin);
        setState("done");
      } else {
        setState("form");
      }
      if (checkins?.partner_checkin) setPartnerCheckin(checkins.partner_checkin);

      // Nom partenaire
      const { data: partnerData } = await supabase.rpc("get_partner_profile");
      if (partnerData?.name) setPartnerName(partnerData.name);
    }
    load();
  }, [router]);

  async function handleSubmit() {
    if (!selectedMood) return;
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !coupleId) { setSubmitting(false); return; }

    const { error: insertError } = await supabase.from("checkins").insert({
      user_id: user.id,
      couple_id: coupleId,
      mood: selectedMood,
      message: message.trim() || null,
    });

    if (insertError) {
      setError("Erreur lors de l'envoi. Réessaie.");
      console.error(insertError);
      setSubmitting(false);
      return;
    }

    setMyCheckin({ mood: selectedMood, message: message.trim() });
    setState("done");
    setSubmitting(false);
  }

  const getMoodEmoji = (key: string) => MOODS.find(m => m.key === key)?.emoji ?? "❓";
  const getMoodLabel = (key: string) => MOODS.find(m => m.key === key)?.label ?? key;

  // Loading
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center pb-28">
        <p className="text-stone-400">Chargement...</p>
      </div>
    );
  }

  // Déjà fait
  if (state === "done") {
    return (
      <div className="min-h-screen pb-28 pt-8 px-4 bg-[#FDF8F5]">
        <Link href="/home" className="text-stone-400 text-sm hover:text-stone-600">← Retour</Link>

        <div className="mt-6 space-y-4">
          <h1 className="text-2xl font-bold text-stone-800">Check-in du jour</h1>

          {/* Mon check-in */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Toi</p>
            <div className="flex items-center gap-4">
              <span className="text-5xl">{getMoodEmoji(myCheckin!.mood)}</span>
              <div>
                <p className="font-semibold text-stone-700">{getMoodLabel(myCheckin!.mood)}</p>
                {myCheckin!.message && (
                  <p className="text-stone-500 text-sm mt-1 italic">"{myCheckin!.message}"</p>
                )}
              </div>
            </div>
          </div>

          {/* Check-in partenaire */}
          <div className="bg-white rounded-3xl p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
              {partnerName ?? "Partenaire"}
            </p>
            {partnerCheckin ? (
              <div className="flex items-center gap-4">
                <span className="text-5xl">{getMoodEmoji(partnerCheckin.mood)}</span>
                <div>
                  <p className="font-semibold text-stone-700">{getMoodLabel(partnerCheckin.mood)}</p>
                  {partnerCheckin.message && (
                    <p className="text-stone-500 text-sm mt-1 italic">"{partnerCheckin.message}"</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-stone-400">
                <span className="text-3xl">🫥</span>
                <p className="text-sm">Pas encore répondu aujourd'hui</p>
              </div>
            )}
          </div>

          <Link
            href="/home"
            className="block w-full text-center bg-rose-500 text-white py-4 rounded-2xl font-semibold shadow-md shadow-rose-100 hover:bg-rose-600 transition-all"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  // Formulaire
  return (
    <div className="min-h-screen pb-28 pt-8 px-4 bg-[#FDF8F5]">
      <Link href="/home" className="text-stone-400 text-sm hover:text-stone-600">← Retour</Link>

      {/* Check-in partenaire — visible même avant de faire le sien */}
      {partnerCheckin && (
        <div className="mt-5 bg-white rounded-3xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
            {partnerName ?? "Partenaire"} aujourd'hui
          </p>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{getMoodEmoji(partnerCheckin.mood)}</span>
            <div>
              <p className="font-semibold text-stone-700">{getMoodLabel(partnerCheckin.mood)}</p>
              {partnerCheckin.message && (
                <p className="text-stone-500 text-sm mt-1 italic">"{partnerCheckin.message}"</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-bold text-stone-800">Comment tu te sens ?</h1>
        <p className="text-stone-400 text-sm mt-1">
          {partnerName ? `${partnerName} verra ton humeur du jour 💛` : "Choisis ton humeur du moment 🌿"}
        </p>
      </div>

      {/* Mood picker */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {MOODS.map((mood) => (
          <button
            key={mood.key}
            onClick={() => setSelectedMood(mood.key)}
            className={`flex flex-col items-center gap-1.5 py-4 rounded-2xl border-2 transition-all ${
              selectedMood === mood.key
                ? "border-rose-400 bg-rose-50 shadow-md shadow-rose-100 scale-105"
                : "border-transparent bg-white hover:border-rose-200"
            }`}
          >
            <span className="text-3xl">{mood.emoji}</span>
            <span className="text-[10px] text-stone-500 font-medium text-center leading-tight">{mood.label}</span>
          </button>
        ))}
      </div>

      {/* Message */}
      <div className="mb-8">
        <label className="text-sm font-semibold text-stone-600 block mb-2">
          Un mot pour {partnerName ?? "ton/ta partenaire"} ?{" "}
          <span className="text-stone-400 font-normal">(optionnel)</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Je pensais à toi..."
          maxLength={280}
          rows={3}
          className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 placeholder-stone-300 resize-none focus:outline-none focus:border-rose-300 transition-colors"
        />
        <p className="text-xs text-stone-300 text-right mt-1">{message.length}/280</p>
      </div>

      {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={selectedMood === null || submitting}
        className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
          selectedMood !== null && !submitting
            ? "bg-rose-500 text-white shadow-lg shadow-rose-200 hover:bg-rose-600 active:scale-[0.98]"
            : "bg-stone-100 text-stone-300 cursor-not-allowed"
        }`}
      >
        {submitting ? "Envoi..." : "Envoyer mon humeur 💛"}
      </button>
    </div>
  );
}
