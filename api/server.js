import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import routes from "./routes/routes.js";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import { createServer } from "http";
import Redis from "ioredis";
import admin from "firebase-admin";
import { Food, HungerSpot } from "./schemas/schema1.js";
import { Work } from "./schemas/schema2.js";
import bodyParser from "body-parser";

const app = express();
const port = 3000;

mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log("Connected to DB");
    const foodChangeStream = Food.watch();
    foodChangeStream.on("change", (change) => {
      io.emit("FoodDBChange", change);
    });
    const workChangeStream = Work.watch();
    workChangeStream.on("change", (change) => {
      io.emit("WorkDBChange", change);
    });
    const HPChangeStream = HungerSpot.watch();
    HPChangeStream.on("change", (change) => {
      io.emit("HPDBChange", change);
    });
  })
  .catch((err) => {
    console.log(err);
  });

const client = new Redis({
  port: process.env.REDIS_DB_PORT,
  host: process.env.REDIS_DB_HOST,
  password: process.env.REDIS_DB_PASSWORD,
});

client.on("error", (err) => console.log("Redis Client Error", err));
client.on("connect", () => console.log("Connected to Redis"));

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
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "hunger-halt",
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 60000 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Must be 'none' to enable cross-site delivery
    },
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(routes);

app.get("/", (req, res) => {
  res.send("This is Hunger Halt Backend!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

const httpServer = createServer(app);

export const io = new SocketIOServer(httpServer, {
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

process.on("SIGINT", async () => {
  await client.quit();
  process.exit(0);
});

httpServer.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

export { client };
export { admin };
export default app;
