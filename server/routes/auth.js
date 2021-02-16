const express = require("express");
const router = express.Router();
const passport = require("../config/authConfig");
const ensureLoggedOut = require("connect-ensure-login").ensureLoggedOut("/");

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
router.get(
  "/facebook",
  ensureLoggedOut,
  passport.authenticate("facebook", { scope: ["email"] })
);

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/auth/facebook",
    successRedirect: "/",
  })
);

router.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

module.exports = router;
