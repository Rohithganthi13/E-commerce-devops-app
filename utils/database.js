const mongoDb = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const MongoClient = mongoDb.MongoClient;

let _db;
const mongodb = process.env.MONGO_URL ;
const mongoConnect = (callback) => {
  MongoClient.connect(mongodb)
    .then((client) => {
      console.log("Connected!!");
      _db = client.db("shop");
      _db
        .collection("users")
        .createIndex({ email: 1 }, { unique: true })
        .catch((err) => console.log("Failed to create users.email index", err));
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
