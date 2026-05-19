const API = "https://dummyjson.com";

async function getProducts(limit = 20, skip = 0) {
  const response = await fetch(`${API}/products?limit=${limit}&skip=${skip}`);
  return response.json();
}

async function getProductById(id) {
  const response = await fetch(`${API}/products/${id}`);
  return response.json();
}
