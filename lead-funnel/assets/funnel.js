/* =========================================================================
   Seller appraisal funnel — step logic + submit to the Netlify proxy.
   Vanilla JS, no framework. The proxy (/.netlify/functions/lead-intake) injects
   the webhook secret + owner_user_id server-side; the browser never sees them.
   ========================================================================= */
(function () {
  "use strict";

  var form = document.getElementById("appraisal");
  if (!form) return;

  var steps = Array.prototype.slice.call(form.querySelectorAll(".step"));
  var TOTAL = steps.length;
  var current = 0;
  var initiateFired = false;

  var progressFill = document.getElementById("progress-fill");
  var progressStep = document.getElementById("progress-step");
  var errorEl = document.getElementById("form-error");
  var submitBtn = document.getElementById("submit-btn");

  document.getElementById("year").textContent = String(new Date().getFullYear());

  // ---- Navigation -------------------------------------------------------
  function showStep(i) {
    steps.forEach(function (s, idx) {
      s.classList.toggle("is-active", idx === i);
    });
    current = i;
    var pct = ((i + 1) / TOTAL) * 100;
    if (progressFill) progressFill.style.width = pct + "%";
    if (progressStep) progressStep.textContent = String(i + 1);
    // Focus first control on the newly shown step
    var firstField = steps[i].querySelector("input, select, button");
    if (firstField) {
      try { firstField.focus({ preventScroll: true }); } catch (e) { firstField.focus(); }
    }
    document.getElementById("appraisal-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateStep(i) {
    clearError();
    var step = steps[i];
    // Step 1: address required
    if (i === 0) {
      var addr = form.address.value.trim();
      if (addr.length < 4) { markInvalid(form.address); return false; }
    }
    // Step 2: timeline required
    if (i === 1) {
      if (!form.querySelector('input[name="timeline"]:checked')) {
        showError("Please pick a timeline so I can tailor your appraisal.");
        return false;
      }
    }
    // Step 3: optional — always valid
    // Step 4: contact fields
    if (i === 3) {
      var ok = true;
      ["first_name", "last_name", "email", "phone"].forEach(function (n) {
        var el = form[n];
        if (!el.value.trim()) { markInvalid(el); ok = false; }
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
    return true;
  }

  function markInvalid(el) {
    el.classList.add("is-invalid");
    el.addEventListener("input", function h() { el.classList.remove("is-invalid"); el.removeEventListener("input", h); });
  }
  function showError(msg) { errorEl.textContent = msg; errorEl.hidden = false; }
  function clearError() { errorEl.textContent = ""; errorEl.hidden = true; }

  form.addEventListener("click", function (e) {
    var next = e.target.closest("[data-next]");
    var prev = e.target.closest("[data-prev]");
    if (next) { if (validateStep(current)) showStep(Math.min(current + 1, TOTAL - 1)); }
    if (prev) { showStep(Math.max(current - 1, 0)); }
  });

  // Fire Meta Pixel InitiateCheckout on first interaction (form start)
  function fireInitiate() {
    if (initiateFired) return;
    initiateFired = true;
    if (typeof window.fbq === "function") window.fbq("track", "InitiateCheckout");
  }
  form.addEventListener("input", fireInitiate, { once: false });
  form.addEventListener("focusin", fireInitiate);

  // Timeline choice can auto-advance for a snappy wizard feel
  form.querySelectorAll('input[name="timeline"]').forEach(function (el) {
    el.addEventListener("change", function () {
      setTimeout(function () { if (current === 1) showStep(2); }, 220);
    });
  });

  // ---- Compose the qualification notes string -------------------------
  function composeNotes(data) {
    var parts = ["Valuation LP"];
    if (data.timeline) parts.push("Timeline: " + data.timeline);
    var typeBits = [];
    if (data.ptype) typeBits.push(data.ptype);
    if (data.beds) typeBits.push(data.beds + "bed");
    if (typeBits.length) parts.push("Type: " + typeBits.join(" "));
    if (data.address) parts.push("Address: " + data.address);
    return parts.join(" | ");
  }

  // ---- Submit -----------------------------------------------------------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateStep(3)) return;

    var honeypot = (form.company && form.company.value) || "";
    if (honeypot.trim() !== "") {
      // Bot: pretend success, do not POST.
      window.location.href = "thankyou.html";
      return;
    }

    var data = {
      first_name: form.first_name.value.trim(),
      last_name: form.last_name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      timeline: (form.querySelector('input[name="timeline"]:checked') || {}).value || "",
      ptype: (form.querySelector('input[name="ptype"]:checked') || {}).value || "",
      beds: form.beds.value || "",
      company: honeypot
    };

    var payload = {
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      property_interest: data.address,
      timeline: data.timeline,
      notes: composeNotes(data),
      source: "meta_valuation_lp",
      company: data.company // honeypot forwarded for server-side check
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    clearError();

    fetch("/.netlify/functions/lead-intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json().catch(function () { return {}; });
      })
      .then(function () {
        window.location.href = "thankyou.html";
      })
      .catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = "Get my free appraisal";
        showError("Sorry — something went wrong sending your details. Please try again, or call Greg directly.");
      });
  });

  // ---- Optional Google Places autocomplete ----------------------------
  // Wired to the Google Maps callback if the script tag in index.html is enabled.
  window.initPlaces = function () {
    if (!(window.google && google.maps && google.maps.places)) return;
    var input = document.getElementById("address");
    if (!input) return;
    var ac = new google.maps.places.Autocomplete(input, {
      componentRestrictions: { country: "au" },
      fields: ["formatted_address"],
      types: ["address"]
    });
    ac.addListener("place_changed", function () {
      var p = ac.getPlace();
      if (p && p.formatted_address) input.value = p.formatted_address;
    });
  };

  showStep(0);
})();
