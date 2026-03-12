const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendPushOnNotification = onDocumentCreated(
  "users/{userId}/notifications/{notifId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    if (data.type !== "session_invite") return;

    const userId = event.params.userId;
    const db = getFirestore();

    const tokensSnap = await db
      .collection("users")
      .doc(userId)
      .collection("fcmTokens")
      .get();

    if (tokensSnap.empty) return;

    const tokens = tokensSnap.docs.map((d) => d.data().token).filter(Boolean);
    if (tokens.length === 0) return;

    const title = "🧖 SaunaStats";
    const body = `${data.fromUsername} added you to a sauna session on ${data.date}`;

    const messaging = getMessaging();
    const results = await Promise.allSettled(
      tokens.map((token) =>
        messaging.send({
          token,
          webpush: {
            notification: {
              title,
              body,
              icon: "https://saunastats.eu/pwa-192x192.png",
              badge: "https://saunastats.eu/pwa-192x192.png",
            },
            fcmOptions: {
              link: "https://saunastats.eu/friends",
            },
          },
        })
      )
    );

    const invalidTokens = [];
    results.forEach((result, i) => {
      if (
        result.status === "rejected" &&
        (result.reason?.code === "messaging/invalid-registration-token" ||
          result.reason?.code === "messaging/registration-token-not-registered")
      ) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (invalidTokens.length > 0) {
      const batch = db.batch();
      for (const token of invalidTokens) {
        const snap = await db
          .collection("users")
          .doc(userId)
          .collection("fcmTokens")
          .where("token", "==", token)
          .get();
        snap.docs.forEach((d) => batch.delete(d.ref));
      }
      await batch.commit();
    }
  }
);
