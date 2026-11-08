require("dotenv").config();
const db = require("../src/db");

const categories = [
  ["จานโปรด", "favorites-dish", "เมนูจานโปรดจากสมาชิก"],
  ["อาหารไทย", "thai-food", "อาหารไทยและอาหารท้องถิ่น"],
  ["อาหารญี่ปุ่น", "japanese-food", "ซูชิ ราเมง และอาหารญี่ปุ่น"],
  ["อาหารเกาหลี", "korean-food", "อาหารเกาหลีและสตรีทฟู้ด"],
  ["เมนูเส้น", "noodles", "ก๋วยเตี๋ยว ราเมง และเมนูเส้น"],
  ["อาหารสุขภาพ", "healthy-food", "อาหารสุขภาพและเมนูคลีน"],
  ["คาเฟ่", "cafe", "คาเฟ่และร้านกาแฟ"],
  ["ของหวาน", "dessert", "ขนม เค้ก และเบเกอรี่"],
  ["เครื่องดื่ม", "drinks", "ชา กาแฟ และเครื่องดื่ม"],
  ["อาหารอิตาเลียน", "italian-food", "พาสต้าและพิซซ่า"],
  ["พาสต้า", "pasta", "พาสต้าและอาหารเส้นสไตล์อิตาเลียน"],
  ["อื่น ๆ", "others", "เมนูอาหารประเภทอื่น"],
];

async function seed() {
  for (const [name, slug, description] of categories) {
    await db.category.upsert({
      where: { name },
      update: { slug, description, isActive: true },
      create: { name, slug, description },
    });
  }
}

seed()
  .catch((error) => {
    console.error("Unable to seed categories:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
