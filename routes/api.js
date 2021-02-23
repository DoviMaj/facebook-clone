const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const ensureLoggedIn = require("connect-ensure-login").ensureLoggedIn("/");

//  Users can create posts. || refactor with req.user!!
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

// Get User Profile || refactor with req.user!!
router.get("/:id/profile", async (req, res) => {
  const user = await User.findById(req.params.id);
  const userPosts = await Post.find({ User: req.params.id }).sort("-date");
  if (user === null) {
    return res.status(404).json({ msg: "user not found" });
  }
  res.status(200).json({ user, userPosts });
});

// Get user TIMELINE  || refactor with req.user!!
router.get("/users/:id/timeline", async function (req, res, next) {
  const user = await User.findById(req.params.id);
  const userPosts = await Post.find({ User: req.params.id }).sort("-date");
  if (userPosts !== null) {
    const friendsPosts = await getFriendsPosts();
    async function getFriendsPosts() {
      const jobQueries = [];
      user.friends.map((friend) => {
        jobQueries.push(Post.find({ User: friend }).sort("-date"));
      });
      const posts = await Promise.all(jobQueries);
      return posts[0];
    }
    if (friendsPosts !== null) {
      const allPosts = userPosts.concat(friendsPosts);
      const sortedPosts = allPosts.slice().sort((a, b) => b.date - a.date);
      return res.status(200).json(sortedPosts);
    }
    return res.status(200).json(userPosts);
  }
  return res.status(404).json({ msg: "posts not found" });
});

// Like Post
router.post("/posts/:postId/likes/", async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.postId,
    { $inc: { likes: 1 } },
    { new: true }
  );
  return res.status(200).json({
    msg: `post with id of ${req.params.postId} has now ${post.likes} likes`,
  });
});

// Commment Post || refactor with req.user!!
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

// Send friend request || refactor with req.user!!
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
      checkForDuplicate(userSending.friendsRequestsSent, recieverid)
    ) {
      return res.status(405).json({ msg: "Pending request" });
    }

    if (
      checkForDuplicate(userRecieving.friends, sentid) ||
      checkForDuplicate(userSending.friends, recieverid)
    ) {
      return res.status(405).json({ msg: "Already friends" });
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
      checkForNonExistingReq(userSending.friendsRequestsSent, recieverid)
    ) {
      return res.status(405).json({ msg: "No request found" });
    }
    if (
      checkForAlreadyFriend(userRecieving.friends, sentid) ||
      checkForAlreadyFriend(userSending.friends, recieverid)
    ) {
      return res.status(405).json({ msg: "Already friends" });
    }
    // add to friend array
    userRecieving.friends.push(sentid);
    // remove from pending request array
    const newFriendsArr = userRecieving.friendsRequestsRecieved.filter(
      (friend) => friend.toString() !== sentid
    );
    userRecieving.friendsRequestsRecieved = newFriendsArr;

    // add to friend array
    userSending.friends.push(recieverid);
    // remove from pending request array
    const newFriendsArr2 = userSending.friendsRequestsSent.filter(
      (friend) => friend.toString() !== recieverid
    );
    userSending.friendsRequestsSent = newFriendsArr2;

    try {
      await userSending.save();
      await userRecieving.save();
      res.status(200).json({ msg: "Friend added", userRecieving });
    } catch (err) {
      res.status(404).json({ err: err });
    }
  }
);

// Unfriend Request || TODO
router.post("/unfriend/:sentid/:recieverid", function (req, res, next) {
  res.json("Hello from Express");
});

// router.get("/users/:sentid/request/:recieverid", function (req, res, next) {
//   res.send("Hello from Express");
// });
module.exports = router;
