"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type DailyPhoto = {
  id: string;
  user_id: string;
  photo_date: string;
  storage_path: string;
  liked?: boolean;
  publicUrl?: string; // On va ajouter l'URL dynamique côté client
};

export default function PhotoPage() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState("ton/ta partenaire");

  const [myPhoto, setMyPhoto] = useState<DailyPhoto | null>(null);
  const [partnerPhoto, setPartnerPhoto] = useState<DailyPhoto | null>(null);

  // Animation coeur sur double clic
  const [showHeart, setShowHeart] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Couple ID & Partenaire
    const { data: member } = await supabase
      .from("couple_members").select("couple_id").eq("user_id", user.id).single();
      
    if (member) {
      setCoupleId(member.couple_id);
      const { data: partnerMember } = await supabase
        .from("couple_members")
        .select("user_id")
        .eq("couple_id", member.couple_id)
        .neq("user_id", user.id)
        .single();
        
      if (partnerMember) {
        const { data: pProfile } = await supabase
          .from("profiles").select("name").eq("id", partnerMember.user_id).single();
        if (pProfile?.name) setPartnerName(pProfile.name);
      }
    }

    // Récupérer les photos du jour (en UTC/date locale serveur)
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    const { data: photos } = await supabase
      .from("daily_photos")
      .select("*")
      .eq("photo_date", todayStr);

    if (photos && photos.length > 0) {
      const timestamp = new Date().getTime();
      const photosWithUrls = await Promise.all(photos.map(async (p) => {
        const { data } = supabase.storage.from("photos").getPublicUrl(p.storage_path);
        return { ...p, publicUrl: `${data.publicUrl}?t=${timestamp}` };
      }));

      const mine = photosWithUrls.find(p => p.user_id === user.id);
      const theirs = photosWithUrls.find(p => p.user_id !== user.id);
      if (mine) setMyPhoto(mine);
      if (theirs) setPartnerPhoto(theirs);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener("app:refresh_data", loadData);
    return () => window.removeEventListener("app:refresh_data", loadData);
  }, [loadData]);

  // --- COMPRESSION BASIQUE CANVAS ---
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        // Taille MAX : ~1200px
        const MAX_WIDTH = 1000;
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Erreur de compression"));
        }, "image/jpeg", 0.8);
      };
      img.onerror = (e) => reject(e);
    });
  };

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId || !coupleId) return;

    try {
      setUploading(true);
      setError("");

      const supabase = createClient();
      const todayStr = new Date().toISOString().split("T")[0];
      const filePath = `${coupleId}/${todayStr}_${userId}.jpg`;

      // 1. Compresser vite fait l'image
      const compressedBlob = await compressImage(file);

      // 2. Upload Storage (Upsert pour écraser si on re-teste le même jour)
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, compressedBlob, { contentType: "image/jpeg", upsert: true });

      if (uploadError) {
        console.error("Storage Error:", uploadError);
        throw new Error("Erreur d'envoi Storage: " + uploadError.message);
      }

      // 3. Update / Insert dans daily_photos
      const { error: dbError } = await supabase.from("daily_photos").upsert({
        couple_id: coupleId,
        user_id: userId,
        photo_date: todayStr,
        storage_path: filePath
      }, { onConflict: "user_id, photo_date" });

      if (dbError) {
        console.error("DB Error:", dbError);
        throw new Error("Erreur base: " + dbError.message);
      }

      // 4. Notification Push au partenaire
      const { data: partnerMember } = await supabase
        .from('couple_members')
        .select('user_id')
        .eq('couple_id', coupleId)
        .neq('user_id', userId)
        .single();
        
      if (partnerMember) {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: "Closer",
            message: "Votre partenaire a posté sa photo du jour 📸",
            targetUserId: partnerMember.user_id,
            url: "/photo"
          })
        }).catch(console.error);
      }

      // 5. Recharger la page
      await loadData();
      
    } catch (err: any) {
      console.error("Catch Error:", err);
      setError(err.message || "Une erreur s'est produite lors de l'envoi.");
    } finally {
      setUploading(false);
    }
  }

  // Double Tap pour Liker la photo du partenaire
  async function handleDoubleTapPartner() {
    if (!partnerPhoto || partnerPhoto.liked) return;

    // Déclenche l'animation visuelle immédiatement
    setShowHeart(true);
    setPartnerPhoto(prev => prev ? { ...prev, liked: true } : prev);
    setTimeout(() => setShowHeart(false), 1000); // l'animation dure ~1s

    // Envoi en BDD en arrière-plan
    const supabase = createClient();
    await supabase.from("daily_photos").update({ liked: true }).eq("id", partnerPhoto.id);

    // Notification Push
    fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: "Nouveau Cœur ❤️",
        message: "Votre partenaire a adoré votre photo du jour !",
        targetUserId: partnerPhoto.user_id, // le créateur de la photo
        url: "/photo"
      })
    }).catch(console.error);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F5] flex items-center justify-center pb-28">
        <p className="text-stone-400">Chargement...</p>
      </div>
    );
  }

  // --- ÉTATS D'AFFICHAGE ---
  const stateNoPhoto = !myPhoto && !partnerPhoto;
  const stateOnlyMe = myPhoto && !partnerPhoto;
  const stateOnlyPartner = !myPhoto && partnerPhoto;
  const stateBoth = myPhoto && partnerPhoto;

  return (
    <div className="min-h-screen pb-28 pt-8 px-4 bg-[#FDF8F5] space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-stone-800">L'instant 📸</h1>
        <p className="text-stone-400 text-xs">
          {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm font-medium border border-red-100">
          {error}
        </div>
      )}

      {/* Input natif masqué (capture environment ouvre l'appareil arrière par defaut) */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={fileInputRef}
        onChange={handleFileSelected}
        className="hidden" 
      />

      {/* ÉTAT 1 : Personne n'a posté */}
      {stateNoPhoto && (
        <div className="bg-white rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6 min-h-[400px]">
          <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center">
            <span className="text-3xl">📱</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-800 mb-2">Pas de photo aujourd'hui</h2>
            <p className="text-stone-500 text-sm leading-relaxed max-w-[200px] mx-auto">
              Partage un instant de ta journée. Qu'est-ce que tu vois juste là, maintenant ?
            </p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full bg-rose-500 text-white font-bold py-4 rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-rose-200"
          >
            {uploading ? "Envoi en cours..." : "Prendre ma photo"}
          </button>
        </div>
      )}

      {/* ÉTAT 2 : Mon/Ma Partenaire a posté, mais pas moi */}
      {stateOnlyPartner && (
        <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden shadow-md bg-stone-100 flex flex-col items-center justify-center text-center">
          {/* Photo fortement floutée */}
          {partnerPhoto?.publicUrl && (
            <div className="absolute inset-0">
              <Image src={partnerPhoto.publicUrl} alt="blurred" fill className="object-cover blur-[20px] scale-110 saturate-50 brightness-110" />
              <div className="absolute inset-0 bg-white/20 backdrop-blur-md" />
            </div>
          )}
          
          <div className="relative z-10 space-y-6 flex flex-col items-center px-6">
            <div className="w-16 h-16 bg-white/60 backdrop-blur-md shadow-xl rounded-full flex items-center justify-center">
              <span className="text-2xl">👀</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-800 mb-2 drop-shadow-sm">{partnerName} a posté !</h2>
              <p className="text-stone-700 font-medium text-sm leading-relaxed max-w-[200px] mx-auto drop-shadow-sm">
                Partage ta propre photo pour découvrir la sienne.
              </p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-rose-500 text-white font-bold py-4 px-8 rounded-2xl active:scale-[0.98] transition-all shadow-md shadow-rose-200"
            >
              {uploading ? "Envoi..." : "Prendre ma photo pour voir"}
            </button>
          </div>
        </div>
      )}

      {/* ÉTAT 3 : J'ai posté, j'attends partenaire */}
      {stateOnlyMe && myPhoto?.publicUrl && (
        <div className="space-y-4">
          <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden shadow-md bg-stone-100">
            <Image src={myPhoto.publicUrl} alt="Ma photo" fill className="object-cover" />
            
            {/* Overlay Attente */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
              <p className="text-white font-medium text-shadow-sm">Ta vue du jour</p>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex items-center justify-center text-center">
            <p className="text-amber-800 text-sm font-medium">
              En attente de la photo de {partnerName}... ⏳
            </p>
          </div>
        </div>
      )}

      {/* ÉTAT 4 : Les deux ont posté */}
      {stateBoth && myPhoto?.publicUrl && partnerPhoto?.publicUrl && (
        <div className="space-y-6 pb-6">
          <p className="text-center text-stone-400 text-xs tracking-widest uppercase font-semibold">
            Instants partagés
          </p>
          
          {/* Photo Partenaire clickable */}
          <div 
            className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-md bg-stone-100 touch-manipulation select-none"
            onDoubleClick={handleDoubleTapPartner}
          >
            <Image src={partnerPhoto.publicUrl} alt={partnerName} fill className="object-cover" />
            
            {/* Si c'est liké, on met l'icône coeur en bas à droite fixe */}
            {partnerPhoto.liked && (
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full">
                <span className="text-xl">❤️</span>
              </div>
            )}

            {/* Animation du coeur géant qui poppe au milieu lors du double-tap */}
            {showHeart && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <span className="text-8xl animate-in zoom-in spin-in-12 duration-300 drop-shadow-xl text-rose-500">❤️</span>
              </div>
            )}
            
            {/* Overlay Nom Partner */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6 pointer-events-none">
              <p className="text-white font-semibold text-lg text-shadow-sm">{partnerName}</p>
            </div>
          </div>

          {/* Ma Photo en dessous */}
          <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden shadow-md bg-stone-100">
            <Image src={myPhoto.publicUrl} alt="Moi" fill className="object-cover" />
            
            {/* Overlay Nom Moi */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-6">
              <p className="text-white font-semibold text-lg text-shadow-sm">Moi</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
