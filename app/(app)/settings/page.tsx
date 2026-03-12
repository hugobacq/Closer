"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  name: string;
  country: string | null;
  city: string | null;
  timezone: string | null;
  avatar_url: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Mon profil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name, country, city, timezone, avatar_url")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Profil partenaire via fonction sécurisée
      const { data: partnerData } = await supabase.rpc("get_partner_profile");
      setPartner(partnerData ?? null);

      setLoading(false);
    }
    loadData();
  }, [router]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert("Erreur lors de l'upload.");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

    await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
    setUploading(false);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center pb-28">
        <p className="text-stone-400">Chargement...</p>
      </div>
    );
  }

  const myLocation = [profile?.city, profile?.country].filter(Boolean).join(", ");
  const partnerLocation = [partner?.city, partner?.country].filter(Boolean).join(", ");
  const initials = profile?.name?.charAt(0).toUpperCase() ?? "?";
  const partnerInitials = partner?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="min-h-screen pb-28 pt-8 px-4 space-y-4 bg-[#FDF8F5]">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Profil</h1>

      {/* Mon profil */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative w-16 h-16 rounded-full overflow-hidden bg-rose-100 flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity"
            title="Changer la photo"
          >
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt="Avatar" fill className="object-cover" />
            ) : (
              <span className="text-2xl font-bold text-rose-400">{initials}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="white" className="w-2.5 h-2.5">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </div>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />

          <div className="flex-1 min-w-0">
            <p className="font-bold text-stone-800 text-lg truncate">{profile?.name ?? "—"}</p>
            <p className="text-stone-400 text-sm truncate">
              {myLocation || "Localisation non renseignée"}{profile?.timezone ? ` · ${profile.timezone}` : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/onboarding/profile")}
          className="w-full py-2.5 border border-stone-200 rounded-xl text-stone-500 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Modifier le profil
        </button>
      </div>

      {/* Mon partenaire */}
      <div className="bg-white rounded-3xl p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-4">
          Mon partenaire
        </p>
        {partner ? (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-rose-50 flex items-center justify-center flex-shrink-0">
              {partner.avatar_url ? (
                <Image src={partner.avatar_url} alt={partner.name} width={56} height={56} className="object-cover w-full h-full" />
              ) : (
                <span className="text-2xl font-bold text-rose-300">{partnerInitials}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-stone-800 truncate">{partner.name}</p>
              <p className="text-stone-400 text-sm truncate">
                {partnerLocation || "Localisation non renseignée"}
                {partner.timezone ? ` · ${partner.timezone}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🔗</span>
            </div>
            <div>
              <p className="font-semibold text-stone-500 text-sm">Pas encore lié</p>
              <button
                onClick={() => router.push("/onboarding/couple")}
                className="text-rose-400 text-xs font-semibold mt-0.5 hover:text-rose-600 transition-colors"
              >
                Inviter mon/ma partenaire →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notre couple */}
      <div className="bg-white rounded-3xl p-5 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Notre couple</p>
        {partner ? (
          <div className="flex items-center gap-2">
            <span className="text-lg">💛</span>
            <p className="text-stone-600 text-sm font-medium">
              {profile?.name} & {partner.name}
            </p>
          </div>
        ) : (
          <p className="text-stone-400 text-sm text-center py-2">
            Disponible après le couple linking 💛
          </p>
        )}
      </div>

      {/* Déconnexion */}
      <button
        onClick={handleLogout}
        className="w-full py-3 text-center text-rose-400 font-medium hover:text-rose-600 transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  );
}
