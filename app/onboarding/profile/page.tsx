"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const timezones = [
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "Europe/London", label: "Londres (UTC+0)" },
  { value: "America/New_York", label: "New York (UTC-5)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8)" },
  { value: "Asia/Tokyo", label: "Tokyo (UTC+9)" },
  { value: "Asia/Shanghai", label: "Shanghai (UTC+8)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+11)" },
];

const countries = [
  "France", "Belgique", "Suisse", "Canada", "États-Unis", "Royaume-Uni",
  "Allemagne", "Espagne", "Italie", "Portugal", "Pays-Bas", "Australie",
  "Japon", "Chine", "Corée du Sud", "Brésil", "Mexique", "Argentine",
  "Maroc", "Algérie", "Tunisie", "Sénégal", "Autre",
];

export default function OnboardingProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setName(user.user_metadata?.name || "");
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezones.find(t => t.value === detected)) setTimezone(detected);
      }
      setInitialLoading(false);
    }
    loadUser();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        name: name.trim(),
        birth_date: birthDate || null,
        country: country || null,
        city: city.trim() || null,
        timezone,
        profile_complete: true,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      setError("Erreur lors de la sauvegarde. Réessaie.");
      setLoading(false);
      return;
    }

    router.push("/onboarding/couple");
  }

  if (initialLoading) {
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
        <div className="h-1 flex-1 bg-stone-200 rounded-full" />
      </div>

      <div className="mb-8">
        <div className="text-3xl mb-3">👤</div>
        <h1 className="text-3xl font-bold text-stone-800 leading-tight">Ton profil</h1>
        <p className="text-stone-400 mt-2 text-sm">Ces infos seront visibles par ton/ta partenaire.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        {/* Bloc principal */}
        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          {/* Prénom */}
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">
              Prénom *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Hugo"
              required
              autoFocus
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-sm"
            />
          </div>

          {/* Date de naissance */}
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">
              Date de naissance <span className="text-stone-300 font-normal normal-case">(optionnel)</span>
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-stone-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-sm"
            />
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-white rounded-3xl p-5 shadow-sm space-y-4">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
            📍 Où tu es en ce moment
          </p>

          {/* Pays */}
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">
              Pays
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-stone-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-sm"
            >
              <option value="">Sélectionner un pays</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Ville */}
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">
              Ville
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Paris, Lyon, Montréal…"
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-stone-700 placeholder-stone-300 focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-sm"
            />
          </div>
        </div>

        {/* Fuseau horaire */}
        <div className="bg-white rounded-3xl p-5 shadow-sm">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-2">
            🕐 Fuseau horaire
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3.5 text-stone-700 focus:outline-none focus:border-rose-300 focus:bg-white transition-all text-sm"
          >
            {timezones.map((tz) => (
              <option key={tz.value} value={tz.value}>{tz.label}</option>
            ))}
          </select>
          <p className="text-xs text-stone-400 mt-1.5 pl-1">
            Pour afficher l'heure locale de ton partenaire.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className={`w-full py-4 rounded-2xl font-semibold shadow-md transition-all ${
            loading || !name.trim()
              ? "bg-rose-300 text-white cursor-not-allowed"
              : "bg-rose-500 text-white shadow-rose-100 hover:bg-rose-600 active:scale-[0.98]"
          }`}
        >
          {loading ? "Enregistrement..." : "Continuer →"}
        </button>
      </form>
    </main>
  );
}
