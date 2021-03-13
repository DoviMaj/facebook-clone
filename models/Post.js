const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PostSchema = new Schema({
  User: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: {
    type: String,
  },
  image_url: { type: String },
  likes: { type: Number, default: 0 },
  comments: [
    {
      User: { type: Schema.Types.ObjectId, ref: "User", required: true },
      text: { type: String, required: true },
      likes: { type: Number, default: 0 },
      date: { type: Date, default: Date.now },
    },
  ],
  date: { type: Date, default: Date.now },
});

const Post = mongoose.model("Post", PostSchema);

module.exports = Post;
