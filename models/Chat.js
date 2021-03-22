const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ChatSchema = new Schema({
  chat: [
    {
      from: { type: Schema.Types.ObjectId, ref: "User", required: true },
      msg: { type: String, required: true },
      to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    },
  ],
});

const Chat = mongoose.model("Chat", ChatSchema);

module.exports = Chat;
