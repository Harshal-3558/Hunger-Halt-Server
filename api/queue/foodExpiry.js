import Queue from "bull";
import { Food } from "../schemas/food.js";

const foodExpiryQueue = new Queue("foodExpiry", {
  redis: {
    port: process.env.REDIS_DB_PORT,
    host: process.env.REDIS_DB_HOST,
    password: process.env.REDIS_DB_PASSWORD,
  },
  settings: {
    lockDuration: 600000, // 5 minutes
  },
});

foodExpiryQueue.process(10, async (job) => {
  const { shelfLife, id } = job.data;
  const currentTime = new Date();
  const expiryTime = new Date(
    currentTime.getTime() + shelfLife * 60 * 60 * 1000
  );

  const totalDuration = expiryTime - currentTime;

  const intervalId = setInterval(async () => {
    const currentTime = new Date();
    const elapsedTime = currentTime - (expiryTime - totalDuration);
    const progress = Math.min((elapsedTime / totalDuration) * 100, 100);
    job.progress(progress);

    const remainingShelfLife = Math.max(
      (expiryTime - currentTime) / (60 * 60 * 1000),
      0
    ).toFixed(2);
    try {
      await Food.findByIdAndUpdate(id, { remainingShelfLife });
    } catch (error) {
      console.error("Error updating remainingShelfLife:", error);
    }
    if (currentTime >= expiryTime) {
      console.log("Food is expired");
      clearInterval(intervalId);
    }
  }, 1000);

  await new Promise((resolve) => {
    const checkExpiry = setInterval(async () => {
      const currentTime = new Date();
      if (currentTime >= expiryTime) {
        try {
          await Food.findByIdAndUpdate(id, { foodExpired: true });
        } catch (error) {
          console.error("Error updating remainingShelfLife:", error);
        }
        clearInterval(checkExpiry);
        resolve();
      }
    }, 1000);
  });

  return { status: "expired" };
});

foodExpiryQueue.on("active", (job) => {
  console.log(`Job ${job.id} has started processing`);
});

foodExpiryQueue.on("error", (error) => {
  console.error("Food expiry queue error:", error);
});

foodExpiryQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

foodExpiryQueue.on("failed", (job, err) => {
  console.log(`Job ${job.id} failed: ${err}`);
});

export { foodExpiryQueue };
