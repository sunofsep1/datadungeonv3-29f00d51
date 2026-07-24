/* =========================================================================
   Newsletter signup — shared handler for any .nl-form on the page
   (index.html section + thankyou.html block). Posts to the Netlify proxy,
   which injects the secret server-side. On success, swaps the form for a
   thank-you line. Vanilla JS, no framework.
   ========================================================================= */
(function () {
  "use strict";

  document.querySelectorAll(".nl-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var emailEl = form.querySelector('input[name="nl_email"]');
      var nameEl = form.querySelector('input[name="nl_first_name"]');
      var hpEl = form.querySelector('input[name="company"]');
      var btn = form.querySelector('button[type="submit"]');
      var msg = form.querySelector(".nl-form__msg");

      var email = emailEl ? emailEl.value.trim() : "";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        if (msg) { msg.textContent = "Please enter a valid email address."; msg.hidden = false; msg.classList.add("is-error"); }
        if (emailEl) emailEl.focus();
        return;
      }
      if (msg) { msg.hidden = true; msg.classList.remove("is-error"); }
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Joining…"; }

      fetch("/.netlify/functions/newsletter-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          first_name: nameEl ? nameEl.value.trim() : "",
          company: hpEl ? hpEl.value : ""
        })
      })
        .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json().catch(function () { return {}; }); })
        .then(function () {
          var done = document.createElement("p");
          done.className = "nl-form__done";
          done.innerHTML = "&#10003;&nbsp; You&rsquo;re in &mdash; check your inbox for a welcome note from Greg.";
          form.replaceWith(done);
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || "Join the list"; }
          if (msg) {
            msg.textContent = "Sorry — that didn't go through. Please try again in a moment.";
            msg.hidden = false; msg.classList.add("is-error");
          }
        });
    });
  });
})();
