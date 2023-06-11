const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator");

const io = require("../socket");

const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = async (req, res, next) => {
  // extracts value of route?page=value
  const currentPage = req.query.page || 1;
  const perPage = 2;

  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      // Populates all creator data using the id
      .populate("creator")
      // Sorting by created at in a descending order
      .sort({ createdAt: -1 })
      // Paginating methods
      .skip((currentPage - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Fetched Posts",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    // Error handling
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    // Sends error to error handling middleware
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Error handling
    const error = new Error("Validation failed, input data is incorrect");
    error.statusCode = 422;
    // Sends error to error handling middleware
    throw error;
  }
  if (!req.file) {
    const error = new Error("No image provided.");
    error.statusCode = 422;
    throw error;
  }

  // Parse data from req body
  const { title, content } = req.body;
  // Parse image path
  const imageUrl = req.file.path;

  // Create a post and save to db
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });

  try {
    await post.save();
    // Find logged in user (post creator) in db
    const user = await User.findById(req.userId);
    user.posts.push(post);
    await user.save();

    // Sending data to all connected clients using socket.io. Second argument is an object that could hold any data you want to pass
    io.getIO().emit("posts", {
      action: "create",
      // Getting useful creator data and not just userId
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });

    res.status(201).json({
      message: "Post Created successfully!",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
  } catch (err) {
    // Error handling
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    // Sends error to error handling middleware
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId)
      // Populates all creator data using the id
      .populate("creator");
    if (!post) {
      const error = new Error("Post was not found");
      error.statusCode = 404;
      // Throws error to catch block
      throw error;
    }
    res.status(200).json({
      message: "Post fetched!",
      post: post,
    });
  } catch (err) {
    // Error handling
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    // Sends error to error handling middleware
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const { postId } = req.params;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Error handling
    const error = new Error("Validation failed, input data is incorrect");
    error.statusCode = 422;
    // Sends error to error handling middleware
    throw error;
  }

  const { title, content } = req.body;
  // If no new image is passed, use image in request body
  let imageUrl = req.body.image;
  // Getting new image from file picker
  if (req.file) {
    imageUrl = req.file.path;
  }
  // Error handling
  if (!imageUrl) {
    const error = new Error("No file picked");
    error.statusCode = 422;
    throw error;
  }
  try {
    // Find post with creator data
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("Could not find post");
      error.statusCode = 422;
      throw error;
    }

    // checks if creator is logged in user
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }

    // Deleting old image
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    // Assign new values to post
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;

    const result = await post.save();

    // Sending updated data to all connected clients
    io.getIO().emit("posts", { action: "update", post: result });

    res.status(200).json({
      message: "Post updated successfully!",
      post: result,
    });
  } catch (err) {
    // Error handling
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    // Sends error to error handling middleware
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const { postId } = req.params;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Could not find post");
      error.statusCode = 422;
      throw error;
    }
    // checks if creator is logged in user
    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }
    clearImage(post.imageUrl);

    await Post.findByIdAndRemove(postId);

    // Find creator of post
    const user = await User.findById(req.userId);

    // Remove post from user model using .pull() mongoose method
    user.posts.pull(postId);
    await user.save();

    // Socket.io sending data to all connected clients
    io.getIO().emit("posts", { action: "delete", post: postId });

    res.status(200).json({ message: "Deleted post." });
  } catch (err) {
    // Error handling
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    // Sends error to error handling middleware
    next(err);
  }
};

// For deleting image
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => {
    console.log(err);
  });
};
