const detailContent = document.getElementById("detail-content");
const detailLoading = document.getElementById("detail-loading");

function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function loadProductDetails() {
  const id = getProductIdFromUrl();

  if (!id) {
    detailContent.innerHTML = "<p>No product selected.</p>";
    return;
  }

  detailLoading.classList.add("visible");

  try {
    const product = await getProductById(id);
    renderProductDetails(product);
  } catch (error) {
    detailContent.innerHTML = "<p>Failed to load product.</p>";
  } finally {
    detailLoading.classList.remove("visible");
  }
}

function renderProductDetails(product) {
  detailContent.innerHTML = `
    <section class="detail-grid">
      <div class="gallery">
        <img 
          id="main-img" 
          src="${product.thumbnail}" 
          alt="${product.title}"
        >
      </div>

      <div class="detail-info">
        <p>${product.category}</p>
        <h2>${product.title}</h2>
        <p>Brand: ${product.brand || "Unknown"}</p>
        <p>${product.description}</p>
        <h3>$${product.price}</h3>
        <p>Rating: ${product.rating}</p>
        <p>Stock: ${product.stock}</p>

        <button>Add to Cart</button>
      </div>
    </section>
  `;
}

loadProductDetails();