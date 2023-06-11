require("dotenv").config();

const bcrypt = require("bcryptjs");
const validator = require("validator");
const jwt = require("jsonwebtoken");

const User = require("../models/user");
const Post = require("../models/post");

const { clearImage } = require("../util/file");

// Similar to controllers of RESTful APIs, contains logic

module.exports = {
  createUser: async function ({ userInput }, req) {
    const { email, name, password } = userInput;

    // Validation Logic
    let errors = [];
    if (!validator.isEmail(email)) {
      errors.push({ message: "Invalid Email" });
    }

    if (
      validator.isEmpty(password) ||
      !validator.isLength(password, { min: 5 })
    ) {
      errors.push({ message: "Password too short" });
    }

    // Error handling
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // Find user with input email in db
    const existingUser = await User.findOne({ email: email });
    // If user with email exists
    if (existingUser) {
      const error = new Error("User already exists");
      throw error;
    }

    // Encrypt password
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      email: email,
      name: name,
      password: hashedPassword,
    });

    // Save new user to db
    const createdUser = await user.save();

    // Return user based on graph schema, note _id must be a string, so convert
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function ({ email, password }) {
    // FInd user with input email
    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new Error("User not found");
      error.code = 401;
      throw error;
    }

    // Check if passwords are equal
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      const error = new Error("Password is incorrect");
      error.code = 401;
      throw error;
    }

    // Generate JSON web token for authentication
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return { token: token, userId: user._id.toString() };
  },
  createPost: async function ({ postInput }, req) {
    // Error handling based on auth middleware
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const { title, content, imageUrl } = postInput;

    // Validation Logic
    let errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid" });
    }

    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid" });
    }

    // Error handling
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // Find logged in user
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("Invalid user");
      error.code = 401;
      throw error;
    }

    const post = new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: user,
    });

    const createdPost = await post.save();

    // Add post to user
    user.posts.push(createdPost);
    await user.save();

    // Return necessary data, remember to convert ids and times to formats your schema agrees with i.e String
    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    };
  },
  posts: async function ({ page }, req) {
    // Error handling based on auth middleware
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    if (!page) {
      page = 1;
    }
    const perPage = 2;

    const totalPosts = await Post.find().countDocuments();
    const posts = await Post.find()
      // Populates all creator data using the id
      .populate("creator")
      // Sorting by created at in a descending order
      .sort({ createdAt: -1 })
      // Paginating methods
      .skip((page - 1) * perPage)
      .limit(perPage);

    return {
      // Converting post data to acceptable schema types
      posts: posts.map((p) => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalPosts: totalPosts,
    };
  },
  post: async function ({ postId }, req) {
    // Authentication check
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    // Get the post and populate full creator data
    const post = await Post.findById(postId).populate("creator");

    if (!post) {
      const error = new Error("No post found");
      error.code = 404;
      throw error;
    }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  },
  updatePost: async function ({ postId, postInput }, req) {
    // Authentication check
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    // Extract data from client
    const { title, content, imageUrl } = postInput;

    // Extract post with complete creator data
    const post = await Post.findById(postId).populate("creator");

    if (!post) {
      const error = new Error("No post found");
      error.code = 404;
      throw error;
    }

    // Check if post creator is logged in user
    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.code = 403;
      throw error;
    }

    // Validation Logic
    let errors = [];
    if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
      errors.push({ message: "Title is invalid" });
    }
    if (
      validator.isEmpty(content) ||
      !validator.isLength(content, { min: 5 })
    ) {
      errors.push({ message: "Content is invalid" });
    }

    // Error handling
    if (errors.length > 0) {
      const error = new Error("Invalid Input");
      error.data = errors;
      error.code = 422;
      throw error;
    }

    // Assign new data to post in db
    post.title = title;
    post.content = content;
    // If new image has been attached, override old image
    if (imageUrl !== "undefined") {
      post.imageUrl = imageUrl;
    }

    const updatedPost = await post.save();

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    };
  },
  deletePost: async function ({ postId }, req) {
    // Authentication check
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    // Fetch post to be deleted
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("No post found");
      error.code = 404;
      throw error;
    }

    // Check if post creator is logged in user
    if (post.creator.toString() !== req.userId.toString()) {
      const error = new Error("Not authorized");
      error.code = 403;
      throw error;
    }

    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);

    // Find creator of post
    const user = await User.findById(req.userId);

    // Remove post from user model using .pull() mongoose method
    user.posts.pull(postId);
    await user.save();

    return true;
  },
  user: async function (args, req) {
    // Authentication check
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    // Fetching user
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("No user found");
      error.code = 404;
      throw error;
    }

    // Returning user data
    return { ...user._doc, _id: user._id.toString() };
  },
  updateStatus: async function ({ status }, req) {
    // Authentication check
    if (!req.isAuth) {
      const error = new Error("Not authenticated");
      error.code = 401;
      throw error;
    }

    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error("No user found");
      error.code = 404;
      throw error;
    }

    user.status = status;
    await user.save();

    return { ...user._doc, _id: user._id.toString() };
  },
};
