const authenticateToken = require("./auth");

function requireAdmin(req, res, next) {
  authenticateToken(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "สิทธิ์ไม่ถูกต้อง (สำหรับผู้ดูแลระบบเท่านั้น)" });
    }
    next();
  });
}

module.exports = requireAdmin;
