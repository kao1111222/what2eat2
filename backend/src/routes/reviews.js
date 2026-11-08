const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");
const optionalAuth = require("../middleware/optionalAuth");
const { reviewSchema } = require("../validation");
const uploadDir = path.join(__dirname, "../../uploads");

function getUploadedFilePath(imageUrl) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl, "http://localhost");
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/uploads/")
    ) {
      return null;
    }

    return path.join(uploadDir, path.basename(url.pathname));
  } catch (_error) {
    return null;
  }
}

function getReviewInclude(userId) {
  return {
    user: { select: { name: true } },
    _count: { select: { likes: true, favorites: true } },
    ...(userId
      ? {
          likes: { where: { userId }, select: { id: true }, take: 1 },
          favorites: { where: { userId }, select: { id: true }, take: 1 },
        }
      : {}),
  };
}

function toReviewResponse(review, userId) {
  return {
    id: review.id,
    user_id: review.userId,
    title: review.title,
    rating: review.rating,
    restaurant: review.restaurant,
    location: review.location,
    category: review.category,
    body: review.body,
    image_url: review.imageUrl,
    view_count: review.viewCount,
    created_at: review.createdAt,
    author: review.user?.name || review.author || null,
    author_name: review.user?.name || review.author || null,
    like_count: review._count.likes,
    favorite_count: review._count.favorites,
    liked: Boolean(userId && review.likes?.length),
    favorited: Boolean(userId && review.favorites?.length),
  };
}

async function removeMissingImage(review) {
  const filePath = getUploadedFilePath(review.image_url);
  if (filePath && !fs.existsSync(filePath)) {
    return { ...review, image_url: null };
  }
  return review;
}

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function removeUploadedFile(file, context) {
  if (!file) return;
  try {
    await fs.promises.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(`Error removing ${context}:`, error.message);
    }
  }
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, callback) => {
      const extensions = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
      };
      callback(
        null,
        `${Date.now()}-${Math.round(Math.random() * 1e9)}${extensions[file.mimetype]}`
      );
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error("รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP"));
    }
    callback(null, true);
  },
});
const parseReviewForm = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "photo", maxCount: 1 },
]);

router.get("/", optionalAuth, async (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const category = typeof req.query.category === "string" ? req.query.category.trim() : "";
    const sort = typeof req.query.sort === "string" ? req.query.sort : "latest";
    const userId = req.user?.id ? Number(req.user.id) : null;
    const where = {
      ...(category ? { category } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { restaurant: { contains: query, mode: "insensitive" } },
              { user: { name: { contains: query, mode: "insensitive" } } },
              { location: { contains: query, mode: "insensitive" } },
              { category: { contains: query, mode: "insensitive" } },
              { body: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const rows = await db.review.findMany({
      where,
      include: getReviewInclude(userId),
      orderBy: [{ id: "desc" }],
    });

    if (sort === "popular") {
      rows.sort((a, b) => {
        const totalA = a._count.likes + a._count.favorites;
        const totalB = b._count.likes + b._count.favorites;
        return (
          totalB - totalA ||
          b._count.likes - a._count.likes ||
          b._count.favorites - a._count.favorites ||
          b.id - a.id
        );
      });
    }

    const reviews = await Promise.all(
      rows.map(async (row) => removeMissingImage(toReviewResponse(row, userId)))
    );
    res.json({ reviews });
  } catch (err) {
    console.error("Error fetching reviews:", err.message);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลรีวิวได้" });
  }
});

router.get("/user/me", verifyToken, async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const rows = await db.review.findMany({
      where: { userId },
      include: getReviewInclude(userId),
      orderBy: { createdAt: "desc" },
    });
    const reviews = await Promise.all(
      rows.map(async (row) => removeMissingImage(toReviewResponse(row, userId)))
    );
    res.json(reviews);
  } catch (err) {
    console.error("Error fetching user's reviews:", err.message);
    res.status(500).json({ error: "ไม่สามารถดึงรีวิวของคุณได้" });
  }
});

router.get("/:id", optionalAuth, async (req, res) => {
  const reviewId = parseId(req.params.id);
  if (!reviewId) {
    return res.status(400).json({ error: "รหัสรีวิวไม่ถูกต้อง" });
  }
  try {
    const userId = req.user?.id ? Number(req.user.id) : null;
    const row = await db.review.findUnique({
      where: { id: reviewId },
      include: getReviewInclude(userId),
    });
    if (!row) {
      return res.status(404).json({ error: "ไม่พบรีวิวที่ต้องการ" });
    }
    const review = await removeMissingImage(toReviewResponse(row, userId));
    res.json({ review });
  } catch (err) {
    console.error("Error fetching review:", err.message);
    res.status(500).json({ error: "ไม่สามารถดึงข้อมูลรีวิวได้" });
  }
});

router.post("/:id/like", verifyToken, async (req, res) => {
  const reviewId = parseId(req.params.id);
  if (!reviewId) {
    return res.status(400).json({ error: "รหัสรีวิวไม่ถูกต้อง" });
  }
  try {
    const reviewExists = await db.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!reviewExists) {
      return res.status(404).json({ error: "ไม่พบรีวิวที่ต้องการ" });
    }

    const userId = Number(req.user.id);
    const existing = await db.reviewLike.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
      select: { id: true },
    });
    if (existing) {
      await db.reviewLike.delete({ where: { id: existing.id } });
    } else {
      await db.reviewLike.createMany({
        data: [{ reviewId, userId }],
        skipDuplicates: true,
      });
    }

    const [likeCount, current] = await Promise.all([
      db.reviewLike.count({ where: { reviewId } }),
      db.reviewLike.findUnique({
        where: { userId_reviewId: { userId, reviewId } },
        select: { id: true },
      }),
    ]);
    res.json({
      liked: Boolean(current),
      like_count: likeCount,
      message: current ? "กดถูกใจรีวิวแล้ว" : "ยกเลิกการถูกใจแล้ว",
    });
  } catch (err) {
    console.error("Error toggling review like:", err.message);
    res.status(500).json({ error: "ไม่สามารถอัปเดตการถูกใจได้" });
  }
});

router.post("/:id/favorite", verifyToken, async (req, res) => {
  const reviewId = parseId(req.params.id);
  if (!reviewId) {
    return res.status(400).json({ error: "รหัสรีวิวไม่ถูกต้อง" });
  }
  try {
    const reviewExists = await db.review.findUnique({
      where: { id: reviewId },
      select: { id: true },
    });
    if (!reviewExists) {
      return res.status(404).json({ error: "ไม่พบรีวิวที่ต้องการ" });
    }

    const userId = Number(req.user.id);
    const existing = await db.favorite.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
      select: { id: true },
    });
    if (existing) {
      await db.favorite.delete({ where: { id: existing.id } });
    } else {
      await db.favorite.createMany({
        data: [{ reviewId, userId }],
        skipDuplicates: true,
      });
    }

    const current = await db.favorite.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
      select: { id: true },
    });
    res.json({
      favorited: Boolean(current),
      message: current ? "บันทึกรีวิวแล้ว" : "นำรีวิวออกจากรายการโปรดแล้ว",
    });
  } catch (err) {
    console.error("Error toggling review favorite:", err.message);
    res.status(500).json({ error: "ไม่สามารถอัปเดตรายการโปรดได้" });
  }
});

router.post(
  "/",
  verifyToken,
  (req, res, next) => {
    parseReviewForm(req, res, (err) => {
      if (err) {
        const message =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? "รูปภาพต้องมีขนาดไม่เกิน 5MB"
            : err.message;
        return res.status(400).json({ error: message });
      }
      next();
    });
  },
  async (req, res) => {
    const validation = reviewSchema.safeParse(req.body);
    const image = req.files?.image?.[0] || req.files?.photo?.[0];

    if (!validation.success) {
      if (image) {
        try {
          await fs.promises.unlink(image.path);
        } catch (err) {
          if (err.code !== "ENOENT") {
            console.error("Error removing invalid review image:", err.message);
          }
        }
      }
      return res
        .status(400)
        .json({ error: "กรุณากรอกหัวข้อ ชื่อร้าน เนื้อหา และคะแนน 1-5 ให้ครบถ้วน" });
    }

    const { title, restaurant, location, category, body, rating } = validation.data;

    try {
      const review = await db.review.create({
        data: {
          userId: Number(req.user.id),
          title,
          restaurant,
          location: location || "",
          category: category || "อื่น ๆ",
          rating,
          body,
          imageUrl: image ? `/uploads/${image.filename}` : null,
        },
        select: { id: true },
      });
      res.status(201).json({ message: "เพิ่มรีวิวเรียบร้อยแล้ว", id: review.id });
    } catch (err) {
      if (image) {
        fs.unlink(path.join(__dirname, "../../uploads", image.filename), (unlinkError) => {
          if (unlinkError)
            console.error("Error removing uploaded review image:", unlinkError.message);
        });
      }
      console.error("Error creating review:", err.message);
      res.status(500).json({ error: "เกิดข้อผิดพลาดในการบันทึกรีวิว" });
    }
  }
);

router.patch(
  "/:id",
  verifyToken,
  (req, res, next) => {
    parseReviewForm(req, res, (err) => {
      if (err) {
        const message =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? "รูปภาพต้องมีขนาดไม่เกิน 5MB"
            : err.message;
        return res.status(400).json({ error: message });
      }
      next();
    });
  },
  async (req, res) => {
    const reviewId = parseId(req.params.id);
    const image = req.files?.image?.[0] || req.files?.photo?.[0];
    if (!reviewId) {
      await removeUploadedFile(image, "invalid review image");
      return res.status(400).json({ error: "รหัสรีวิวไม่ถูกต้อง" });
    }

    const validation = reviewSchema.safeParse(req.body);
    if (!validation.success) {
      await removeUploadedFile(image, "invalid review image");
      return res
        .status(400)
        .json({ error: "กรุณากรอกหัวข้อ ชื่อร้าน เนื้อหา และคะแนน 1-5 ให้ครบถ้วน" });
    }

    try {
      const existing = await db.review.findUnique({
        where: { id: reviewId },
        select: { userId: true, imageUrl: true },
      });
      if (!existing) {
        await removeUploadedFile(image, "image for missing review");
        return res.status(404).json({ error: "ไม่พบรีวิวที่ต้องการแก้ไข" });
      }
      if (Number(existing.userId) !== Number(req.user.id) && req.user.role !== "admin") {
        await removeUploadedFile(image, "unauthorized review image");
        return res.status(403).json({ error: "คุณไม่มีสิทธิ์แก้ไขรีวิวนี้" });
      }

      const { title, restaurant, location, category, body, rating } = validation.data;
      await db.review.update({
        where: { id: reviewId },
        data: {
          title,
          restaurant,
          location: location || "",
          category: category || "อื่น ๆ",
          rating,
          body,
          ...(image ? { imageUrl: `/uploads/${image.filename}` } : {}),
        },
      });

      if (image) {
        const oldImagePath = getUploadedFilePath(existing.imageUrl);
        if (oldImagePath) {
          try {
            await fs.promises.unlink(oldImagePath);
          } catch (error) {
            if (error.code !== "ENOENT") {
              console.error("Error removing replaced review image:", error.message);
            }
          }
        }
      }

      return res.json({ message: "บันทึกการแก้ไขรีวิวเรียบร้อยแล้ว", id: reviewId });
    } catch (error) {
      await removeUploadedFile(image, "failed review update image");
      console.error("Error updating review:", error.message);
      return res.status(500).json({ error: "เกิดข้อผิดพลาดในการแก้ไขรีวิว" });
    }
  }
);

router.delete("/:id", verifyToken, async (req, res) => {
  const reviewId = parseId(req.params.id);
  if (!reviewId) {
    return res.status(400).json({ error: "รหัสรีวิวไม่ถูกต้อง" });
  }
  try {
    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { userId: true, imageUrl: true },
    });
    if (!review) {
      return res.status(404).json({ error: "ไม่พบรีวิวที่ต้องการลบ" });
    }
    if (Number(review.userId) !== Number(req.user.id) && req.user.role !== "admin") {
      return res.status(403).json({ error: "คุณไม่มีสิทธิ์ลบรีวิวนี้" });
    }

    await db.review.delete({ where: { id: reviewId } });
    const filePath = getUploadedFilePath(review.imageUrl);
    if (filePath) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        if (err.code !== "ENOENT") {
          console.error("Error removing deleted review image:", err.message);
        }
      }
    }
    res.json({ message: "ลบรีวิวเรียบร้อยแล้ว" });
  } catch (err) {
    console.error("Error deleting review:", err.message);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในการลบรีวิว" });
  }
});

module.exports = router;
