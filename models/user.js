const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  userName: { type: String, required: true },
  password: { type: String, required: true },
  memberStatus: {
    type: String,
    enum: ["member", "nonmember"],
  },
  admin: { type: Boolean },
});

module.exports = mongoose.model("User", UserSchema);
