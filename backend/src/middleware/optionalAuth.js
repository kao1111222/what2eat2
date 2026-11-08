const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return next();

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token ไม่ถูกต้องหรือหมดอายุ" });
    req.user = user;
    next();
  });
}

module.exports = optionalAuth;
