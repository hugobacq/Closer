import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    // Initialisation conditionnelle pour autoriser le "build" statique de Vercel
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        "mailto:contact@closer-app.com",
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
    } else {
      console.warn("VAPID Keys are missing. Push notifications won't be sent.");
    }
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, message, targetUserId, url } = body;

    // 1. Récupérer les abonnements du partenaire
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", targetUserId);

    if (error || !subscriptions || subscriptions.length === 0) {
      // Pas de souscription, on ignore silencieusement (ce n'est pas une "erreur" grave)
      return NextResponse.json({ success: true, delivered: 0 });
    }

    // 2. Préparer le payload du Service Worker
    // Attention: sw.js attend { body: string, icon: string, title?: string, url?: string }
    const payload = JSON.stringify({
      title: title || "Closer",
      body: message || "Vous avez une nouvelle notification.",
      url: url || "/home",
      icon: "/logo.png"
    });

    console.log(`[PUSH] Tentative d'envoi vers ${targetUserId}. ${subscriptions.length} abonnements trouvés.`);

    let deliveredCount = 0;

    // 3. Envoyer le Push à chaque appareil de l'utilisateur
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        console.log(`[PUSH] Envoi vers Endpoint: ${sub.endpoint.substring(0, 30)}...`);
        const result = await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          },
          payload
        );
        console.log(`[PUSH] Succès (${result.statusCode}) pour Endpoint: ${sub.endpoint.substring(0, 30)}...`);
        deliveredCount++;
      } catch (err: any) {
        // L'abonnement a peut-être expiré sur l'appareil du partenaire
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.warn("[PUSH] Expired subscription, deleting...", sub.endpoint);
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("[PUSH] Erreur web-push :", err);
        }
      }
    });

    await Promise.all(sendPromises);
    console.log(`[PUSH] Processus terminé. Délivrés : ${deliveredCount}/${subscriptions.length}`);

    return NextResponse.json({ success: true, delivered: deliveredCount });
  } catch (err) {
    console.error("[PUSH] Critical Error in /api/push/send:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
