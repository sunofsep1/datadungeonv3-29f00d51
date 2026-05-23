// Service worker. In Manifest V3 only the background worker can make CORS-free
// cross-origin requests (using host_permissions), so the content script asks it
// to fetch from RiTA and from Agentbox.
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  // --- RiTA contact fetch (reuses RiTA's own in-memory token) ---
  if (msg && msg.type === "ddFetch" && msg.url) {
    var headers = { Accept: "application/json" };
    if (msg.token) headers.Authorization = msg.token;
    fetch(msg.url, { headers: headers })
      .then(function (r) { return r.text().then(function (t) { return { ok: r.ok, status: r.status, body: t }; }); })
      .then(sendResponse)
      .catch(function (e) { sendResponse({ ok: false, status: 0, error: String(e) }); });
    return true;
  }
});
