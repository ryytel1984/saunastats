import { useEffect } from "react";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

const VAPID_KEY = "BPhfbFjKdsTD03viTUpZHziNSPBPgJMROzoLeBkZ101U7axPXnIeXIUxJ2jw2Q5CrdDQe2Ib71yYb3tBG9JGKw";

export function usePushNotifications(user) {
  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;

    const setup = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const messaging = getMessaging();
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) return;

        await setDoc(doc(db, "users", user.uid, "fcmTokens", token), {
          token,
          createdAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
        });

        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          if (Notification.permission === "granted") {
            new Notification(title || "SaunaStats", {
              body: body || "You have a new notification",
              icon: "/pwa-192x192.png",
            });
          }
        });
      } catch (err) {
        console.error("Push setup failed:", err);
      }
    };

    setup();
  }, [user]);
}
