const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const adminRoutes = require("./routes/admin.js");
const shopRoutes = require("./routes/shop.js");
const errorController = require("./controllers/error.js");
const { mongoConnect } = require("./utils/database.js");
const Users = require("./models/users.js");
const mongoDb = require("mongodb");
const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  Users.findById("69a16129af5c48d05805e1c3")
    .then((user) => {
      if (user) {
        req.user = new Users(user.name, user.email, user.cart, user._id);
      }
      next();
    })
    .catch((err) => {
      console.log(err);
      next();
    });
});
app.use("/admin", adminRoutes);
app.use(shopRoutes);

app.use(errorController.pageNotFound);

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
