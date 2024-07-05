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
import { createBullBoard } from "@bull-board/api";
import { BullAdapter } from "@bull-board/api/bullAdapter.js";
import { ExpressAdapter } from "@bull-board/express";
import { foodExpiryQueue } from "./queue/foodExpiry.js";
import { hungerSpotQueue } from "./queue/hungerSpot.js";
import admin from "firebase-admin";
import { Food } from "./schemas/food.js";
import { Work } from "./schemas/work.js";

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

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS error:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
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
    },
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(routes);

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

const { addQueue, removeQueue, setQueues, replaceQueues } = createBullBoard({
  queues: [new BullAdapter(foodExpiryQueue), new BullAdapter(hungerSpotQueue)],
  serverAdapter: serverAdapter,
});

app.use("/admin/queues", serverAdapter.getRouter());

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
  console.log(`Bull Board available at http://localhost:${port}/admin/queues`);
});

export { client };
export { admin };
