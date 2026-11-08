const router = require("express").Router();
const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const { sendContactNotification, sendContactRecovery } = require("../mailer");
const {
  contactSchema,
  contactTrackingSchema,
  contactRecoverySchema,
  contactRecoveryConfirmSchema,
  validateBody,
} = require("../validation");

const recoveryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "ขอกู้รหัสได้ไม่เกิน 3 ครั้งใน 15 นาที กรุณาลองใหม่ภายหลัง" },
});

const attachmentDir = path.join(__dirname, "../../contact-attachments");
fs.mkdirSync(attachmentDir, { recursive: true });

const attachmentExtensions = {
  "image/jpeg": ".jpg",
  "image/jfif": ".jfif",
  "image/pjpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: attachmentDir,
    filename: (_req, file, callback) => {
      callback(
        null,
        `${crypto.randomBytes(16).toString("hex")}${attachmentExtensions[file.mimetype]}`
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!attachmentExtensions[file.mimetype]) {
      return callback(new Error("แนบได้เฉพาะภาพ JPG, PNG หรือ WEBP"));
    }
    callback(null, true);
  },
});

function parseAttachment(req, res, next) {
  attachmentUpload.single("attachment")(req, res, (error) => {
    if (!error) return next();
    const message =
      error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
        ? "ไฟล์แนบต้องมีขนาดไม่เกิน 5MB"
        : error.message;
    return res.status(400).json({ error: message });
  });
}

function validateContactBody(req, res, next) {
  const validate = validateBody(
    contactSchema,
    "กรุณากรอกชื่อ อีเมล หัวข้อ และรายละเอียดให้ถูกต้อง"
  );
  validate(req, res, next);
  if (res.headersSent && req.file) {
    fs.promises.unlink(req.file.path).catch((error) => {
      if (error.code !== "ENOENT") {
        console.error("Error removing invalid contact attachment:", error.message);
      }
    });
  }
}

router.post("/", parseAttachment, validateContactBody, async (req, res) => {
  const { name, email, subject, message, type } = req.validatedBody;
  const trackingCode = crypto.randomBytes(32).toString("base64url");
  const trackingCodeHash = crypto.createHash("sha256").update(trackingCode).digest("hex");
  let savedRequest;
  try {
    savedRequest = await db.contactMessage.create({
      data: {
        name,
        email,
        subject: `${type}: ${subject}`,
        message,
        trackingCodeHash,
        attachmentFilename: req.file?.filename,
      },
    });
  } catch (error) {
    if (req.file) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkError) {
        if (unlinkError.code !== "ENOENT") {
          console.error("Error removing rejected contact attachment:", unlinkError.message);
        }
      }
    }
    console.error("Error saving contact request:", error.message);
    return res.status(500).json({ error: "ส่งคำร้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
  }

  try {
    const admins = await db.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    await sendContactNotification(
      savedRequest,
      admins.map((admin) => admin.email)
    );
  } catch (error) {
    console.error("Error sending contact notification to admin:", error.message);
  }

  return res.status(201).json({
    message: "ส่งคำร้องถึงผู้ดูแลเรียบร้อยแล้ว ขอบคุณที่แจ้งให้เราทราบ",
    trackingCode,
  });
});

router.post(
  "/track",
  validateBody(contactTrackingSchema, "ไม่พบคำร้อง กรุณาตรวจสอบรหัสติดตาม"),
  async (req, res) => {
    const trackingCodeHash = crypto
      .createHash("sha256")
      .update(req.validatedBody.trackingCode)
      .digest("hex");

    try {
      const request = await db.contactMessage.findUnique({
        where: { trackingCodeHash },
        select: {
          subject: true,
          status: true,
          createdAt: true,
          adminReply: true,
          repliedAt: true,
        },
      });

      if (!request) {
        return res.status(404).json({ error: "ไม่พบคำร้อง กรุณาตรวจสอบรหัสติดตาม" });
      }

      return res.json({
        request: {
          subject: request.subject,
          status: request.status,
          created_at: request.createdAt,
          reply: request.adminReply,
          replied_at: request.repliedAt,
        },
      });
    } catch (error) {
      console.error("Error looking up contact request:", error.message);
      return res.status(500).json({ error: "ไม่สามารถตรวจสอบสถานะคำร้องได้" });
    }
  }
);

router.post(
  "/recover",
  recoveryRateLimit,
  validateBody(contactRecoverySchema, "กรุณากรอกอีเมลที่ใช้ส่งคำร้องให้ถูกต้อง"),
  async (req, res) => {
    const { email } = req.validatedBody;

    try {
      const requests = await db.contactMessage.findMany({
        where: { email, trackingCodeHash: { not: null } },
        select: { id: true, subject: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });

      if (requests.length) {
        const recoveryRequests = requests.map((request) => {
          const recoveryToken = crypto.randomBytes(32).toString("base64url");
          return {
            ...request,
            recoveryToken,
            recoveryTokenHash: crypto.createHash("sha256").update(recoveryToken).digest("hex"),
          };
        });
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        await db.$transaction(
          recoveryRequests.map(({ id, recoveryTokenHash }) =>
            db.contactMessage.update({
              where: { id },
              data: {
                trackingRecoveryHash: recoveryTokenHash,
                trackingRecoveryExpiresAt: expiresAt,
              },
            })
          )
        );

        try {
          await sendContactRecovery(email, recoveryRequests);
        } catch (error) {
          await db.contactMessage.updateMany({
            where: { id: { in: requests.map((request) => request.id) } },
            data: { trackingRecoveryHash: null, trackingRecoveryExpiresAt: null },
          });
          console.error("Error sending contact recovery email:", error.message);
        }
      }

      return res.json({
        message:
          "หากพบคำร้องที่ใช้อีเมลนี้ ระบบจะส่งลิงก์กู้รหัสไปให้ กรุณาตรวจกล่องจดหมายและอีเมลขยะ",
      });
    } catch (error) {
      console.error("Error requesting contact recovery:", error.message);
      return res.status(500).json({ error: "ไม่สามารถขอกู้รหัสได้ กรุณาลองใหม่ภายหลัง" });
    }
  }
);

router.post(
  "/recover/confirm",
  recoveryRateLimit,
  validateBody(contactRecoveryConfirmSchema, "ลิงก์กู้รหัสไม่ถูกต้องหรือหมดอายุแล้ว"),
  async (req, res) => {
    const recoveryTokenHash = crypto
      .createHash("sha256")
      .update(req.validatedBody.recoveryToken)
      .digest("hex");
    const trackingCode = crypto.randomBytes(32).toString("base64url");
    const trackingCodeHash = crypto.createHash("sha256").update(trackingCode).digest("hex");

    try {
      const recoveryRequest = await db.contactMessage.findUnique({
        where: { trackingRecoveryHash: recoveryTokenHash },
        select: { id: true },
      });

      if (!recoveryRequest) {
        return res.status(400).json({ error: "ลิงก์กู้รหัสไม่ถูกต้องหรือหมดอายุแล้ว" });
      }

      const updated = await db.contactMessage.updateMany({
        where: {
          id: recoveryRequest.id,
          trackingRecoveryHash: recoveryTokenHash,
          trackingRecoveryExpiresAt: { gt: new Date() },
        },
        data: {
          trackingCodeHash,
          trackingRecoveryHash: null,
          trackingRecoveryExpiresAt: null,
        },
      });

      if (updated.count !== 1) {
        return res.status(400).json({ error: "ลิงก์กู้รหัสไม่ถูกต้องหรือหมดอายุแล้ว" });
      }

      return res.json({
        message: "ยืนยันอีเมลสำเร็จ นี่คือรหัสติดตามใหม่ของคุณ",
        trackingCode,
      });
    } catch (error) {
      console.error("Error confirming contact recovery:", error.message);
      return res.status(500).json({ error: "ไม่สามารถกู้รหัสได้ กรุณาลองใหม่ภายหลัง" });
    }
  }
);

module.exports = router;
