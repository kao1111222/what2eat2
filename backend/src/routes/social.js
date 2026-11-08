const express = require("express");
const router = express.Router();
const db = require("../db");
const requireAdmin = require("../middleware/adminAuth");
const { contactStatusSchema, validateBody } = require("../validation");

router.get("/categories", async (_req, res) => {
  try {
    const categories = await db.category.findMany({
      select: { id: true, name: true, slug: true, description: true },
      orderBy: { id: "asc" },
    });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/summary", requireAdmin, async (_req, res) => {
  try {
    const [users, reviews] = await Promise.all([db.user.count(), db.review.count()]);
    res.json({ users, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/messages", requireAdmin, async (_req, res) => {
  try {
    const messages = await db.contactMessage.findMany({
      select: { id: true, name: true, email: true, subject: true, message: true, status: true },
    });
    res.json({ messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  "/admin/messages/:id",
  requireAdmin,
  validateBody(contactStatusSchema, "สถานะไม่ถูกต้อง"),
  async (req, res) => {
    const messageId = Number(req.params.id);
    const { status } = req.validatedBody;
    if (!Number.isSafeInteger(messageId) || messageId < 1) {
      return res.status(400).json({ error: "รหัสคำร้องไม่ถูกต้อง" });
    }
    try {
      await db.contactMessage.update({
        where: { id: messageId },
        data: { status },
      });
      res.json({ message: "อัปเดตสถานะสำเร็จ" });
    } catch (err) {
      if (err.code === "P2025") {
        return res.status(404).json({ error: "ไม่พบคำร้องที่ต้องการอัปเดต" });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
