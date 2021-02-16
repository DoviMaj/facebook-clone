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

      const user = await User.findOne({ facebookId: profile.id });

      if (user !== null) {
        return done(null, user);
      }
      await User.create(userData);
      done(err, user);
    }
  )
);

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
passport.serializeUser(function (user, cb) {
  cb(null, user);
});

passport.deserializeUser(function (obj, cb) {
  cb(null, obj);
});

module.exports = passport;
