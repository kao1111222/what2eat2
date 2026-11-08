const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { registerSchema, loginSchema, validateBody } = require("../validation");
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.post(
  "/register",
  validateBody(registerSchema, "กรุณากรอกชื่อ อีเมล และรหัสผ่านให้ถูกต้อง"),
  async (req, res) => {
    const { name, username, email, password } = req.validatedBody;
    const displayName = name || username || "ผู้ใช้ใหม่";

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      await db.user.create({
        data: { name: displayName, email, passwordHash: hashedPassword },
      });

      res.status(201).json({ message: "สมัครสมาชิกสำเร็จ" });
    } catch (err) {
      console.error("Register Error:", err);
      if (err.code === "P2002") {
        return res.status(400).json({ error: "Email นี้ถูกใช้งานในระบบแล้ว" });
      }
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการสมัครสมาชิก" });
    }
  }
);

router.post(
  "/login",
  validateBody(loginSchema, "กรุณากรอก Email และ Password ให้ถูกต้อง"),
  async (req, res) => {
    const { email, password } = req.validatedBody;
    try {
      const user = await db.user.findUnique({ where: { email } });

      if (!user) {
        return res.status(400).json({ error: "ไม่พบผู้ใช้นี้ในระบบ" });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ error: "รหัสผ่านไม่ถูกต้อง" });
      }

      const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, {
        expiresIn: "1d",
      });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("Login Error:", err);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" });
    }
  }
);

module.exports = router;
