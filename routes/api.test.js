const app = require("../app");
const request = require("supertest")(app);
require("../mongoConfigTesting");
// const mongoose = require("mongoose");
// require("dotenv").config();

// let connection;
// let db;

// beforeAll(async () => {
//   const mongoDB = process.env.MONGOURI;
//   connection = await mongoose.connect(mongoDB, {
//     useUnifiedTopology: true,
//     useNewUrlParser: true,
//   });
//   db = mongoose.connection;
//   db.on("error", console.error.bind(console, "mongo connection error"));
// });

// afterAll(async () => {
//   await connection.disconnect();
//   await db.close();
// });

it("Gets the test endpoint", async (done) => {
  // Sends GET Request to /test endpoint
  const response = await request.get("/test");
  expect(response.status).toBe(200);
  expect(response.body.message).toBe("pass!");
  done();
});

it("Gets the test endpoint", async (done) => {
  // Sends GET Request to /test endpoint
  const response = await request.get("/test");
  expect(response.status).toBe(200);
  expect(response.body.message).toBe("pass!");
  done();
});
