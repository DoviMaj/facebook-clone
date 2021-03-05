const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const ensureLoggedIn = require("connect-ensure-login").ensureLoggedIn("/");

//  Users can create posts.
router.post("/posts", [
  body("text", "Text can't be empty").not().isEmpty().trim().escape(),

  async function (req, res, next) {
    console.log("hi");
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(req.body);
      return res.json({
        data: req.body,
        errors: errors.array(),
      });
    }

    const { text } = req.body;
    const post = new Post({
      User: req.user._id,
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

// Delete post
router.delete("/posts/:id", async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
  } catch (err) {
    res.status(404).json({ msg: "something went wrong" });
  }

  res
    .status(200)
    .json({ msg: `post with id ${req.params._id} deleted succesfully` });
});

// Get User Profile
router.get("/profile", async (req, res) => {
  const user = await User.findById(req.user._id);
  const userPosts = await Post.find({ User: req.user._id }).sort("-date");
  if (user === null) {
    return res.status(404).json({ msg: "user not found" });
  }
  res.status(200).json({ user, userPosts });
});

// Get all non friends users
router.get("/notFriends", async (req, res) => {
  console.log(req.user._id);
  const currentUser = await User.findById(req.user._id);
  const allUsers = await User.find({});

  const notFriends = allUsers.filter(
    (user) =>
      !currentUser.friends.includes(user._id) &&
      user._id.toString() !== currentUser._id.toString()
  );

  if (currentUser === null) {
    return res.status(404).json({ msg: "user not found" });
  }
  res.status(200).json(notFriends);
});

// Get user TIMELINE
router.get("/timeline", async function (req, res, next) {
  const user = await User.findById(req.user._id);
  const userPosts = await Post.find({ User: req.user._id })
    .populate("User")
    .populate({
      path: "comments",
      populate: { path: "User", model: "User" },
    })
    .sort({ date: -1 });
  if (userPosts !== null) {
    if (user.friends.length > 0) {
      const friendsPosts = await getFriendsPosts();
      async function getFriendsPosts() {
        const jobQueries = [];
        user.friends.map((friend) => {
          jobQueries.push(
            Post.find({ User: friend })
              .populate("User")
              .populate({
                path: "comments",
                populate: { path: "User", model: "User" },
              })
              .sort({ date: -1 })
          );
        });
        const posts = await Promise.all(jobQueries);
        return posts[0];
      }
      if (friendsPosts) {
        const allPosts = userPosts.concat(friendsPosts);
        const sortedPosts = allPosts.slice().sort((a, b) => b.date - a.date);
        return res.status(200).json(sortedPosts);
        // return res.status(200).json(allPosts);
      }
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

// Dislike Post
router.put("/posts/:postId/likes/", async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.postId,
    { $inc: { likes: -1 } },
    { new: true }
  );
  return res.status(200).json({
    msg: `post with id of ${req.params.postId} has now ${post.likes} likes`,
  });
});

// Commment Post
router.post("/posts/:postId/comments/", [
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

    const newComment = { User: req.user._id, text };
    post.comments = [...post.comments, newComment];
    await post.save();
    console.log(post.comments);
    return res.status(200).json({
      comments: post.comments,
    });
  },
]);

// Send friend request
router.post("/friendRequest/:recieverid", async function (req, res, next) {
  const { recieverid } = req.params;

  const userRecieving = await User.findById(recieverid);
  const userSending = await User.findById(req.user._id);
  const checkForDuplicate = (friendArr, friend) => {
    return friendArr.includes(friend);
  };
  if (
    checkForDuplicate(userRecieving.friendsRequestsRecieved, req.user._id) ||
    checkForDuplicate(userSending.friendsRequestsSent, recieverid)
  ) {
    return res.status(405).json({ msg: "Pending request" });
  }

  if (
    checkForDuplicate(userRecieving.friends, req.user._id) ||
    checkForDuplicate(userSending.friends, recieverid)
  ) {
    return res.status(405).json({ msg: "Already friends" });
  }
  userRecieving.friendsRequestsRecieved.push(req.user._id);
  userSending.friendsRequestsSent.push(recieverid);

  try {
    await userSending.updateOne();
    await userRecieving.updateOne();
    res.status(200).json({ userRecieving, userSending });
  } catch (err) {
    res.status(404).json({ err: err });
  }
});

// Accept friend request
router.post("/acceptRequest/:sentid", async function (req, res, next) {
  const { sentid } = req.params;

  const userRecieving = await User.findById(req.user._id);
  const userSending = await User.findById(sentid);
  const checkForNonExistingReq = (friendArr, friend) => {
    return !friendArr.includes(friend);
  };
  const checkForAlreadyFriend = (friendArr, friend) => {
    return friendArr.includes(friend);
  };
  if (
    checkForNonExistingReq(userRecieving.friendsRequestsRecieved, sentid) ||
    checkForNonExistingReq(userSending.friendsRequestsSent, req.user._id)
  ) {
    return res.status(405).json({ msg: "No request found" });
  }
  if (
    checkForAlreadyFriend(userRecieving.friends, sentid) ||
    checkForAlreadyFriend(userSending.friends, req.user._id)
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
  userSending.friends.push(req.user._id);
  // remove from pending request array
  const newFriendsArr2 = userSending.friendsRequestsSent.filter(
    (friend) => friend.toString() !== req.user._id
  );
  userSending.friendsRequestsSent = newFriendsArr2;

  try {
    await userSending.save();
    await userRecieving.save();
    res.status(200).json({ msg: "Friend added", userRecieving });
  } catch (err) {
    res.status(404).json({ err: err });
  }
});

// Unfriend Request || TODO
router.post("/unfriend/:sentid/:recieverid", function (req, res, next) {
  res.json("Hello from Express");
});

module.exports = router;
