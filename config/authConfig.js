const User = require("../models/User");

const passport = require("passport"),
  FacebookStrategy = require("passport-facebook").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;

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
        user = await User.create(userData);
      }
      done(null, user);
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async function (accessToken, refreshToken, profile, done) {
      console.log(profile);
      const { displayName, photos } = profile;
      const userData = {
        username: displayName,
        picture_url: photos[0].value,
        googleId: profile.id,
      };
      let user = await User.findOne({ googleId: profile.id });
      if (user === null) {
        user = await User.create(userData);
      }
      done(null, user);
    }
  )
);

passport.serializeUser(function (user, cb) {
  cb(null, user._id);
});

passport.deserializeUser(async function (id, cb) {
  User.findById(id, (err, user) => {
    if (err) {
      cb(null, false, { error: err });
    } else {
      cb(null, user);
    }
  });
});

module.exports = passport;
