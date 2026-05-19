/* global db, formatCurrency, Chart */
// --- DASHBOARD BUSINESS LOGIC ---
document.addEventListener("DOMContentLoaded", () => {
    // Only load if the user is authenticated (components.js handles redirect, but we prevent script crash)
    const currentUser = JSON.parse(localStorage.getItem("travel_tracker_user"));
    if (!currentUser) return;

    renderDashboardData();
});

function renderDashboardData() {
    const trips = db.getTrips();
    const expenses = db.getExpenses();
    const stats = db.getStats();

    // 1. Render Numeric Cards
    document.getElementById("stat-trips-count").innerText = stats.tripCount;
    document.getElementById("stat-total-spent").innerText = formatCurrency(stats.totalSpent);
    document.getElementById("stat-total-budget").innerText = formatCurrency(stats.totalBudget);

    // Compute efficiency ratio (totalSpent / totalBudget)
    let efficiency = 0;
    let efficiencyDesc = `<i class="bi bi-shield-fill-check"></i> Overall health`;
    let efficiencyClass = "";

    if (stats.totalBudget > 0) {
        efficiency = Math.round((stats.totalSpent / stats.totalBudget) * 100);
        if (efficiency <= 70) {
            efficiencyDesc = `<i class="bi bi-emoji-smile-fill" style="color: var(--success);"></i> Within safe margins`;
        } else if (efficiency <= 90) {
            efficiencyDesc = `<i class="bi bi-exclamation-triangle-fill" style="color: var(--warning);"></i> Nearing budget cap`;
        } else {
            efficiencyDesc = `<i class="bi bi-exclamation-octagon-fill" style="color: var(--danger);"></i> Overdraft risk!`;
        }
    }

    document.getElementById("stat-efficiency").innerText = `${efficiency}%`;
    document.getElementById("stat-efficiency-desc").innerHTML = efficiencyDesc;

    // 2. Render Recent Expenses
    const recentExpensesBody = document.getElementById("recent-expenses-body");
    if (expenses.length > 0) {
        // Sort by date descending
        const sortedExpenses = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        recentExpensesBody.innerHTML = sortedExpenses.map(exp => {
            const trip = db.getTripById(exp.tripId);
            const destination = trip ? trip.destination : "Unknown Trip";
            return `
                <tr>
                    <td style="font-weight: 600;">${exp.title}</td>
                    <td style="color: var(--text-secondary);"><i class="bi bi-geo-alt"></i> ${destination}</td>
                    <td><span class="category-badge category-${exp.category}">${exp.category}</span></td>
                    <td style="color: var(--text-muted);"><i class="bi bi-credit-card-2-front"></i> ${exp.paymentMethod}</td>
                    <td style="font-weight: 700; color: var(--text-primary);">${formatCurrency(exp.amount)}</td>
                </tr>
            `;
        }).join("");
    }

    // 3. Render Chart.js Visualizations
    renderCategoryChart(stats.categories);
    renderTrendChart(trips, expenses);
}

function renderCategoryChart(categories) {
    const ctx = document.getElementById("categoryChart").getContext("2d");
    if (!ctx) return;

    // Destroy existing chart if it exists to avoid overlay bugs
    if (window.myCategoryChart) {
        window.myCategoryChart.destroy();
    }

    const keys = Object.keys(categories);
    const values = Object.values(categories);

    // Neon theme gradients
    window.myCategoryChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: keys.map(k => k.charAt(0).toUpperCase() + k.slice(1)),
            datasets: [{
                data: values,
                backgroundColor: [
                    "#f87171", // Food (rose)
                    "#60a5fa", // Transport (cyan/blue)
                    "#c084fc", // Lodging (purple)
                    "#fbbf24", // Activities (amber)
                    "#9ca3af"  // Other (grey)
                ],
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.05)"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        color: "#9ca3af",
                        font: { family: "Inter", size: 12 }
                    }
                }
            },
            cutout: "70%"
        }
    });
}

function renderTrendChart(trips, expenses) {
    const ctx = document.getElementById("trendChart").getContext("2d");
    if (!ctx) return;

    if (window.myTrendChart) {
        window.myTrendChart.destroy();
    }

    // Aggregate expenses per trip
    const tripNames = trips.map(t => t.destination);
    const tripSpent = trips.map(t => {
        const tripExpenses = expenses.filter(e => e.tripId === t.id);
        return tripExpenses.reduce((sum, e) => sum + e.amount, 0);
    });
    const tripBudgets = trips.map(t => t.budget);

    window.myTrendChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: tripNames,
            datasets: [
                {
                    label: "Budget Limit",
                    data: tripBudgets,
                    backgroundColor: "rgba(147, 51, 234, 0.15)",
                    borderColor: "#9333ea",
                    borderWidth: 2,
                    borderRadius: 4
                },
                {
                    label: "Actual Spent",
                    data: tripSpent,
                    backgroundColor: "rgba(6, 182, 212, 0.5)",
                    borderColor: "#06b6d4",
                    borderWidth: 2,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: "#9ca3af",
                        font: { family: "Inter", size: 12 }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255,255,255,0.02)" },
                    ticks: { color: "#9ca3af", font: { family: "Inter" } }
                },
                y: {
                    grid: { color: "rgba(255,255,255,0.02)" },
                    ticks: { color: "#9ca3af", font: { family: "Inter" } }
                }
            }
        }
    });
}

