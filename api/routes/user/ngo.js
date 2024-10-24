import { Router } from "express";
import { User } from "../../schemas/schema2.js";
import { Food, HungerSpot } from "../../schemas/schema1.js";

const router = Router();

router.post("/ngo/hungerSpot", async (req, res) => {
  const { userLocation } = req.body;
  try {
    const hungerSpots = await HungerSpot.find({});
    console.log(hungerSpots);
    res.status(200).json(hungerSpots);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hunger spots" });
  }
});

router.post("/ngo/activeVolunteers", async (req, res) => {
  try {
    const totalVolunteers = await User.find({
      role: "volunteer",
    }).countDocuments();
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    const activeVolunteers = await User.find({
      role: "volunteer",
      workingDays: today
        .toLocaleString("en-us", { weekday: "short" })
        .toLowerCase(),
    }).countDocuments();

    const todaysDonations = await Food.find({
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    const totalDonation = todaysDonations.reduce(
      (acc, donation) => acc + donation.qty,
      0
    );

    const totalHungerSpots = await HungerSpot.find({}).countDocuments();

    const totalDonors = await User.find({ role: "donor" }).countDocuments();

    res.json({
      activeVolunteers,
      totalVolunteers,
      totalDonation,
      totalHungerSpots,
      totalDonors,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching volunteers" });
  }
});

export default router;
