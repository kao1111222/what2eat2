const nodemailer = require("nodemailer");

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]
  );
}

async function sendContactReply(contact, reply) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const escapedName = escapeHtml(contact.name);
  const escapedSubject = escapeHtml(contact.subject);
  const escapedReply = escapeHtml(reply).replace(/\n/g, "<br>");

  await transporter.sendMail({
    from: `"What to Eat" <${from}>`,
    to: contact.email,
    subject: `อัปเดตคำร้อง: ${contact.subject}`,
    text: `สวัสดีคุณ ${contact.name}\n\nคำร้อง: ${contact.subject}\nสถานะ: แก้ไขแล้ว\n\nคำตอบจากทีมงาน:\n${reply}\n\nทีมงาน What to Eat`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px"><h2>อัปเดตคำร้องของคุณ</h2><p>สวัสดีคุณ ${escapedName}</p><p><strong>คำร้อง:</strong> ${escapedSubject}</p><p><strong>สถานะ:</strong> แก้ไขแล้ว</p><hr><p><strong>คำตอบจากทีมงาน:</strong></p><p>${escapedReply}</p><hr><p>ทีมงาน What to Eat</p></div>`,
  });
}

async function sendContactNotification(contact, adminEmails = []) {
  const configuredAdminEmails =
    process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || process.env.SMTP_USER || "";
  const recipients = [
    ...new Set(
      (adminEmails.length ? adminEmails : configuredAdminEmails.split(","))
        .map((email) => email.trim())
        .filter(Boolean)
    ),
  ];
  if (!recipients.length) {
    throw new Error(
      "Admin email is not configured. Set an admin account or ADMIN_EMAILS, ADMIN_EMAIL, or SMTP_USER."
    );
  }

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const baseUrl = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(
    /\/+$/,
    ""
  );
  const escapedName = escapeHtml(contact.name);
  const escapedEmail = escapeHtml(contact.email);
  const escapedSubject = escapeHtml(contact.subject);
  const escapedMessage = escapeHtml(contact.message).replace(/\n/g, "<br>");
  const escapedCreatedAt = escapeHtml(
    new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(contact.createdAt)
  );
  const attachmentText = contact.attachmentFilename ? "มีไฟล์แนบ" : "ไม่มีไฟล์แนบ";
  const adminUrl = `${baseUrl}/admin.html`;

  await transporter.sendMail({
    from: `"What to Eat" <${from}>`,
    to: recipients,
    subject: "มีคำร้องใหม่จากผู้ใช้",
    text: [
      "มีคำร้องใหม่จากผู้ใช้",
      "",
      `ชื่อ: ${contact.name}`,
      `อีเมล: ${contact.email}`,
      `หัวข้อ: ${contact.subject}`,
      `วันที่ส่ง: ${new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(contact.createdAt)}`,
      attachmentText,
      "",
      "รายละเอียด:",
      contact.message,
      "",
      `ดูและจัดการคำร้อง: ${adminUrl}`,
    ].join("\n"),
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px"><h2>มีคำร้องใหม่จากผู้ใช้</h2><p><strong>ชื่อ:</strong> ${escapedName}</p><p><strong>อีเมล:</strong> <a href="mailto:${escapedEmail}">${escapedEmail}</a></p><p><strong>หัวข้อ:</strong> ${escapedSubject}</p><p><strong>วันที่ส่ง:</strong> ${escapedCreatedAt}</p><p><strong>ไฟล์แนบ:</strong> ${attachmentText}</p><hr><p><strong>รายละเอียด:</strong></p><p>${escapedMessage}</p><p><a href="${escapeHtml(adminUrl)}">ดูและจัดการคำร้องในหน้าแอดมิน</a></p></div>`,
  });
}

async function sendContactRecovery(email, requests) {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const baseUrl = (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(
    /\/+$/,
    ""
  );
  const requestRows = requests
    .map(({ subject, createdAt, recoveryToken }) => {
      const link = `${baseUrl}/recover-request.html#recover_${recoveryToken}`;
      const date = new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(createdAt);
      return {
        text: `- ${subject} (${date}): ${link}`,
        html: `<li><strong>${escapeHtml(subject)}</strong> (${escapeHtml(date)})<br><a href="${escapeHtml(link)}">ยืนยันและสร้างรหัสติดตามใหม่</a></li>`,
      };
    })
    .reverse();

  await transporter.sendMail({
    from: `"What to Eat" <${from}>`,
    to: email,
    subject: "ลิงก์กู้คืนรหัสติดตามคำร้อง",
    text: [
      "มีการขอกู้คืนรหัสติดตามคำร้องสำหรับอีเมลนี้",
      "",
      ...requestRows.map((row) => row.text),
      "",
      "ลิงก์ใช้ได้ 30 นาที หากคุณไม่ได้เป็นผู้ขอ สามารถเพิกเฉยต่ออีเมลนี้ได้",
      "ทีมงาน What to Eat",
    ].join("\n"),
    html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px"><h2>กู้คืนรหัสติดตามคำร้อง</h2><p>เลือกรายการที่ต้องการกู้คืน ลิงก์ใช้ได้ 30 นาทีและใช้ได้ครั้งเดียว</p><ul>${requestRows.map((row) => row.html).join("")}</ul><p>หากคุณไม่ได้เป็นผู้ขอ สามารถเพิกเฉยต่ออีเมลนี้ได้</p><p>ทีมงาน What to Eat</p></div>`,
  });
}

module.exports = { sendContactReply, sendContactNotification, sendContactRecovery };
