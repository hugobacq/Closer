"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AutoRefreshListener() {
  const router = useRouter();

  // Astuce pour forcer un vrai rechargement des données "client-side" (SWR-like) 
  // sans utiliser window.location.reload() qui ferait un flash blanc moche.
  // Dans le App Router de Next.js, router.refresh() redemande le payload Serveur.
  // Cependant, beaucoup de pages Closer font leur fetch dans des useEffect clients.
  // Pour eux, réévaluer le composant ou invalider le cache de fetch est nécessaire.
  // router.refresh() gère bien les requêtes serveurs et peut suffire.
  // Si ce n'est pas suffisant pour tes pages "use client", on pourrait dispatché un CustomEvent.
  // Pour la V1 : router.refresh() au minimum + un événement window local (sauf events server-side).
  let refreshTimeout: NodeJS.Timeout;

  const refreshSilent = () => {
    // Throttling / Debouncing : on évite de mitrailler le serveur 
    // si 3 requêtes arrivent d'un coup.
    clearTimeout(refreshTimeout);
    refreshTimeout = setTimeout(() => {
      console.log("[AutoRefresh] Synchronisation des données...");
      router.refresh(); 
      window.dispatchEvent(new Event('app:refresh_data'));
    }, 1500); // On attend 1.5s avant de rafraîchir (le temps que les uploads Storage se finissent souvent)
  }

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = () => {
      // Nettoyer si déjà existant
      if (channel) {
        supabase.removeChannel(channel);
      }

      // On crée et s'abonne à un nouveau canal pour avoir une connexion "fraîche"
      channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, refreshSilent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_photos' }, refreshSilent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'question_answers' }, refreshSilent)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, refreshSilent)
        .subscribe((status) => {
          console.log("[AutoRefresh] Realtime status:", status);
        });
    };

    // Lancement initial
    setupSubscription();

    // 1. Écoute du retour depuis l'arrière-plan (Sleep Mode -> Active Mode)
    // Sur Mobile, Safari/Chrome coupe souvent les WebSockets quand l'app est en background.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSilent(); // force update data
        setupSubscription(); // force reconnect WebSocket
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Nettoyage à la destruction du composant
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (channel) supabase.removeChannel(channel);
    };
  }, [router]);

  return null; // Ce composant est purement logique, il ne s'affiche pas
}
