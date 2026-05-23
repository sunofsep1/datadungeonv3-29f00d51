// Runs in the PAGE context (injected by content.js) so it can patch the page's
// own fetch / XMLHttpRequest. RiTA holds its auth token in memory, so the only
// reliable way to read it (and the JSON responses) is to observe the app's own
// requests. We never send anything anywhere from here — we just relay what RiTA
// already fetched back to the extension via window.postMessage.
(function () {
  if (window.__ddInstalled) return;
  window.__ddInstalled = true;

  var API = "https://api.ritabyaire.com";

  function relay(type, payload) {
    try {
      window.postMessage({ __ddSource: "rita-interceptor", type: type, payload: payload }, "*");
    } catch (e) {}
  }

  function maybeToken(auth, url) {
    if (auth && url && url.indexOf(API) === 0) relay("token", { auth: auth });
  }

  // ---- fetch ----
  var origFetch = window.fetch;
  if (origFetch) {
    window.fetch = function () {
      var args = arguments;
      var req = args[0];
      var init = args[1] || {};
      var url = typeof req === "string" ? req : req && req.url;
      try {
        var auth = null;
        if (init.headers) auth = new Headers(init.headers).get("Authorization");
        if (!auth && req && req.headers && req.headers.get) auth = req.headers.get("Authorization");
        maybeToken(auth, url);
      } catch (e) {}
      return origFetch.apply(this, args).then(function (res) {
        try {
          if (url && url.indexOf(API) === 0) {
            res.clone().text().then(function (t) { relay("response", { url: url, body: t }); }).catch(function () {});
          }
        } catch (e) {}
        return res;
      });
    };
  }

  // ---- XMLHttpRequest (axios uses this) ----
  var OrigXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    var xhr = new OrigXHR();
    var _url = "";
    var _auth = "";
    var origOpen = xhr.open;
    xhr.open = function (method, url) {
      _url = url;
      return origOpen.apply(this, arguments);
    };
    var origSet = xhr.setRequestHeader;
    xhr.setRequestHeader = function (k, v) {
      if (String(k).toLowerCase() === "authorization") _auth = v;
      return origSet.apply(this, arguments);
    };
    xhr.addEventListener("load", function () {
      try {
        if (_url && String(_url).indexOf("api.ritabyaire.com") >= 0) {
          maybeToken(_auth, String(_url));
          relay("response", { url: String(_url), body: xhr.responseText });
        }
      } catch (e) {}
    });
    return xhr;
  }
  PatchedXHR.prototype = OrigXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;
})();
