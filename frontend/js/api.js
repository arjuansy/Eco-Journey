window.API = {
  base: "http://localhost:3000/api",
  async request(path, options = {}) {
    const token = localStorage.getItem("eco_token");
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const response = await fetch(`${this.base}${path}`, { ...options, headers });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Permintaan gagal");
    return data;
  }
};
