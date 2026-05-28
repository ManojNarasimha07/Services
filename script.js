(function () {
  const THEME_KEY = "cmw-theme";
  const imageElement = document.getElementById("dynamicImage");
  const themeToggle = document.getElementById("themeToggle");
  const themeToggleText = document.getElementById("themeToggleText");
  const themeIcon = themeToggle ? themeToggle.querySelector(".theme-icon") : null;
  const navButtons = Array.from(document.querySelectorAll(".button-container button"));
  const sections = Array.from(document.querySelectorAll(".services"));

  let currentImageIndex = 0;
  const totalImages = 9;

  function setTheme(theme) {
    const nextTheme = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);

    if (themeToggleText) {
      themeToggleText.textContent = nextTheme === "dark" ? "Dark mode" : "Light mode";
    }
    if (themeIcon) {
      themeIcon.textContent = nextTheme === "dark" ? "☾" : "☀";
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      return;
    }
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    setTheme(prefersLight ? "light" : "dark");
  }

  function highlightButton(type) {
    navButtons.forEach((btn) => {
      const active = btn.getAttribute("onclick")?.includes(`'${type}'`) || btn.getAttribute("onclick")?.includes(`"${type}"`);
      btn.classList.toggle("active", Boolean(active));
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  window.showTable = function (type) {
    sections.forEach((section) => {
      section.classList.add("hidden");
    });

    const activeSection = document.getElementById(type);
    if (activeSection) {
      activeSection.classList.remove("hidden");
      highlightButton(type);
      activeSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  function changeImage() {
    if (!imageElement) return;
    currentImageIndex = (currentImageIndex + 1) % totalImages;
    imageElement.src = `${currentImageIndex}.png`;
  }

  function bindEvents() {
    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        setTheme(current === "dark" ? "light" : "dark");
      });
    }

    navButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const match = btn.getAttribute("onclick") || "";
        const result = match.match(/showTable\('([^']+)'\)/) || match.match(/showTable\("([^"]+)"\)/);
        if (result && result[1]) {
          window.showTable(result[1]);
        }
      });
    });
  }

  function init() {
    initTheme();
    bindEvents();
    if (sections.length) {
      window.showTable("pvc");
    }
    if (imageElement) {
      setInterval(changeImage, 3000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
