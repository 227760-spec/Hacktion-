const PAGE_SIZE = 20;

let products = [];
let filteredProducts = [];
let categories = [];
let activeCategory = "all";
let searchQuery = "";
let skip = 0;
let total = 0;
let loading = false;

const productsGrid = document.getElementById("products-grid");
const loadMoreBtn = document.getElementById("load-more-btn");
const countLabel = document.getElementById("count-label");
const searchInput = document.getElementById("search-input");
const categoryBar = document.querySelector(".category-bar");
const loadingOverlay = document.getElementById("loading-overlay");

async function fetchProducts() {
  if (loading) return;

  loading = true;
  loadingOverlay.classList.add("visible");

  try {
    const data = await getProducts(PAGE_SIZE, skip);

    total = data.total;
    skip += data.products.length;
    products = [...products, ...data.products];

    data.products.forEach(product => {
      if (!categories.includes(product.category)) {
        categories.push(product.category);
      }
    });

    renderCategories();
    applyFilters();
  } catch (error) {
    console.error("Failed to fetch products", error);
  } finally {
    loading = false;
    loadingOverlay.classList.remove("visible");
  }
}

function applyFilters() {
  const query = searchQuery.toLowerCase().trim();

  filteredProducts = products.filter(product => {
    const matchCategory =
      activeCategory === "all" || product.category === activeCategory;

    const matchSearch =
      !query ||
      product.title.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.brand?.toLowerCase().includes(query);

    return matchCategory && matchSearch;
  });

  renderProducts();
  updateLoadMore();
}

function renderProducts() {
  productsGrid.innerHTML = "";

  if (filteredProducts.length === 0) {
    productsGrid.innerHTML = `
      <div class="no-results">
        <h2>Nothing found</h2>
        <p>Try another search or category.</p>
      </div>
    `;
    return;
  }

  filteredProducts.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";

    card.innerHTML = `
      <img src="${product.thumbnail}" alt="${product.title}">
      <h3>${product.title}</h3>
      <p>${product.brand || ""}</p>
      <p>${product.category}</p>
      <strong>$${product.price}</strong>
    `;

    card.addEventListener("click", () => {
      window.location.href = `product-page.html?id=${product.id}`;
    });

    productsGrid.appendChild(card);
  });
}

function renderCategories() {
  const oldButtons = categoryBar.querySelectorAll(".cat-btn:not([data-cat='all'])");
  oldButtons.forEach(button => button.remove());

  categories.sort().forEach(category => {
    const button = document.createElement("button");
    button.className = "cat-btn";
    button.dataset.cat = category;
    button.textContent = category;

    button.addEventListener("click", () => {
      setCategory(category);
    });

    categoryBar.appendChild(button);
  });
}

function setCategory(category) {
  activeCategory = category;

  document.querySelectorAll(".cat-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.cat === category);
  });

  applyFilters();
}

function updateLoadMore() {
  countLabel.textContent = `Showing ${filteredProducts.length} of ${total} products`;

  if (skip >= total) {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "All products loaded";
  } else {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = "Load more products";
  }
}

loadMoreBtn.addEventListener("click", fetchProducts);

searchInput.addEventListener("input", () => {
  searchQuery = searchInput.value;
  applyFilters();
});

categoryBar.querySelector("[data-cat='all']").addEventListener("click", () => {
  setCategory("all");
});

fetchProducts();