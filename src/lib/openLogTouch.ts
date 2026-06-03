const LOG_TOUCH_EVENT = "datadungeon-open-log-touch";

export type OpenLogTouchDetail = { contactId?: string };

export function openLogTouch(detail?: OpenLogTouchDetail) {
  window.dispatchEvent(new CustomEvent(LOG_TOUCH_EVENT, { detail: detail ?? {} }));
}

export function getLogTouchEventName() {
  return LOG_TOUCH_EVENT;
}
