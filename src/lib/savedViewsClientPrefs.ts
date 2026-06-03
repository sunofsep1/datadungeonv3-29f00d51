const CONTACTS_KEY = "datadungeon_contacts_open_default_saved_view_v1";
const TASKS_KEY = "datadungeon_tasks_open_default_saved_view_v1";

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

export function getContactsOpenDefaultSavedView(): boolean {
  return readFlag(CONTACTS_KEY);
}

export function setContactsOpenDefaultSavedView(value: boolean): void {
  writeFlag(CONTACTS_KEY, value);
}

export function getTasksOpenDefaultSavedView(): boolean {
  return readFlag(TASKS_KEY);
}

export function setTasksOpenDefaultSavedView(value: boolean): void {
  writeFlag(TASKS_KEY, value);
}
