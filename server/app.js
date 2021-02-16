const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
require("dotenv").config();
require("./config/mongoConfig");
const passport = require("./config/authConfig");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "../client/build")));
app.use(
  require("express-session")({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.get(
  "/",
  express.static(path.join(__dirname, "../client/build/index.html"))
);

app.get("/test", async (req, res) => {
  res.json({ message: "pass!" });
});

const apiRouter = require("./routes/api");
const authRouter = require("./routes/auth");
app.use("/api", apiRouter);
app.use("/auth", authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.status(404).json({ error: "Page not found" });
});

module.exports = app;
