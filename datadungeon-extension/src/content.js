// DataDungeon content script (engine). Runs on app.ritabyaire.com.
// 1. Injects the page-context interceptor so we can see RiTA's own API calls.
// 2. Collects contact data + the auth token from those calls.
// 3. Shows a floating "Send to DataDungeon" button that captures the whole list
//    and downloads a CSV whose columns match the DataDungeon importer.
(function () {
  var store = { token: null, contacts: {}, properties: {}, lists: [], responses: [], seenIds: {} };

  // Record contact ids visible in the DOM right now (the rail is virtualized, so
  // we accumulate them over time / while scrolling).
  function harvestDom() {
    document.querySelectorAll('[href*="/contact-"]').forEach(function (el) {
      var m = (el.getAttribute("href") || "").match(/\/contact-([a-f0-9]{16,})/i);
      if (m) store.seenIds[m[1]] = 1;
    });
    var cur = location.pathname.match(/\/contact-([a-f0-9]{16,})/i);
    if (cur) store.seenIds[cur[1]] = 1;
  }
  var lastExport = { csv: "", json: "", count: 0, listName: "" };

  function adapter() {
    var list = window.__ddAdapters || [];
    for (var i = 0; i < list.length; i++) {
      try { if (list[i].matches()) return list[i]; } catch (e) {}
    }
    return null;
  }

  // The interceptor runs in the page (MAIN) world via manifest "world":"MAIN" and
  // patches window.fetch / XHR before any RiTA code runs, so no injection needed here.

  // --- receive intercepted data from the page ---
  window.addEventListener("message", function (ev) {
    var d = ev.data;
    if (!d || d.__ddSource !== "rita-interceptor") return;
    var a = adapter();
    if (!a) return;
    if (d.type === "token" && d.payload && d.payload.auth) {
      store.token = d.payload.auth;
    } else if (d.type === "response" && d.payload) {
      var json;
      try { json = JSON.parse(d.payload.body); } catch (e) { return; }
      var path = d.payload.url.replace(a.apiBase, "").split("?")[0];
      store.responses.push({ path: path, json: json });
      if (store.responses.length > 200) store.responses.shift();
      var parsed = a.parseResponse(path, json);
      if (parsed.kind === "contact" && parsed.data) store.contacts[parsed.id] = parsed.data;
      else if (parsed.kind === "properties") store.properties[parsed.id] = parsed.data;
      else if (parsed.kind === "list" && parsed.data) store.lists.push(parsed.data);
      refreshButton();
    }
  });

  // --- fetch any contacts we haven't seen yet, reusing RiTA's own token ---
  // In Manifest V3 a content script can't make CORS-free cross-origin requests,
  // so the actual fetch happens in the background service worker.
  function bgFetch(url) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage({ type: "ddFetch", url: url, token: store.token }, function (res) {
          if (chrome.runtime.lastError || !res || !res.ok) return resolve(null);
          try { resolve(JSON.parse(res.body)); } catch (e) { resolve(null); }
        });
      } catch (e) { resolve(null); }
    });
  }

  function fetchContact(a, id) {
    return Promise.all([
      bgFetch(a.contactUrl(id)),
      bgFetch(a.apiBase + "/contacts/" + id + "/properties?includePropertyAttributes=true"),
    ]).then(function (res) {
      var j = res[0], pj = res[1];
      if (j) {
        var data = j.data !== undefined ? j.data : j;
        store.contacts[id] = data && data.contact ? data.contact : data;
      }
      if (pj) store.properties[id] = pj.data !== undefined ? pj.data : pj;
      return !!j;
    });
  }

  function fetchMissing(a, ids) {
    var missing = ids.filter(function (id) { return !store.contacts[id]; });
    if (!missing.length || !store.token) return Promise.resolve(0);
    var ok = 0;
    var queue = missing.slice();
    function worker() {
      if (!queue.length) return Promise.resolve();
      var id = queue.shift();
      return fetchContact(a, id).then(function (got) {
        if (got) ok++;
        return worker();
      });
    }
    var workers = [];
    for (var i = 0; i < 4; i++) workers.push(worker());
    return Promise.all(workers).then(function () { return ok; });
  }

  // --- CSV building ---
  function csvCell(v) {
    var s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function buildCsv(a, ids, listName) {
    var headers = a.csvHeaders;
    var lines = [headers.map(csvCell).join(",")];
    var rows = [];
    ids.forEach(function (id) {
      var row = a.toRow(store.contacts[id], store.properties[id]);
      if (!row || !row.Name) return;
      row["RITA List"] = listName;
      rows.push(row);
      lines.push(headers.map(function (h) { return csvCell(row[h]); }).join(","));
    });
    return { csv: lines.join("\r\n"), rows: rows };
  }

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 1000);
  }

  function safeName(s) {
    return (s || "rita-list").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60).toLowerCase();
  }

  // Scroll the (virtualized) rail gradually, harvesting the ids that render at
  // each step (jumping straight to the bottom would skip the middle rows).
  function scrollRail(a) {
    return new Promise(function (resolve) {
      var c = a.railScrollContainer && a.railScrollContainer();
      harvestDom();
      if (!c) return resolve();
      var y = 0;
      var stable = 0;
      var lastCount = -1;
      (function step() {
        harvestDom();
        var count = Object.keys(store.seenIds).length;
        stable = count === lastCount ? stable + 1 : 0;
        lastCount = count;
        var atBottom = y >= c.scrollHeight;
        if (atBottom && stable >= 2) { c.scrollTop = 0; return resolve(); }
        y += Math.max(120, Math.floor(c.clientHeight * 0.8));
        c.scrollTop = Math.min(y, c.scrollHeight);
        if (y > c.scrollHeight + c.clientHeight * 3) { c.scrollTop = 0; return resolve(); } // safety stop
        setTimeout(step, 300);
      })();
    });
  }

  function ctx() {
    return { responses: store.responses, contactIds: Object.keys(store.contacts), domIds: Object.keys(store.seenIds) };
  }

  // Walk a JSON object to find the biggest array of contact-id-like hex strings.
  // Mirrors collectContactIdArrays in the adapter but lives here for active fetches.
  function findContactIds(obj, depth) {
    var best = [];
    depth = depth || 0;
    if (!obj || typeof obj !== "object" || depth > 7) return best;
    if (Array.isArray(obj)) {
      var hit = [];
      obj.forEach(function (item) {
        if (typeof item === "string" && /^[a-f0-9]{16,}$/i.test(item)) { hit.push(item); return; }
        if (item && typeof item === "object") {
          var id =
            (typeof item.contact === "string" && item.contact) ||
            (item.contact && item.contact._id) ||
            item._id || item.contactId || item.id;
          if (typeof id === "string" && /^[a-f0-9]{16,}$/i.test(id)) hit.push(id);
        }
      });
      if (hit.length > best.length) best = hit;
      obj.forEach(function (item) {
        var sub = findContactIds(item, depth + 1);
        if (sub.length > best.length) best = sub;
      });
    } else {
      for (var k in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
        var sub = findContactIds(obj[k], depth + 1);
        if (sub.length > best.length) best = sub;
      }
    }
    return best;
  }

  // Actively fetch the list's full contact roster from the RiTA API.
  // The interceptor should catch it on fresh load (now it's synchronous via MAIN world),
  // but this is a belt-and-suspenders fallback for when the user hasn't reloaded.
  function fetchRoster(a) {
    var listId = a.listId && a.listId();
    if (!listId || !store.token) return Promise.resolve([]);
    var base = a.apiBase || "https://api.ritabyaire.com";
    var urls = [
      base + "/lists/" + listId,
      base + "/lists/" + listId + "/contacts",
      base + "/lists/do/" + listId,
    ];
    var collected = [];
    function tryNext(i) {
      if (i >= urls.length) return Promise.resolve(collected);
      return bgFetch(urls[i]).then(function (json) {
        if (json) {
          findContactIds(json).forEach(function (id) {
            if (collected.indexOf(id) < 0) collected.push(id);
          });
          if (collected.length > 0) return collected;
        }
        return tryNext(i + 1);
      });
    }
    return tryNext(0);
  }

  // --- the main capture flow ---
  function capture() {
    var a = adapter();
    if (!a) return Promise.resolve({ error: "Not a RiTA page." });
    if (!a.onListPage || !a.onListPage()) {
      return Promise.resolve({ error: "Open a RiTA call list first, then try again." });
    }
    var listName = a.getListName();
    setStatus("Reading the list…");
    return scrollRail(a).then(function () {
      return fetchRoster(a).then(function (rosterIds) {
        // Merge actively-fetched roster ids into seenIds so getRosterIds includes them
        rosterIds.forEach(function (id) { store.seenIds[id] = 1; });
      var ids = a.getRosterIds(ctx());
      if (!ids.length) return { error: "No contacts found yet — open the list, wait a second, then retry." };
      setStatus("Capturing " + ids.length + " contacts…");
      return fetchMissing(a, ids).then(function () {
        var built = buildCsv(a, ids, listName);
        var json = JSON.stringify(
          ids.map(function (id) {
            return store.contacts[id]
              ? { contact: store.contacts[id], properties: store.properties[id] || null }
              : null;
          }).filter(Boolean),
          null, 2
        );
        lastExport = { csv: built.csv, json: json, count: built.rows.length, listName: listName };
        try { chrome.storage.local.set({ lastExport: lastExport }); } catch (e) {}
        download(safeName(listName) + ".csv", built.csv);
        var withPhone = built.rows.filter(function (r) { return r.Mobile || r.Phones; }).length;
        var withEmail = built.rows.filter(function (r) { return r.Email; }).length;
        setStatus("Downloaded " + built.rows.length + " ✓ — " + withPhone + " with a phone, " + withEmail + " with email");
        return { count: built.rows.length, total: ids.length, listName: listName, withPhone: withPhone, withEmail: withEmail };
      });
      }); // fetchRoster
    }); // scrollRail
  }

  // --- floating button UI ---
  var btn, statusEl;
  function ensureButton() {
    if (btn || !document.body) return;
    var wrap = document.createElement("div");
    wrap.style.cssText =
      "position:fixed;right:18px;bottom:18px;z-index:2147483647;font-family:system-ui,Arial,sans-serif;";
    btn = document.createElement("button");
    btn.textContent = "⬇ Send to DataDungeon";
    btn.style.cssText =
      "background:#00BCD4;color:#062b30;border:none;border-radius:999px;padding:12px 18px;" +
      "font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.3);";
    btn.addEventListener("click", function () {
      btn.disabled = true;
      capture().then(function (res) {
        btn.disabled = false;
        if (res && res.error) setStatus(res.error);
        else if (res && res.total && res.count < res.total) {
          setStatus("Got " + res.count + " of " + res.total + " — click through any missing contacts, then retry.");
        }
      });
    });
    statusEl = document.createElement("div");
    statusEl.style.cssText =
      "margin-top:8px;background:#0b3b42;color:#e0f7fa;border-radius:8px;padding:6px 10px;" +
      "font-size:12px;max-width:260px;display:none;";
    wrap.appendChild(btn);
    wrap.appendChild(statusEl);
    document.body.appendChild(wrap);
  }

  function setStatus(t) {
    ensureButton();
    if (statusEl) { statusEl.textContent = t; statusEl.style.display = "block"; }
  }

  function refreshButton() {
    var a = adapter();
    if (!a || !(a.onListPage && a.onListPage())) return;
    ensureButton();
  }

  // --- messages from the popup ---
  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    var a = adapter();
    if (msg && msg.cmd === "status") {
      sendResponse({
        onList: !!(a && a.onListPage && a.onListPage()),
        listName: a && a.onListPage && a.onListPage() ? a.getListName() : "",
        roster: a && a.onListPage && a.onListPage() ? a.getRosterIds(ctx()).length : 0,
        hasToken: !!store.token,
      });
      return true;
    }
    if (msg && msg.cmd === "capture") {
      capture().then(sendResponse);
      return true; // async
    }
    if (msg && msg.cmd === "downloadJson") {
      if (lastExport.json) download(safeName(lastExport.listName) + ".json", lastExport.json, "application/json");
      sendResponse({ ok: !!lastExport.json });
      return true;
    }
  });

  // show the button once the list page is ready
  function boot() {
    refreshButton();
    setTimeout(refreshButton, 1500);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
  // RiTA is a single-page app — re-check when the URL changes.
  var lastUrl = location.href;
  setInterval(function () {
    harvestDom();
    if (location.href !== lastUrl) { lastUrl = location.href; refreshButton(); }
  }, 1000);
})();
