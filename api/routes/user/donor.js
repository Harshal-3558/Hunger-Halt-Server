import { Router } from "express";
import { User, NGO, Work } from "../../schemas/schema2.js";
import { Food, HungerSpot, MonthlyDonation } from "../../schemas/schema1.js";
import { io } from "../../server.js";
import { foodExpiryQueue, hungerSpotQueue } from "../../queue/queue.js";
import { sendFCMMessage } from "../../fcm.js";

const router = Router();

router.post("/donor/livemap", async (req, res) => {
  const { userLocation } = req.body;
  console.log(userLocation);
  try {
    const hungerSpots = await HungerSpot.find({});
    const ngos = await NGO.find({});
    const volunteers = await User.find({ role: "volunteer" });
    res.status(200).json({ hungerSpots, ngos, volunteers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

router.post("/donor/donateFood", async (req, res) => {
  const {
    foodName,
    donorName,
    donorEmail,
    beneficiary,
    qty,
    shelfLife,
    location,
    address,
  } = req.body;

  try {
    const geoLocation = {
      type: "Point",
      coordinates: location,
    };

    const donate = await Food.create({
      foodName,
      donorName,
      donorEmail,
      qty,
      shelfLife,
      beneficiary,
      location: geoLocation,
      address,
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().toLocaleString("default", {
      month: "long",
    });
    await MonthlyDonation.create({
      month: currentMonth,
      year: currentYear,
      amount: donate.qty,
      donor: donate._id,
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

    console.log(users);

    let volEmails = [];
    let fcmTokens = [];

    users.forEach((user) => {
      volEmails.push(user.email);
      if (user.FCMtoken) {
        fcmTokens.push(user.FCMtoken);
      }
    });

    // Send multicast message using sendFCMMessage function
    if (fcmTokens.length > 0) {
      const title = "New Food Donation";
      const body = `${foodName} donated by ${donorName}`;
      const data = { foodName, donorName };

      for (const token of fcmTokens) {
        await sendFCMMessage(token, title, body, data);
      }
    }

    await Work.create({
      donationID: donate._id,
      donorName: donate.donorName,
      donorAddress: donate.address,
      volunteerEmails: volEmails,
    });

    res
      .status(200)
      .send({ message: "Food details added to DB and notifications sent" });
  } catch (err) {
    console.error("Error in donateFood:", err);
    res.status(400).send({ message: "Unsuccessful", error: err.message });
  }
});

router.get("/donor/monthly-donations", async (req, res) => {
  try {
    const monthlyDonations = await MonthlyDonation.find({}).sort({ year: 1, month: 1 });
    const chartData = monthlyDonations.map((donation) => ({
      month: donation.month.substring(0, 3),
      "Amount of leftover food saved": donation.amount,
    }));
    res.status(200).json(chartData);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

router.post("/donor/donationStatus", async (req, res) => {
  const { email } = req.body;
  try {
    const data = await Food.find({ donorEmail: email });
    res.status(200).send(data);
  } catch (error) {
    res.sendStatus(400);
  }
});


export default router;
