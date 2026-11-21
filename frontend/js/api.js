const isLocalApiHost = ["localhost", "127.0.0.1"].includes(location.hostname);
const configuredApiBase = window.ECO_API_BASE || (
  isLocalApiHost && location.port && location.port !== "3000"
    ? `${location.protocol}//${location.hostname}:3000/api`
    : "/api"
);

window.API = {
  base: configuredApiBase.replace(/\/+$/, ""),
  async request(path, options = {}) {
    const token = localStorage.getItem("eco_token");
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let response;
    try {
      response = await fetch(`${this.base}${path}`, { ...options, headers, signal: options.signal || controller.signal });
    } catch (error) {
      if (error.name === "AbortError") throw new Error("Permintaan ke server melewati batas waktu. Silakan coba lagi.");
      throw new Error("Tidak dapat menghubungi API. Periksa deployment API dan koneksi jaringan.");
    } finally {
      clearTimeout(timeoutId);
    }
    const responseText = await response.text();
    let data = null;
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }
    }
    if (!response.ok) throw new Error(data?.message || `Permintaan gagal (${response.status})`);
    return data;
  }
};
