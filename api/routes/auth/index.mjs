import { Router } from "express";
import { hashPassword } from "./hash.mjs";
import { User } from "../../schemas/user.js";
import "./strategies/local-strategies.mjs";
import "./strategies/github-straegies.mjs";
import passport from "passport";

const router = Router();

router.post("/auth/signup", async (req, res) => {
  const { email, name, password } = req.body;
  try {
    const hashedPassword = hashPassword(password);
    const value = await User.create({
      email,
      name,
      password: hashedPassword,
    });
    res.status(200).send({ message: "Account created" });
  } catch (err) {
    console.log(err);
  }
});

router.post("/auth/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).send({ message: "Internal server error" });
    }
    if (!user) {
      return res.status(401).send({ message: info.message || "Login failed" });
    }
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).send({ message: "Login error" });
      }
      return res.sendStatus(200);
    });
  })(req, res, next);
});

router.post("/auth/logout", (req, res) => {
  if (!req.user) return res.sendStatus(401);
  req.logout((err) => {
    if (err) return res.sendStatus(400);
    res.sendStatus(200);
  });
});

router.get("/auth/authStatus", (req, res) => {
  console.log(req.session);
  if (req.user) {
    // User is logged in
    res.status(200).send({ loggedIn: true, user: req.user });
  } else {
    // User is not logged in
    res.status(200).send({ loggedIn: false });
  }
});

router.get("/auth/github", passport.authenticate("github"));

router.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);

export default router;
