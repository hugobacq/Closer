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
    const payload = JSON.stringify({
      title: title || "Closer",
      body: message || "Vous avez une nouvelle notification.",
      url: url || "/home",
      icon: "/logo.png"
    });

    let deliveredCount = 0;

    // 3. Envoyer le Push à chaque appareil de l'utilisateur
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              auth: sub.auth,
              p256dh: sub.p256dh,
            },
          },
          payload
        );
        deliveredCount++;
      } catch (err: any) {
        // L'abonnement a peut-être expiré sur l'appareil du partenaire
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log("Subscription expired, deleting...", sub.endpoint);
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error("Erreur d'envoi web-push :", err);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, delivered: deliveredCount });
  } catch (err) {
    console.error("Error in /api/push/send:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
