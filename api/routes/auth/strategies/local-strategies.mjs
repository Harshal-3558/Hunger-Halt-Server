import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { User } from "../../../schemas/user.js";
import bcrypt from "bcryptjs";

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

passport.use(
  new LocalStrategy(
    {
      usernameField: "email", // Specify the name of the email field
      passwordField: "password", // Specify the name of the password field
    },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "User not found!" });
        }

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid credentials!" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
