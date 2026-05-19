const mongoDb = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const MongoClient = mongoDb.MongoClient;

let _db;
const mongodb = process.env.MONGO_URL || "mongodb://admin:password@localhost:27017"
const mongoConnect = (callback) => {
  MongoClient.connect(mongodb)
    .then((client) => {
      console.log("Connected!!");
      _db = client.db("shop");
      callback();
    })
    .catch((err) => {
      console.log(err);
      throw err;
    });
};

const getDb = () => {
  if (_db) {
    return _db;
  } else throw "DB Not Found";
};

exports.mongoConnect = mongoConnect;
exports.getDb = getDb;
