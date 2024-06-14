import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import routes from "./routes/routes.mjs";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io"; // Import Socket.io
import { createServer } from "http"; // Import http server from node

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

app.use(
  cors({
    origin: process.env.CLIENT_HOST, // Adjust this to your frontend domain
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

app.get("/", (req, res) => {
  res.send("This is Hunger Halt Backend!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Create HTTP server and wrap the Express app
const httpServer = createServer(app);

// Attach socket.io to the HTTP server
export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CLIENT_HOST, // Adjust this to your frontend domain
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Setup socket.io connection
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  // Handle other socket events here
  socket.on("message", (msg) => {
    console.log("message: " + msg);
    // You can emit messages back to the clients if needed
    socket.emit("message", "Hello from server");
  });
});

// Start the server
httpServer.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
