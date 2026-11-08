const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/auth");

router.get("/", verifyToken, async (req, res) => {
  try {
    const favorites = await db.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        review: {
          include: {
            user: { select: { name: true } },
            _count: { select: { likes: true } },
            likes: {
              where: { userId: req.user.id },
              select: { id: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    const reviews = favorites.map(({ review }) => ({
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
      author_name: review.user?.name || review.author || null,
      like_count: review._count.likes,
      liked: review.likes.length > 0,
      favorited: true,
    }));
    res.json({ reviews });
  } catch (err) {
    console.error("Error fetching favorite reviews:", err.message);
    res.status(500).json({ error: "ไม่สามารถดึงรายการโปรดได้" });
  }
});

module.exports = router;
