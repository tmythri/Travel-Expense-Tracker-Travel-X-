// --- COMMON UI COMPONENTS INJECTOR ---
document.addEventListener("DOMContentLoaded", () => {
    // 1. Auth Gate Check
    const publicPages = ["index.html", "login.html", "register.html", ""];
    const currentPage = window.location.pathname.split("/").pop();
    const currentUser = JSON.parse(localStorage.getItem("travel_tracker_user"));

    if (!currentUser && !publicPages.includes(currentPage)) {
        // Not logged in and trying to access a protected page
        showToast("Access Denied. Please log in first.", "error");
        setTimeout(() => {
            window.location.href = "login.html";
        }, 1500);
        return;
    }

    // 2. Inject Sidebar & Common Elements if on a protected page
    if (currentUser && !publicPages.includes(currentPage)) {
        injectSidebar(currentUser, currentPage);
    }
});

function injectSidebar(user, currentPage) {
    const container = document.querySelector(".app-container");
    if (!container) return;

    // Create Sidebar Element
    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar glass";
    sidebar.id = "app-sidebar";

    // Setup active state checks
    const isActive = (page) => currentPage === page ? "active" : "";

    sidebar.innerHTML = `
        <div class="logo-container">
            <i class="logo-icon bi bi-compass"></i>
            <span class="logo-text">TravelX</span>
        </div>
        <ul class="nav-menu">
            <li class="nav-item ${isActive("dashboard.html")}">
                <a href="dashboard.html"><i class="bi bi-grid-1x2-fill"></i> Dashboard</a>
            </li>
            <li class="nav-item ${isActive("trips.html")}">
                <a href="trips.html"><i class="bi bi-map-fill"></i> My Trips</a>
            </li>
            <li class="nav-item ${isActive("expenses.html")}">
                <a href="expenses.html"><i class="bi bi-wallet2"></i> Expenses</a>
            </li>
            <li class="nav-item ${isActive("insights.html")}">
                <a href="insights.html"><i class="bi bi-cpu-fill"></i> AI Insights</a>
            </li>
        </ul>
        <div class="sidebar-footer">
            <button class="icon-btn w-full" id="sidebar-theme-toggle" style="width: 100%; display: flex; gap: 10px; font-size: 14px; font-weight: 500;">
                <i class="bi bi-moon-fill" id="theme-btn-icon"></i> <span id="theme-btn-text">Toggle Theme</span>
            </button>
            <div class="user-card">
                <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <span class="user-name">${user.name}</span>
                    <span class="user-role">${user.email}</span>
                </div>
            </div>
            <button class="btn btn-danger btn-sm" id="logout-btn" style="width: 100%; justify-content: center;">
                <i class="bi bi-box-arrow-right"></i> Log Out
            </button>
        </div>
    `;

    // Add Bootstrap Icon stylesheet to page if missing
    if (!document.querySelector('link[href*="bootstrap-icons"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
        document.head.appendChild(link);
    }

    // Insert Sidebar at the beginning of the container
    container.insertBefore(sidebar, container.firstChild);

    // Setup Mobile Burger Button in Main Content Header
    setupMobileMenu();

    // Bind Log Out
    document.getElementById("logout-btn").addEventListener("click", () => {
        localStorage.removeItem("travel_tracker_user");
        showToast("Logged out successfully", "success");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);
    });

    // Theme Toggle bindings
    const themeToggle = document.getElementById("sidebar-theme-toggle");
    themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const nextTheme = currentTheme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", nextTheme);
        localStorage.setItem("travel_tracker_theme", nextTheme);
        updateThemeToggleUI(nextTheme);
    });

    // Apply loaded theme preference
    const savedTheme = localStorage.getItem("travel_tracker_theme") || "dark";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeToggleUI(savedTheme);
}

function updateThemeToggleUI(theme) {
    const icon = document.getElementById("theme-btn-icon");
    const text = document.getElementById("theme-btn-text");
    if (!icon || !text) return;
    if (theme === "light") {
        icon.className = "bi bi-sun-fill";
        text.innerText = "Light Mode";
    } else {
        icon.className = "bi bi-moon-fill";
        text.innerText = "Dark Mode";
    }
}

function setupMobileMenu() {
    const header = document.querySelector(".page-header");
    if (!header) return;

    // Create Burger Button
    const burger = document.createElement("button");
    burger.className = "icon-btn";
    burger.id = "mobile-burger";
    burger.style.display = "none"; // Handled by media queries in CSS or inline style for simple responsive toggles
    burger.innerHTML = `<i class="bi bi-list"></i>`;

    // Only show on mobile
    const style = document.createElement("style");
    style.innerHTML = `
        @media (max-width: 768px) {
            #mobile-burger { display: flex !important; }
        }
    `;
    document.head.appendChild(style);

    header.insertBefore(burger, header.firstChild);

    burger.addEventListener("click", () => {
        const sidebar = document.getElementById("app-sidebar");
        if (sidebar) {
            sidebar.classList.toggle("active");
        }
    });

    // Close sidebar on document click outside on mobile
    document.addEventListener("click", (e) => {
        const sidebar = document.getElementById("app-sidebar");
        const burgerBtn = document.getElementById("mobile-burger");
        if (sidebar && sidebar.classList.contains("active")) {
            if (!sidebar.contains(e.target) && !burgerBtn.contains(e.target)) {
                sidebar.classList.remove("active");
            }
        }
    });
}

// --- UTILITY: TOAST NOTIFICATIONS ---
function showToast(message, type = "success") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type} glass`;
    
    let iconClass = "bi-check-circle-fill";
    if (type === "error") iconClass = "bi-exclamation-triangle-fill";
    if (type === "warning") iconClass = "bi-exclamation-circle-fill";

    toast.innerHTML = `
        <i class="bi ${iconClass}" style="color: var(--${type === 'success' ? 'success' : type === 'error' ? 'danger' : 'warning'});"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = "slideInRight var(--transition-fast) reverse";
        toast.addEventListener("animationend", () => {
            toast.remove();
        });
    }, 4000);
}
window.showToast = showToast;

// --- UTILITY: FORMAT CURRENCY ---
function formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD"
    }).format(amount);
}
window.formatCurrency = formatCurrency;

// --- UTILITY: FORMAT DATE ---
function formatDate(dateString) {
    if (!dateString) return "";
    const options = { month: "short", day: "numeric", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
}
window.formatDate = formatDate;
