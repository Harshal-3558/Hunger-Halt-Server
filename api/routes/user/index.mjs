import { Router } from "express";
import { User } from "../../schemas/user.js";
import { Food } from "../../schemas/food.js";
import { io } from "../../index.mjs";
import { HungerSpot } from "../../schemas/hungerSpot.js";

const router = Router();

router.post("/user/selectRole", async (req, res) => {
  const { id, role } = req.body;
  console.log(req.body);
  try {
    const updateRole = await User.findByIdAndUpdate(
      id,
      { role: role },
      { new: true }
    );
    if (!updateRole) {
      return res.status(400).send({ message: "Something went worng" });
    }
    res.status(200).send(updateRole);
  } catch (err) {
    console.log(err);
  }
});

router.post("/user/volunteerStatus", async (req, res) => {
  const { location, role, days } = req.body;
  console.log(req.body);
  try {
    await User.findOneAndUpdate(
      { role },
      { currentLocation: location, workingDays: days }
    );
    res.status(200).send({ message: "Successfull" });
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/user/donateFood", async (req, res) => {
  const { foodName, donorName, donorEmail, qty, shelfLife, location, address } =
    req.body;
  try {
    await Food.create({
      foodName,
      donorName,
      donorEmail,
      qty,
      shelfLife,
      location,
      address,
    });
    io.emit("foodDonation", {
      message: "New food donation added",
      foodName,
      donorName,
    });
    res.status(200).send({ message: "Food details added to DB" });
  } catch (err) {
    console.log(err);
    res.status(400).send({ message: "Unsuccessful" });
  }
});

router.post("/user/createHungerSpot", async (req, res) => {
  const { name, email, location, address, requiredQTY, image } = req.body;
  try {
    await HungerSpot.create({
      name,
      email,
      location,
      address,
      requiredQTY,
      image,
    });
    res.status(200).send({ message: "Hunger Spot details added to DB" });
    io.emit("newHungerSpot", {
      message: "New Hunger Spot registered",
      name,
    });
  } catch (err) {
    console.log(err);
    res.status(400).send({ message: "Unsuccessful" });
  }
});

router.post("/user/donationStatus", async (req, res) => {
  const { email } = req.body;
  try {
    const data = await Food.find({ donorEmail: email });
    res.status(200).send(data);
  } catch (error) {
    res.sendStatus(400);
  }
});

export default router;
