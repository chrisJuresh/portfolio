(function () {
  "use strict";

  var root = document.documentElement;
  var themeToggle = document.querySelector(".theme-toggle");
  var themeMeta = document.getElementById("theme-color");

  function setTheme(theme, remember) {
    var dark = theme === "dark";
    root.setAttribute("data-theme", dark ? "dark" : "light");

    if (themeToggle) {
      themeToggle.setAttribute("aria-checked", dark ? "true" : "false");
      themeToggle.setAttribute("aria-label", dark ? "Light mode" : "Dark mode");
      themeToggle.querySelector(".theme-toggle__label").textContent = dark ? "light" : "dark";
    }

    if (themeMeta) themeMeta.setAttribute("content", dark ? "#161616" : "#fcfbf8");

    if (remember) {
      try { localStorage.setItem("portfolio-theme", dark ? "dark" : "light"); } catch (_) {}
    }
  }

  function hasSavedTheme() {
    try {
      var saved = localStorage.getItem("portfolio-theme");
      return saved === "dark" || saved === "light";
    } catch (_) {
      return false;
    }
  }

  setTheme(root.getAttribute("data-theme") === "dark" ? "dark" : "light", false);

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      setTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark", true);
    });
  }

  var systemTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

  function syncSystemTheme(event) {
    if (!hasSavedTheme()) setTheme(event.matches ? "dark" : "light", false);
  }

  if (systemTheme) {
    if (systemTheme.addEventListener) systemTheme.addEventListener("change", syncSystemTheme);
    else if (systemTheme.addListener) systemTheme.addListener(syncSystemTheme);
  }
})();
