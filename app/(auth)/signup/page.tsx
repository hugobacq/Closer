"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Afficher l'écran de confirmation email
    setEmailSent(true);
  }

  // Écran post-inscription : e-mail de confirmation envoyé
  if (emailSent) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-rose-50 to-[#FDF8F5] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-6xl mb-6">📬</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-3">Vérifie ta boîte mail</h1>
        <p className="text-stone-500 text-sm leading-relaxed max-w-xs mb-2">
          On a envoyé un lien de confirmation à
        </p>
        <p className="text-rose-500 font-semibold text-sm mb-6">{email}</p>
        <p className="text-stone-400 text-sm leading-relaxed max-w-xs mb-8">
          Clique sur le lien dans l'email pour activer ton compte, puis reviens te connecter.
        </p>
        <Link
          href="/login"
          className="w-full max-w-xs block bg-rose-500 text-white text-center py-4 rounded-2xl font-semibold shadow-md shadow-rose-100 hover:bg-rose-600 transition-all"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-[#FDF8F5] flex flex-col px-5 pt-12 pb-10">
      <Link href="/" className="text-stone-400 text-sm mb-10 inline-flex items-center gap-1 hover:text-stone-600 transition-colors">
        ← Retour
      </Link>

      {/* Logo inline */}
      <div className="flex items-center gap-2 mb-8">
        <Image src="/logo.png" alt="Closer" width={28} height={28} className="object-contain" />
        <span className="text-sm font-bold text-stone-600">Closer</span>
      </div>
      <div className="mb-8">
        <div className="text-3xl mb-3">💛</div>
        <h1 className="text-3xl font-bold text-stone-800 leading-tight">
          Rejoindre<br />Closer
        </h1>
        <p className="text-stone-400 mt-2 text-sm">Crée ton espace privé à deux.</p>
      </div>

      <form onSubmit={handleSignup} className="bg-white rounded-3xl p-5 shadow-sm space-y-4 mb-6">
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">Prénom</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hugo"
            required
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ton@email.com"
            required
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-4 rounded-2xl font-semibold shadow-md transition-all ${
            loading
              ? "bg-rose-300 text-white cursor-not-allowed"
              : "bg-rose-500 text-white shadow-rose-100 hover:bg-rose-600 active:scale-[0.98]"
          }`}
        >
          {loading ? "Création en cours..." : "Créer mon compte"}
        </button>
      </form>

      <p className="text-center text-stone-400 text-sm">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-rose-500 font-semibold hover:text-rose-600">
          Se connecter
        </Link>
      </p>
    </main>
  );
}
