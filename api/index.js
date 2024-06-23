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

const app = express();
const port = 3000;

mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log("Connected to DB");
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

app.use(
  cors({
    origin: process.env.CLIENT_HOST,
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
      secure: false,
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
  queues: [new BullAdapter(foodExpiryQueue)],
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
    origin: process.env.CLIENT_HOST,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    console.log("user disconnected");
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
