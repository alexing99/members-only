const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MessageSchema = new Schema({
  message: { type: String, required: true },
  author: { type: String, required: true },
  date: { type: Date, required: true },
});

// ItemSchema.virtual("url").get(function () {
//   return `/catalog/item/${this._id}`;
// });

module.exports = mongoose.model("Message", MessageSchema);
