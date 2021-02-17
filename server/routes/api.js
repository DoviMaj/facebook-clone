const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const ensureLoggedIn = require("connect-ensure-login").ensureLoggedIn("/");

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
    const checkForDuplicate = (friendArr, friend) => {
      return friendArr.includes(friend);
    };
    if (
      checkForDuplicate(userRecieving.friendsRequestsRecieved, sentid) ||
      checkForDuplicate(userRecieving.friends, sentid) ||
      checkForDuplicate(userSending.friendsRequestsSent, recieverid) ||
      checkForDuplicate(userSending.friends, recieverid)
    ) {
      return res
        .status(405)
        .json({ msg: "Already friends or pending request" });
    }
    userRecieving.friendsRequestsRecieved.push(sentid);
    userSending.friendsRequestsSent.push(sentid);

    try {
      await userSending.updateOne();
      await userRecieving.updateOne();
      res.status(200).json({ userRecieving, userSending });
    } catch (err) {
      res.status(404).json({ err: err });
    }
  }
);

// Accept friend request
router.post(
  "/acceptRequest/:sentid/:recieverid",
  async function (req, res, next) {
    const { recieverid, sentid } = req.params;

    const userRecieving = await User.findById(recieverid);
    const userSending = await User.findById(sentid);
    const checkForNonExistingReq = (friendArr, friend) => {
      return !friendArr.includes(friend);
    };
    const checkForAlreadyFriend = (friendArr, friend) => {
      return friendArr.includes(friend);
    };
    if (
      checkForNonExistingReq(userRecieving.friendsRequestsRecieved, sentid) ||
      checkForNonExistingReq(userSending.friendsRequestsSent, recieverid) ||
      checkForAlreadyFriend(userRecieving.friends, sentid) ||
      checkForAlreadyFriend(userSending.friends, recieverid)
    ) {
      return res
        .status(405)
        .json({ msg: "Already friends or pending request" });
    }
    // add to frind array
    userRecieving.friends.push(sentid);
    // remove from pending request array
    const newFriendsArr = userRecieving.friendsRequestsRecieved.filter(
      (friend) => friend.toString() !== sentid
    );
    userRecieving.friendsRequestsRecieved = newFriendsArr;

    // add to frind array
    userSending.friends.push(recieverid);
    // remove from pending request array
    const newFriendsArr2 = userSending.friendsRequestsSent.filter(
      (friend) => friend.toString() !== recieverid
    );
    userSending.friendsRequestsSent = newFriendsArr2;

    try {
      await userSending.updateOne();
      await userRecieving.updateOne();
      res.status(200).json({ userRecieving, userSending });
    } catch (err) {
      res.status(404).json({ err: err });
    }
  }
);

// router.get("/users/:sentid/request/:recieverid", function (req, res, next) {
//   res.send("Hello from Express");
// });
module.exports = router;
