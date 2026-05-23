// Popup: talks to the content script running on the active RiTA tab.
var statusEl = document.getElementById("status");
var captureBtn = document.getElementById("capture");
var jsonBtn = document.getElementById("json");

function withTab(cb) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    cb(tabs && tabs[0]);
  });
}

function send(tabId, msg) {
  return new Promise(function (resolve) {
    chrome.tabs.sendMessage(tabId, msg, function (res) {
      if (chrome.runtime.lastError) return resolve(null);
      resolve(res);
    });
  });
}

function refresh() {
  withTab(function (tab) {
    if (!tab || !/^https:\/\/app\.ritabyaire\.com\//.test(tab.url || "")) {
      statusEl.textContent = "Open a RiTA call list in this tab, then click the extension again.";
      captureBtn.disabled = true;
      return;
    }
    send(tab.id, { cmd: "status" }).then(function (s) {
      if (!s) {
        statusEl.textContent = "Loading… reload the RiTA tab if this stays.";
        captureBtn.disabled = true;
        return;
      }
      if (!s.onList) {
        statusEl.textContent = "Go into a call list (click one under Call Lists), then try again.";
        captureBtn.disabled = true;
        return;
      }
      statusEl.innerHTML =
        "<b>" + (s.listName || "List") + "</b><br>" +
        s.roster + " contacts found" +
        (s.hasToken ? "" : "<br>⚠ Browse the list once so RiTA loads, then capture.");
      captureBtn.disabled = false;
    });
  });
}

captureBtn.addEventListener("click", function () {
  captureBtn.disabled = true;
  statusEl.textContent = "Capturing… this can take a few seconds.";
  withTab(function (tab) {
    send(tab.id, { cmd: "capture" }).then(function (res) {
      captureBtn.disabled = false;
      if (!res) { statusEl.textContent = "Something went wrong — reload the RiTA tab and retry."; return; }
      if (res.error) { statusEl.textContent = res.error; return; }
      statusEl.innerHTML =
        "Downloaded " + res.count + " of " + res.total + " ✓<br>" +
        (res.withPhone || 0) + " have a phone · " + (res.withEmail || 0) + " have email";
    });
  });
});

jsonBtn.addEventListener("click", function () {
  withTab(function (tab) {
    send(tab.id, { cmd: "downloadJson" }).then(function (res) {
      if (!res || !res.ok) statusEl.textContent = "Capture a list first, then download JSON.";
    });
  });
});

refresh();
