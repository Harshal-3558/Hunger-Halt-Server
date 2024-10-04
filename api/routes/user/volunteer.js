import { Router } from "express";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
    console.log(result.response.text());
    res.status(200).send(result.response.text());
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("An error occurred while processing the image.");
  }
}

async function checkHungerSpot(imagePath) {
  const genAI = new GoogleGenerativeAI(
    "AIzaSyAtcnJg9RWRw5uM0lHiA5yg-izBghW4yVU"
  );
  const fileManager = new GoogleAIFileManager(
    "AIzaSyAtcnJg9RWRw5uM0lHiA5yg-izBghW4yVU"
  );
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

export default router;
