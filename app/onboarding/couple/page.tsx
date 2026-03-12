"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type State = "loading" | "choose" | "waiting" | "join";

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function OnboardingCouplePage() {
  const router = useRouter();
  const [state, setState] = useState<State>("loading");
  const [inviteCode, setInviteCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  // Vérifie si l'utilisateur a déjà créé une invitation
  useEffect(() => {
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Déjà dans un couple ?
      const { data: member } = await supabase
        .from("couple_members")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (member) { router.push("/home"); return; }

      // Invitation déjà créée et en attente ?
      const { data: invite } = await supabase
        .from("couple_invites")
        .select("invite_code")
        .eq("created_by", user.id)
        .is("used_at", null)
        .maybeSingle();

      if (invite) {
        setInviteCode(invite.invite_code);
        setState("waiting");
      } else {
        setState("choose");
      }
    }
    check();
  }, [router]);

  // Option A — Créer une invitation
  async function handleCreateInvite() {
    setWorking(true);
    setError("");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const code = generateCode();
    // Générer l'UUID côté client pour éviter la re-lecture (bloquée par RLS avant que couple_members existe)
    const coupleId = crypto.randomUUID();

    // 1. Créer le couple avec un UUID connu
    const { error: coupleError } = await supabase
      .from("couples")
      .insert({ id: coupleId, created_by: user.id });

    if (coupleError) {
      setError("Erreur lors de la création du couple.");
      console.error("couples insert error:", coupleError);
      setWorking(false);
      return;
    }

    // 2. S'ajouter comme membre
    const { error: memberError } = await supabase.from("couple_members").insert({
      couple_id: coupleId,
      user_id: user.id,
    });

    if (memberError) {
      setError("Erreur lors de l'ajout au couple.");
      console.error("couple_members insert error:", memberError);
      setWorking(false);
      return;
    }

    // 3. Créer l'invitation
    const { error: inviteError } = await supabase.from("couple_invites").insert({
      couple_id: coupleId,
      invite_code: code,
      created_by: user.id,
    });

    if (inviteError) {
      setError("Erreur lors de la création de l'invitation.");
      console.error("couple_invites insert error:", inviteError);
      setWorking(false);
      return;
    }

    setInviteCode(code);
    setState("waiting");
    setWorking(false);
  }


  // Option B — Rejoindre via un code
  async function handleJoin() {
    if (!inputCode.trim()) return;
    setWorking(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const code = inputCode.trim().toUpperCase();

      // 1. Chercher l'invitation
      const { data: invite, error: inviteError } = await supabase
        .from("couple_invites")
        .select("id, couple_id, created_by, expires_at")
        .eq("invite_code", code)
        .is("used_at", null)
        .maybeSingle();

      console.log("invite lookup:", invite, inviteError);

      if (inviteError || !invite) {
        setError("Code invalide ou déjà utilisé.");
        setWorking(false);
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError("Ce code a expiré.");
        setWorking(false);
        return;
      }

      if (invite.created_by === user.id) {
        setError("Tu ne peux pas rejoindre ton propre code.");
        setWorking(false);
        return;
      }

      // 2. Rejoindre le couple
      const { error: memberError } = await supabase
        .from("couple_members")
        .insert({ couple_id: invite.couple_id, user_id: user.id });

      console.log("member insert error:", memberError);

      if (memberError) {
        // Déjà dans ce couple → c'est OK, on redirige quand même
        if (memberError.code === "23505") {
          setWorking(false);
          router.push("/home");
          return;
        }
        setError("Erreur lors de l'ajout au couple. (" + memberError.message + ")");
        setWorking(false);
        return;
      }

      // 3. Marquer l'invitation comme utilisée (best effort, pas bloquant)
      await supabase
        .from("couple_invites")
        .update({ used_at: new Date().toISOString(), used_by: user.id })
        .eq("id", invite.id);

      // 4. Couple formé ✅
      setWorking(false);
      router.push("/home");

    } catch (err) {
      console.error("handleJoin error:", err);
      setError("Une erreur inattendue s'est produite.");
      setWorking(false);
    }
  }


  async function handleCopyCode() {
    await navigator.clipboard.writeText(inviteCode);
  }

  // — Loading
  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center">
        <p className="text-stone-400">Chargement...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-[#FDF8F5] flex flex-col px-5 pt-14 pb-10">
      {/* Barre de progression */}
      <div className="flex gap-2 mb-10">
        <div className="h-1 flex-1 bg-rose-400 rounded-full" />
        <div className="h-1 flex-1 bg-rose-400 rounded-full" />
      </div>

      <div className="mb-8">
        <div className="text-3xl mb-3">🔗</div>
        <h1 className="text-3xl font-bold text-stone-800 leading-tight">
          Votre espace<br />à deux
        </h1>
        <p className="text-stone-400 mt-2 text-sm">
          {state === "waiting"
            ? "En attente que ton/ta partenaire rejoigne."
            : "Invite ton/ta partenaire ou rejoins son espace."}
        </p>
      </div>

      {/* Erreur globale — visible dans tous les états */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <p className="text-red-500 text-sm text-center">{error}</p>
        </div>
      )}

      {/* État : choisir */}

      {state === "choose" && (
        <div className="space-y-3">
          <button
            onClick={handleCreateInvite}
            disabled={working}
            className={`w-full py-4 rounded-2xl font-semibold text-white shadow-md transition-all ${
              working ? "bg-rose-300 cursor-not-allowed" : "bg-rose-500 shadow-rose-100 hover:bg-rose-600 active:scale-[0.98]"
            }`}
          >
            {working ? "Création..." : "💌 Inviter mon/ma partenaire"}
          </button>
          <button
            onClick={() => setState("join")}
            className="w-full py-4 rounded-2xl font-semibold bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 active:scale-[0.98] transition-all shadow-sm"
          >
            🔑 J'ai déjà un code
          </button>
        </div>
      )}

      {/* État : attente partenaire */}
      {state === "waiting" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">
              ⏳ En attente
            </p>
            <p className="text-stone-500 text-sm leading-relaxed">
              Partage ce code à ton/ta partenaire. Il/Elle devra le saisir sur Closer pour vous lier.
            </p>

            {/* Code affiché en grand */}
            <div className="bg-rose-50 rounded-2xl px-6 py-5 text-center">
              <p className="text-xs text-stone-400 mb-1">Ton code d'invitation</p>
              <p className="text-4xl font-bold tracking-[0.3em] text-rose-500">{inviteCode}</p>
            </div>

            <button
              onClick={handleCopyCode}
              className="w-full py-3 border border-stone-200 rounded-2xl text-stone-500 text-sm font-semibold hover:bg-stone-50 active:scale-[0.98] transition-all"
            >
              📋 Copier le code
            </button>
          </div>

          <button
            onClick={() => setState("join")}
            className="w-full py-4 rounded-2xl font-semibold bg-white border border-stone-200 text-stone-500 text-sm hover:bg-stone-50 transition-all shadow-sm"
          >
            Mon/Ma partenaire m'a donné un code →
          </button>

          <p className="text-center text-stone-300 text-xs">
            Le code expire dans 7 jours.
          </p>
        </div>
      )}

      {/* État : saisir un code */}
      {state === "join" && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
            <p className="text-stone-600 text-sm font-medium">
              Saisis le code partagé par ton/ta partenaire :
            </p>
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="EX : ABC123"
              maxLength={6}
              autoFocus
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-[0.3em] text-stone-700 placeholder-stone-300 focus:outline-none focus:border-rose-300 focus:bg-white transition-all uppercase"
            />
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            <button
              onClick={handleJoin}
              disabled={working || inputCode.length < 6}
              className={`w-full py-4 rounded-2xl font-semibold text-white shadow-md transition-all ${
                working || inputCode.length < 6
                  ? "bg-rose-300 cursor-not-allowed"
                  : "bg-rose-500 shadow-rose-100 hover:bg-rose-600 active:scale-[0.98]"
              }`}
            >
              {working ? "Vérification..." : "Rejoindre →"}
            </button>
          </div>

          <button
            onClick={() => { setState("choose"); setError(""); setInputCode(""); }}
            className="w-full text-center text-stone-400 text-sm py-2 hover:text-stone-600 transition-colors"
          >
            ← Retour
          </button>
        </div>
      )}
    </main>
  );
}
