const app = require('./app.js')
const { mongoConnect } = require("./utils/database.js");

mongoConnect(() => {
  app.listen(3000);
});