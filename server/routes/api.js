const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const ensureLoggedIn = require("connect-ensure-login").ensureLoggedIn("/");

router.get("/", function (req, res, next) {
  res.send("Hello from Express");
});

//  Users can create posts.
router.post("/users/:id/posts", [
  body("text", "Text can't be empty").not().isEmpty().escape(),

  async function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        data: req.body,
        errors: errors.array(),
      });
    }
    const { text } = req.body;
    const post = new Post({
      User: req.params.id,
      text,
    });
    post.save((err) => {
      if (err) {
        return next(err);
      }
      res.status(200).json({ msg: "post created" });
    });
  },
]);

// Get users posts || CHANGE FOR TIMELINE
router.get("/users/:id/posts", async function (req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (user !== null) {
      const posts = await Post.find({ User: req.params.id });
      if (posts !== null) {
        // actual success
        return res.status(200).json({ posts });
      }
      return res.status(404).json({ msg: "Posts not found" });
    }
    return res.status(404).json({ msg: "User not found" });
  } catch (err) {
    res.status(404).json({ msg: err });
  }
});

// Like Post
router.post("/posts/:postId/likes/", async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.postId,
    { $inc: { likes: 1 } },
    { new: true }
  );
  return res.status(200).json({
    post: `post with id of ${req.params.postId} has now ${post.likes} likes`,
  });
});

// Commment Post
router.post("/users/:userId/posts/:postId/comments/", [
  body("text", "Text can't be empty").not().isEmpty().escape(),

  async function (req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({
        data: req.body,
        errors: errors.array(),
      });
    }
    const { text } = req.body;
    const post = await Post.findById(req.params.postId);

    const newComment = { User: req.params.userId, text };
    post.comments = [...post.comments, newComment];
    await post.save();

    return res.status(200).json({
      post,
    });
  },
]);

// Send friend request
router.post(
  "/friendRequest/:sentid/:recieverid",
  async function (req, res, next) {
    const { recieverid, sentid } = req.params;
    const userRecieving = await User.findById(recieverid);
    const userSending = await User.findById(sentid);

    const checkForDuplicate = (where, who) => {
      return where.includes(who);
    };
    if (
      checkForDuplicate(userRecieving.friendsRequestsRecieved, sentid) ||
      checkForDuplicate(userSending.friendsRequestsSent, recieverid)
    ) {
      return res.status(401).json({ msg: "Not allowed" });
    }
    userRecieving.friendsRequestsRecieved = [
      ...userRecieving.friendsRequestsRecieved,
      sentid,
    ];

    userSending.friendsRequestsSent = [
      ...userSending.friendsRequestsSent,
      sentid,
    ];
    try {
      await userSending.save();
      await userRecieving.save();
    } catch (err) {
      return res.status(404).json(err);
    }

    res.status(200).json({ userRecieving, userSending });
  }
);

// router.get("/users/:sentid/request/:recieverid", function (req, res, next) {
//   res.send("Hello from Express");
// });

module.exports = router;
