const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Extract token from client in the Authorization header
  const authHeader = req.get("Authorization");

  if (!authHeader) {
    req.isAuth = false;
    return next();
  }
  // ie authHeader = Bearer token, all we want is the token
  const token = authHeader.split(" ")[1];
  let decodedToken;
  try {
    // Verify token with the secret (used in initialization in auth.js login controller)
    decodedToken = jwt.verify(token, "somesupersecretsecret");
  } catch (error) {
    req.isAuth = false;
    return next();
  }
  // Error handling
  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }
  // Make userId accessible in all authorized requests
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
