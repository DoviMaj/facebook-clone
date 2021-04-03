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
const Chat = require("./models/Chat");
const User = require("./models/User");
const port = process.env.PORT || "5000";
const app = express();

app.set("trust proxy", 1);

const server = app.listen(port);

let currentChat;
const connectedUsers = {};

const corsOptions = {
  cors: {
    origin: function (origin, callback) {
      console.log(origin);
      callback(null, origin);
    },
    credentials: true,
  },
};

// socket setup
const io = require("socket.io")(server, corsOptions);

io.on("connection", async (socket) => {
  console.log(socket.id);
  socket.on("logged-in", async (userId) => {
    connectedUsers[userId] = socket.id;
    console.log(connectedUsers, "connectedUsers");
  });

  socket.on("get chat", async (userId, targetUserId) => {
    console.log(corsOptions.cors.origin);
    const toUser = await User.findById(targetUserId).populate("chats.chat");
    const fromUser = await User.findById(userId).populate("chats.chat");
    // if chat already exists
    // send chat document back
    // else create new chat
    const currentChatFind = fromUser.chats.filter(
      (chat) => chat.to === targetUserId
    );
    console.log(currentChatFind, "line 48");
    currentChat = currentChatFind;
    if (!currentChatFind[0]) {
      console.log("im in");
      const newChat = await Chat.create({});
      currentChatId = newChat._id;
      toUser.chats.push({
        chat: newChat._id,
        to: mongoose.Types.ObjectId(fromUser._id),
      });
      await toUser.save();
      fromUser.chats.push({
        chat: newChat._id,
        to: mongoose.Types.ObjectId(toUser._id),
      });
      await fromUser.save();
      currentChat = newChat;
    }
    if (!currentChat[0]) {
      console.log("66");
      return io.to(connectedUsers[userId]).emit("send chat", []);
    }
    console.log(currentChat, "69");
    io.to(connectedUsers[userId]).emit("send chat", currentChat[0].chat.chat);
  });
  // get new message from client
  socket.on("send message", async (msg) => {
    console.log("message: " + msg.msg);
    io.to(connectedUsers[msg.to]).emit("recieve message", msg);
    // Save to database:
    console.log(currentChat[0].chat._id);
    try {
      const currentChatDoc = await Chat.findById(currentChat[0].chat._id);

      console.log(currentChatDoc);
      currentChatDoc.chat.push(msg);
      await currentChatDoc.save();
    } catch (err) {
      console.log(err, "err");
    }
  });
});

app.use(cors(corsOptions.cors));
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
const sessionOptions = {
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    sameSite: "none",
  },
};

app.use(session(sessionOptions));

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
