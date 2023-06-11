const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const { graphqlHTTP } = require("express-graphql");

const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const auth = require("./middlewares/auth");
const { clearImage } = require("./util/file");

const app = express();

// Multer setup
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // cb(error, destination)
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    // cb(error, destination)
    cb(null, new Date().toISOString() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.4uhxiz2.mongodb.net/${process.env.MONGO_DEFAULT_DB}?retryWrites=true&w=majority`;

// Parses incoming JSON data
app.use(bodyParser.json());
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
// Serving images statically
app.use("/images", express.static(path.join(__dirname, "images")));

// For preventing CORS error, seting appropriate CORS headers
app.use((req, res, next) => {
  // Urls that should be able to access the API
  res.setHeader("Access-Control-Allow-Origin", "*");
  // HTTP methods the origin should be allowed to use
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS ,GET ,POST ,PUT, PATCH, DELETE"
  );
  // Headers the origin should be allowed to use
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  // Done for graphql API as graphql usually rejects any non-POST request
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Auth middleware
app.use(auth);

// Separate route for handling image upload with graphql APIs
app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    const error = new Error("Not authenticated");
    error.code = 401;
    throw error;
  }
  if (!req.file) {
    return res.status(200).json({ message: "No file provided" });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: "File stored", filePath: req.file.path });
});

// Setting up graphql in our app
app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    // User Interface for testing graphql APIs, available on the rote set up i.e htttp://localhost:8080/graphql
    graphiql: true,
    // Allows adding your own descriptive data to error messages
    customFormatErrorFn: (error) => {
      if (!error.originalError) {
        return error;
      }
      return {
        message: error.message || "An error occurred.",
        status: error.originalError.code || 500,
        data: error.originalError.data,
      };
    },
  })
);

// Error handling middleware
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const { message, data } = error;
  res.status(status).json({ message: message, data: data });
});

mongoose
  .connect(MONGODB_URI)
  .then((result) => {
    app.listen(8080);
  })
  .catch((err) => {
    console.log(err);
  });
