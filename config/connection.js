const mongoose = require("mongoose");
const config = require("./keys");

module.exports = {
  connectToServer: () => {
    let db =
      process.env.NODE_ENV !== "development"
        ? process.env.PRODUCTION_DB
        : process.env.PRODUCTION_DB;
    mongoose
      .connect(db, { keepAlive: true, useNewUrlParser: true, useUnifiedTopology: true })
      .then(() => {
        console.log("MongoDB Connected");
      })
      .catch((err) => {
        console.log("MongoDB Error");
      });

    global.db = global.db ? global.db : mongoose.connection;
  },
  getDb: () => {
    return global.db;
  },
};
