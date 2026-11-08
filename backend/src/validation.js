const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  username: z.string().trim().min(2).max(100).optional(),
  email: z.string().email().max(190),
  password: z.string().min(4),
});

const loginSchema = z.object({
  email: z.string().email().max(190),
  password: z.string().min(4),
});

const reviewSchema = z.object({
  title: z.string().min(2).max(180),
  restaurant: z.string().min(1).max(180),
  location: z.string().max(180).optional().default(""),
  category: z.string().max(80).optional().default("อื่น ๆ"),
  body: z.string().min(5),
  rating: z.coerce.number().int().min(1).max(5),
});

const requestTypes = ["แจ้งปัญหา", "ขอความช่วยเหลือ", "เสนอแนะ", "อื่น ๆ"];

const contactSchema = z.object({
  name: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(2).max(100)
  ),
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email().max(190)
  ),
  subject: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).max(150)
  ),
  message: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : value),
    z.string().min(1).max(5000)
  ),
  type: z.preprocess(
    (value) => (requestTypes.includes(value) ? value : "แจ้งปัญหา"),
    z.enum(requestTypes)
  ),
});

const contactStatusSchema = z.object({
  status: z.enum(["pending", "investigating", "resolved", "closed"]),
});

const adminRoleSchema = z.object({
  role: z.literal("admin"),
});

const contactReplySchema = z.object({
  reply: z.string().trim().min(1).max(5000),
});

const contactTrackingSchema = z.object({
  trackingCode: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

const contactRecoverySchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z.string().email().max(190)
  ),
});

const contactRecoveryConfirmSchema = z.object({
  recoveryToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});

function validateBody(schema, errorMessage) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: errorMessage });
    }

    req.validatedBody = result.data;
    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  reviewSchema,
  contactSchema,
  contactStatusSchema,
  adminRoleSchema,
  contactReplySchema,
  contactTrackingSchema,
  contactRecoverySchema,
  contactRecoveryConfirmSchema,
  validateBody,
};
