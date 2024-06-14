import { Router } from "express";
import { User } from "../../schemas/user.js";
import { Food } from "../../schemas/food.js";
import { io } from "../../index.mjs";

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
    res.status(200).send({ message: "Your role is updated" });
  } catch (err) {
    console.log(err);
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

export default router;
