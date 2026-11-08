const jwt = require("jsonwebtoken");
const db = require("../db");
const JWT_SECRET = process.env.JWT_SECRET;

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token ไม่ถูกต้องหรือหมดอายุ" });
    db.user
      .findUnique({
        where: { id: Number(user.id) },
        select: { role: true },
      })
      .then(
        (currentUser) => {
          if (!currentUser) {
            return res.status(401).json({ error: "ไม่พบบัญชีผู้ใช้นี้ในระบบ" });
          }
          req.user = { ...user, role: currentUser.role };
          next();
        },
        (error) => {
          console.error("Error verifying authenticated user:", error.message);
          res.status(500).json({ error: "ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้ได้" });
        }
      );
  });
}

module.exports = authenticateToken;
