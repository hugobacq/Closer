"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

export default function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    } else {
      setLoading(false);
    }
  }, []);

  async function registerServiceWorker() {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (err) {
      console.error("Service Worker registration failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function subscribeToPush() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string
        ),
      });

      setSubscription(sub);

      // Envoyer la clé au Backend Supabase via notre API Route
      await fetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify({ subscription: sub }),
        headers: { "Content-Type": "application/json" },
      });
      
    } catch (err) {
      console.error("Échec de l'abonnement push:", err);
      // Gérer l'erreur "Permission refusée" ici si besoin
    } finally {
      setLoading(false);
    }
  }

  // Utilitaire pour convertir la clé VAPID base64 vers Uint8Array (Requis par PushManager)
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!isSupported) {
    // Si Safari sur iOS est trop vieux ou PWA non installée : on cache.
    return null; 
  }

  if (loading) {
    return (
      <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 shadow-sm flex items-center justify-center min-h-[70px]">
        <Loader2 className="w-5 h-5 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (subscription) {
    return null; // Déjà abonné, pas besoin de polluer l'écran d'accueil
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-rose-100 flex gap-4 items-center">
      <div className="bg-rose-100 p-3 rounded-full shrink-0">
        <Bell className="w-6 h-6 text-rose-500" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-stone-800">Activer les notifications</h3>
        <p className="text-sm text-stone-500 mt-1">
          Pour savoir instantanément quand votre partenaire poste une photo.
        </p>
      </div>
      <button
        onClick={subscribeToPush}
        className="bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm shadow-rose-200 hover:bg-rose-600 transition disabled:opacity-50 shrink-0"
        disabled={loading}
      >
        Activer
      </button>
    </div>
  );
}
