export function createApi(getToken) {
  async function request(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
  }

  return {
    request,
    login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
    signup: (payload) => request("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
    loadAll: () => Promise.all([
      request("/api/dashboard"),
      request("/api/auth/users"),
      request("/api/teams"),
      request("/api/projects"),
      request("/api/tasks")
    ]),
    saveProject: (id, payload) => request(id ? `/api/projects/${id}` : "/api/projects", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }),
    deleteProject: (id) => request(`/api/projects/${id}`, { method: "DELETE" }),
    saveTeam: (id, payload) => request(id ? `/api/teams/${id}` : "/api/teams", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }),
    deleteTeam: (id) => request(`/api/teams/${id}`, { method: "DELETE" }),
    saveTask: (id, payload) => request(id ? `/api/tasks/${id}` : "/api/tasks", { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }),
    deleteTask: (id) => request(`/api/tasks/${id}`, { method: "DELETE" }),
    patchTaskStatus: (id, status) => request(`/api/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) })
  };
}
