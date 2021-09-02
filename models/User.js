const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  mac: {
    type: String,
    required: false,
    default: "",
  },
  ip1: {
    type: String,
    required: false,
    default: "",
  },
  ip2: {
    type: String,
    required: false,
    default: "",
  },
  roles: {
    type: String,
    required: true,
    default: "USER",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model("User", UserSchema);

module.exports = User;
