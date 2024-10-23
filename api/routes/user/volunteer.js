import { Router } from "express";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { HungerSpot, Food } from "../../schemas/schema1.js";
import { User, NGO, Work } from "../../schemas/schema2.js";
import { io } from "../../server.js";
import { foodExpiryQueue, hungerSpotQueue } from "../../queue/queue.js";
import { sendFCMMessage } from "../../fcm.js";

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function handleImageProcessing(req, res, processingFunction) {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).send("No base64 data provided.");
    }
    const imageBuffer = Buffer.from(image.split(";base64,").pop(), "base64");
    const imagePath = path.join(uploadsDir, `image_${Date.now()}.jpg`);
    fs.writeFileSync(imagePath, imageBuffer);

    console.log("Image saved!");

    const result = await processingFunction(imagePath);
    const checkImage = fs.readFileSync(imagePath);
    const hash = crypto.createHash("sha256").update(checkImage).digest("hex");
    const checkHash = await HungerSpot.findOne({ hash });
    const resultText = await result.response.text();
    const resultJson = JSON.parse(resultText);

    if (checkHash) {
      res.status(200).send({ message: "Image already exists", success: false });
    } else if (resultJson) {
      res
        .status(200)
        .send({ message: "Hunger Spot verified !", success: true, hash });
    } else {
      res.status(200).send({ message: "Not a Hunger Spot !", success: false });
    }
    // console.log(result.response.text());
    // res.status(200).send(result.response.text());
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred while processing the image.");
  }
}

async function checkHungerSpot(imagePath) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI);
  const fileManager = new GoogleAIFileManager(process.env.GEMINI);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash-002",
    generationConfig: {
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      temperature: 1.0,
      responseSchema: {
        type: SchemaType.OBJECT,
        properties: {
          isHungerSpot: {
            type: SchemaType.BOOLEAN,
            description: "Indicates if the image depicts a hunger spot",
          },
        },
        required: ["isHungerSpot"],
      },
      responseMimeType: "application/json",
    },
    systemInstruction:
      "Your task is to determine if the uploaded image depicts a hunger spot. Hunger spots are locations where economically disadvantaged individuals reside, such as slum areas, people living on railway station platforms, or individuals sleeping on the streets.",
  });

  try {
    const uploadResult = await fileManager.uploadFile(imagePath, {
      mimeType: "image/jpeg",
      displayName: "Uploaded image",
    });

    console.log(
      `Uploaded file ${uploadResult.file.displayName} as: ${uploadResult.file.uri}`
    );

    const result = await model.generateContent([
      {
        text: "Does this image depict a hunger spot?",
      },
      {
        fileData: {
          fileUri: uploadResult.file.uri,
          mimeType: uploadResult.file.mimeType,
        },
      },
    ]);
    return result;
  } catch (error) {
    console.error("Error during image processing or upload:", error);
    throw error;
  }
}

router.post("/volunteer/checkHungerSpot", async (req, res) => {
  handleImageProcessing(req, res, checkHungerSpot);
});

router.post("/volunteer/createHungerSpot", async (req, res) => {
  const { name, email, location, address, beneficiaries, image, hash } =
    req.body;
  try {
    const geoLocation = {
      type: "Point",
      coordinates: location,
    };
    await HungerSpot.create({
      name,
      email,
      location: geoLocation,
      address,
      totalBeneficiary: beneficiaries,
      image,
      hash,
    });
    res.status(200).send({ message: "Hunger Spot details added to DB" });
    io.emit("newHungerSpot", {
      message: "New Hunger Spot registered",
      name,
    });
  } catch (err) {
    // console.log(err);
    res.status(400).send({ message: "Unsuccessful" });
  }
});

router.post("/volunteer/volunteerUpdates", async (req, res) => {
  const { email } = req.body;
  try {
    const data = await Work.find({ volunteerEmails: { $in: [email] } });
    res.status(200).send(data);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/volunteer/volunteerUpdatesDetails", async (req, res) => {
  const { donationID } = req.body;
  try {
    const foodData = await Food.findById(donationID);
    res.status(200).send(foodData);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/volunteer/volunteerUpdatesDetails", async (req, res) => {
  const { donationID } = req.body;
  try {
    const foodData = await Food.findById(donationID);
    res.status(200).send(foodData);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/volunteer/assignVolunteer", async (req, res) => {
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

router.post("/volunteer/volunteerCurrentWork", async (req, res) => {
  const { email } = req.body;
  try {
    const data = await Food.find({ assignedVolunteerEmail: email });
    res.status(200).send(data);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/volunteer/verifyFood", async (req, res) => {
  const { id, shelfLife, foodQualityStatus, beneficiaries } = req.body;
  try {
    const foodData = await Food.findByIdAndUpdate(id, {
      shelfLife,
      foodQualityStatus,
      beneficiary: beneficiaries,
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
        hungerSpotID: hungerSpot._id,
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
    // console.log(error);
    res.sendStatus(400);
  }
});

router.post("/volunteer/getAssignedHungerSpot", async (req, res) => {
  const { email } = req.body;
  try {
    const value = await Food.findOne({
      assignedVolunteerEmail: email,
      foodDonationStatus: "pending",
    });
    if (value) {
      const data = await HungerSpot.findOne({
        _id: value.hungerSpotID,
        isActive: true,
      });
      res.status(200).send(data);
    } else {
      res.status(200).send({});
    }
  } catch (error) {
    // console.log(error);
    res.status(400).send(error);
  }
});

router.post("/volunteer/checkBeforeDonation", async (req, res) => {
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

router.post("/volunteer/completeDonation", async (req, res) => {
  const { spotID, beneficiaryNO, beneficiary } = req.body;
  try {
    await Food.findOneAndUpdate(
      { SpotID: spotID },
      { foodDonationStatus: "donated" }
    );
    const remainingBeneficiary = beneficiaryNO - beneficiary;
    const value = await HungerSpot.findByIdAndUpdate(spotID, {
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
