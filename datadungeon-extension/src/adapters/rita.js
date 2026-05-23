// RiTA adapter for DataDungeon. Knows how to read RiTA's data and turn a list
// of contacts into rows whose columns match the DataDungeon CSV importer.
// Other sites can be supported later by pushing another adapter onto
// window.__ddAdapters with the same shape.
(function () {
  window.__ddAdapters = window.__ddAdapters || [];

  var API = "https://api.ritabyaire.com";
  var ID = /[a-f0-9]{16,}/i;

  // --- small helpers ---
  function str(v) { return v == null ? "" : String(v).trim(); }

  // RiTA stores email/mobile as objects like { value, display, status, ... }.
  function pickValue(v) {
    if (v == null) return "";
    if (typeof v === "string" || typeof v === "number") return str(v);
    if (typeof v === "object") return str(v.value || v.display || v.address || v.email || v.number);
    return "";
  }

  // Search an object (shallow-ish) for the first value under a key matching `re`.
  function deepFindValue(obj, re, depth) {
    if (!obj || typeof obj !== "object" || depth > 5) return null;
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];
      if (re.test(k) && (typeof v === "string" || typeof v === "number")) return v;
      if (v && typeof v === "object") {
        var found = deepFindValue(v, re, depth + 1);
        if (found != null) return found;
      }
    }
    return null;
  }

  // Search for the first array under a key matching `re`.
  function deepFindArray(obj, re, depth) {
    if (!obj || typeof obj !== "object" || depth > 5) return null;
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];
      if (re.test(k) && Array.isArray(v)) return v;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        var found = deepFindArray(v, re, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  function buildAddress(a) {
    if (!a || typeof a !== "object") return str(a);
    var single = a.displayAddress || a.fullAddress || a.formatted || a.formattedAddress;
    if (single) return str(single);
    var line1 = a.streetAddress || a.street || a.addressLine1 || a.line1 || a.address || "";
    var suburb = a.suburb || a.locality || a.localityName || a.city || a.town || "";
    var state = a.state || a.region || "";
    var postcode = a.postcode || a.postalCode || a.postcodeZip || a.zip || "";
    return [line1, suburb, state, postcode].map(str).filter(Boolean).join(", ");
  }

  // A contact can own several properties; RiTA returns them from a separate
  // /properties call. Each has a full displayAddress.
  function propertyList(props) {
    if (!props) return [];
    var arr = Array.isArray(props) ? props : props.data || [];
    return arr
      .map(function (p) { return str(p.displayAddress) || buildAddress(p.property || p); })
      .filter(Boolean);
  }

  function buildPhones(otherPhones) {
    if (!otherPhones) return "";
    var arr = Array.isArray(otherPhones) ? otherPhones : [otherPhones];
    return arr
      .map(function (p) {
        if (typeof p === "string") return p;
        return p && (p.value || p.display || p.number || p.phone);
      })
      .map(str)
      .filter(Boolean)
      .join(" / ");
  }

  function buildCategories(contact) {
    var s = contact.source;
    var arr = s && Array.isArray(s.categories) ? s.categories : deepFindArray(contact, /categor/i, 0);
    if (!arr) return "";
    return arr
      .map(function (c) {
        if (typeof c === "string") return c;
        return c && (c.name || c.label || c.title || c.category);
      })
      .map(str)
      .filter(Boolean)
      .join(", ");
  }

  // The Agentbox id lives in source.id (source.name === "agentbox").
  function agentboxId(contact) {
    var s = contact.source;
    if (s && s.id && (!s.name || /agentbox/i.test(s.name))) return str(s.id);
    var v = deepFindValue(contact, /agentbox/i, 0);
    return str(v);
  }

  // Walk any intercepted JSON and pull out arrays of contact ids. RiTA loads the
  // full list roster from an API call at mount; we don't need to know its exact
  // path — we just find the biggest array of contact-looking ids.
  function collectContactIdArrays(node, depth, found) {
    found = found || [];
    depth = depth || 0;
    if (!node || typeof node !== "object" || depth > 7) return found;
    if (Array.isArray(node)) {
      var hit = [];
      node.forEach(function (item) {
        if (typeof item === "string" && /^[a-f0-9]{16,}$/i.test(item)) { hit.push(item); return; }
        if (item && typeof item === "object") {
          var id =
            (typeof item.contact === "string" && item.contact) ||
            (item.contact && item.contact._id) ||
            item._id || item.contactId || item.id;
          if (typeof id === "string" && /^[a-f0-9]{16,}$/i.test(id)) hit.push(id);
        }
      });
      if (hit.length) found.push(hit);
      node.forEach(function (item) { collectContactIdArrays(item, depth + 1, found); });
    } else {
      for (var k in node) collectContactIdArrays(node[k], depth + 1, found);
    }
    return found;
  }

  // Phones, formatted with their type label (Home/Mobile/Work/...).
  function formatPhones(otherPhones) {
    if (!Array.isArray(otherPhones)) return "";
    return otherPhones
      .map(function (p) {
        var v = str(p.value || p.display);
        if (!v) return "";
        return (p.type ? p.type + ": " : "") + v;
      })
      .filter(Boolean)
      .join("; ");
  }

  // Mobile: prefer the dedicated field, else any otherPhones entry typed mobile.
  function mobileOf(contact) {
    var m = pickValue(contact.mobile);
    if (m) return m;
    if (Array.isArray(contact.otherPhones)) {
      for (var i = 0; i < contact.otherPhones.length; i++) {
        var p = contact.otherPhones[i];
        if (/mobile|cell/i.test(p.type || "") && (p.value || p.display)) return str(p.value || p.display);
      }
    }
    return "";
  }

  function dataQualityScore(contact) {
    var q = contact.qualification, dq = q && q.dataQuality;
    return dq && dq.total != null ? String(dq.total) : "";
  }

  // RiTA's qualification.dataQuality.contributors describe reachability, e.g.
  // "Can email", "Cannot call mobile". We surface the positive ones.
  function reachability(contact) {
    var q = contact.qualification, dq = q && q.dataQuality, arr = dq && dq.contributors;
    if (Array.isArray(arr)) {
      return arr
        .filter(function (c) { return c.value > 0 && /^can\s/i.test(c.description || ""); })
        .map(function (c) { return str(c.description).replace(/^can\s+/i, ""); })
        .join(", ");
    }
    var r = [];
    if (pickValue(contact.email)) r.push("email");
    if (mobileOf(contact)) r.push("mobile");
    else if (formatPhones(contact.otherPhones)) r.push("phone");
    return r.join(", ");
  }

  function lastTouched(contact) {
    var s = contact.source;
    var d = s && (s.lastTouched || s.sourceLastSeen);
    return d ? String(d).slice(0, 10) : "";
  }

  var adapter = {
    id: "rita",
    apiBase: API,

    matches: function () {
      return location.hostname === "app.ritabyaire.com";
    },

    onListPage: function () {
      return /\/lists\/do\//.test(location.pathname);
    },

    listId: function () {
      var m = location.pathname.match(/\/lists\/do\/([^/]+)/);
      return m ? m[1] : null;
    },

    // Human-friendly list name, read from the page heading.
    getListName: function () {
      var el = document.querySelector("h1, h2, h3, [class*='title']");
      var nodes = document.querySelectorAll("h1,h2,h3,div,span");
      for (var i = 0; i < nodes.length; i++) {
        var t = str(nodes[i].textContent);
        if (/just listed|just sold|appraisal|market|competitor|nurtur/i.test(t) && t.length < 120) return t;
      }
      return el ? str(el.textContent) : "RiTA List";
    },

    // Recognise an intercepted response and say what it is.
    parseResponse: function (path, json) {
      var data = json && json.data !== undefined ? json.data : json;
      var mC = path.match(/^\/contacts\/([a-f0-9]{16,})$/i);
      if (mC) {
        var c = data && data.contact ? data.contact : data;
        return { kind: "contact", id: mC[1], data: c };
      }
      var mP = path.match(/^\/contacts\/([a-f0-9]{16,})\/properties$/i);
      if (mP) return { kind: "properties", id: mP[1], data: Array.isArray(data) ? data : (data && data.data) || [] };
      if (/^\/lists/.test(path)) return { kind: "list", id: null, data: data };
      return { kind: null };
    },

    contactUrl: function (id) {
      return API + "/contacts/" + id;
    },

    // Collect every contact id in the current list. The rail is virtualized
    // (only ~7 links rendered at once), so we combine: (1) the full roster from
    // intercepted API responses, (2) the visible DOM rail links, (3) contacts
    // we've already captured. ctx is supplied by the engine.
    getRosterIds: function (ctx) {
      ctx = ctx || {};
      var ids = [];
      var seen = {};
      function add(id) {
        if (id && /^[a-f0-9]{16,}$/i.test(id) && !seen[id]) { seen[id] = 1; ids.push(id); }
      }
      // 1. the list roster from intercepted responses. Prefer responses whose
      // URL is scoped to THIS list (so we don't grab unrelated big arrays like an
      // account-wide contact list); fall back to scanning everything.
      var listId = (this.listId && this.listId()) || "";
      function biggestArray(filterFn) {
        var b = [];
        (ctx.responses || []).forEach(function (r) {
          if (!filterFn(r)) return;
          collectContactIdArrays(r.json).forEach(function (arr) { if (arr.length > b.length) b = arr; });
        });
        return b;
      }
      var best = listId ? biggestArray(function (r) { return r.path && r.path.indexOf(listId) >= 0; }) : [];
      if (!best.length) best = biggestArray(function () { return true; });
      best.forEach(add);
      // 2. ids harvested while scrolling the virtualized rail
      (ctx.domIds || []).forEach(add);
      // 3. visible DOM rail links right now
      document.querySelectorAll('[href*="/contact-"]').forEach(function (a) {
        var m = (a.getAttribute("href") || "").match(/\/contact-([a-f0-9]{16,})/i);
        if (m) add(m[1]);
      });
      // 4. the contact currently open + anything already captured
      var cur = location.pathname.match(/\/contact-([a-f0-9]{16,})/i);
      if (cur) add(cur[1]);
      (ctx.contactIds || []).forEach(add);
      return ids;
    },

    // The scrollable rail container (so the engine can scroll it to surface more
    // virtualized rows as a fallback).
    railScrollContainer: function () {
      var link = document.querySelector('[href*="/lists/do/"][href*="/contact-"]');
      var el = link;
      while (el && el !== document.body) {
        var cs = getComputedStyle(el);
        if (el.scrollHeight > el.clientHeight + 20 && /(auto|scroll)/.test(cs.overflowY)) return el;
        el = el.parentElement;
      }
      return null;
    },

    // Columns: importer-friendly core (Name/Email/Mobile/Phones/Address/...) plus
    // extra journey columns the importer ignores but you can read in the file.
    csvHeaders: [
      "Name", "Email", "Mobile", "Phones", "Address", "Properties",
      "Categories", "Status", "Reachable", "Data Quality", "Last Touched",
      "Do Not Call", "Do Not SMS", "Do Not Email", "Agentbox ID", "RITA List",
    ],

    toRow: function (contact, properties) {
      if (!contact) return null;
      var name = [contact.firstName, contact.lastName].map(str).filter(Boolean).join(" ").trim() ||
        str(contact.salutation) || str(contact.name);
      var propAddrs = propertyList(properties);
      var primary = propAddrs[0] || buildAddress(contact.residentialAddress || contact.postalAddress);
      return {
        Name: name,
        Email: pickValue(contact.email),
        Mobile: mobileOf(contact),
        Phones: formatPhones(contact.otherPhones),
        Address: primary,
        Properties: propAddrs.join(" | "),
        Categories: buildCategories(contact),
        Status: str(contact.status),
        Reachable: reachability(contact),
        "Data Quality": dataQualityScore(contact),
        "Last Touched": lastTouched(contact),
        "Do Not Call": contact.doNotCall ? "Yes" : "No",
        "Do Not SMS": contact.doNotSms ? "Yes" : "No",
        "Do Not Email": contact.noSpam ? "Yes" : "No",
        "Agentbox ID": agentboxId(contact),
      };
    },
  };

  window.__ddAdapters.push(adapter);
})();
