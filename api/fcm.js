import { admin } from "./server.js";

async function sendFCMMessage(token, title, body, data = {}) {
  try {
    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: data,
      webpush: {
        headers: {
          Urgency: "high",
        },
        notification: {
          title: title,
          body: body,
        },
        fcm_options: {
          link: "http://localhost:5173",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
    return response;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

export { sendFCMMessage };