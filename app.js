/* =====================================================
   ShopLens — app.js
   Hash-based routing: #/  → catalog, #/product/:id → detail
   ===================================================== */

const API = 'https://dummyjson.com';
const PAGE_SIZE = 20;

// ── State ──────────────────────────────────────────────
const state = {
  products: [],
  filtered:  [],
  categories: [],
  activeCategory: 'all',
  searchQuery: '',
  skip: 0,
  total: 0,
  loading: false,
};

// ── DOM refs ───────────────────────────────────────────
const $catalogPage  = document.getElementById('page-catalog');
const $detailPage   = document.getElementById('page-detail');
const $grid         = document.getElementById('products-grid');
const $loadMoreBtn  = document.getElementById('load-more-btn');
const $countLabel   = document.getElementById('count-label');
const $loadingOverlay = document.getElementById('loading-overlay');
const $detailContent  = document.getElementById('detail-content');
const $detailLoading  = document.getElementById('detail-loading');
const $categoryBar    = document.querySelector('.category-bar');
const $searchInput    = document.getElementById('search-input');
const $backBtn        = document.getElementById('back-btn');

// ── Router ─────────────────────────────────────────────
function router() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/product/')) {
    const id = parseInt(hash.split('/')[2], 10);
    showDetailPage(id);
  } else {
    showCatalogPage();
  }
}

function navigate(path) {
  location.hash = path;
}

// ── Catalog Page ───────────────────────────────────────
function showCatalogPage() {
  $detailPage.classList.remove('active');
  $catalogPage.classList.add('active');
  document.title = 'ShopLens — Product Catalog';

  if (state.products.length === 0) {
    fetchProducts(true);
  }
}

async function fetchProducts(initial = false) {
  if (state.loading) return;
  state.loading = true;
  toggleCatalogLoading(true);

  try {
    const res = await fetch(`${API}/products?limit=${PAGE_SIZE}&skip=${state.skip}`);
    const data = await res.json();

    state.total = data.total;
    state.skip += data.products.length;
    state.products = [...state.products, ...data.products];

    // Collect categories
    data.products.forEach(p => {
      if (!state.categories.includes(p.category)) {
        state.categories.push(p.category);
      }
    });
    renderCategoryBar();
    applyFilters();
  } catch (err) {
    console.error('Failed to fetch products', err);
  } finally {
    state.loading = false;
    toggleCatalogLoading(false);
  }
}

function applyFilters() {
  const q = state.searchQuery.toLowerCase().trim();
  state.filtered = state.products.filter(p => {
    const matchCat = state.activeCategory === 'all' || p.category === state.activeCategory;
    const matchQ   = !q || p.title.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
    return matchCat && matchQ;
  });
  renderGrid();
  updateLoadMore();
}

function renderGrid(append = false) {
  if (!append) $grid.innerHTML = '';

  if (state.filtered.length === 0) {
    $grid.innerHTML = `
      <div class="no-results">
        <h2>Nothing found.</h2>
        <p>Try a different search or category.</p>
      </div>`;
    return;
  }

  state.filtered.forEach((p, i) => {
    const existing = $grid.querySelector(`[data-id="${p.id}"]`);
    if (existing) return; // avoid duplicates

    const card = createCard(p, i);
    $grid.appendChild(card);
  });
}

function createCard(p, animIndex = 0) {
  const originalPrice = p.discountPercentage > 0
    ? (p.price / (1 - p.discountPercentage / 100)).toFixed(2)
    : null;

  const badge = getBadge(p.availabilityStatus, p.discountPercentage);

  const el = document.createElement('div');
  el.className = 'product-card';
  el.dataset.id = p.id;
  el.style.animationDelay = `${Math.min(animIndex * 40, 400)}ms`;

  el.innerHTML = `
    <div class="card-img-wrap">
      <img src="${p.thumbnail}" alt="${esc(p.title)}" loading="lazy" />
      ${badge}
    </div>
    <div class="card-body">
      <p class="card-category">${esc(p.category)}</p>
      <h2 class="card-title">${esc(p.title)}</h2>
      <p class="card-brand">${esc(p.brand || '')}</p>
      <div class="card-footer">
        <div class="card-price">
          ${originalPrice ? `<span class="original">$${originalPrice}</span>` : ''}
          $${p.price.toFixed(2)}
        </div>
        <div class="card-rating">
          <span class="star-icon">★</span>
          ${p.rating.toFixed(1)}
        </div>
      </div>
    </div>
  `;

  el.addEventListener('click', () => navigate(`#/product/${p.id}`));
  return el;
}

function getBadge(status, discount) {
  if (!status) return '';
  const s = status.toLowerCase();
  let cls = '';
  if (s.includes('low')) cls = 'low';
  else if (s.includes('out')) cls = 'out';
  else if (discount > 10) cls = 'sale';
  return `<span class="card-badge ${cls}">${status}</span>`;
}

function renderCategoryBar() {
  // Clear existing except "All"
  [...$categoryBar.querySelectorAll('.cat-btn')].slice(1).forEach(b => b.remove());

  state.categories.sort().forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.dataset.cat = cat;
    btn.textContent = cat.replace(/-/g, ' ');
    if (cat === state.activeCategory) btn.classList.add('active');
    btn.addEventListener('click', () => setCategory(cat));
    $categoryBar.appendChild(btn);
  });
}

function setCategory(cat) {
  state.activeCategory = cat;
  $categoryBar.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  $grid.innerHTML = '';
  applyFilters();
}

function updateLoadMore() {
  const showing = state.filtered.length;
  const canLoadMore = state.skip < state.total;

  $countLabel.textContent = `Showing ${showing} of ${state.total} products`;
  $loadMoreBtn.disabled = !canLoadMore || state.loading;
  $loadMoreBtn.textContent = canLoadMore ? 'Load more products' : 'All products loaded';
}

function toggleCatalogLoading(show) {
  $loadingOverlay.classList.toggle('visible', show);
}

// ── Detail Page ────────────────────────────────────────
async function showDetailPage(id) {
  $catalogPage.classList.remove('active');
  $detailPage.classList.add('active');
  $detailContent.innerHTML = '';
  $detailLoading.classList.add('visible');

  try {
    // Check cache first
    let product = state.products.find(p => p.id === id);
    if (!product) {
      const res = await fetch(`${API}/products/${id}`);
      product = await res.json();
    }
    document.title = `ShopLens — ${product.title}`;
    renderDetailPage(product);
  } catch (err) {
    $detailContent.innerHTML = `<p style="padding:40px;color:var(--red)">Failed to load product. Please go back and try again.</p>`;
  } finally {
    $detailLoading.classList.remove('visible');
  }
}

function renderDetailPage(p) {
  const originalPrice = p.discountPercentage > 0
    ? (p.price / (1 - p.discountPercentage / 100)).toFixed(2)
    : null;

  const stars = renderStars(p.rating);
  const images = p.images?.length ? p.images : [p.thumbnail];
  const mainImg = images[0];

  const thumbsHtml = images.map((img, i) => `
    <div class="thumb ${i === 0 ? 'active' : ''}" data-img="${esc(img)}" data-idx="${i}">
      <img src="${esc(img)}" alt="View ${i + 1}" loading="lazy" />
    </div>
  `).join('');

  const specsHtml = buildSpecs(p);
  const reviewsHtml = (p.reviews || []).map(r => `
    <div class="review-card">
      <div class="review-header">
        <span class="reviewer-name">${esc(r.reviewerName)}</span>
        <span class="review-date">${formatDate(r.date)}</span>
      </div>
      <div class="review-stars">${renderStars(r.rating)}</div>
      <p class="review-comment">${esc(r.comment)}</p>
    </div>
  `).join('');

  const avail = p.availabilityStatus || 'In Stock';
  const availClass = avail.toLowerCase().includes('low') ? 'low' : avail.toLowerCase().includes('out') ? 'out' : '';

  $detailContent.innerHTML = `
    <div class="detail-grid">

      <!-- ── Gallery ── -->
      <div class="gallery">
        <div class="gallery-main">
          <img id="main-img" src="${esc(mainImg)}" alt="${esc(p.title)}" />
        </div>
        ${images.length > 1 ? `<div class="gallery-thumbs">${thumbsHtml}</div>` : ''}
      </div>

      <!-- ── Info ── -->
      <div class="detail-info">
        <div class="detail-eyebrow">
          <span class="detail-category">${esc(p.category)}</span>
          <span class="detail-sku">SKU: ${esc(p.sku || '—')}</span>
        </div>

        <h1 class="detail-title">${esc(p.title)}</h1>
        <p class="detail-brand">By <strong>${esc(p.brand || 'Unknown')}</strong></p>

        <div class="rating-row">
          <span class="stars">${stars}</span>
          <span class="rating-num">${p.rating.toFixed(2)}</span>
          <span class="rating-count">(${(p.reviews || []).length} reviews)</span>
        </div>

        <div class="price-block">
          ${originalPrice ? `<span class="price-original">$${originalPrice}</span>` : ''}
          <span class="price-now">$${p.price.toFixed(2)}</span>
          ${p.discountPercentage > 0 ? `<span class="price-discount">−${p.discountPercentage.toFixed(1)}%</span>` : ''}
        </div>

        <p class="detail-desc">${esc(p.description)}</p>

        <div class="tags-row">
          ${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>

        <div class="availability">
          <span class="avail-dot ${availClass}"></span>
          ${esc(avail)} &nbsp;·&nbsp; ${p.stock} in stock
        </div>

        <div class="specs-grid">${specsHtml}</div>

        <div class="cta-row">
          <button class="btn-primary" onclick="alert('Added to cart! (demo)')">Add to Cart</button>
          <button class="btn-secondary" onclick="alert('Saved to wishlist! (demo)')">♡ Save</button>
        </div>

        <hr class="section-divider" />

        <h2 class="section-heading">Customer Reviews</h2>
        <div class="reviews-list">
          ${reviewsHtml || '<p style="color:var(--ink-light);font-size:.88rem">No reviews yet.</p>'}
        </div>

      </div>
    </div>
  `;

  // Thumb click → swap main image
  $detailContent.querySelectorAll('.thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const img = thumb.dataset.img;
      document.getElementById('main-img').src = img;
      $detailContent.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  window.scrollTo({ top: 0, behavior: 'instant' });
}

function buildSpecs(p) {
  const items = [
    ['Weight', p.weight ? `${p.weight} g` : null],
    ['Dimensions', p.dimensions ? `${p.dimensions.width}×${p.dimensions.height}×${p.dimensions.depth} cm` : null],
    ['Min. Order',  p.minimumOrderQuantity ? `${p.minimumOrderQuantity} units` : null],
    ['Warranty',    p.warrantyInformation || null],
    ['Shipping',    p.shippingInformation || null],
    ['Return',      p.returnPolicy || null],
  ].filter(([, v]) => v);

  return items.map(([label, value]) => `
    <div class="spec-item">
      <p class="spec-label">${label}</p>
      <p class="spec-value">${esc(value)}</p>
    </div>
  `).join('');
}

function renderStars(rating) {
  const full  = Math.round(rating);
  const stars = [];
  for (let i = 1; i <= 5; i++) stars.push(i <= full ? '★' : '☆');
  return stars.join('');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event Listeners ────────────────────────────────────
$loadMoreBtn.addEventListener('click', () => fetchProducts(false));

$searchInput.addEventListener('input', () => {
  state.searchQuery = $searchInput.value;
  $grid.innerHTML = '';
  applyFilters();
});

$categoryBar.querySelector('[data-cat="all"]').addEventListener('click', () => setCategory('all'));

$backBtn.addEventListener('click', () => navigate('#/'));

window.addEventListener('hashchange', router);

// ── Init ───────────────────────────────────────────────
router();
