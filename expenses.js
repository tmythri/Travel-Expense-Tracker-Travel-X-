/* global db, showToast, formatDate, formatCurrency */
// --- EXPENSES PAGE CONTROLLER ---
let activeFriends = [];

document.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem("travel_tracker_user"));
    if (!currentUser) return;

    // Set today's date in form by default
    document.getElementById("expense-date").value = new Date().toISOString().split("T")[0];

    // Load Select Dropdowns and Ledger
    loadTripDropdowns();
    renderExpensesLedger();

    // Bind forms and scanner
    setupExpenseForm();
    setupReceiptScanner();
    setupSplitCalculator();
});

function loadTripDropdowns() {
    const trips = db.getTrips();
    const expSelect = document.getElementById("expense-trip");
    const filterSelect = document.getElementById("filter-trip-select");

    if (trips.length === 0) {
        expSelect.innerHTML = `<option value="">-- Plan a Trip First --</option>`;
        return;
    }

    const optionsHTML = trips.map(t => `<option value="${t.id}">${t.destination}</option>`).join("");
    expSelect.innerHTML = optionsHTML;
    filterSelect.innerHTML = `<option value="all">All Trips</option>` + optionsHTML;
}

function renderExpensesLedger() {
    const expenses = db.getExpenses();
    const body = document.getElementById("expenses-ledger-body");
    const selectedTrip = document.getElementById("filter-trip-select").value;
    const selectedCategory = document.getElementById("filter-category-select").value;

    let filtered = [...expenses];

    // Apply trip filter
    if (selectedTrip !== "all") {
        filtered = filtered.filter(e => e.tripId === selectedTrip);
    }

    // Apply category filter
    if (selectedCategory !== "all") {
        filtered = filtered.filter(e => e.category === selectedCategory);
    }

    if (filtered.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="6" class="text-center" style="color: var(--text-muted); padding: 30px;">
                    No transactions found matching filters.
                </td>
            </tr>
        `;
        return;
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    body.innerHTML = filtered.map(exp => {
        const trip = db.getTripById(exp.tripId);
        const destination = trip ? trip.destination : "Unknown Trip";
        return `
            <tr>
                <td style="font-weight: 600;">${exp.title}</td>
                <td style="color: var(--text-secondary);"><i class="bi bi-geo-alt"></i> ${destination}</td>
                <td><span class="category-badge category-${exp.category}">${exp.category}</span></td>
                <td style="color: var(--text-secondary);">${formatDate(exp.date)}</td>
                <td style="font-weight: 700; color: var(--text-primary);">${formatCurrency(exp.amount)}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="triggerDeleteExpense('${exp.id}')" style="padding: 4px 8px;">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join("");
}

function setupExpenseForm() {
    const form = document.getElementById("expense-form");
    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const expenseData = {
            tripId: document.getElementById("expense-trip").value,
            title: document.getElementById("expense-title").value,
            amount: document.getElementById("expense-amount").value,
            category: document.getElementById("expense-category").value,
            date: document.getElementById("expense-date").value,
            paymentMethod: document.getElementById("expense-method").value
        };

        if (!expenseData.tripId) {
            showToast("You must select or create a trip first!", "warning");
            return;
        }

        const res = db.addExpense(expenseData);
        if (res.success) {
            showToast("Expense logged successfully!", "success");
            form.reset();
            document.getElementById("expense-date").value = new Date().toISOString().split("T")[0];
            // Re-populate dropdown just in case
            loadTripDropdowns();
            renderExpensesLedger();
        } else {
            showToast(res.message, "error");
        }
    });

    // Bind filters
    document.getElementById("filter-trip-select").addEventListener("change", renderExpensesLedger);
    document.getElementById("filter-category-select").addEventListener("change", renderExpensesLedger);
}

function setupReceiptScanner() {
    const scannerBox = document.getElementById("receipt-scanner-box");
    const fileInput = document.getElementById("scanner-file-input");
    const icon = document.getElementById("scanner-icon");
    const text = document.getElementById("scanner-text");
    const subtext = document.getElementById("scanner-subtext");

    scannerBox.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length === 0) return;

        const file = e.target.files[0];
        scannerBox.classList.add("scanning");
        icon.className = "bi bi-arrow-repeat";
        icon.style.animation = "spin 1s linear infinite";
        text.innerText = "Analyzing receipt...";
        subtext.innerText = `Reading ${file.name}...`;

        // Inject keyframes dynamically for rotation
        if (!document.getElementById("spin-animation-style")) {
            const spinStyle = document.createElement("style");
            spinStyle.id = "spin-animation-style";
            spinStyle.innerHTML = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(spinStyle);
        }

        // Simulate high-fidelity parsing after 2.5 seconds
        setTimeout(() => {
            scannerBox.classList.remove("scanning");
            icon.className = "bi bi-check-circle-fill";
            icon.style.animation = "none";
            icon.style.color = "var(--success)";
            text.innerText = "Receipt Processed!";
            subtext.innerText = "Form pre-populated below.";

            // Pop values into create form
            document.getElementById("expense-title").value = "Café de Flore Gourmet Dinner";
            document.getElementById("expense-amount").value = "118.40";
            document.getElementById("expense-category").value = "food";
            document.getElementById("expense-method").value = "Credit Card";
            document.getElementById("expense-date").value = new Date().toISOString().split("T")[0];

            showToast("Receipt processed successfully! Form populated.", "success");

            // Reset scanner to standard layout after 3 seconds
            setTimeout(() => {
                icon.className = "bi bi-cloud-upload-fill";
                icon.style.color = "var(--secondary)";
                text.innerText = "Drag & Drop or Click to Upload";
                subtext.innerText = "Supports PNG, JPG, PDF";
                fileInput.value = "";
            }, 3000);

        }, 2500);
    });
}

function setupSplitCalculator() {
    const friendNameInput = document.getElementById("split-friend-name");
    const addFriendBtn = document.getElementById("add-friend-btn");
    const totalAmountInput = document.getElementById("split-total-amount");

    const addFriend = () => {
        const name = friendNameInput.value.trim();
        if (!name) return;

        if (activeFriends.includes(name)) {
            showToast("Friend already in circle.", "warning");
            return;
        }

        activeFriends.push(name);
        friendNameInput.value = "";
        renderFriendsList();
        recalculateSplits();
    };

    addFriendBtn.addEventListener("click", addFriend);
    friendNameInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addFriend();
    });

    totalAmountInput.addEventListener("input", recalculateSplits);
}

function renderFriendsList() {
    const container = document.getElementById("split-friends-container");
    if (activeFriends.length === 0) {
        container.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; padding: 10px; text-align: center;">No friends added yet.</div>`;
        return;
    }

    container.innerHTML = activeFriends.map(friend => `
        <div class="friend-item">
            <span style="font-weight: 500;"><i class="bi bi-person-fill" style="color: var(--secondary);"></i> ${friend}</span>
            <i class="bi bi-trash friend-remove" onclick="removeFriendFromCircle('${friend}')"></i>
        </div>
    `).join("");
}

function removeFriendFromCircle(name) {
    activeFriends = activeFriends.filter(f => f !== name);
    renderFriendsList();
    recalculateSplits();
}

function recalculateSplits() {
    const total = parseFloat(document.getElementById("split-total-amount").value) || 0;
    const summaryValue = document.getElementById("split-summary-value");
    const breakdown = document.getElementById("split-shares-breakdown");

    if (total <= 0 || activeFriends.length === 0) {
        summaryValue.innerText = "$0.00 / person";
        breakdown.innerHTML = "";
        return;
    }

    // Split includes yourself
    const divisor = activeFriends.length + 1;
    const share = total / divisor;

    summaryValue.innerText = `${formatCurrency(share)} / person`;

    breakdown.innerHTML = activeFriends.map(friend => `
        <div class="debt-item">
            <strong>${friend}</strong> owes you <span style="color: var(--secondary); font-weight: 700;">${formatCurrency(share)}</span>
        </div>
    `).join("");
}

function triggerDeleteExpense(id) {
    if (confirm("Are you sure you want to delete this transaction?")) {
        const res = db.deleteExpense(id);
        if (res.success) {
            showToast("Transaction deleted", "success");
            renderExpensesLedger();
        }
    }
}



// Expose handlers globally
window.triggerDeleteExpense = triggerDeleteExpense;
window.removeFriendFromCircle = removeFriendFromCircle;
