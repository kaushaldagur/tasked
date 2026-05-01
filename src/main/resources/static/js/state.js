export const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

export const state = {
  session: {
    token: localStorage.getItem("token"),
    user: JSON.parse(localStorage.getItem("user") || "null")
  },
  entities: {
    users: [],
    teams: [],
    projects: [],
    tasks: [],
    dashboard: null
  },
  ui: {
    activeView: "projects",
    selectedProjectId: null,
    projectDetailOpen: false,
    selectedTaskIds: new Set(),
    theme: localStorage.getItem("theme") || "light",
    taskFilters: {
      search: "",
      status: "ALL",
      projectId: "ALL",
      priority: "ALL",
      sortBy: "deadline"
    }
  }
};
