const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const TOKEN_KEY = "paisa_plan_token";
const USER_KEY = "paisa_plan_user";

async function request(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    const error = new Error("Could not connect to the API. Check that Spring Boot is running.");
    error.status = 0;
    throw error;
  }
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch { /* response may not contain JSON */ }
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function authRequest(path, credentials) {
  return request(path, { method: "POST", body: JSON.stringify(credentials) });
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: "PUT", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
  login: (credentials) => authRequest("/auth/login", credentials),
  register: (details) => authRequest("/auth/register", details),
};

export const session = {
  get() {
    try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); }
    catch { return null; }
  },
  save(response) {
    const token = response?.token || response?.accessToken || response?.jwt;
    const user = response?.user || response?.profile || response;
    if (token) localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
