"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// Banque de 30 questions
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

// Question du jour — déterministe par date
function getTodayQuestion() {
  const start = new Date("2024-01-01").getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayIndex = Math.floor((today.getTime() - start) / 86400000) % QUESTIONS.length;
  return { index: dayIndex, text: QUESTIONS[dayIndex] };
}

type AnswerData = { answer: string; partner_answer: string | null; partner_name: string | null } | null;

export default function QuestionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myAnswer, setMyAnswer] = useState<string | null>(null);
  const [partnerAnswer, setPartnerAnswer] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [coupleId, setCoupleId] = useState<string | null>(null);

  const today = getTodayQuestion();

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Couple
    const { data: member } = await supabase
      .from("couple_members").select("couple_id").eq("user_id", user.id).single();
    if (member) setCoupleId(member.couple_id);

    // Réponses du jour
    const { data, error: rpcErr } = await supabase.rpc("get_today_question_data");
    if (data) {
      setMyAnswer(data.my_answer ?? null);
      setPartnerAnswer(data.partner_answer ?? null);
      setPartnerName(data.partner_name ?? null);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadData();
    window.addEventListener("app:refresh_data", loadData);
    return () => window.removeEventListener("app:refresh_data", loadData);
  }, [loadData]);

  async function handleSubmit() {
    if (!input.trim() || !coupleId) return;
    setSubmitting(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    // Plus fiable : on laisse Postgres gérer l'upsert avec sa propre current_date
    // via une fonction RPC pour éviter les conflits de fuseaux horaires
    const { error: err } = await supabase.rpc("submit_today_answer", {
      p_couple_id: coupleId,
      p_question_index: today.index,
      p_answer: input.trim()
    });

    if (err) {
      setError("Erreur : " + err.message);
      console.error("insert error:", err);
      setSubmitting(false);
      return;
    }

    // Notification Push Web
    const { data: partnerMember } = await supabase
      .from('couple_members').select('user_id').eq('couple_id', coupleId).neq('user_id', user.id).single();
      
    if (partnerMember) {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "Nouvelle Réponse 💭",
          message: "Votre partenaire a répondu à la question du jour !",
          targetUserId: partnerMember.user_id,
          url: "/questions"
        })
      }).catch(console.error);
    }

    setMyAnswer(input.trim());
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center pb-28">
        <p className="text-stone-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 pt-8 px-4 bg-[#FDF8F5] space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-stone-800">Questions 💬</h1>
        <p className="text-stone-400 text-xs">
          {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Question du jour */}
      <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-2">
            Question du jour
          </p>
          <p className="text-stone-800 font-semibold text-lg leading-snug">{today.text}</p>
        </div>

        {/* Réponse partenaire — visible même sans avoir répondu */}
        {partnerAnswer ? (
          <div className="bg-rose-50 rounded-2xl p-4">
            <p className="text-xs text-rose-400 font-semibold mb-1">
              {partnerName ?? "Partenaire"}
            </p>
            <p className="text-stone-700 text-sm leading-relaxed">"{partnerAnswer}"</p>
          </div>
        ) : (
          <div className="bg-stone-50 rounded-2xl px-4 py-3 flex items-center gap-2">
            <span className="text-lg">🫥</span>
            <p className="text-stone-400 text-sm">
              {partnerName ?? "Partenaire"} n'a pas encore répondu
            </p>
          </div>
        )}

        {/* Ma réponse */}
        {myAnswer ? (
          <div className="bg-amber-50 rounded-2xl p-4">
            <p className="text-xs text-amber-500 font-semibold mb-1">Ta réponse</p>
            <p className="text-stone-700 text-sm leading-relaxed">"{myAnswer}"</p>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ta réponse..."
              rows={3}
              maxLength={500}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 text-stone-700 placeholder-stone-300 resize-none focus:outline-none focus:border-amber-300 transition-colors"
            />
            <p className="text-xs text-stone-300 text-right -mt-2">{input.length}/500</p>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || submitting}
              className={`w-full py-3 rounded-2xl font-semibold transition-all ${
                input.trim() && !submitting
                  ? "bg-amber-400 text-white hover:bg-amber-500 shadow-md shadow-amber-100 active:scale-[0.98]"
                  : "bg-stone-100 text-stone-300 cursor-not-allowed"
              }`}
            >
              {submitting ? "Envoi..." : "Envoyer ma réponse 💛"}
            </button>
          </div>
        )}
      </div>

      {/* Infos sur le cycle */}
      <p className="text-center text-stone-300 text-xs pb-2">
        Une nouvelle question chaque jour · Question #{today.index + 1} sur {QUESTIONS.length}
      </p>
    </div>
  );
}
