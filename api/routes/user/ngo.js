import { Router } from "express";
import { User } from "../../schemas/schema2.js";

const router = Router();

router.post("/location/hungerSpot", async (req, res) => {
  const { userLocation } = req.body;
  console.log(userLocation);
  try {
    const hungerSpots = await HungerSpot.find({});
    res.status(200).json(hungerSpots);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch hunger spots" });
  }
});

router.post("/ngo/activeVolunteers", async (req, res) => {
  try {
    const totalVolunteers = await User.find({role: "volunteer"}).countDocuments()
    const today = new Date()
      .toLocaleString("en-us", { weekday: "short" })
      .toLowerCase();
    const activeVolunteers = await User.find({
      role: "volunteer",
      workingDays: today,
    }).countDocuments();
    res.json({activeVolunteers,totalVolunteers});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching volunteers" });
  }
});

export default router;
