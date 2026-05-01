import { state, PRIORITY_ORDER } from "./state.js";
import { $, $$, escapeHtml, formJson, selectedValues, todayIsoDate } from "./utils.js";
import { createApi } from "./services/api.js";
import { getTaskMeta, saveTaskMeta, removeMissingTaskMeta } from "./services/task-meta.js";

const api = createApi(() => state.session.token);

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function isAdmin() {
  return state.session.user?.role === "ADMIN";
}

function isProjectLeader(project) {
  return Boolean(project?.team?.leader?.id && state.session.user?.id === project.team.leader.id);
}

function canManageProjectTasks(project) {
  return isAdmin() || isProjectLeader(project);
}

function canManageTask(task) {
  return canManageProjectTasks(task.project);
}

function canOpenPrimaryAction() {
  if (state.ui.activeView === "tasks") {
    return isAdmin() || state.entities.projects.some(isProjectLeader);
  }
  return isAdmin();
}

function persistAuth(auth) {
  state.session.token = auth.token;
  state.session.user = auth.user;
  localStorage.setItem("token", auth.token);
  localStorage.setItem("user", JSON.stringify(auth.user));
}

function clearAuth() {
  state.session.token = null;
  state.session.user = null;
  state.entities = { users: [], teams: [], projects: [], tasks: [], dashboard: null };
  state.ui.selectedTaskIds.clear();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

function applyTheme() {
  document.documentElement.dataset.theme = state.ui.theme;
  $("#themeToggle").textContent = state.ui.theme === "dark" ? "Use light mode" : "Use dark mode";
}

function toggleAuth(mode) {
  $("#loginTab").classList.toggle("active", mode === "login");
  $("#signupTab").classList.toggle("active", mode === "signup");
  $("#loginForm").classList.toggle("hidden", mode !== "login");
  $("#signupForm").classList.toggle("hidden", mode !== "signup");
}

function setView(view) {
  state.ui.activeView = view;
  $$(".view").forEach((el) => el.classList.add("hidden"));
  $(`#${view}View`).classList.remove("hidden");
  $$(".nav-button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const titles = {
    dashboard: ["Home", "Command center"],
    projects: ["Projects", "Project navigator"],
    tasks: ["Queue", "Task pipeline"],
    team: ["People", "Team workspace"]
  };
  $("#viewEyebrow").textContent = titles[view][0];
  $("#viewTitle").textContent = titles[view][1];
  $("#primaryAction").classList.toggle("hidden", !canOpenPrimaryAction());
  $("#primaryAction").textContent = view === "tasks" ? "New task" : view === "team" ? "New team" : "New project";
}

function renderShell() {
  const loggedIn = Boolean(state.session.token && state.session.user);
  $("#authView").classList.toggle("hidden", loggedIn);
  $("#appView").classList.toggle("hidden", !loggedIn);
  if (!loggedIn) return;

  $("#welcomeTitle").textContent = state.session.user.name;
  $("#rolePill").textContent = state.session.user.role;
  $("#projectAccess").textContent = isAdmin() ? "Open a project to update scope, people, and tasks" : "Projects you are currently mapped to";
  $("#taskAccess").textContent = isAdmin() ? "All tasks in this workspace" : "Tasks assigned to your account";
  setView(state.ui.activeView);
}

function projectTasks(projectId) {
  return state.entities.tasks.filter((task) => task.project?.id === projectId);
}

function projectProgress(projectId) {
  const tasks = projectTasks(projectId);
  if (!tasks.length) return { total: 0, done: 0, percent: 0 };
  const done = tasks.filter((task) => task.status === "DONE").length;
  return { total: tasks.length, done, percent: Math.round((done / tasks.length) * 100) };
}

function taskPriority(task) {
  return getTaskMeta(task.id).priority;
}

function taskTags(task) {
  return getTaskMeta(task.id).tags || [];
}

function renderStats() {
  const dashboard = state.entities.dashboard || { projects: 0, tasks: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 };
  const items = [
    ["Projects", dashboard.projects],
    ["Tasks", dashboard.tasks],
    ["To do", dashboard.todo],
    ["In progress", dashboard.inProgress],
    ["Done", dashboard.done],
    ["Overdue", dashboard.overdue]
  ];
  $("#stats").innerHTML = items.map(([label, value]) => `
    <article class="stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `).join("");
}

function renderAnalytics() {
  const container = $("#analyticsGrid");
  if (!container) return;
  const list = state.entities.tasks;
  const statusTotals = {
    TODO: list.filter((task) => task.status === "TODO").length,
    IN_PROGRESS: list.filter((task) => task.status === "IN_PROGRESS").length,
    DONE: list.filter((task) => task.status === "DONE").length
  };
  const priorityTotals = {
    HIGH: list.filter((task) => taskPriority(task) === "HIGH").length,
    MEDIUM: list.filter((task) => taskPriority(task) === "MEDIUM").length,
    LOW: list.filter((task) => taskPriority(task) === "LOW").length
  };
  const cards = [
    ["TODO tasks", statusTotals.TODO],
    ["In progress tasks", statusTotals.IN_PROGRESS],
    ["Completed tasks", statusTotals.DONE],
    ["High priority", priorityTotals.HIGH],
    ["Medium priority", priorityTotals.MEDIUM],
    ["Low priority", priorityTotals.LOW]
  ];
  container.innerHTML = cards.map(([label, count]) => `
    <article class="stat">
      <span>${label}</span>
      <strong>${count}</strong>
    </article>
  `).join("");
}

function renderProgress() {
  const totalTasks = state.entities.tasks.length;
  const doneTasks = state.entities.tasks.filter((task) => task.status === "DONE").length;
  const overall = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  $("#overallProgressLabel").textContent = `${overall}% complete`;
  $("#overallProgressBar").style.width = `${overall}%`;

  $("#progressList").innerHTML = state.entities.projects.length ? state.entities.projects.map((project) => {
    const progress = projectProgress(project.id);
    return `
      <button class="project-row" data-project-id="${project.id}" type="button">
        <span>
          <strong>${escapeHtml(project.name)}</strong>
          <small>${progress.done}/${progress.total} tasks complete</small>
        </span>
        <span class="progress-mini"><i style="width:${progress.percent}%"></i></span>
        <b>${progress.percent}%</b>
      </button>
    `;
  }).join("") : emptyState("No projects yet", "Create a project and add tasks to see progress.");
}

function renderDashboardTasks() {
  const sorted = [...state.entities.tasks].sort((a, b) => (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31")).slice(0, 6);
  $("#dashboardTaskList").innerHTML = sorted.length ? sorted.map(taskCard).join("") : emptyState("No tasks to track", "Assigned tasks and overdue work will appear here.");
}

function renderUsersAndProjects() {
  const members = state.entities.users.filter((user) => user.role === "MEMBER");
  $("#projectMembers").innerHTML = members.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`).join("");
  $("#projectTeam").innerHTML = `<option value="">No team</option>` + state.entities.teams.map((team) => `<option value="${team.id}">${escapeHtml(team.name)}</option>`).join("");
  $("#teamLeader").innerHTML = `<option value="">No leader</option>` + members.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("");
  $("#teamMembers").innerHTML = members.map((user) => `<option value="${user.id}">${escapeHtml(user.name)} (${escapeHtml(user.email)})</option>`).join("");
  $("#taskProject").innerHTML = state.entities.projects.length ? state.entities.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("") : `<option value="">Create a project first</option>`;
  const filter = $("#taskProjectFilter");
  if (filter) {
    filter.innerHTML = `<option value="ALL">All projects</option>` + state.entities.projects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("");
    filter.value = state.ui.taskFilters.projectId;
  }
  updateTaskAssigneeOptions();
}

function renderTeam() {
  $("#teamList").innerHTML = state.entities.teams.length ? state.entities.teams.map((team) => `
    <article class="team-card">
      <div>
        <strong>${escapeHtml(team.name)}</strong>
        <span>${escapeHtml(team.description || "No description added")}</span>
        <span>Leader: ${escapeHtml(team.leader?.name || "Not assigned")}</span>
        <span>${(team.members || []).length} members</span>
      </div>
      ${isAdmin() ? `<span class="actions"><button class="ghost small" data-edit-team="${team.id}" type="button">Edit</button><button class="danger small" data-delete-team="${team.id}" type="button">Delete</button></span>` : ""}
    </article>
  `).join("") : emptyState("No teams yet", isAdmin() ? "Create teams, choose members, and assign a leader." : "You have not been added to a team yet.");

  $("#userList").innerHTML = state.entities.users.length ? state.entities.users.map((user) => `
    <article class="team-card">
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${escapeHtml(user.email)}</span>
      </div>
      <span class="badge">${user.role}</span>
    </article>
  `).join("") : emptyState("No users yet", "Members can signup from the auth screen.");
}

function renderProjects() {
  if (!state.ui.selectedProjectId && state.entities.projects.length) {
    state.ui.selectedProjectId = state.entities.projects[0].id;
  }
  if (state.ui.selectedProjectId && !state.entities.projects.some((project) => project.id === state.ui.selectedProjectId)) {
    state.ui.selectedProjectId = state.entities.projects[0]?.id || null;
  }

  $("#projectList").innerHTML = state.entities.projects.length ? state.entities.projects.map((project) => {
    const progress = projectProgress(project.id);
    return `
      <button class="project-card ${project.id === state.ui.selectedProjectId ? "selected" : ""}" data-project-id="${project.id}" type="button">
        <span>
          <strong>${escapeHtml(project.name)}</strong>
          <small>${escapeHtml(project.team?.name || "No team")} · ${(project.members || []).length} members · ${progress.total} tasks</small>
        </span>
        <span class="progress-track"><i style="width:${progress.percent}%"></i></span>
      </button>
    `;
  }).join("") : emptyState("No projects yet", isAdmin() ? "Use New project to create one." : "You have not been added to a project yet.");
  renderProjectDetail();
}

function renderProjectDetail() {
  const project = state.entities.projects.find((item) => item.id === state.ui.selectedProjectId);
  if (!project) {
    $("#projectDetail").innerHTML = emptyState("Select a project", "Project info, members, tasks, and completion will show here.");
    return;
  }
  const progress = projectProgress(project.id);
  const tasks = projectTasks(project.id);
  $("#projectDetail").innerHTML = `
    <div class="detail-head">
      <div>
        <h3>${escapeHtml(project.name)}</h3>
        <p>${escapeHtml(project.description || "No description added")}</p>
        <p class="meta">Team: ${escapeHtml(project.team?.name || "No team assigned")}${project.team?.leader ? ` · Leader: ${escapeHtml(project.team.leader.name)}` : ""}</p>
      </div>
      ${isAdmin() ? `<div class="actions"><button class="ghost" data-edit-project="${project.id}" type="button">Edit</button><button class="danger" data-delete-project="${project.id}" type="button">Delete</button></div>` : ""}
    </div>
    <div class="completion">
      <div class="row"><strong>Completion</strong><span>${progress.done}/${progress.total} tasks done · ${progress.percent}%</span></div>
      <div class="progress-track"><i style="width:${progress.percent}%"></i></div>
    </div>
    <div class="section-title">Members</div>
    <div class="chip-row">${(project.members || []).map((member) => `<span class="chip">${escapeHtml(member.name)}</span>`).join("") || `<span class="meta">No members</span>`}</div>
    <div class="section-title">Project tasks</div>
    <div class="list">${tasks.length ? tasks.map(taskCard).join("") : emptyState("No tasks for this project", isAdmin() ? "Create a task and assign it to a member." : "No assigned work yet.")}</div>
  `;
}

function getFilteredTasks() {
  const { search, status, projectId, priority, sortBy } = state.ui.taskFilters;
  const lower = search.trim().toLowerCase();
  let filtered = [...state.entities.tasks];

  if (lower) {
    filtered = filtered.filter((task) => {
      const haystack = [
        task.title,
        task.description,
        task.project?.name,
        task.assignedTo?.name,
        taskTags(task).join(",")
      ].join(" ").toLowerCase();
      return haystack.includes(lower);
    });
  }
  if (status !== "ALL") filtered = filtered.filter((task) => task.status === status);
  if (projectId !== "ALL") filtered = filtered.filter((task) => String(task.project?.id) === String(projectId));
  if (priority !== "ALL") filtered = filtered.filter((task) => taskPriority(task) === priority);

  const statusRank = { TODO: 0, IN_PROGRESS: 1, DONE: 2 };
  filtered.sort((a, b) => {
    if (sortBy === "priority") return PRIORITY_ORDER[taskPriority(a)] - PRIORITY_ORDER[taskPriority(b)];
    if (sortBy === "status") return statusRank[a.status] - statusRank[b.status];
    if (sortBy === "title") return a.title.localeCompare(b.title);
    return (a.deadline || "9999-12-31").localeCompare(b.deadline || "9999-12-31");
  });
  return filtered;
}

function renderTasks() {
  const tasks = getFilteredTasks();
  if (!tasks.length) {
    $("#taskList").innerHTML = emptyState("No matching tasks", "Try clearing filters or create new tasks.");
    return;
  }
  const columns = [
    ["TODO", "To do"],
    ["IN_PROGRESS", "In progress"],
    ["DONE", "Done"]
  ];
  $("#taskList").innerHTML = columns.map(([status, label]) => {
    const bucket = tasks.filter((task) => task.status === status);
    return `
      <section class="kanban-column">
        <header>
          <h4>${label}</h4>
          <span>${bucket.length}</span>
        </header>
        <div class="kanban-cards">
          ${bucket.length ? bucket.map(taskCard).join("") : `<div class="empty-state"><span>No tasks</span></div>`}
        </div>
      </section>
    `;
  }).join("");
}

function taskCard(task) {
  const overdue = task.deadline && task.deadline < todayIsoDate() && task.status !== "DONE";
  const statusClass = task.status === "DONE" ? "done" : overdue ? "warn" : "";
  const canManage = canManageTask(task);
  const meta = getTaskMeta(task.id);
  const priorityClass = meta.priority === "HIGH" ? "warn" : meta.priority === "LOW" ? "" : "done";

  return `
    <article class="task-card">
      <div class="task-card-top">
        <div class="task-card-main">
          <strong>${escapeHtml(task.title)}</strong>
          <p>${escapeHtml(task.description || "No description added")}</p>
        </div>
        <span class="badge ${statusClass}">${task.status.replace("_", " ")}</span>
      </div>
      <div class="task-card-footer">
        <div class="task-meta">
          <span>${escapeHtml(task.project?.name || "No project")}</span>
          <span>${escapeHtml(task.assignedTo?.name || "Unassigned")}</span>
          <span>Due ${task.deadline || "not set"}</span>
          <span class="badge ${priorityClass}">Priority: ${meta.priority}</span>
        </div>
        <div class="task-actions">
          <select class="status-select" data-task-id="${task.id}">
            ${["TODO", "IN_PROGRESS", "DONE"].map((status) => `<option value="${status}" ${task.status === status ? "selected" : ""}>${status.replace("_", " ")}</option>`).join("")}
          </select>
          ${canManage ? `<button class="ghost small" data-edit-task="${task.id}" type="button">Edit</button><button class="danger small" data-delete-task="${task.id}" type="button">Delete</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function emptyState(title, message) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span></div>`;
}

function renderAll() {
  applyTheme();
  renderShell();
  if (!state.session.token) return;
  renderStats();
  renderAnalytics();
  renderProgress();
  renderDashboardTasks();
  renderUsersAndProjects();
  renderTeam();
  renderProjects();
  renderTasks();
}

async function refresh() {
  if (!state.session.token) {
    renderAll();
    return;
  }
  try {
    const [dashboard, users, teams, projects, tasks] = await api.loadAll();
    state.entities.dashboard = dashboard;
    state.entities.users = users;
    state.entities.teams = teams;
    state.entities.projects = projects;
    state.entities.tasks = tasks;
    removeMissingTaskMeta(tasks.map((task) => task.id));
    state.ui.selectedTaskIds.forEach((id) => {
      if (!tasks.some((task) => task.id === id)) state.ui.selectedTaskIds.delete(id);
    });
    renderAll();
  } catch (error) {
    clearAuth();
    renderAll();
    showToast("Please log in again.");
  }
}

function openProjectDialog(project = null) {
  if (!isAdmin()) return;
  $("#projectForm").reset();
  $("#projectFormTitle").textContent = project ? "Edit project" : "Create project";
  $("#projectForm").elements.id.value = project?.id || "";
  $("#projectForm").elements.name.value = project?.name || "";
  $("#projectForm").elements.description.value = project?.description || "";
  $("#projectForm").elements.teamId.value = project?.team?.id || "";
  const memberIds = new Set((project?.members || []).map((member) => String(member.id)));
  Array.from($("#projectMembers").options).forEach((option) => {
    option.selected = memberIds.has(option.value);
  });
  $("#projectDialog").classList.remove("hidden");
}

function openTeamDialog(team = null) {
  if (!isAdmin()) return;
  $("#teamForm").reset();
  $("#teamFormTitle").textContent = team ? "Edit team" : "Create team";
  $("#teamForm").elements.id.value = team?.id || "";
  $("#teamForm").elements.name.value = team?.name || "";
  $("#teamForm").elements.description.value = team?.description || "";
  $("#teamForm").elements.leaderId.value = team?.leader?.id || "";
  const memberIds = new Set((team?.members || []).map((member) => String(member.id)));
  Array.from($("#teamMembers").options).forEach((option) => {
    option.selected = memberIds.has(option.value);
  });
  $("#teamDialog").classList.remove("hidden");
}

function openTaskDialog(task = null) {
  const manageableProjects = state.entities.projects.filter(canManageProjectTasks);
  if (!manageableProjects.length) {
    showToast("Create a project before adding tasks.");
    return;
  }
  const taskProject = task?.project || manageableProjects.find((project) => project.id === state.ui.selectedProjectId) || manageableProjects[0];
  const meta = task ? getTaskMeta(task.id) : { priority: "MEDIUM", tags: [] };
  $("#taskForm").reset();
  $("#taskFormTitle").textContent = task ? "Edit task" : "Create task";
  $("#taskProject").innerHTML = manageableProjects.map((project) => `<option value="${project.id}">${escapeHtml(project.name)}</option>`).join("");
  $("#taskForm").elements.id.value = task?.id || "";
  $("#taskForm").elements.title.value = task?.title || "";
  $("#taskForm").elements.description.value = task?.description || "";
  $("#taskForm").elements.projectId.value = taskProject.id;
  updateTaskAssigneeOptions(taskProject.id, task?.assignedTo?.id || "");
  $("#taskForm").elements.deadline.value = task?.deadline || "";
  $("#taskPriority").value = meta.priority;
  $("#taskTags").value = (meta.tags || []).join(", ");
  $("#taskDialog").classList.remove("hidden");
}

function closeDialogs() {
  $$(".dialog").forEach((dialog) => dialog.classList.add("hidden"));
}

function updateTaskAssigneeOptions(projectId = $("#taskProject")?.value, selectedId = $("#taskAssignee")?.value) {
  const project = state.entities.projects.find((item) => String(item.id) === String(projectId));
  const members = project?.members?.length ? project.members : state.entities.users.filter((user) => user.role === "MEMBER");
  $("#taskAssignee").innerHTML = `<option value="">Unassigned</option>` + members.map((user) => `<option value="${user.id}">${escapeHtml(user.name)}</option>`).join("");
  $("#taskAssignee").value = selectedId && members.some((user) => String(user.id) === String(selectedId)) ? String(selectedId) : "";
}

function validateTaskPayload(form) {
  if (!form.elements.title.value.trim()) return "Task title is required.";
  if (form.elements.title.value.trim().length < 3) return "Task title must be at least 3 characters.";
  if (!form.elements.projectId.value) return "Select a project for this task.";
  return null;
}

async function updateManyTaskStatuses(status) {
  const ids = Array.from(state.ui.selectedTaskIds);
  if (!ids.length) {
    showToast("Select at least one task for bulk updates.");
    return;
  }
  try {
    await Promise.all(ids.map((id) => api.patchTaskStatus(id, status)));
    state.ui.selectedTaskIds.clear();
    await refresh();
    showToast(`Updated ${ids.length} task(s).`);
  } catch (error) {
    showToast("Bulk update failed. Check task permissions.");
    await refresh();
  }
}

$("#themeToggle").addEventListener("click", () => {
  state.ui.theme = state.ui.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", state.ui.theme);
  applyTheme();
});

$("#loginTab").addEventListener("click", () => toggleAuth("login"));
$("#signupTab").addEventListener("click", () => toggleAuth("signup"));

$("#loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const auth = await api.login(formJson(event.target));
    persistAuth(auth);
    event.target.reset();
    await refresh();
  } catch (error) {
    showToast("Login failed. Check your email and password.");
  }
});

$("#signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = formJson(event.target);
    payload.role = "MEMBER";
    const auth = await api.signup(payload);
    persistAuth(auth);
    event.target.reset();
    await refresh();
  } catch (error) {
    showToast("Signup failed. Email may already be registered.");
  }
});

$("#logoutButton").addEventListener("click", () => {
  clearAuth();
  $("#loginForm").reset();
  $("#signupForm").reset();
  renderAll();
});

$$(".nav-button").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

$("#primaryAction").addEventListener("click", () => {
  if (state.ui.activeView === "tasks") return openTaskDialog();
  if (state.ui.activeView === "team") return openTeamDialog();
  return openProjectDialog();
});

$$(".dialog-close").forEach((button) => button.addEventListener("click", closeDialogs));

$("#projectForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (!form.elements.name.value.trim()) {
    showToast("Project name is required.");
    return;
  }
  const payload = {
    name: form.elements.name.value.trim(),
    description: form.elements.description.value.trim(),
    teamId: form.elements.teamId.value ? Number(form.elements.teamId.value) : null,
    memberIds: selectedValues($("#projectMembers"))
  };
  const id = form.elements.id.value;
  try {
    const saved = await api.saveProject(id, payload);
    state.ui.selectedProjectId = saved.id;
    closeDialogs();
    await refresh();
    showToast(id ? "Project updated." : "Project created.");
  } catch (error) {
    showToast("Could not save project.");
  }
});

$("#teamForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (!form.elements.name.value.trim()) {
    showToast("Team name is required.");
    return;
  }
  const leaderId = form.elements.leaderId.value ? Number(form.elements.leaderId.value) : null;
  const memberIds = selectedValues($("#teamMembers"));
  if (leaderId && !memberIds.includes(leaderId)) memberIds.push(leaderId);

  const payload = {
    name: form.elements.name.value.trim(),
    description: form.elements.description.value.trim(),
    leaderId,
    memberIds
  };
  const id = form.elements.id.value;
  try {
    await api.saveTeam(id, payload);
    closeDialogs();
    await refresh();
    showToast(id ? "Team updated." : "Team created.");
  } catch (error) {
    showToast("Could not save team.");
  }
});

$("#taskForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const error = validateTaskPayload(form);
  if (error) {
    showToast(error);
    return;
  }
  const payload = {
    title: form.elements.title.value.trim(),
    description: form.elements.description.value.trim(),
    projectId: Number(form.elements.projectId.value),
    assignedToId: form.elements.assignedToId.value ? Number(form.elements.assignedToId.value) : null,
    deadline: form.elements.deadline.value || null,
    status: "TODO"
  };
  const id = form.elements.id.value;
  const oldTask = state.entities.tasks.find((task) => String(task.id) === id);
  if (oldTask) payload.status = oldTask.status;
  try {
    const savedTask = await api.saveTask(id, payload);
    const tags = $("#taskTags").value.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
    saveTaskMeta(savedTask.id, { priority: $("#taskPriority").value, tags });
    closeDialogs();
    await refresh();
    showToast(id ? "Task updated." : "Task created.");
  } catch (saveError) {
    showToast("Could not save task.");
  }
});

$("#projectTeam").addEventListener("change", (event) => {
  const team = state.entities.teams.find((item) => String(item.id) === event.target.value);
  const memberIds = new Set((team?.members || []).map((member) => String(member.id)));
  Array.from($("#projectMembers").options).forEach((option) => {
    option.selected = memberIds.has(option.value);
  });
});

$("#taskProject").addEventListener("change", (event) => updateTaskAssigneeOptions(event.target.value, ""));
$("#taskSearchInput").addEventListener("input", (event) => {
  state.ui.taskFilters.search = event.target.value;
  renderTasks();
});
$("#taskStatusFilter").addEventListener("change", (event) => {
  state.ui.taskFilters.status = event.target.value;
  renderTasks();
});
const taskProjectFilter = $("#taskProjectFilter");
if (taskProjectFilter) {
  taskProjectFilter.addEventListener("change", (event) => {
    state.ui.taskFilters.projectId = event.target.value;
    renderTasks();
  });
}
const taskPriorityFilter = $("#taskPriorityFilter");
if (taskPriorityFilter) {
  taskPriorityFilter.addEventListener("change", (event) => {
    state.ui.taskFilters.priority = event.target.value;
    renderTasks();
  });
}
const taskSortBy = $("#taskSortBy");
if (taskSortBy) {
  taskSortBy.addEventListener("change", (event) => {
    state.ui.taskFilters.sortBy = event.target.value;
    renderTasks();
  });
}

const bulkTodoButton = $("#bulkTodoButton");
if (bulkTodoButton) bulkTodoButton.addEventListener("click", () => updateManyTaskStatuses("TODO"));
const bulkInProgressButton = $("#bulkInProgressButton");
if (bulkInProgressButton) bulkInProgressButton.addEventListener("click", () => updateManyTaskStatuses("IN_PROGRESS"));
const bulkDoneButton = $("#bulkDoneButton");
if (bulkDoneButton) bulkDoneButton.addEventListener("click", () => updateManyTaskStatuses("DONE"));

document.addEventListener("click", async (event) => {
  const projectButton = event.target.closest("[data-project-id]");
  if (projectButton) {
    state.ui.selectedProjectId = Number(projectButton.dataset.projectId);
    setView("projects");
    renderProjects();
    return;
  }

  const editProject = event.target.closest("[data-edit-project]");
  if (editProject) {
    openProjectDialog(state.entities.projects.find((project) => project.id === Number(editProject.dataset.editProject)));
    return;
  }

  const deleteProject = event.target.closest("[data-delete-project]");
  if (deleteProject && confirm("Delete this project and all of its tasks?")) {
    await api.deleteProject(deleteProject.dataset.deleteProject);
    state.ui.selectedProjectId = null;
    await refresh();
    showToast("Project deleted.");
    return;
  }

  const editTask = event.target.closest("[data-edit-task]");
  if (editTask) {
    openTaskDialog(state.entities.tasks.find((task) => task.id === Number(editTask.dataset.editTask)));
    return;
  }

  const deleteTask = event.target.closest("[data-delete-task]");
  if (deleteTask && confirm("Delete this task?")) {
    await api.deleteTask(deleteTask.dataset.deleteTask);
    await refresh();
    showToast("Task deleted.");
    return;
  }

  const editTeam = event.target.closest("[data-edit-team]");
  if (editTeam) {
    openTeamDialog(state.entities.teams.find((team) => team.id === Number(editTeam.dataset.editTeam)));
    return;
  }

  const deleteTeam = event.target.closest("[data-delete-team]");
  if (deleteTeam && confirm("Delete this team? Projects will keep their members but lose the team link.")) {
    await api.deleteTeam(deleteTeam.dataset.deleteTeam);
    await refresh();
    showToast("Team deleted.");
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.matches(".status-select")) {
    try {
      await api.patchTaskStatus(event.target.dataset.taskId, event.target.value);
      await refresh();
      showToast("Task status updated.");
    } catch (error) {
      showToast("You cannot update this task.");
      await refresh();
    }
    return;
  }

  if (event.target.matches("[data-select-task]")) {
    const id = Number(event.target.dataset.selectTask);
    if (event.target.checked) state.ui.selectedTaskIds.add(id);
    else state.ui.selectedTaskIds.delete(id);
  }
});

renderAll();
refresh();
