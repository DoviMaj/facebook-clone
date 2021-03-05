const mongoose = require("mongoose");

const mongoDB = process.env.MONGOURI;
mongoose.connect(mongoDB, { useUnifiedTopology: true, useNewUrlParser: true });
mongoose.set("useFindAndModify", false);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));
