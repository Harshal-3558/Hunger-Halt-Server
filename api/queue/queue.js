import Queue from "bull";
import { Biogas, Food, HungerSpot } from "../schemas/schema1.js";
import { BiogasUser } from "../schemas/schema2.js";

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
          const data = await Food.findById(id);
          await Food.findByIdAndUpdate(id, { foodExpired: true });
          const currentDate = new Date();
          const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ];

          await Biogas.create({
            foodItem: data.foodName,
            foodQTY: data.qty,
            month: months[currentDate.getMonth()],
            year: currentDate.getFullYear(),
          });
          await BiogasUser.findOneAndUpdate(
            { foodItem: { $exists: false }, foodQTY: { $exists: false } },
            { foodItem: data.foodName, foodQTY: data.qty },
            { new: true, sort: { _id: 1 } }
          );
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

hungerSpotQueue.process(async (job) => {
  const { id } = job.data;
  const disableDuration = 1;
  const currentTime = new Date();
  const enableDuration = new Date(
    currentTime.getTime() + disableDuration * 60 * 60 * 1000
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

export { foodExpiryQueue };
export { hungerSpotQueue };
