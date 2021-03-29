const express = require("express");
const router = express.Router();
const passport = require("../config/authConfig");
require("dotenv").config();

const ensureLoggedOut = require("connect-ensure-login").ensureLoggedOut(
  process.env.FRONT_END
);

// Facebook
router.get("/facebook", ensureLoggedOut, passport.authenticate("facebook", {}));

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/auth/facebook",
    successRedirect: process.env.FRONT_END,
  })
);

// Google
router.get(
  "/google",
  ensureLoggedOut,
  passport.authenticate("google", {
    scope: ["profile"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/google",
    successRedirect: process.env.FRONT_END,
  })
);

router.get("/logout", function (req, res) {
  req.logout();
  res.redirect(process.env.FRONT_END);
  // req.session.destroy(function (err) {
  //   if (!err) {
  //     res
  //       .status(200)
  //       // .clearCookie("connect.sid", { path: "/" })
  //       .redirect("http://localhost:3000");
  //   } else {
  //     console.log(err);
  //   }
  // });
});

module.exports = router;
