import Queue from "bull";
import { HungerSpot } from "../schemas/hungerSpot.js";

const hungerSpotQueue = new Queue("hungerSpotQueue", {
  redis: {
    port: process.env.REDIS_DB_PORT,
    host: process.env.REDIS_DB_HOST,
    password: process.env.REDIS_DB_PASSWORD,
  },
  settings: {
    lockDuration: 600000, // 5 minutes
  },
});

hungerSpotQueue.process(async (job) => {
  const { id } = job.data;
  const disableDuration = 1;
  const currentTime = new Date();
  const enableDuration = new Date(
    currentTime.getTime() + disableDuration * 60 * 1000
  );

  const totalDuration = enableDuration - currentTime;

  const intervalId = setInterval(async () => {
    const currentTime = new Date();
    const elapsedTime = currentTime - (enableDuration - totalDuration);
    const progress = Math.min((elapsedTime / totalDuration) * 100, 100);
    job.progress(progress);
    if (currentTime >= enableDuration) {
      clearInterval(intervalId);
    }
  }, 1000);

  await new Promise((resolve) => {
    const checkStatus = setInterval(async () => {
      const currentTime = new Date();
      if (currentTime >= enableDuration) {
        try {
          await HungerSpot.findByIdAndUpdate(id, { isActive: true });
        } catch (error) {
          console.error("Error updating remainingShelfLife:", error);
        }
        clearInterval(checkStatus);
        resolve();
      }
    }, 1000);
  });

  return { status: "Hunger Spot Enabled" };
});

hungerSpotQueue.on("active", (job) => {
  console.log(`Job ${job.id} has started processing`);
});

hungerSpotQueue.on("error", (error) => {
  console.error("Hunger Spot queue error:", error);
});

hungerSpotQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

hungerSpotQueue.on("failed", (job, err) => {
  console.log(`Job ${job.id} failed: ${err}`);
});

export { hungerSpotQueue };
