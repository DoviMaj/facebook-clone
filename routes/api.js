const express = require("express");
const Post = require("../models/Post");
const User = require("../models/User");
const router = express.Router();
const { body, validationResult } = require("express-validator");
require("dotenv").config();
const fs = require("fs");
const AWS = require("aws-sdk");
const fileType = require("file-type");
const multiparty = require("multiparty");

// configure the keys for accessing AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET,
});

// create S3 instance
const s3 = new AWS.S3();

const uploadFile = (buffer, name, type) => {
  const params = {
    ACL: "public-read",
    Body: buffer,
    Bucket: process.env.S3_BUCKET,
    ContentType: type.mime,
    Key: `${name}.${type.ext}`,
  };
  return s3.upload(params).promise();
};

function sanitize(string) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&grave;",
  };
  const reg = /[&<>"'/]/gi;
  return string.replace(reg, (match) => map[match]);
}

// Post image
router.post("/updateProfileImg", (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    console.log(error, fields, files);
    if (error) {
      console.log(error);
      return res.status(500).send(error);
    }
    try {
      const path = files.myFile[0].path;
      const buffer = fs.readFileSync(path);
      const type = await fileType.fromBuffer(buffer);
      const fileName = `images/${Date.now().toString()}`;
      const publicPath = `https://${process.env.S3_BUCKET}.s3.us-east-2.amazonaws.com/${fileName}.${type.ext}`;
      console.log(publicPath);
      const data = await uploadFile(buffer, fileName, type);
      const user = await User.findById(req.user._id);
      user.picture_url = publicPath;
      await user.save();
      return res.status(200).send(data);
    } catch (err) {
      console.log(err);
      return res.status(500).send(err);
    }
  });
});

//  Users can create posts.
router.post("/posts", async function (req, res, next) {
  console.log("1");

  const THE_POST = { User: req.user._id };
  const form = new multiparty.Form();
  form.parse(req, async (error, fields, files) => {
    if (files.myFile) {
      if (error) {
        console.log(error);
        return res.status(500).send(error);
      }
      try {
        console.log("3");

        const path = files.myFile[0].path;
        const buffer = fs.readFileSync(path);
        const type = await fileType.fromBuffer(buffer);
        const fileName = `images/${Date.now().toString()}`;
        THE_POST.image_url = `https://${process.env.S3_BUCKET}.s3.us-east-2.amazonaws.com/${fileName}.${type.ext}`;
        console.log(THE_POST.image_url);
        await uploadFile(buffer, fileName, type);
      } catch (err) {
        return res.status(500).send(error);
      }
    }
    console.log("4", files.text, files.Myfile, fields);

    if (fields.text) {
      THE_POST.text = sanitize(fields.text[0]);
    }

    console.log(THE_POST.text || THE_POST.image_url);
    if (THE_POST.text || THE_POST.image_url) {
      console.log("5");

      const post = new Post(THE_POST);
      post.save((err) => {
        if (err) {
          return next(err);
        }
        res.status(200).json({ msg: "post created" });
      });
    } else {
      res.status(500).json({ msg: "missing image or text" });
    }
  });
});

// Delete post
router.delete("/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.image_url) {
      const key = post.image_url.substring(post.image_url.lastIndexOf("/") + 1);
      const path = `images/${key}`;
      const params = {
        Bucket: process.env.S3_BUCKET,
        Key: path, //if any sub folder-> path/of/the/folder.ext
      };
      try {
        await s3.headObject(params).promise();
        console.log("File Found in S3");
        try {
          await s3.deleteObject(params).promise();
          console.log("file deleted Successfully");
          await Post.findByIdAndDelete(req.params.id);
          return res.status(200).json({ msg: "deleted sucessfully" });
        } catch (err) {
          console.log("ERROR in file Deleting : " + JSON.stringify(err));
          return res.status(404).json({ msg: "something went wrong" });
        }
      } catch (err) {
        console.log("File not Found ERROR : " + err.code);
        return res.status(404).json({ msg: "something went wrong" });
      }
    }
    await Post.findByIdAndDelete(req.params.id);
  } catch (err) {
    return res.status(404).json({ msg: "something went wrong" });
  }
  res
    .status(200)
    .json({ msg: `post with id ${req.params._id} deleted succesfully` });
});

// Get User Profile
router.get("/profile/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  const posts = await Post.find({ User: req.params.id })
    .populate("User")
    .populate("comments.User")
    .sort("-date");
  if (user === null) {
    return res.status(404).json({ msg: "user not found" });
  }
  console.log(posts);
  res.status(200).json({ user, posts });
});

// Get all non friends users
router.get("/notFriends", async (req, res) => {
  console.log(req.user);
  const currentUser = await User.findById(req.user._id);

  console.log(currentUser);
  const allUsers = await User.find({});

  const notFriends = allUsers.filter(
    (user) =>
      !currentUser.friends.includes(user._id) &&
      user._id.toString() !== currentUser._id.toString() &&
      !currentUser.friendsRequestsSent.includes(user._id) &&
      !currentUser.friendsRequestsRecieved.includes(user._id)
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
  console.log(recieverid, req.user._id);
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
    await userSending.save();
    await userRecieving.save();
    res.status(200).json({ userRecieving, userSending });
  } catch (err) {
    res.status(404).json({ err: err });
  }
});

// Accept friend request
router.post("/acceptRequest/:userSendingId", async function (req, res, next) {
  const { userSendingId } = req.params;
  const recievingUserId = req.user._id;

  const userRecieving = await User.findById(recievingUserId);
  const userSending = await User.findById(userSendingId);

  if (!userSending.friendsRequestsSent.includes(recievingUserId)) {
    return res.status(405).json({ msg: "No request found" });
  }
  if (userSending.friends.includes(req.user._id)) {
    return res.status(405).json({ msg: "Already friends" });
  }

  // add to friend array
  userRecieving.friends.push(userSendingId);
  // remove from pending request array
  userRecieving.friendsRequestsRecieved.pull(userSendingId);

  // add to friend array
  userSending.friends.push(req.user._id);
  // remove from pending request array
  userSending.friendsRequestsSent.pull(recievingUserId);

  try {
    await userSending.save();
    await userRecieving.save();
    res.status(200).json({ msg: "Friend added", userRecieving });
  } catch (err) {
    res.status(404).json({ err: err });
  }
});

// Unfriend
router.post("/unfriend/:unfriendId/", async function (req, res, next) {
  const { unfriendId } = req.params;

  const unfriend = await User.findById(unfriendId);
  const currentUser = await User.findById(req.user._id);

  currentUser.friends.pull(unfriendId);
  unfriend.friends.pull(req.user._id);

  try {
    await unfriend.save();
    await currentUser.save();
  } catch (err) {
    res.status(404).json({ msg: "something went wrong" });
  }
  res.json({});
});

// Remove friend request sent
router.post("/unrequest/:unrequestId/", async function (req, res, next) {
  const { unrequestId } = req.params;

  const unrequested = await User.findById(unrequestId);
  const currentUser = await User.findById(req.user._id);

  unrequested.friendsRequestsRecieved.pull(req.user._id);
  currentUser.friendsRequestsSent.pull(unrequestId);

  try {
    await unrequested.save();
    await currentUser.save();
    res.status(200).json({ msg: "request removed" });
  } catch (err) {
    res.status(404).json({ msg: "something went wrong" });
    next();
  }
});

// get current user
router.get("/me", async (req, res, next) => {
  const currentUser = await User.findById(req.user._id)
    .populate("friends")
    .populate("friendsRequestsSent")
    .populate("friendsRequestsRecieved");
  res.status(200).json(currentUser);
});

module.exports = router;
