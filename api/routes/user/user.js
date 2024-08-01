import { Router } from "express";
import { User } from "../../schemas/user.js";
import { Food } from "../../schemas/food.js";
import { io } from "../../index.js";
import { HungerSpot } from "../../schemas/hungerSpot.js";
import { Work } from "../../schemas/work.js";
import { foodExpiryQueue } from "../../queue/foodExpiry.js";
import { hungerSpotQueue } from "../../queue/hungerSpot.js";
import { sendFCMMessage } from "../../fcm.js";
import { NGO } from "../../schemas/ngo.js";

const router = Router();

router.post("/user/updateFCM", async (req, res) => {
  const { email, token } = req.body;
  try {
    await User.findOneAndUpdate({ email }, { FCMtoken: token });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/user/updateDetails", async (req, res) => {
  const { id, role, location, org, days } = req.body;
  let updateData = {
    role,
    organization: org,
    workingDays: days,
  };

  if (location.length > 0) {
    updateData.currentLocation = {
      type: "Point",
      coordinates: location,
    };
  }

  try {
    const updateRole = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (updateRole.role === "ngo") {
      await NGO.create({
        adminName: updateRole.name,
        email: updateRole.email,
        workingLocation: updateData.currentLocation,
      });
    }
    res.status(200).send(updateRole);
  } catch (err) {
    res.status(400).send({ message: "Something went wrong" });
  }
});

router.post("/user/donateFood", async (req, res) => {
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

router.post("/user/createHungerSpot", async (req, res) => {
  const { name, email, location, address, requiredQTY, image } = req.body;
  try {
    console.log(location);
    const geoLocation = {
      type: "Point",
      coordinates: location,
    };
    console.log(geoLocation);
    await HungerSpot.create({
      name,
      email,
      location: geoLocation,
      address,
      totalBeneficiary: requiredQTY,
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

router.post("/user/volunteerUpdates", async (req, res) => {
  const { email } = req.body;
  try {
    const data = await Work.find({ volunteerEmails: { $in: [email] } });
    res.status(200).send(data);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/user/volunteerUpdatesDetails", async (req, res) => {
  const { donationID } = req.body;
  try {
    const foodData = await Food.findById(donationID);
    res.status(200).send(foodData);
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
    const data = await Food.find({ assignedVolunteerEmail: email });
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
    const hungerSpot = await HungerSpot.findOne({
      location: {
        $near: {
          $geometry: foodData.location,
        },
      },
    });
    if (hungerSpot) {
      await Food.findByIdAndUpdate(id, {
        assignedSpotAddress: hungerSpot.address,
        assignedSpotCoord: hungerSpot.location,
        SpotID: hungerSpot._id,
      });
    } else {
      const food = {
        foodName: foodData.foodName,
        foodQTY: foodData.qty,
        foodShelf: foodData.shelfLife,
        remainingShelf: foodData.shelfLife,
      };
      const ngoSpot = await NGO.findOneAndUpdate(
        {
          currentLocation: {
            $near: {
              $geometry: foodData.location,
            },
          },
        },
        {
          $push: { foodStored: food },
        },
        { new: true } // return the updated document
      );
      await Food.findByIdAndUpdate(id, {
        assignedSpotAddress: ngoSpot.workingAddress,
        assignedSpotCoord: ngoSpot.workingLocation,
        SpotID: ngoSpot._id,
      });
    }
    foodExpiryQueue.add({ shelfLife, id });
    res.status(200).send(hungerSpot);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/user/getAssignedHungerSpot", async (req, res) => {
  const { email } = req.body;
  try {
    const value = await Food.findOne({
      assignedVolunteerEmail: email,
      foodQualityStatus: "verified",
    });
    if (value) {
      const data = await HungerSpot.findById(value.SpotID);
      res.status(200).send(data);
    } else {
      res.status(200).send({});
    }
  } catch (error) {
    console.log(error);
    res.status(400).send(error);
  }
});

router.post("/user/checkBeforeDonation", async (req, res) => {
  const { id, location } = req.body;
  const tolerance = 0.1;
  try {
    const data = await HungerSpot.findById(id);
    const [dbLongitude, dbLatitude] = data.location.coordinates;
    const { longitude, latitude } = location;
    const isLongitudeSame = Math.abs(dbLongitude - longitude) < tolerance;
    const isLatitudeSame = Math.abs(dbLatitude - latitude) < tolerance;
    if (isLongitudeSame && isLatitudeSame) {
      res.status(200).send({ message: true });
    } else {
      res.status(200).send({ message: false });
    }
  } catch (error) {
    res.status(400).send(error);
  }
});

router.post("/user/completeDonation", async (req, res) => {
  const { spotID, beneficiaryNO, beneficiary } = req.body;
  try {
    await Food.findOneAndUpdate(
      { SpotID: spotID },
      { foodDonationStatus: "verified" }
    );
    const remainingBeneficiary = beneficiaryNO - beneficiary;
    await HungerSpot.findByIdAndUpdate(spotID, {
      remainingBeneficiary,
      isActive: false,
    });
    hungerSpotQueue.add({ id: spotID });
    res.sendStatus(200);
  } catch (error) {
    res.status(400).send({ error });
  }
});

export default router;
