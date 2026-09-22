require("dotenv").config();
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const adminRoutes = require("./routes/admin.js");
const shopRoutes = require("./routes/shop.js");
const authRoutes = require("./routes/auth.js");
const errorController = require("./controllers/error.js");
const isAuth = require("./middleware/is-auth.js");
const Users = require("./models/users.js");
const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

// Registered before the session middleware so the ECS container healthcheck
// and the ALB target-group probe never touch the session store.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
  });
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

const sessionStore = new MongoDBStore(
  {
    uri: process.env.MONGO_URL,
    collection: "sessions",
  },
  (err) => {
    if (err) {
      process.stderr.write("Session store connection error: " + err.message + "\n");
    }
  },
);
sessionStore.on("error", (err) => process.stderr.write(String(err) + "\n"));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
  }),
);

app.use((req, res, next) => {
  res.locals.isLoggedIn = req.session.isLoggedIn || false;
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }

  Users.findById(req.session.user._id)
    .then((user) => {
      if (user) {
        req.user = new Users(
          user.name,
          user.email,
          user.cart,
          user._id,
          user.password,
        );
      }
      next();
    })
    .catch((err) => {
      console.log(err);
      next();
    });
});

app.use(authRoutes);
app.use("/admin", isAuth, adminRoutes);
app.use(shopRoutes);

app.use(errorController.pageNotFound);

module.exports = app;