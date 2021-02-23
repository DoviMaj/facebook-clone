const User = require("../models/User");

const passport = require("passport"),
  FacebookStrategy = require("passport-facebook").Strategy;

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "displayName", "email", "picture"],
    },
    async function (accessToken, refreshToken, profile, done) {
      const { email, name, picture } = profile._json;
      const userData = {
        email: email,
        username: name,
        picture_url: picture.data.url,
        facebookId: profile.id,
      };
      let user = await User.findOne({ facebookId: profile.id });
      if (user === null) {
        console.log("not a user");
        user = await User.create(userData);
      }
      done(err, user);
    }
  )
);

passport.serializeUser(function (user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(async function (id, cb) {
  const user = await User.findById(id);
  cb(null, user);
});

module.exports = passport;
