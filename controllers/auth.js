const bcrypt = require("bcryptjs");
const Users = require("../models/users.js");

exports.getLogin = (req, res, next) => {
  res.render("auth/login", {
    pageTitle: "Login",
    path: "/login",
    errorMessage: req.query.error || null,
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  Users.findByEmail(email)
    .then((user) => {
      if (!user) {
        return res.redirect("/login?error=Invalid email or password");
      }
      return bcrypt.compare(password, user.password).then((passwordsMatch) => {
        if (!passwordsMatch) {
          return res.redirect("/login?error=Invalid email or password");
        }
        req.session.isLoggedIn = true;
        req.session.user = {
          _id: user._id.toString(),
          name: user.name,
          email: user.email,
        };
        return req.session.save((err) => {
          if (err) {
            console.log(err);
          }
          res.redirect("/");
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/login?error=Something went wrong, please try again");
    });
};

exports.getSignup = (req, res, next) => {
  res.render("auth/signup", {
    pageTitle: "Signup",
    path: "/signup",
    errorMessage: req.query.error || null,
  });
};

exports.postSignup = (req, res, next) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;

  Users.findByEmail(email)
    .then((existingUser) => {
      if (existingUser) {
        return res.redirect("/signup?error=An account with that email already exists");
      }
      return bcrypt.hash(password, 12).then((hashedPassword) => {
        const user = new Users(name, email, { items: [] }, null, hashedPassword);
        return user.save();
      }).then(() => {
        res.redirect("/login");
      });
    })
    .catch((err) => {
      console.log(err);
      res.redirect("/signup?error=Something went wrong, please try again");
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/login");
  });
};
