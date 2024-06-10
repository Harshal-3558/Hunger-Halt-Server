import express from "express";
import mongoose from "mongoose";
import "dotenv/config";
import routes from "./routes/routes.mjs";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";

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

app.get("/", (req, res) => {
  res.send("This is Hunger Halt Backend!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
