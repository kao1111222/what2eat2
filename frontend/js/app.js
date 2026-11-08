const API =
  window.location.protocol === 'file:' ||
  ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? 'http://localhost:3000'
    : window.location.origin;

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function getToken() { 
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === 'undefined' || token === 'null') return null;
  return token; 
}

function getUser() {
  try { 
    const user = localStorage.getItem(USER_KEY);
    if (!user || user === 'undefined' || user === 'null') return null;
    return JSON.parse(user); 
  } catch (_error) { 
    return null; 
  }
}

function saveSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง';
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function renderStars(value) {
  const rating = Math.max(0, Math.min(5, Number(value) || 0));
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function toast(message, type = 'success') {
  let element = document.querySelector('#toast');
  if (!element) {
    element = document.createElement('div');
    element.id = 'toast';
    document.body.appendChild(element);
  }
  element.textContent = message;
  element.dataset.type = type;
  element.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => element.classList.remove('show'), 3000);
}

async function api(url, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const response = await axios({
      url: `${API}${url}`,
      method: options.method || 'GET',
      headers: headers,
      data: options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401 && getToken()) clearSession();
      throw new Error(error.response.data.error || error.response.data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่');
    }
    throw new Error('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
  }
}

function requireLogin() {
  if (getToken()) return true;
  toast('กรุณาเข้าสู่ระบบก่อนใช้งาน', 'error');
  window.setTimeout(() => { location.href = 'login.html'; }, 700);
  return false;
}

function confirmAction(message) {
  return window.confirm(message);
}

window.deleteReview = async function(reviewId) {
  if (!requireLogin()) return;

  if (typeof Swal === 'undefined') {
    const isConfirmed = window.confirm('⚠️ ยืนยันการลบรีวิวนี้ใช่หรือไม่?\nหากลบแล้วจะไม่สามารถกู้คืนได้!');
    if (!isConfirmed) return;

    try {
      await api(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      toast('ลบรีวิวเรียบร้อยแล้ว');
      location.reload();
    } catch (err) {
      alert(err.message);
    }
    return;
  }

  const result = await Swal.fire({
    title: 'ยืนยันการลบรีวิว?',
    text: "หากลบแล้วจะไม่สามารถย้อนกลับได้อีก!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'ใช่, ลบเลย!',
    cancelButtonText: 'ยกเลิก'
  });

  if (result.isConfirmed) {
    try {
      await api(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      await Swal.fire({
        title: 'ลบสำเร็จ!',
        text: 'รีวิวของคุณถูกลบเรียบร้อยแล้ว',
        icon: 'success',
        confirmButtonColor: '#ef4444'
      });
      location.reload();
    } catch (err) {
      Swal.fire('เกิดข้อผิดพลาด!', err.message, 'error');
    }
  }
};

async function handleLike(reviewId, btnElement) {
  if (!requireLogin()) return;
  try {
    const res = await api(`/api/reviews/${reviewId}/like`, { method: 'POST' });
    toast(res.message || 'อัปเดตการถูกใจเรียบร้อย');
    if (btnElement) {
      const isLiked = res.liked;
      btnElement.classList.toggle('is-active', isLiked);
      btnElement.innerHTML = `♥ ${res.like_count ?? (Number(btnElement.textContent.replace(/\D/g, '')) + (isLiked ? 1 : -1))}`;
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function handleFavorite(reviewId, btnElement) {
  if (!requireLogin()) return;
  try {
    const res = await api(`/api/reviews/${reviewId}/favorite`, { method: 'POST' });
    toast(res.message || 'อัปเดตรายการโปรดเรียบร้อย');
    if (btnElement) {
      const isFav = res.favorited;
      btnElement.classList.toggle('is-active', isFav);
      btnElement.innerHTML = isFav ? '★ บันทึกแล้ว' : '☆ บันทึก';
    }
  } catch (err) {
    toast(err.message, 'error');
  }
}

function renderNav() {
  const links = document.querySelector('.navlinks');
  if (links && !links.querySelector('a[href="track-request.html"]')) {
    const trackingLink = document.createElement('a');
    trackingLink.href = 'track-request.html';
    trackingLink.textContent = 'ติดตามคำร้อง';
    links.append(trackingLink);
  }

  const container = document.querySelector('#nav-actions');
  if (!container) return;
  const user = getUser();
  
  let navHtml = '';
  
  if (user) {
    if (user.role === 'admin') {
      navHtml += `<a class="btn btn-red" href="admin.html" style="margin-right: 8px; background: #ef4444; color: white;">⚙️ จัดการระบบ</a>`;
    }
    
    navHtml += `
      <a class="btn btn-outline" href="profile.html">👤 ${escapeHtml(user.name || user.username || 'โปรไฟล์')}</a>
      <button class="btn btn-dark" type="button" id="logout-button" style="margin-left: 8px;">ออกจากระบบ</button>
    `;
  } else {
    navHtml = `
      <a class="btn btn-outline" href="login.html">เข้าสู่ระบบ</a>
      <a class="btn btn-red" href="register.html" style="margin-left: 8px;">สมัครสมาชิก</a>
    `;
  }
  
  container.innerHTML = navHtml;
  
  document.querySelector('#logout-button')?.addEventListener('click', () => {
    if (!confirmAction('ต้องการออกจากระบบใช่ไหม?')) return;
    clearSession();
    location.href = 'index.html';
  });
}

function reviewCard(review) {
  const image = review.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900';
  const user = getUser();
  const canManage =
    user && (Number(user.id) === Number(review.user_id) || user.role === 'admin');
  return `<article class="review-card">
    <a class="review-card-link" href="review.html?id=${encodeURIComponent(review.id)}">
      <div class="review-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(review.title)}" loading="lazy"><span class="tag">${escapeHtml(review.category || 'รีวิว')}</span></div>
      <div class="review-content"><div class="stars">${renderStars(review.rating)}</div><h3>${escapeHtml(review.title)}</h3>
      <div class="review-meta"><span>📍 ${escapeHtml(review.restaurant)}</span><span>✍ ${escapeHtml(review.author_name || review.author || 'สมาชิก')}</span></div>
      <p>${escapeHtml((review.body || '').slice(0, 100))}${(review.body || '').length > 100 ? '…' : ''}</p></div>
    </a>
    <div class="review-card-actions">
      <button type="button" class="small-action ${review.liked ? 'is-active' : ''}" data-like="${review.id}">♥ ${Number(review.like_count || 0)}</button>
      <button type="button" class="small-action ${review.favorited ? 'is-active' : ''}" data-favorite="${review.id}">${review.favorited ? '★ บันทึกแล้ว' : '☆ บันทึก'}</button>
      ${canManage ? `<a class="small-action" href="edit-review.html?id=${encodeURIComponent(review.id)}">✎ แก้ไข</a><button type="button" class="small-action btn-danger" onclick="deleteReview('${review.id}')">🗑 ลบ</button>` : ''}
    </div>
  </article>`;
}

async function getReviews(query = '', sort = 'latest', category = '') {
  const params = new URLSearchParams({ q: query, sort, category });
  const data = await api(`/api/reviews?${params}`);
  return Array.isArray(data) ? data : (data.reviews || []);
}

const reviewRenderRequests = new WeakMap();

async function renderCards(target = '#review-list', query = '', sort = 'latest', category = '') {
  const element = document.querySelector(target);
  if (!element) return;
  const requestId = (reviewRenderRequests.get(element) || 0) + 1;
  reviewRenderRequests.set(element, requestId);
  element.innerHTML = '<p class="empty">กำลังโหลดรีวิว...</p>';
  try {
    const reviews = await getReviews(query, sort, category);
    if (reviewRenderRequests.get(element) !== requestId) return;
    element.innerHTML = reviews.length ? reviews.map(reviewCard).join('') : '<p class="empty">ยังไม่มีรีวิว ลองเป็นคนแรกที่แบ่งปันความอร่อยกัน!</p>';
  } catch (error) {
    if (reviewRenderRequests.get(element) !== requestId) return;
    element.innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

async function renderProfilePage() {
  const profileContainer = document.querySelector('#profile-container');
  if (!profileContainer) return;

  if (!requireLogin()) return;

  const user = getUser();

  const savedAvatar = localStorage.getItem(`avatar_${user?.id || 'me'}`) || 
                      user?.avatar_url || 
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.name || 'foodie')}`;

  const savedCover = localStorage.getItem(`cover_img_${user?.id || 'me'}`) || '';

  let myReviews = [];
  let totalLikes = 0;
  try {
    const res = await api('/api/reviews/user/me');
    myReviews = Array.isArray(res) ? res : [];
    totalLikes = myReviews.reduce((sum, item) => sum + (Number(item.like_count) || 0), 0);
  } catch (e) {
    console.log('Error fetching user stats:', e);
  }

  const coverStyle = savedCover 
    ? `background-image: url('${savedCover}'); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, #ff472e 0%, #ff8c42 50%, #facc15 100%);`;

  profileContainer.innerHTML = `
    <div class="profile-card-fancy">
      <div class="profile-cover" id="profile-cover-banner" style="${coverStyle}">
        <button class="cover-picker-btn" id="btn-change-cover" type="button">🖼️ เปลี่ยนรูปปก</button>
        
        <div class="profile-avatar-wrap" id="avatar-trigger" title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์">
          <img src="${escapeHtml(savedAvatar)}" id="profile-avatar-img" alt="Avatar">
          <div class="avatar-overlay">
            <span style="font-size:18px;">📷</span>
            <span>เปลี่ยนรูป</span>
          </div>
        </div>
      </div>
      
      <div class="profile-content">
        <div class="profile-header-info">
          <div>
            <h1 class="profile-name">${escapeHtml(user?.name || user?.username || 'นักชิมปริศนา')}</h1>
            <div class="profile-email">✉️ ${escapeHtml(user?.email || 'ไม่ระบุอีเมล')}</div>
            
            <div class="badge-container">
              <span class="profile-badge">✳️ สมาชิกนักรีวิวประจำชุมชน</span>
            </div>
          </div>
          
          <div class="profile-actions-bar">
            <a href="write-review.html" class="btn btn-red" style="padding: 10px 18px; font-weight:800;">＋ เขียนรีวิวใหม่</a>
            <button class="btn btn-dark" type="button" id="profile-logout-btn" style="padding: 10px 18px; font-weight:800;">ออกจากระบบ</button>
          </div>
        </div>

        <div class="profile-stats">
          <div class="stat-box">
            <div class="stat-number">${myReviews.length}</div>
            <div class="stat-label">📝 รีวิวทั้งหมด</div>
          </div>
          <div class="stat-box">
            <div class="stat-number" style="color: #ff472e;">♥ ${totalLikes}</div>
            <div class="stat-label">ยอดถูกใจรวม</div>
          </div>
          <div class="stat-box">
            <div class="stat-number" style="color: #10b981;">ใช้งานปกติ</div>
            <div class="stat-label">สถานะบัญชี</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const btnChangeCover = document.querySelector('#btn-change-cover');
  const coverInput = document.querySelector('#cover-input');

  if (btnChangeCover && coverInput) {
    btnChangeCover.addEventListener('click', () => coverInput.click());

    coverInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const newCoverUrl = event.target.result;
          const banner = document.querySelector('#profile-cover-banner');
          banner.style.backgroundImage = `url('${newCoverUrl}')`;
          banner.style.backgroundSize = 'cover';
          banner.style.backgroundPosition = 'center';
          localStorage.setItem(`cover_img_${user?.id || 'me'}`, newCoverUrl);
          toast('อัปเดตรูปปกหลังเรียบร้อยแล้ว!');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  const avatarTrigger = document.querySelector('#avatar-trigger');
  const avatarInput = document.querySelector('#avatar-input');

  if (avatarTrigger && avatarInput) {
    avatarTrigger.addEventListener('click', () => avatarInput.click());

    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          const newImgUrl = event.target.result;
          document.querySelector('#profile-avatar-img').src = newImgUrl;
          localStorage.setItem(`avatar_${user?.id || 'me'}`, newImgUrl);
          toast('อัปเดตรูปโปรไฟล์สำเร็จแล้ว!');
        };
        reader.readAsDataURL(file);
      }
    });
  }

  document.querySelector('#profile-logout-btn')?.addEventListener('click', () => {
    if (!confirmAction('ต้องการออกจากระบบใช่ไหม?')) return;
    clearSession();
    location.href = 'index.html';
  });

  loadMyReviews();

  const tabMy = document.querySelector('#tab-my-reviews');
  const tabFav = document.querySelector('#tab-favorites');

  function resetTabs() {
    [tabMy, tabFav].forEach(b => b?.classList.remove('active'));
  }

  tabMy?.addEventListener('click', () => {
    resetTabs();
    tabMy.classList.add('active');
    loadMyReviews();
  });

  tabFav?.addEventListener('click', () => {
    resetTabs();
    tabFav.classList.add('active');
    loadFavorites();
  });
}

async function loadMyReviews() {
  const container = document.querySelector('#tab-content-area');
  if (!container) return;
  container.innerHTML = '<div class="review-grid" id="profile-review-list"><p class="empty">กำลังโหลดรีวิวของคุณ...</p></div>';

  try {
    const reviews = await api('/api/reviews/user/me');
    const listEl = document.querySelector('#profile-review-list');
    if (Array.isArray(reviews) && reviews.length > 0) {
      listEl.innerHTML = reviews.map(reviewCard).join('');
    } else {
      listEl.innerHTML = '<p class="empty">คุณยังไม่ได้เขียนรีวิวเลย ลองเริ่มเขียนรีวิวแรกกัน!</p>';
    }
  } catch (err) {
    container.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
  }
}

async function loadFavorites() {
  const container = document.querySelector('#tab-content-area');
  if (!container) return;
  container.innerHTML = '<div class="review-grid" id="profile-review-list"><p class="empty">กำลังโหลดรายการโปรด...</p></div>';

  try {
    const reviews = await getReviews();
    const favReviews = reviews.filter(r => r.favorited);
    const listEl = document.querySelector('#profile-review-list');

    if (favReviews.length > 0) {
      listEl.innerHTML = favReviews.map(reviewCard).join('');
    } else {
      listEl.innerHTML = '<p class="empty">ยังไม่มีรายการโปรดที่คุณกดบันทึกไว้</p>';
    }
  } catch (err) {
    container.innerHTML = `<p class="empty">${escapeHtml(err.message)}</p>`;
  }
}

async function renderDetailPage() {
  const container = document.querySelector('#review-detail-container') || document.querySelector('#review-detail');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const reviewId = urlParams.get('id');

  if (!reviewId) {
    container.innerHTML = '<p class="empty">ไม่พบรหัสรีวิว</p>';
    return;
  }

  container.innerHTML = '<p class="empty">กำลังโหลดรายละเอียดรีวิว...</p>';

  try {
    const resData = await api(`/api/reviews/${reviewId}`);
    const review = resData.data || resData.review || resData;

    if (!review || (!review.id && !review.title)) {
      container.innerHTML = '<p class="empty">ไม่พบข้อมูลรีวิวนี้ในระบบ</p>';
      return;
    }

    const image = review.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900';

    container.innerHTML = `
      <div class="detail-card" style="background:#fff; padding:28px; border-radius:12px; border:2px solid #111; box-shadow:4px 4px 0 #111; margin-bottom:40px;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <span class="tag" style="background:#ff472e; color:#fff; padding:6px 16px; border-radius:99px; font-weight:bold;">${escapeHtml(review.category || 'รีวิว')}</span>
          <a href="index.html" class="btn btn-outline" style="font-size:14px; padding:4px 12px;">← กลับหน้าหลัก</a>
        </div>

        <h1 style="margin-top:16px; font-size:32px; font-weight:800; color:#111;">${escapeHtml(review.title)}</h1>
        
        <div style="display:flex; gap:16px; margin:12px 0; color:#4b5563; font-size:15px; flex-wrap:wrap;">
          <span>📍 ร้าน: <strong>${escapeHtml(review.restaurant)}</strong></span>
          <span>✍ ผู้เขียน: <strong>${escapeHtml(review.author_name || review.author || 'สมาชิก')}</strong></span>
        </div>

        <div class="stars" style="color:#f59e0b; font-size:22px; margin-bottom:16px;">
          ${renderStars(review.rating)} <span style="font-size:16px; color:#111; font-weight:bold;">(${review.rating}/5)</span>
        </div>

        <div style="margin:20px 0; border-radius:10px; overflow:hidden; border:2px solid #111;">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(review.title)}" style="width:100%; max-height:480px; object-fit:cover; display:block;">
        </div>

        ${review.location ? `<p style="background:#f3f4f6; padding:10px 14px; border-radius:8px; margin-bottom:16px; border:1px solid #ddd;">📍 พิกัดร้าน: ${escapeHtml(review.location)}</p>` : ''}

        <div style="font-size:17px; line-height:1.8; color:#1f2937; white-space:pre-line; margin:24px 0;">
          ${escapeHtml(review.body || '')}
        </div>

        <div class="review-card-actions" style="display:flex; gap:12px; border-top:2px solid #f3f4f6; padding-top:20px; margin-top:20px;">
          <button type="button" class="small-action ${review.liked ? 'is-active' : ''}" data-like="${review.id}">♥ ${Number(review.like_count || 0)} ถูกใจ</button>
          <button type="button" class="small-action ${review.favorited ? 'is-active' : ''}" data-favorite="${review.id}">${review.favorited ? '★ บันทึกแล้ว' : '☆ บันทึกรายการโปรด'}</button>
          <button type="button" class="small-action btn-danger" onclick="deleteReview('${review.id}')">🗑 ลบรีวิว</button>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Error fetching review detail:', err);
    container.innerHTML = `<p class="empty">ไม่สามารถโหลดข้อมูลได้ (${escapeHtml(err.message)})</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  
  if (getToken() && (location.pathname.includes('login') || location.pathname.includes('register'))) {
    window.location.replace('index.html');
    return;
  }

  if (location.pathname.includes('profile.html') || document.querySelector('#profile-container')) {
    renderProfilePage();
  }

  if (location.pathname.includes('review.html') || document.querySelector('#review-detail-container') || document.querySelector('#review-detail')) {
    renderDetailPage();
  }

  document.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('[data-like]');
    if (likeBtn) {
      e.preventDefault();
      const reviewId = likeBtn.dataset.like;
      handleLike(reviewId, likeBtn);
      return;
    }

    const favBtn = e.target.closest('[data-favorite]');
    if (favBtn) {
      e.preventDefault();
      const reviewId = favBtn.dataset.favorite;
      handleFavorite(reviewId, favBtn);
      return;
    }
  });

  const list = document.querySelector('#review-list') || document.querySelector('#explore-list') || document.querySelector('.review-grid');
  if (list && !location.pathname.includes('profile.html')) {
    const targetId = `#${list.id || 'review-list'}`;
    const sort = location.pathname.includes('trending') ? 'popular' : 'latest';
    const filterContainer = document.querySelector('#category-filter') || document.querySelector('.category-filter');
    let activeCategory = new URLSearchParams(location.search).get('category') || '';
    renderCards(targetId, '', sort, activeCategory);

    if (filterContainer) {
      filterContainer.querySelectorAll('.cat-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.category === activeCategory);
      });
      filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-btn') || e.target.closest('button');
        if (!btn) return;

        filterContainer.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        activeCategory = btn.dataset.category ?? btn.textContent.trim();
        if (activeCategory === 'ทั้งหมด') activeCategory = '';
        renderCards(targetId, searchInput?.value.trim() || '', sort, activeCategory);
      });
    }

    const searchInput = document.querySelector('input[placeholder*="ค้นหา"]') || document.querySelector('#search-input');
    const searchBtn = document.querySelector('#search-btn') || document.querySelector('.searchbar button');

    const performSearch = () => {
      const query = searchInput ? searchInput.value.trim() : '';
      renderCards(targetId, query, sort, activeCategory);
    };

    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) {
      searchInput.addEventListener('input', performSearch);
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          performSearch();
        }
      });
    }
  }

  const reviewForm = !window.pagesHandlesForms && document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault(); 
      if (!requireLogin()) return;

      const formDataRaw = new FormData(reviewForm);

      try {
        const token = getToken();
        const response = await axios.post(`${API}/api/reviews`, formDataRaw, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        alert(response.data.message || 'เผยแพร่รีวิวสำเร็จ!');
        window.location.replace('index.html'); 
      } catch (err) {
        console.error('Error submitting review:', err);
        const errorMsg = err.response?.data?.error || err.response?.data?.message || 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
        alert('เกิดข้อผิดพลาด: ' + errorMsg);
      }
    });
  }
});