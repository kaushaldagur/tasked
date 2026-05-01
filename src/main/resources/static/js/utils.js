export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => Array.from(document.querySelectorAll(selector));

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function selectedValues(selectEl) {
  return Array.from(selectEl.selectedOptions).map((option) => Number(option.value));
}

export function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}
