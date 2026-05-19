/* global db, showToast, formatDate, formatCurrency */
// --- TRIP PAGE CONTROLLER ---
document.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem("travel_tracker_user"));
    if (!currentUser) return;

    renderTripsList();
    setupTripModalEvents();
});

function renderTripsList() {
    const trips = db.getTrips();
    const expenses = db.getExpenses();
    const container = document.getElementById("trips-container");

    if (trips.length === 0) {
        container.innerHTML = `
            <div class="glass glass-card text-center" style="grid-column: 1 / -1; padding: 40px; color: var(--text-muted);">
                <i class="bi bi-compass" style="font-size: 40px; color: var(--text-muted); display: block; margin-bottom: 15px;"></i>
                No trips planned yet. Click "Plan New Trip" to get started!
            </div>
        `;
        return;
    }

    container.innerHTML = trips.map(trip => {
        // Calculate dynamic budget details
        const tripExpenses = expenses.filter(e => e.tripId === trip.id);
        const spent = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
        const remaining = trip.budget - spent;
        const percentage = Math.min(Math.round((spent / trip.budget) * 100), 100);

        // Progress bar styling
        let barClass = "progress-safe";
        if (percentage > 70 && percentage <= 100) {
            barClass = "progress-warn";
        } else if (percentage > 100 || spent > trip.budget) {
            barClass = "progress-danger";
        }

        // Format dates
        const dateStr = trip.startDate 
            ? `${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}`
            : "No dates configured";

        return `
            <div class="trip-card glass">
                <img class="trip-image" src="${trip.image}" alt="${trip.destination}" onerror="this.src='https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80'">
                <div class="trip-card-body">
                    <div>
                        <h3 class="trip-title">${trip.destination}</h3>
                        <div class="trip-dates">
                            <i class="bi bi-calendar-event"></i> ${dateStr}
                        </div>
                    </div>
                    
                    <div class="trip-budget-progress">
                        <div class="progress-info">
                            <span style="font-weight: 500;">Spent: ${formatCurrency(spent)}</span>
                            <span style="color: var(--text-secondary);">Budget: ${formatCurrency(trip.budget)}</span>
                        </div>
                        <div class="progress-bar-bg">
                            <div class="progress-bar ${barClass}" style="width: ${percentage}%"></div>
                        </div>
                        <div style="font-size: 11px; margin-top: 5px; color: ${remaining >= 0 ? 'var(--success)' : 'var(--danger)'}; text-align: right; font-weight: 600;">
                            ${remaining >= 0 ? `${formatCurrency(remaining)} Left` : `${formatCurrency(Math.abs(remaining))} Overdraft`}
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 15px;">
                        <button class="btn btn-secondary btn-sm" onclick="openEditTripModal('${trip.id}')" style="flex: 1; justify-content: center;">
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="triggerDeleteTrip('${trip.id}')" style="flex: 1; justify-content: center;">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function setupTripModalEvents() {
    const modal = document.getElementById("trip-modal");
    const openBtn = document.getElementById("open-trip-modal-btn");
    const closeBtn = document.getElementById("close-trip-modal-btn");
    const cancelBtn = document.getElementById("cancel-trip-btn");
    const form = document.getElementById("trip-form");

    const openModal = () => {
        document.getElementById("modal-title").innerText = "Plan New Trip";
        form.reset();
        document.getElementById("edit-trip-id").value = "";
        modal.classList.add("active");
    };

    const closeModal = () => {
        modal.classList.remove("active");
    };

    openBtn.addEventListener("click", openModal);
    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = document.getElementById("edit-trip-id").value;
        const tripData = {
            destination: document.getElementById("destination").value,
            startDate: document.getElementById("startDate").value,
            endDate: document.getElementById("endDate").value,
            budget: document.getElementById("budget").value,
            image: document.getElementById("image").value
        };

        let res;
        if (id) {
            res = db.updateTrip(id, tripData);
        } else {
            res = db.addTrip(tripData);
        }

        if (res.success) {
            showToast(id ? "Trip updated successfully" : "Trip planned successfully", "success");
            closeModal();
            renderTripsList();
        } else {
            showToast(res.message, "error");
        }
    });
}

function openEditTripModal(id) {
    const trip = db.getTripById(id);
    if (!trip) return;

    document.getElementById("modal-title").innerText = "Edit Planned Trip";
    document.getElementById("edit-trip-id").value = trip.id;
    document.getElementById("destination").value = trip.destination;
    document.getElementById("startDate").value = trip.startDate || "";
    document.getElementById("endDate").value = trip.endDate || "";
    document.getElementById("budget").value = trip.budget;
    document.getElementById("image").value = trip.image || "";

    document.getElementById("trip-modal").classList.add("active");
}

function triggerDeleteTrip(id) {
    if (confirm("Are you sure you want to delete this trip and all its associated expenses?")) {
        const res = db.deleteTrip(id);
        if (res.success) {
            showToast("Trip deleted", "success");
            renderTripsList();
        }
    }
}



// Expose handlers to window global context
window.openEditTripModal = openEditTripModal;
window.triggerDeleteTrip = triggerDeleteTrip;
