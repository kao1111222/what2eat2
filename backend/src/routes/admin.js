const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const db = require("../db");
const requireAdmin = require("../middleware/adminAuth");
const {
  adminRoleSchema,
  contactReplySchema,
  contactStatusSchema,
  validateBody,
} = require("../validation");
const { sendContactReply } = require("../mailer");
const attachmentDir = path.join(__dirname, "../../contact-attachments");

router.use(requireAdmin);

router.get("/users", async (_req, res) => {
  try {
    const users = await db.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { id: "desc" },
    });
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลผู้ใช้ได้" });
  }
});

router.patch(
  "/users/:id/role",
  validateBody(adminRoleSchema, "สิทธิ์ที่กำหนดไม่ถูกต้อง"),
  async (req, res) => {
    const userId = Number(req.params.id);
    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).json({ error: "รหัสสมาชิกไม่ถูกต้อง" });
    }

    try {
      const result = await db.user.updateMany({
        where: { id: userId },
        data: { role: req.validatedBody.role },
      });
      if (!result.count) {
        return res.status(404).json({ error: "ไม่พบสมาชิกที่ต้องการกำหนดสิทธิ์" });
      }
      return res.json({ message: "กำหนดสิทธิ์แอดมินให้สมาชิกเรียบร้อยแล้ว" });
    } catch (err) {
      console.error("Error promoting user to admin:", err.message);
      return res.status(500).json({ error: "ไม่สามารถกำหนดสิทธิ์แอดมินได้" });
    }
  }
);

router.delete("/users/:id", async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isSafeInteger(userId) || userId < 1) {
    return res.status(400).json({ error: "รหัสสมาชิกไม่ถูกต้อง" });
  }
  if (userId === Number(req.user.id)) {
    return res.status(400).json({ error: "ไม่สามารถลบบัญชีของตัวเองได้" });
  }

  try {
    const result = await db.user.deleteMany({ where: { id: userId } });
    if (!result.count) {
      return res.status(404).json({ error: "ไม่พบสมาชิกที่ต้องการลบ" });
    }
    res.json({ message: "ลบสมาชิกออกจากระบบเรียบร้อยแล้ว" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบสมาชิก" });
  }
});

router.delete("/reviews/:id", async (req, res) => {
  const reviewId = Number(req.params.id);
  if (!Number.isSafeInteger(reviewId) || reviewId < 1) {
    return res.status(400).json({ error: "รหัสรีวิวไม่ถูกต้อง" });
  }
  try {
    await db.review.deleteMany({ where: { id: reviewId } });
    res.json({ message: "แอดมินลบรีวิวนี้เรียบร้อยแล้ว" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบรีวิว" });
  }
});

router.get("/messages", async (_req, res) => {
  try {
    const messages = await db.contactMessage.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        subject: true,
        message: true,
        status: true,
        attachmentFilename: true,
        adminReply: true,
        repliedAt: true,
        replyEmailSentAt: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    res.json({
      messages: messages.map(
        ({
          attachmentFilename,
          adminReply,
          repliedAt,
          replyEmailSentAt,
          createdAt,
          ...message
        }) => ({
          ...message,
          has_attachment: Boolean(attachmentFilename),
          admin_reply: adminReply,
          replied_at: repliedAt,
          reply_email_sent_at: replyEmailSentAt,
          created_at: createdAt,
        })
      ),
    });
  } catch (err) {
    console.error("Error fetching contact requests:", err.message);
    res.status(500).json({ error: "ไม่สามารถดึงคำร้องจากผู้ใช้ได้" });
  }
});

router.get("/messages/:id/attachment", async (req, res) => {
  const messageId = Number(req.params.id);
  if (!Number.isSafeInteger(messageId) || messageId < 1) {
    return res.status(400).json({ error: "รหัสคำร้องไม่ถูกต้อง" });
  }

  try {
    const request = await db.contactMessage.findUnique({
      where: { id: messageId },
      select: { attachmentFilename: true },
    });
    if (!request?.attachmentFilename) {
      return res.status(404).json({ error: "ไม่พบไฟล์แนบ" });
    }

    const filename = path.basename(request.attachmentFilename);
    if (
      filename !== request.attachmentFilename ||
      !/^[a-f0-9]{32}\.(jpg|jfif|png|webp)$/.test(filename)
    ) {
      console.error("Invalid stored contact attachment filename", { messageId });
      return res.status(500).json({ error: "ข้อมูลไฟล์แนบไม่ถูกต้อง" });
    }

    const filePath = path.join(attachmentDir, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "ไม่พบไฟล์แนบในระบบ" });
    }
    return res.sendFile(filePath, {
      headers: {
        "Content-Disposition": "inline",
        ...(filename.endsWith(".jfif") ? { "Content-Type": "image/jpeg" } : {}),
      },
    });
  } catch (err) {
    console.error("Error reading contact attachment:", err.message);
    return res.status(500).json({ error: "ไม่สามารถเปิดไฟล์แนบได้" });
  }
});

router.delete("/messages/:id", async (req, res) => {
  const messageId = Number(req.params.id);
  if (!Number.isSafeInteger(messageId) || messageId < 1) {
    return res.status(400).json({ error: "รหัสคำร้องไม่ถูกต้อง" });
  }

  try {
    const request = await db.contactMessage.findUnique({
      where: { id: messageId },
      select: { attachmentFilename: true },
    });
    if (!request) {
      return res.status(404).json({ error: "ไม่พบคำร้องที่ต้องการลบ" });
    }

    await db.contactMessage.delete({ where: { id: messageId } });

    if (request.attachmentFilename) {
      const filename = path.basename(request.attachmentFilename);
      if (
        filename !== request.attachmentFilename ||
        !/^[a-f0-9]{32}\.(jpg|jfif|png|webp)$/.test(filename)
      ) {
        console.error("Invalid stored contact attachment filename", { messageId });
        return res.json({
          message: "ลบคำร้องแล้ว แต่ไม่สามารถลบไฟล์แนบได้ กรุณาตรวจสอบไฟล์บนเซิร์ฟเวอร์",
          attachmentCleanupFailed: true,
        });
      }

      try {
        await fs.promises.unlink(path.join(attachmentDir, filename));
      } catch (error) {
        if (error.code !== "ENOENT") {
          console.error("Error removing deleted contact attachment:", error.message);
          return res.json({
            message: "ลบคำร้องแล้ว แต่ไม่สามารถลบไฟล์แนบได้ กรุณาตรวจสอบไฟล์บนเซิร์ฟเวอร์",
            attachmentCleanupFailed: true,
          });
        }
      }
    }

    return res.json({ message: "ลบคำร้องเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error deleting contact request:", err.message);
    return res.status(500).json({ error: "ไม่สามารถลบคำร้องได้" });
  }
});

router.patch(
  "/messages/:id",
  validateBody(contactStatusSchema, "สถานะไม่ถูกต้อง"),
  async (req, res) => {
    const messageId = Number(req.params.id);
    const { status } = req.validatedBody;
    if (!Number.isSafeInteger(messageId) || messageId < 1) {
      return res.status(400).json({ error: "รหัสคำร้องไม่ถูกต้อง" });
    }
    try {
      const result = await db.contactMessage.updateMany({
        where: { id: messageId },
        data: { status },
      });
      if (!result.count) {
        return res.status(404).json({ error: "ไม่พบคำร้องที่ต้องการอัปเดต" });
      }
      return res.json({ message: "อัปเดตสถานะคำร้องเรียบร้อยแล้ว" });
    } catch (err) {
      console.error("Error updating contact request:", err.message);
      return res.status(500).json({ error: "ไม่สามารถอัปเดตสถานะคำร้องได้" });
    }
  }
);

router.post(
  "/messages/:id/reply",
  validateBody(contactReplySchema, "กรุณากรอกข้อความตอบกลับ (ไม่เกิน 5,000 ตัวอักษร)"),
  async (req, res) => {
    const messageId = Number(req.params.id);
    if (!Number.isSafeInteger(messageId) || messageId < 1) {
      return res.status(400).json({ error: "รหัสคำร้องไม่ถูกต้อง" });
    }

    const { reply } = req.validatedBody;
    let emailSent = false;
    try {
      const request = await db.contactMessage.findUnique({
        where: { id: messageId },
        select: { id: true, name: true, email: true, subject: true },
      });
      if (!request) {
        return res.status(404).json({ error: "ไม่พบคำร้องที่ต้องการตอบกลับ" });
      }

      await db.contactMessage.update({
        where: { id: messageId },
        data: { adminReply: reply },
      });

      try {
        await sendContactReply(request, reply);
        emailSent = true;
      } catch (emailError) {
        console.error("Error sending contact reply email:", emailError.message);
        return res.status(502).json({
          error:
            "บันทึกคำตอบแล้ว แต่ส่งอีเมลไม่สำเร็จ กรุณาตรวจสอบการตั้งค่า SMTP แล้วลองส่งอีกครั้ง",
          replySaved: true,
          emailSent: false,
        });
      }

      const repliedAt = new Date();
      try {
        await db.contactMessage.update({
          where: { id: messageId },
          data: { status: "resolved", repliedAt, replyEmailSentAt: repliedAt },
        });
      } catch (updateError) {
        console.error(
          "Email sent but contact reply status could not be updated:",
          updateError.message
        );
        return res.status(500).json({
          error: "ส่งอีเมลแล้ว แต่บันทึกสถานะคำร้องไม่สำเร็จ กรุณาตรวจสอบสถานะในระบบ",
          replySaved: true,
          emailSent: true,
        });
      }
      return res.json({
        message: "ส่งคำตอบทางอีเมลแล้ว และอัปเดตสถานะเป็นแก้ไขแล้ว",
        status: "resolved",
        emailSent: true,
      });
    } catch (err) {
      console.error("Error saving or sending contact reply:", err.message);
      return res.status(500).json({
        error: emailSent
          ? "ส่งอีเมลแล้ว แต่เกิดข้อผิดพลาดในการบันทึกคำตอบ"
          : "ไม่สามารถตอบกลับคำร้องได้",
        emailSent,
      });
    }
  }
);

module.exports = router;
