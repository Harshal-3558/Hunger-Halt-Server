import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import Redis from "ioredis";
import admin from "firebase-admin";
import { Food } from "./schemas/food.js";
import { Work } from "./schemas/work.js";
import userRoutes from "./routes/user.js"

const app = express();

// MongoDB connection
mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log("Connected to DB");
    // Note: This part might not work in a serverless environment
    const foodChangeStream = Food.watch();
    foodChangeStream.on("change", (change) => {
      if (io) io.emit("FoodDBChange", change);
    });
    const workChangeStream = Work.watch();
    workChangeStream.on("change", (change) => {
      if (io) io.emit("WorkDBChange", change);
    });
  })
  .catch((err) => {
    console.log(err);
  });

// Redis setup
let client;
if (process.env.NODE_ENV !== 'production') {
  client = new Redis({
    port: process.env.REDIS_DB_PORT,
    host: process.env.REDIS_DB_HOST,
    password: process.env.REDIS_DB_PASSWORD,
  });

  client.on("error", (err) => console.log("Redis Client Error", err));
  client.on("connect", () => console.log("Connected to Redis"));
}

// Firebase Admin setup
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const allowedOrigins = [process.env.CLIENT_HOST, process.env.CLIENT_HOST1];

app.set("trust proxy", 1);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());

app.use(
  session({
    secret: "hunger-halt",
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60000 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
    }),
  })
);

app.use(userRoutes);

app.get("/", (req, res) => {
  res.send("This is Hunger Halt Backend!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

let io;

// Only create HTTP server and set up Socket.IO for non-production environments
if (process.env.NODE_ENV !== 'production') {
  const httpServer = createServer(app);
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      // console.log("user disconnected");
    });
  });

  const port = 3000;
  httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}

process.on("SIGINT", async () => {
  if (client) await client.quit();
  process.exit(0);
});

export { client };
export { admin };
export {io};
export default app;