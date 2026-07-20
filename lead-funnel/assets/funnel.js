/* =========================================================================
   Seller appraisal funnel — two-path (online / in-person), expanded questions.
   Vanilla JS, no framework. Posts to the Netlify proxy (/.netlify/functions/
   lead-intake), which injects the webhook secret + owner_user_id server-side.
   ========================================================================= */
(function () {
  "use strict";

  var form = document.getElementById("appraisal");
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var TOTAL = steps.length;
  var current = 0;
  var initiateFired = false;
  var appraisalType = ""; // "online" | "in_person"

  var progressFill = document.getElementById("progress-fill");
  var progressStep = document.getElementById("progress-step");
  var progressTotal = document.getElementById("progress-total");
  var errorEl = document.getElementById("form-error");
  var submitBtn = document.getElementById("submit-btn");

  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  if (progressTotal) progressTotal.textContent = String(TOTAL);

  // ---- Navigation -------------------------------------------------------
  function showStep(i, skipScroll) {
    steps.forEach(function (s, idx) { s.classList.toggle("is-active", idx === i); });
    current = i;
    var pct = ((i + 1) / TOTAL) * 100;
    if (progressFill) progressFill.style.width = pct + "%";
    if (progressStep) progressStep.textContent = String(i + 1);
    var firstField = steps[i].querySelector("input, select, textarea, button[data-path]");
    if (firstField) { try { firstField.focus({ preventScroll: true }); } catch (e) { firstField.focus(); } }
    // Wire Google autocomplete only once the address step is visible (Google
    // mis-positions the suggestions dropdown if initialised on a hidden field).
    if (steps[i].querySelector("#address")) wireAutocomplete();
    // Never auto-scroll on first paint (avoids the mobile "lands halfway down" issue).
    if (!skipScroll) {
      var anchor = document.getElementById("appraisal-form");
      if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Validate the CURRENT step by inspecting its contents (order-independent).
  function validateStep(i) {
    clearError();
    var step = steps[i];

    // Address step
    var addr = step.querySelector("#address");
    if (addr) {
      if (addr.value.trim().length < 4) { markInvalid(addr); showError("Please enter the property address."); return false; }
    }
    // Timeframe step (required dropdown)
    var tl = step.querySelector('[name="timeline"]');
    if (tl) {
      if (!tl.value) {
        showError("Please pick a timeframe so I can tailor your appraisal."); return false;
      }
    }
    // Contact step
    var fn = step.querySelector("#first_name");
    if (fn) {
      var ok = true;
      ["first_name", "last_name", "email", "phone"].forEach(function (n) {
        var el = form[n];
        if (el && !el.value.trim()) { markInvalid(el); ok = false; }
      });
      if (ok && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.value.trim())) {
        markInvalid(form.email); showError("Please enter a valid email address."); ok = false;
      }
      if (ok && form.phone.value.replace(/\D/g, "").length < 8) {
        markInvalid(form.phone); showError("Please enter a valid mobile number."); ok = false;
      }
      if (!ok && !errorEl.textContent) showError("Please complete the highlighted fields.");
      return ok;
    }
    // All other steps are optional
    return true;
  }

  function markInvalid(el) {
    el.classList.add("is-invalid");
    el.addEventListener("input", function h() { el.classList.remove("is-invalid"); el.removeEventListener("input", h); });
  }
  function showError(msg) { if (errorEl) { errorEl.textContent = msg; errorEl.hidden = false; } }
  function clearError() { if (errorEl) { errorEl.textContent = ""; errorEl.hidden = true; } }

  // ---- Path choice cards (step 1) --------------------------------------
  form.querySelectorAll("[data-path]").forEach(function (card) {
    card.addEventListener("click", function () {
      appraisalType = card.getAttribute("data-path") || "";
      form.querySelectorAll("[data-path]").forEach(function (c) { c.classList.remove("is-selected"); });
      card.classList.add("is-selected");
      fireInitiate();
      setTimeout(function () { showStep(Math.min(current + 1, TOTAL - 1)); }, 160);
    });
  });

  // ---- Next / Prev ------------------------------------------------------
  form.addEventListener("click", function (e) {
    var next = e.target.closest("[data-next]");
    var prev = e.target.closest("[data-prev]");
    if (next) { if (validateStep(current)) showStep(Math.min(current + 1, TOTAL - 1)); }
    if (prev) { showStep(Math.max(current - 1, 0)); }
  });

  // Meta Pixel InitiateCheckout on first interaction
  function fireInitiate() {
    if (initiateFired) return;
    initiateFired = true;
    if (typeof window.fbq === "function") window.fbq("track", "InitiateCheckout");
  }
  form.addEventListener("input", fireInitiate);
  form.addEventListener("focusin", fireInitiate);

  // Timeframe auto-advance for a snappy wizard feel (dropdown)
  form.querySelectorAll('[name="timeline"]').forEach(function (el) {
    el.addEventListener("change", function () {
      var stepIdx = steps.indexOf(el.closest(".step"));
      setTimeout(function () { if (current === stepIdx && el.value) showStep(Math.min(stepIdx + 1, TOTAL - 1)); }, 220);
    });
  });

  // ---- Helpers to read fields ------------------------------------------
  function val(name) { var el = form[name]; return el && typeof el.value === "string" ? el.value.trim() : ""; }
  function radio(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
  function checks(name) {
    return Array.prototype.slice
      .call(form.querySelectorAll('input[name="' + name + '"]:checked'))
      .map(function (el) { return el.value; });
  }
  // Combine the dedicated unit field with the street address (units get dropped
  // by Google autocomplete, so we re-attach them here). Avoids double-prefixing.
  function composeAddress() {
    var addr = val("address");
    var unit = val("unit");
    if (!unit) return addr;
    var esc = unit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp("^\\s*" + esc + "\\s*[\\/,]").test(addr)) return addr;
    return unit + "/" + addr;
  }

  // ---- Compose the qualification notes string --------------------------
  function composeNotes(d) {
    var parts = [d.appraisal_type === "in_person" ? "In-person appraisal" : "Online appraisal"];
    if (d.timeline) parts.push("Timeline: " + d.timeline);
    var cfg = [];
    if (d.property_type) cfg.push(d.property_type);
    if (d.bedrooms) cfg.push(d.bedrooms + "bd");
    if (d.bathrooms) cfg.push(d.bathrooms + "ba");
    if (d.car_spaces) cfg.push(d.car_spaces + "car");
    if (d.storeys) cfg.push(d.storeys);
    if (cfg.length) parts.push("Property: " + cfg.join(" "));
    if (d.land_size) parts.push("Land: " + d.land_size);
    if (d.construction) parts.push("Construction: " + d.construction);
    if (d.era) parts.push("Era: " + d.era);
    if (d.condition) parts.push("Condition: " + d.condition);
    if (d.renovations && d.renovations.length) parts.push("Renos: " + d.renovations.join(", "));
    if (d.features && d.features.length) parts.push("Features: " + d.features.join(", "));
    if (d.occupancy) parts.push("Currently: " + d.occupancy);
    if (d.extra_notes) parts.push("Notes: " + d.extra_notes);
    if (d.address) parts.push("Address: " + d.address);
    return parts.join(" | ");
  }

  // ---- Submit -----------------------------------------------------------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep(current)) return;

    var honeypot = (form.company && form.company.value) || "";
    if (honeypot.trim() !== "") { window.location.href = "thankyou.html"; return; }

    var d = {
      appraisal_type: appraisalType || "online",
      first_name: val("first_name"),
      last_name: val("last_name"),
      email: val("email"),
      phone: val("phone"),
      address: composeAddress(),
      timeline: val("timeline"),
      property_type: val("ptype"),
      bedrooms: val("beds"),
      bathrooms: val("baths"),
      car_spaces: val("cars"),
      storeys: radio("storeys"),
      land_size: val("land_size"),
      construction: val("construction"),
      era: val("era"),
      condition: val("condition"),
      occupancy: radio("occupancy"),
      renovations: checks("renovations"),
      features: checks("features"),
      extra_notes: val("extra_notes"),
      company: honeypot
    };

    var payload = {
      first_name: d.first_name,
      last_name: d.last_name,
      email: d.email,
      phone: d.phone,
      property_interest: d.address,
      timeline: d.timeline,
      notes: composeNotes(d),
      source: "meta_valuation_lp",
      appraisal_type: d.appraisal_type,
      property_type: d.property_type,
      bedrooms: d.bedrooms,
      bathrooms: d.bathrooms,
      car_spaces: d.car_spaces,
      storeys: d.storeys,
      land_size: d.land_size,
      construction: d.construction,
      era: d.era,
      condition: d.condition,
      occupancy: d.occupancy,
      renovations: d.renovations,
      features: d.features,
      company: d.company
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    clearError();

    if (typeof window.fbq === "function") window.fbq("track", "Lead");

    fetch("/.netlify/functions/lead-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json().catch(function () { return {}; }); })
      .then(function () { window.location.href = "thankyou.html"; })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Get my free appraisal";
        showError("Sorry — something went wrong sending your details. Please try again, or call Greg directly.");
      });
  });

  // ---- Google Places autocomplete --------------------------------------
  // The address field lives on step 2 (hidden at first paint). Google mis-positions
  // the suggestions dropdown if the Autocomplete is created while the input is hidden,
  // so we wire it lazily — when the address step becomes visible / the field is focused.
  var acWired = false;
  function wireAutocomplete() {
    if (acWired) return;
    if (!(window.google && google.maps && google.maps.places && google.maps.places.Autocomplete)) return;
    var input = document.getElementById("address");
    if (!input) return;
    if (input.offsetParent === null) return; // still hidden — wait until its step is visible
    var ac = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: "au" },
      fields: ["formatted_address"],
      types: ["address"]
    });
    ac.addListener("place_changed", function () {
      var typed = input.value;
      var p = ac.getPlace();
      if (!(p && p.formatted_address)) return;
      var fa = p.formatted_address;
      // If the user typed a leading unit (e.g. "33/…" or "33,…") that Google
      // dropped, re-attach it. Only "/" or "," count as unit separators — never
      // "-" (that's a street range like 30-46). Also mirror it into the unit field.
      var m = typed.match(/^\s*(?:unit\s*|u\s*|apt\s*|apartment\s*)?(\d+[a-zA-Z]?)\s*[\/,]\s*/i);
      if (m) {
        var u = m[1];
        var esc = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        if (!new RegExp("^\\s*" + esc + "\\s*[\\/,]").test(fa)) fa = u + "/" + fa;
        var unitEl = document.getElementById("unit");
        if (unitEl && !unitEl.value.trim()) unitEl.value = u;
      }
      input.value = fa;
    });
    acWired = true;
  }
  // Google Maps (loaded via the site's Places snippet) calls this callback when
  // the library is ready. Wiring itself happens on step-show / focus, above.
  window.initPlaces = function () { wireAutocomplete(); };
  (function () {
    var a = document.getElementById("address");
    if (a) a.addEventListener("focus", wireAutocomplete, false);
  })();

  showStep(0, true);
})();
