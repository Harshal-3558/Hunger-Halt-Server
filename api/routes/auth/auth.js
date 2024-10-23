import { Router } from "express";
import "./strategies.js";
import passport from "passport";
import bycrpt from "bcryptjs";
import { User } from "../../schemas/schema2.js";

const router = Router();
const saltRound = 10;
export const hashPassword = (password) => {
  const salt = bycrpt.genSaltSync(saltRound);
  return bycrpt.hashSync(password, salt);
};

router.post("/auth/signup", async (req, res) => {
  const { email, name, password } = req.body;
  try {
    const hashedPassword = hashPassword(password);
    const value = await User.create({
      email,
      name,
      password: hashedPassword,
      currentLocation: {
        type: "Point",
        coordinates: [0, 0],
      },
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
      return res.status(200).send({ success: true, user: req.user });
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
  // console.log('Session:', req.session);
  // console.log('User:', req.user);
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
  passport.authenticate("github", {
    failureRedirect: "http://localhost:5173/login",
  }),
  (req, res) => {
    const data = res.req.user;
    if (data.role) {
      res.redirect(`http://localhost:5173/${data.role}`);
    } else {
      res.redirect("http://localhost:5173/selectrole");
    }
  }
);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    const data = res.req.user;
    if (data.role) {
      res.redirect(`http://localhost:5173/${data.role}`);
    } else {
      res.redirect("http://localhost:5173/selectrole");
    }
  }
);

router.post("/auth/updateFCM", async (req, res) => {
  const { email, token } = req.body;
  try {
    await User.findOneAndUpdate({ email }, { FCMtoken: token });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(400);
  }
});

router.post("/auth/updateDetails", async (req, res) => {
  const { id, role, location, orgName, orgEmail, days } = req.body;
  let updateData = {
    role,
    organization: orgName,
    workingDays: days,
  };

  if (location.length > 0 && role === "volunteer") {
    updateData.currentLocation = {
      type: "Point",
      coordinates: location,
    };
  }

  try {
    const updateRole = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });
    if (updateRole.role === "ngo") {
      await NGO.create({
        adminName: updateRole.name,
        adminEmail: updateRole.email,
        email: updateRole.email,
        name: orgName,
        email: orgEmail,
        workingLocation: {
          type: "Point",
          coordinates: location,
        },
      });
    }
    res.status(200).send(updateRole);
  } catch (err) {
    res.status(400).send({ message: "Something went wrong" });
  }
});

export default router;
