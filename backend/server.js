require("dotenv").config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set before starting the server");
}

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));
app.use(express.static(path.join(__dirname, "../frontend")));

const authRoutes = require("./src/routes/auth");
const reviewRoutes = require("./src/routes/reviews");
const contactRoutes = require("./src/routes/contact");
const socialRoutes = require("./src/routes/social");
const adminRoutes = require("./src/routes/admin");
const favoriteRoutes = require("./src/routes/favorites");

app.use("/api/auth", authRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/favorites", favoriteRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
