const express = require("express");
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv").config();
const { body, validationResult } = require("express-validator");
const asyncHandler = require("express-async-handler");
const compression = require("compression");
const helmet = require("helmet");

const User = require("./models/user");
const Message = require("./models/message");

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

// const User = mongoose.model(
//   "User",
//   new Schema({
//     username: { type: String, required: true },
//     password: { type: String, required: true },
//   })
// );

const app = express();
app.set("views", __dirname);
app.set("view engine", "ejs");

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await User.findOne({ userName: username });
      if (!user) {
        console.log("bet");
        return done(null, false, { message: "Incorrect username" });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        // passwords do not match!
        return done(null, false, { message: "Incorrect password" });
      }

      //   if (user.password !== password) {
      //     return done(null, false, { message: "Incorrect password" });
      //   }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      "script-src": ["'self'", "code.jquery.com", "cdn.jsdelivr.net"],
    },
  })
);

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

app.get(
  "/",
  [],
  asyncHandler(async (req, res, next) => {
    const allMessages = await Message.find({}, "message author date")
      .sort({ message: 1 })
      .exec();
    res.render("views/index", { feed: allMessages });
  })
);

app.get("/sign-up", (req, res) =>
  res.render("views/sign-up", { errors: null })
);
app.post(
  "/sign-up",
  [
    body("firstname", "First name must be at least two characters")
      .trim()
      .isLength({ min: 2 })
      .escape(),
    body("lastname", "Last name must be at least two characters")
      .trim()
      .isLength({ min: 2 })
      .escape(),
    body("username", "Username must be at least 4 characters")
      .trim()
      .isLength({ min: 4 })
      .escape(),
    body("password", "Password must be at least 6 characters")
      .trim()
      .isLength({ min: 6 })
      .escape(),
    body("confpassword").custom((value, { req }) => {
      if (value != req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
    body("admin").toBoolean().optional(),
  ],
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("views/sign-up", { errors: errors.array() });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      firstName: req.body.firstname,
      lastName: req.body.lastname,
      userName: req.body.username,
      password: hashedPassword,
      memberStatus: "nonmember",
      admin: req.body.admin,
      //   admin: req.body.admin,
    });
    await user.save();
    res.redirect("/");
  })
);

app.post(
  "/log-in",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/",
    failureMessage: true,
  })
);

app.get("/member-up", (req, res) =>
  res.render("views/member-up", { errors: null })
);
app.post(
  "/member-up",
  [
    body("memberstat").custom((value, { req }) => {
      if (value != "Fidelio") {
        throw new Error("That is not the code");
      }
      return true;
    }),
  ],

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("views/member-up", { errors: errors.array() });
    }

    // const update = { memberStatus: "member" };
    // const user = await User.findOne({ _id: req.body.getUser._id });

    // const upUser = new User({
    //   firstName: req.body.getUser.firstName,
    //   lastName: req.body.getUser.lastName,
    //   userName: req.body.getUser.userName,
    //   password: req.body.getUser.password,
    //   memberStatus: "member",
    //   _id: req.body.getUser.id,
    // });
    // const updatedUser = await User.findByIdAndUpdate(
    //   req.body.getID,
    //   upUser,
    //   {}
    // );

    try {
      console.log("Updating member status...");
      const userID = req.body.getUser;
      console.log(userID),
        await User.updateOne(
          { _id: userID },
          { $set: { memberStatus: "member" } }
        );

      res.redirect("/");
    } catch (error) {
      console.error("Error updating member status:", error);
      next(error);
    }
  })
);

app.get("/message", (req, res) => {
  res.render("views/message");
});

app.post(
  "/message",
  [
    body("message", "Message must be at least 2 characters")
      .trim()
      .isLength({ min: 2 })
      .escape(),
  ],
  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.render("views/message", { errors: errors.array() });
    }
    const message = new Message({
      message: req.body.message,
      author: req.body.getUser,
      date: new Date(),
    });
    await message.save();
    res.redirect("/");
  })
);

app.get("/log-out", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

app.post("/delete", async (req, res, next) => {
  console.log(req.body.getMess);
  const messageId = req.body.getMess;
  try {
    await Message.findByIdAndDelete(messageId);
    console.log("Message deleted", messageId);
  } catch (error) {
    console.log("Error deleting:", error);
  }
  res.redirect("/");
});

app.listen(3000, () => console.log("app listening on port 3000!"));
