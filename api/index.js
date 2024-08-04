import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import cors from "cors";
import auth from "./routes/auth/auth.js"

const app = express();
const port = 3001;

mongoose
  .connect(process.env.MONGO_DB_URL)
  .then(() => {
    console.log("Connected to DB");    
  })
  .catch((err) => {
    console.log(err);
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
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Must be 'none' to enable cross-site delivery
    },
    store: MongoStore.create({
      client: mongoose.connection.getClient(),
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(auth);

app.get("/", (req, res) => {
  res.send("This is Hunger Halt Backend!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});