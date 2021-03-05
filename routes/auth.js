const express = require("express");
const router = express.Router();
const passport = require("../config/authConfig");
const ensureLoggedOut = require("connect-ensure-login").ensureLoggedOut(
  "http://localhost:3000"
);

// Facebook
router.get(
  "/facebook",
  ensureLoggedOut,
  passport.authenticate("facebook", {
    // authType: "reauthenticate",
    scope: ["email"],
  })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/auth/facebook",
    successRedirect: "http://localhost:3000",
  })
);

// Google
router.get(
  "/google",
  ensureLoggedOut,
  passport.authenticate("google", {
    // authType: "reauthenticate",
    scope: ["profile"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/google",
    successRedirect: "http://localhost:3000",
  })
);

router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("http://localhost:3000");
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
