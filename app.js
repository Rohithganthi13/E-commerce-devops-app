const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const adminRoutes = require("./routes/admin.js");
const shopRoutes = require("./routes/shop.js");
const errorController = require("./controllers/error.js");
const Users = require("./models/users.js");
const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  
  if(req.path === "/health"){
    return next();
  }

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

app.get("/health",(req,res)=>{
  res.status(200).json({
    status: "healthy"
  })
})

app.use(errorController.pageNotFound);


module.exports = app;