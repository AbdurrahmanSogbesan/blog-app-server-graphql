require("dotenv").config();
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/user");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Error handling
    const error = new Error("Validation failed.");
    error.statusCode = 422;
    error.data = errors.array();
    // Sends error to error handling middleware
    throw error;
  }

  const { email, password, name } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      email: email,
      password: hashedPassword,
      name: name,
    });

    const result = user.save();

    res.status(201).json({ message: "User created", userId: result._id });
  } catch (error) {
    // Error handling
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    // Sends error to error handling middleware
    next(err);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Find user with input email
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error("A user with this email could not be found");
      error.statusCode = 401;
      throw error;
    }

    // Compare db encrypted password with input password, returns a boolean
    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error("Passwords do not match!");
      error.statusCode = 401;
      throw error;
    }

    // Generate JSON web token
    const token = jwt.sign(
      {
        email: user.email,
        userId: user._id.toString(),
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return token and some user info to client
    res.status(200).json({
      message: "Login successful!",
      token: token,
      userId: user._id.toString(),
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

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User was not found!");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({ message: "Status fetched!", status: user.status });
  } catch (err) {
    // Error handling
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    // Sends error to error handling middleware
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  const { status } = req.body;

  // Validation Logic
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Status cannot be empty");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User was not found!");
      error.statusCode = 404;
      throw error;
    }
    // Set input status to user
    user.status = status;
    await user.save();

    res.status(200).json({ message: "Status updated!" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    // Sends error to error handling middleware
    next(err);
  }
};
