const createError = require("http-errors");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
require("dotenv").config();
require("./config/mongoConfig");
const cors = require("cors");
const passport = require("./config/authConfig");
const User = require("./models/User");
const port = process.env.PORT || "5000";
const app = express();
const server = app.listen(port);

const connectedUsers = {};

const io = require("socket.io")(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

io.on("connection", async (socket) => {
  console.log(socket.id);
  socket.on("logged-in", async (userId) => {
    connectedUsers[userId] = socket.id;
    console.log(connectedUsers, "connectedUsers");
  });

  socket.on("get chat", async (userId, targetUserId) => {
    // find chat with target user
    const currentUser = await User.findById(userId).populate("chats");
    if (currentUser.chats.length > 0) {
      const currentChat = currentUser.chats.filter((chat) => {
        chat.to === targetUserId || chat.from === targetUserId;
      });
      return io.to(connectedUsers[userId]).emit("send chat", currentChat);
    }
    io.to(connectedUsers[userId]).emit("send chat", []);
  });
  socket.on("send message", async (msg, chatId) => {
    console.log("message: " + msg.msg);
    io.to(connectedUsers[msg.to]).emit("recieve message", msg);
    // save to database
    // check if chat id exists
    // get chat id and save to it

    const toUser = await User.findById(msg.to).populate("chats.chat chats.to");
    const fromUser = await User.findById(msg.from).populate("chats");
    const currentChat = fromUser.chats.filter((chat) => {
      chat.to === msg.to;
    });
    console.log(currentChat);

    // const newChat = await Chat.create({
    //   chat: [
    //     {
    //       to: mongoose.Types.ObjectId(msg.to),
    //       from: mongoose.Types.ObjectId(msg.from),
    //       msg: msg.msg,
    //     },
    //   ],
    // });
    // toUser.chats.push({
    //   chat: newChat._id,
    //   to: mongoose.Types.ObjectId(fromUser._id),
    // });
    // await toUser.save();

    // fromUser.chats.push({
    //   chat: newChat._id,
    //   to: mongoose.Types.ObjectId(toUser._id),
    // });
    // await fromUser.save();
    // console.log(toUser.chats);
  });
});

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.SECRET));
app.use(
  session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/test", async (req, res) => {
  res.json({ message: "pass!" });
});

app.get("/session", async (req, res) => {
  if (req.isAuthenticated()) {
    const user = await User.findById(req.user._id)
      .populate("friends")
      .populate("friendsRequestsSent")
      .populate("friendsRequestsRecieved");
    res.status(200).json({
      success: true,
      message: "user has successfully authenticated",
      user: user,
    });
  } else {
    res.status(200).json(null);
  }
});

const apiRouter = require("./routes/api");
const authRouter = require("./routes/auth");
const { UnsupportedMediaType } = require("http-errors");
const Chat = require("./models/Chat");
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
