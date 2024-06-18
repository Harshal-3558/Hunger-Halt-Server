import { Router } from "express";
import { HungerSpot } from "../../schemas/hungerSpot.js";

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

export default router;
