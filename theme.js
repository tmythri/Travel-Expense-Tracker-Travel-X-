// --- THEME UTILITY (IMMEDIATE PRE-LOAD) ---
(function () {
    const savedTheme = localStorage.getItem("travel_tracker_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
})();
