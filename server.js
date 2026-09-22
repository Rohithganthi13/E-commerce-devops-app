const mongoDb = require("mongodb");
const app = require('./app.js')
const { mongoConnect } = require("./utils/database.js");
const Users = require("./models/users.js");

mongoConnect(() => {
  Users.findById("69a16129af5c48d05805e1c3")
    .then((user) => {
      if (!user) {
        const newUser = new Users(
          "Test User",
          "test@test.com",
          { items: [] },
          new mongoDb.ObjectId("69a16129af5c48d05805e1c3")
        );
        return newUser.save();
      }
    })
    .then(() => {
      app.listen(3000);
    });
});