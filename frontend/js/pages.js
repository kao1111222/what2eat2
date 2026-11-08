window.pagesHandlesForms = true;

async function loadFavorites() {
  const target = document.querySelector("#favorite-list");
  if (!target) return;
  if (!getToken()) {
    target.innerHTML =
      '<p class="empty">กรุณาเข้าสู่ระบบเพื่อดูรายการโปรด <a href="login.html">เข้าสู่ระบบ</a></p>';
    return;
  }
  try {
    const data = await api("/api/favorites");
    target.innerHTML = data.reviews.length
      ? data.reviews.map(reviewCard).join("")
      : '<p class="empty">ยังไม่มีรายการโปรด</p>';
  } catch (error) {
    target.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

async function loadComments(reviewId) {
  const target = document.querySelector("#comments-list");
  if (!target) return;
  try {
    const data = await api(`/api/reviews/${reviewId}/comments`);
    target.innerHTML = data.comments.length
      ? data.comments
          .map(
            (comment) =>
              `<div class="comment-item"><strong>${escapeHtml(comment.author)}</strong><small>${formatDate(comment.created_at)}</small><p>${escapeHtml(comment.comment_text)}</p>${Number(getUser()?.id) === Number(comment.user_id) || getUser()?.role === "admin" ? `<button class="text-danger" data-delete-comment="${comment.id}">ลบความคิดเห็น</button>` : ""}</div>`
          )
          .join("")
      : '<p class="form-note">ยังไม่มีความคิดเห็น</p>';
  } catch (error) {
    target.innerHTML = `<p class="form-note">${escapeHtml(error.message)}</p>`;
  }
}

async function loadReviewDetail() {
  const target = document.querySelector("#review-detail");
  if (!target) return;
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    target.innerHTML = '<p class="empty">ไม่พบรหัสรีวิว</p>';
    return;
  }
  try {
    const data = await api(`/api/reviews/${encodeURIComponent(id)}`);
    const review = data.review;
    const user = getUser();
    const canManage = user && (Number(user.id) === Number(review.user_id) || user.role === "admin");
    target.innerHTML = `<div class="detail-layout"><div class="detail-photo"><img src="${escapeHtml(review.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000")}" alt="${escapeHtml(review.title)}"></div>
      <div class="detail-copy"><div class="eyebrow">${escapeHtml(review.category || "FOOD JOURNAL")}</div><h1>${escapeHtml(review.title)}</h1>
      <div class="stars">${renderStars(review.rating)}</div><p>📍 ${escapeHtml(review.restaurant)} · ${escapeHtml(review.location || "ไม่ระบุพิกัด")}</p>
      <p>${escapeHtml(review.body).replace(/\n/g, "<br>")}</p><p class="form-note">รีวิวโดย ${escapeHtml(review.author)} · ${formatDate(review.created_at)} · ${review.view_count} ครั้งที่อ่าน</p>
      <div class="detail-actions"><button class="btn btn-outline" data-like="${review.id}">♥ ถูกใจ (${review.like_count || 0})</button><button class="btn btn-outline" data-favorite="${review.id}">${review.favorited ? "★ บันทึกแล้ว" : "☆ บันทึกรายการโปรด"}</button>
      ${canManage ? `<a class="btn btn-outline" href="edit-review.html?id=${review.id}">แก้ไขรีวิว</a><button class="btn btn-danger" id="delete-review">ลบรีวิว</button>` : ""}</div></div></div>
      <section class="comments-section"><h2>ความคิดเห็น</h2><form id="comment-form" class="comment-form"><textarea class="field" name="comment" rows="3" maxlength="1000" placeholder="แบ่งปันความคิดเห็นของคุณ..." required></textarea><button class="btn btn-red">ส่งความคิดเห็น</button></form><div id="comments-list"></div></section>`;
    await loadComments(id);
    document.querySelector("#comment-form")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!requireLogin()) return;
      try {
        await api(`/api/reviews/${id}/comments`, {
          method: "POST",
          body: JSON.stringify({ comment: new FormData(event.currentTarget).get("comment") }),
        });
        event.currentTarget.reset();
        toast("เพิ่มความคิดเห็นแล้ว");
        await loadComments(id);
      } catch (error) {
        toast(error.message, "error");
      }
    });
    document.querySelector("#delete-review")?.addEventListener("click", async () => {
      if (!confirmAction("ยืนยันลบรีวิวนี้ใช่ไหม? การลบไม่สามารถกู้คืนได้")) return;
      try {
        await api(`/api/reviews/${id}`, { method: "DELETE" });
        toast("ลบรีวิวแล้ว");
        location.href = "profile.html";
      } catch (error) {
        toast(error.message, "error");
      }
    });
  } catch (error) {
    target.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector("#review-detail")) loadReviewDetail();
  if (document.querySelector("#favorite-list")) loadFavorites();

  const loginForm = document.querySelector("#login-form");
  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(loginForm))),
      });
      saveSession(data.token, data.user);
      location.href = "profile.html";
    } catch (error) {
      toast(error.message, "error");
    }
  });

  const registerForm = document.querySelector("#register-form");
  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(registerForm));
    if (values.password !== values.confirm) return toast("รหัสผ่านไม่ตรงกัน", "error");
    delete values.confirm;
    try {
      await api("/api/auth/register", { method: "POST", body: JSON.stringify(values) });
      toast("สมัครสมาชิกสำเร็จ ไปเข้าสู่ระบบได้เลย");
      setTimeout(() => (location.href = "login.html"), 900);
    } catch (error) {
      toast(error.message, "error");
    }
  });

  const reviewForm = document.querySelector("#review-form");
  if (reviewForm) {
    const picker = document.querySelector("#star-picker");
    let rating = Number(reviewForm.elements.rating?.value || 5);
    const paintStars = () => {
      if (!picker) return;
      picker.innerHTML = [1, 2, 3, 4, 5]
        .map(
          (number) =>
            `<button type="button" class="star-btn ${number <= rating ? "active" : ""}" data-star="${number}">★</button>`
        )
        .join("");
    };
    paintStars();
    picker?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-star]");
      if (button) {
        rating = Number(button.dataset.star);
        paintStars();
      }
    });
    reviewForm.elements.rating?.addEventListener("change", (event) => {
      rating = Number(event.currentTarget.value);
    });
    const editId = new URLSearchParams(location.search).get("id");
    let editReady = !editId;
    if (editId) {
      if (!getToken()) {
        requireLogin();
        return;
      }

      document.querySelector("h1").textContent = "แก้ไขรีวิวของคุณ";
      const submitButton = reviewForm.querySelector('button[type="submit"]');
      const editError = document.querySelector("#review-edit-error");
      submitButton.textContent = "กำลังโหลดรีวิว...";
      submitButton.disabled = true;
      api(`/api/reviews/${editId}`)
        .then(({ review }) => {
          const user = getUser();
          const canEdit =
            user && (Number(user.id) === Number(review.user_id) || user.role === "admin");
          if (!canEdit) {
            toast("คุณไม่มีสิทธิ์แก้ไขรีวิวนี้", "error");
            setTimeout(() => location.replace(`review.html?id=${encodeURIComponent(editId)}`), 900);
            return;
          }

          for (const field of ["title", "restaurant", "location", "category", "body"]) {
            const input = reviewForm.elements[field];
            if (input) input.value = review[field] || "";
          }
          rating = Number(review.rating);
          paintStars();
          editReady = true;
          submitButton.textContent = "บันทึกการแก้ไข";
          submitButton.disabled = false;
        })
        .catch((error) => {
          console.error("Error loading review for editing:", error);
          submitButton.textContent = "โหลดรีวิวไม่สำเร็จ";
          editError.textContent = `โหลดรีวิวไม่สำเร็จ: ${error.message}`;
          editError.hidden = false;
          toast(error.message, "error");
        });
    }
    reviewForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!editReady) {
        toast("กรุณารอให้โหลดข้อมูลรีวิวเสร็จก่อน", "error");
        return;
      }
      if (!requireLogin()) return;
      const formData = new FormData(reviewForm);
      formData.set("rating", rating);
      try {
        const result = await api(editId ? `/api/reviews/${editId}` : "/api/reviews", {
          method: editId ? "PATCH" : "POST",
          body: formData,
        });
        toast(result.message || "บันทึกสำเร็จ");
        setTimeout(
          () =>
            (location.href = editId ? `review.html?id=${editId}` : `review.html?id=${result.id}`),
          700
        );
      } catch (error) {
        toast(error.message, "error");
      }
    });
  }

  const profile = document.querySelector("#profile-content");
  if (profile) loadProfile();
  if (document.querySelector("#admin-summary")) loadAdminDashboard();

  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    const user = getUser();
    if (user) {
      contactForm.elements.name.value = user.name || "";
      contactForm.elements.email.value = user.email || "";
    }

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = contactForm.querySelector('[type="submit"]');
      const status = document.querySelector("#contact-message");
      submitButton.disabled = true;
      status.textContent = "กำลังส่งคำร้อง...";
      try {
        const response = await axios.post(`${API}/api/contact`, new FormData(contactForm));
        const result = response.data;
        status.replaceChildren();
        const message = document.createElement("p");
        message.textContent = result.message;
        status.append(message);
        const trackingInfo = document.createElement("p");
        trackingInfo.append("รหัสติดตามคำร้อง: ");
        const code = document.createElement("strong");
        code.textContent = result.trackingCode;
        trackingInfo.append(code, " — กรุณาบันทึกรหัสนี้ไว้");
        const trackingLink = document.createElement("a");
        trackingLink.href = `track-request.html#${encodeURIComponent(result.trackingCode)}`;
        trackingLink.textContent = "ดูสถานะคำร้อง";
        trackingInfo.append(document.createElement("br"), trackingLink);
        status.append(trackingInfo);
        toast(result.message);
        contactForm.reset();
        if (user) {
          contactForm.elements.name.value = user.name || "";
          contactForm.elements.email.value = user.email || "";
        }
      } catch (error) {
        const message = error.response?.data?.error || "ส่งคำร้องไม่สำเร็จ กรุณาลองใหม่";
        status.textContent = message;
        toast(message, "error");
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  const trackingForm = document.querySelector("#tracking-form");
  if (trackingForm) {
    const codeInput = trackingForm.elements.trackingCode;
    const initialCode = location.hash.slice(1);

    trackingForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const result = document.querySelector("#tracking-result");
      const submitButton = trackingForm.querySelector('[type="submit"]');
      submitButton.disabled = true;
      result.textContent = "กำลังตรวจสอบคำร้อง...";

      try {
        const data = await api("/api/contact/track", {
          method: "POST",
          body: JSON.stringify({ trackingCode: codeInput.value.trim() }),
        });
        const labels = {
          pending: "รอดำเนินการ",
          investigating: "กำลังตรวจสอบ",
          resolved: "แก้ไขแล้ว",
          closed: "ปิดเรื่อง",
        };
        const request = data.request;
        const details = document.createElement("section");
        details.className = "comment-item";
        const subject = document.createElement("h2");
        subject.textContent = request.subject;
        const status = document.createElement("p");
        status.textContent = `สถานะ: ${labels[request.status] || "ไม่ทราบสถานะ"}`;
        const created = document.createElement("p");
        created.textContent = `วันที่ส่ง: ${formatDate(request.created_at)}`;
        details.append(subject, status, created);
        if (request.reply) {
          const replyTitle = document.createElement("h3");
          replyTitle.textContent = "ข้อความตอบกลับจากทีมงาน";
          const reply = document.createElement("p");
          reply.style.whiteSpace = "pre-wrap";
          reply.textContent = request.reply;
          details.append(replyTitle, reply);
          if (request.replied_at) {
            const repliedAt = document.createElement("small");
            repliedAt.textContent = `ตอบกลับเมื่อ ${formatDate(request.replied_at)}`;
            details.append(repliedAt);
          }
        } else {
          const pendingReply = document.createElement("p");
          pendingReply.textContent = "ทีมงานยังไม่ได้ส่งคำตอบ";
          details.append(pendingReply);
        }
        result.replaceChildren(details);
      } catch (error) {
        result.textContent = error.message;
      } finally {
        submitButton.disabled = false;
      }
    });

    if (initialCode) {
      codeInput.value = initialCode;
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      trackingForm.requestSubmit();
    }
  }

  const recoveryForm = document.querySelector("#recovery-form");
  if (recoveryForm) {
    recoveryForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#recovery-message");
      const submitButton = recoveryForm.querySelector('[type="submit"]');
      submitButton.disabled = true;
      message.textContent = "กำลังขอลิงก์กู้คืน...";

      try {
        const result = await api("/api/contact/recover", {
          method: "POST",
          body: JSON.stringify({ email: recoveryForm.elements.email.value.trim() }),
        });
        message.textContent = result.message;
      } catch (error) {
        message.textContent = error.message;
      } finally {
        submitButton.disabled = false;
      }
    });

    const confirmation = document.querySelector("#recovery-confirmation");
    const recoveryToken = location.hash.startsWith("#recover_")
      ? location.hash.slice("#recover_".length)
      : "";

    if (recoveryToken) {
      recoveryForm.hidden = true;
      confirmation.hidden = false;
      document.querySelector("#recovery-confirm-button").addEventListener("click", async (event) => {
        const button = event.currentTarget;
        const message = document.querySelector("#recovery-message");
        button.disabled = true;
        message.textContent = "กำลังยืนยันลิงก์...";
        history.replaceState(null, "", `${location.pathname}${location.search}`);

        try {
          const result = await api("/api/contact/recover/confirm", {
            method: "POST",
            body: JSON.stringify({ recoveryToken }),
          });
          message.textContent = result.message;
          confirmation.hidden = true;

          const resultPanel = document.querySelector("#recovery-result");
          const code = document.createElement("strong");
          code.textContent = result.trackingCode;
          const warning = document.createElement("p");
          warning.textContent = "บันทึกรหัสนี้ไว้ให้ปลอดภัย ระบบจะแสดงรหัสใหม่ครั้งเดียว";
          const link = document.createElement("a");
          link.href = `track-request.html#${encodeURIComponent(result.trackingCode)}`;
          link.textContent = "ไปดูสถานะคำร้อง";
          resultPanel.replaceChildren(code, warning, link);
        } catch (error) {
          message.textContent = error.message;
          button.disabled = false;
        }
      });
    } else {
      confirmation.hidden = true;
    }
  }

  document.addEventListener("click", async (event) => {
    const deleteComment = event.target.closest("[data-delete-comment]");
    if (!deleteComment) return;
    if (!confirmAction("ยืนยันลบความคิดเห็นนี้ใช่ไหม?")) return;
    try {
      await api(`/api/comments/${deleteComment.dataset.deleteComment}`, { method: "DELETE" });
      toast("ลบความคิดเห็นแล้ว");
      await loadComments(new URLSearchParams(location.search).get("id"));
    } catch (error) {
      toast(error.message, "error");
    }
  });
});

async function loadProfile() {
  const target = document.querySelector("#profile-content");
  if (!getToken()) {
    target.innerHTML =
      '<div class="empty">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์ <a class="btn btn-dark" href="login.html">เข้าสู่ระบบ</a></div>';
    return;
  }
  try {
    const { user } = await api("/api/auth/me");
    localStorage.setItem("what_to_eat_user", JSON.stringify(user));
    target.innerHTML = `<div class="profile-panel"><div class="profile-head"><div class="avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</div><div><div class="eyebrow">WHAT TO EAT MEMBER</div><h2>${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><span class="tag">${user.role === "admin" ? "ผู้ดูแลระบบ" : "สมาชิก"}</span>${user.role === "admin" ? '<p><a class="btn btn-outline" href="admin.html">เปิดแดชบอร์ดผู้ดูแล</a></p>' : ""}</div></div>
      <form id="profile-form" class="form-wrap"><h2>แก้ไขโปรไฟล์</h2><div class="form-row"><label>ชื่อที่แสดง</label><input class="field" name="name" value="${escapeHtml(user.name)}" required minlength="2"></div><div class="form-row"><label>แนะนำตัว</label><textarea class="field" name="bio" rows="3" maxlength="500">${escapeHtml(user.bio || "")}</textarea></div><button class="btn btn-red">บันทึกโปรไฟล์</button></form>
      <form id="password-form" class="form-wrap"><h2>เปลี่ยนรหัสผ่าน</h2><div class="form-row"><label>รหัสผ่านปัจจุบัน</label><input class="field" name="currentPassword" type="password" required></div><div class="form-row"><label>รหัสผ่านใหม่</label><input class="field" name="newPassword" type="password" minlength="8" required></div><button class="btn btn-outline">เปลี่ยนรหัสผ่าน</button></form>
      <div class="danger-zone"><h2>จัดการบัญชี</h2><p>การลบบัญชีจะลบรีวิวและข้อมูลที่เกี่ยวข้องกับบัญชีนี้ด้วย และไม่สามารถกู้คืนได้</p><button id="delete-account" class="btn btn-danger">ลบบัญชีของฉัน</button></div></div>
      <h2 class="section-title">รีวิวล่าสุดจากชุมชน</h2><div class="review-grid" id="my-review-list"></div>`;
    const [myReviews] = await Promise.all([api("/api/reviews")]);
    const own = myReviews.reviews.filter((review) => Number(review.user_id) === Number(user.id));
    document.querySelector("#my-review-list").innerHTML = own.length
      ? own.map(reviewCard).join("")
      : '<p class="empty">คุณยังไม่ได้เขียนรีวิว</p>';
    document.querySelector("#profile-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        const result = await api("/api/auth/me", {
          method: "PATCH",
          body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
        });
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        toast(result.message);
        renderNav();
      } catch (error) {
        toast(error.message, "error");
      }
    });
    document.querySelector("#password-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await api("/api/auth/password", {
          method: "PATCH",
          body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
        });
        clearSession();
        toast("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบใหม่");
        setTimeout(() => (location.href = "login.html"), 900);
      } catch (error) {
        toast(error.message, "error");
      }
    });
    document.querySelector("#delete-account").addEventListener("click", async () => {
      if (
        !confirmAction(
          "คำเตือน: ต้องการลบบัญชีถาวรใช่ไหม? รีวิว ความคิดเห็น และรายการโปรดของคุณจะถูกลบด้วย"
        )
      )
        return;
      const password = prompt("เพื่อยืนยันตัวตน กรุณากรอกรหัสผ่านปัจจุบัน:");
      if (password === null) return;
      try {
        const result = await api("/api/auth/me", {
          method: "DELETE",
          body: JSON.stringify({ password }),
        });
        clearSession();
        alert(result.message);
        location.href = "index.html";
      } catch (error) {
        toast(error.message, "error");
      }
    });
  } catch (error) {
    target.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

async function loadAdminDashboard() {
  const summary = document.querySelector("#admin-summary");
  const messages = document.querySelector("#admin-messages");
  if (!getToken()) {
    summary.innerHTML = '<p class="empty">กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ</p>';
    return;
  }
  try {
    const [stats, inbox] = await Promise.all([
      api("/api/admin/summary"),
      api("/api/admin/messages"),
    ]);
    summary.innerHTML = `<div class="admin-stat"><strong>${stats.users}</strong><span>สมาชิก</span></div><div class="admin-stat"><strong>${stats.reviews}</strong><span>รีวิว</span></div><div class="admin-stat"><strong>${stats.comments}</strong><span>ความคิดเห็น</span></div><div class="admin-stat"><strong>${stats.newMessages}</strong><span>ข้อความใหม่</span></div>`;
    messages.innerHTML = inbox.messages.length
      ? inbox.messages
          .map(
            (item) =>
              `<article class="comment-item"><strong>${escapeHtml(item.subject)}</strong><small>${escapeHtml(item.name)} · ${escapeHtml(item.email)} · ${formatDate(item.created_at)}</small><p>${escapeHtml(item.message)}</p><label>สถานะ <select class="field" data-message-status="${item.id}"><option value="pending" ${item.status === "pending" ? "selected" : ""}>รอดำเนินการ</option><option value="investigating" ${item.status === "investigating" ? "selected" : ""}>กำลังตรวจสอบ</option><option value="resolved" ${item.status === "resolved" ? "selected" : ""}>แก้ไขแล้ว</option><option value="closed" ${item.status === "closed" ? "selected" : ""}>ปิดเรื่อง</option></select></label></article>`
          )
          .join("")
      : '<p class="empty">ยังไม่มีข้อความติดต่อ</p>';
    messages.addEventListener("change", async (event) => {
      const select = event.target.closest("[data-message-status]");
      if (!select) return;
      try {
        await api(`/api/admin/messages/${select.dataset.messageStatus}`, {
          method: "PATCH",
          body: JSON.stringify({ status: select.value }),
        });
        toast("อัปเดตสถานะแล้ว");
      } catch (error) {
        toast(error.message, "error");
      }
    });
  } catch (error) {
    summary.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}
