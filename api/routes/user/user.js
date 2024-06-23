import { Router } from "express";
import { User } from "../../schemas/user.js";
import { Food } from "../../schemas/food.js";
import { io } from "../../index.js";
import { HungerSpot } from "../../schemas/hungerSpot.js";
import { Work } from "../../schemas/work.js";
import { foodExpiryQueue } from "../../queue/foodExpiry.js";

const router = Router();

router.post("/user/selectRole", async (req, res) => {
  const { id, role } = req.body;
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
  } catch (err) {}
});

router.post("/user/volunteerStatus", async (req, res) => {
  const { location, email, days } = req.body;
  const geoLocation = {
    type: "Point",
    coordinates: location,
  };
  try {
    await User.findOneAndUpdate(
      { email },
      { currentLocation: geoLocation, workingDays: days }
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
    const geoLocation = {
      type: "Point",
      coordinates: [location.longitude, location.latitude],
    };
    const donate = await Food.create({
      foodName,
      donorName,
      donorEmail,
      qty,
      shelfLife,
      location: geoLocation,
      address,
    });
    const maxDistance = 10 * 1000;
    const users = await User.find({
      currentLocation: {
        $near: {
          $geometry: geoLocation,
          $maxDistance: maxDistance,
        },
      },
    });
    let volEmails = [];
    users.forEach(async (user) => {
      volEmails.push(user.email);
      io.emit("foodDonation", {
        message: "New food donation added",
        foodName,
        donorName,
        userEmail: user.email,
      });
    });
    await Work.create({
      donationID: donate._id,
      donorName: donate.donorName,
      donorAddress: donate.address,
      volunteerEmails: volEmails,
    });
    res.status(200).send({ message: "Food details added to DB" });
  } catch (err) {
    res.status(400).send({ message: "Unsuccessful" });
  }
});

router.post("/user/createHungerSpot", async (req, res) => {
  const { name, email, location, address, requiredQTY, image } = req.body;
  try {
    const geoLocation = {
      type: "Point",
      coordinates: [location.longitude, location.latitude],
    };
    await HungerSpot.create({
      name,
      email,
      location: geoLocation,
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

router.post("/user/volunteerUpdates", async (req, res) => {
  const { email } = req.body;
  try {
    const data = await Work.find({ volunteerEmails: { $in: [email] } });
    res.status(200).send(data);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/user/assignVolunteer", async (req, res) => {
  const { email, id, donationID } = req.body;
  try {
    await Work.deleteOne({ _id: id });
    const user = await User.find({ email });
    await Food.findByIdAndUpdate(donationID, {
      assignedVolunteerName: user[0].name,
      assignedVolunteerEmail: user[0].email,
    });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/user/volunteerCurrentWork", async (req, res) => {
  const { email } = req.body;
  try {
    const data = await Food.findOne({ assignedVolunteerEmail: email });
    res.status(200).send(data);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/user/verifyFood", async (req, res) => {
  const { id, shelfLife, foodQualityStatus } = req.body;
  try {
    const foodData = await Food.findByIdAndUpdate(id, {
      shelfLife,
      foodQualityStatus,
    });
    const spot = await HungerSpot.findOne({
      location: {
        $near: {
          $geometry: foodData.location,
        },
      },
    });
    foodExpiryQueue.add({ shelfLife, id });
    res.status(200).send(spot);
  } catch (error) {
    console.log(error);
    res.sendStatus(400);
  }
});

export default router;
