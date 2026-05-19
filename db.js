// --- LOCALSTORAGE DATABASE ENGINE ---
function getDbNamespace() {
    const currentUser = JSON.parse(localStorage.getItem("travel_tracker_user"));
    if (!currentUser) return null;
    return currentUser.email;
}

// Helper to fetch parsed array or return empty
function getLocalArray(key) {
    const ns = getDbNamespace();
    if (!ns) return [];
    return JSON.parse(localStorage.getItem(`${ns}_${key}`)) || [];
}

// Helper to save array
function setLocalArray(key, data) {
    const ns = getDbNamespace();
    if (!ns) return;
    localStorage.setItem(`${ns}_${key}`, JSON.stringify(data));
}

// --- TRIP CRUD ---
const db = {
    getTrips() {
        return getLocalArray("trips");
    },

    getTripById(id) {
        const trips = getLocalArray("trips");
        return trips.find(t => t.id === id) || null;
    },

    addTrip(trip) {
        if (!trip.destination || !trip.budget) return { success: false, message: "Missing required fields." };
        const trips = getLocalArray("trips");
        const newTrip = {
            id: "trip_" + Date.now().toString(36),
            destination: trip.destination.trim(),
            startDate: trip.startDate || "",
            endDate: trip.endDate || "",
            budget: parseFloat(trip.budget),
            image: trip.image.trim() || "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80"
        };
        trips.push(newTrip);
        setLocalArray("trips", trips);
        return { success: true, trip: newTrip };
    },

    updateTrip(id, updatedTrip) {
        const trips = getLocalArray("trips");
        const idx = trips.findIndex(t => t.id === id);
        if (idx === -1) return { success: false, message: "Trip not found." };
        
        trips[idx] = {
            ...trips[idx],
            destination: updatedTrip.destination.trim(),
            startDate: updatedTrip.startDate || "",
            endDate: updatedTrip.endDate || "",
            budget: parseFloat(updatedTrip.budget),
            image: updatedTrip.image.trim() || trips[idx].image
        };
        
        setLocalArray("trips", trips);
        return { success: true, trip: trips[idx] };
    },

    deleteTrip(id) {
        const trips = getLocalArray("trips");
        const filtered = trips.filter(t => t.id !== id);
        setLocalArray("trips", filtered);
        
        // Also delete associated expenses to maintain relational integrity!
        const expenses = getLocalArray("expenses");
        const remainingExpenses = expenses.filter(e => e.tripId !== id);
        setLocalArray("expenses", remainingExpenses);
        
        return { success: true };
    },

    // --- EXPENSE CRUD ---
    getExpenses() {
        return getLocalArray("expenses");
    },

    getExpensesByTrip(tripId) {
        const expenses = getLocalArray("expenses");
        return expenses.filter(e => e.tripId === tripId);
    },

    addExpense(expense) {
        if (!expense.tripId || !expense.title || !expense.amount || !expense.category) {
            return { success: false, message: "Missing required expense details." };
        }
        
        const expenses = getLocalArray("expenses");
        const newExpense = {
            id: "exp_" + Date.now().toString(36),
            tripId: expense.tripId,
            title: expense.title.trim(),
            amount: parseFloat(expense.amount),
            category: expense.category, // food, transport, lodging, activities, other
            date: expense.date || new Date().toISOString().split("T")[0],
            paymentMethod: expense.paymentMethod || "Credit Card"
        };
        
        expenses.push(newExpense);
        setLocalArray("expenses", expenses);
        return { success: true, expense: newExpense };
    },

    deleteExpense(id) {
        const expenses = getLocalArray("expenses");
        const filtered = expenses.filter(e => e.id !== id);
        setLocalArray("expenses", filtered);
        return { success: true };
    },

    // Get aggregated statistics for user
    getStats() {
        const trips = this.getTrips();
        const expenses = this.getExpenses();

        const totalBudget = trips.reduce((sum, t) => sum + t.budget, 0);
        const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
        
        // Dynamic category summary
        const categories = { food: 0, transport: 0, lodging: 0, activities: 0, other: 0 };
        expenses.forEach(e => {
            if (categories[e.category] !== undefined) {
                categories[e.category] += e.amount;
            } else {
                categories.other += e.amount;
            }
        });

        return {
            tripCount: trips.length,
            expenseCount: expenses.length,
            totalBudget,
            totalSpent,
            categories
        };
    },

    // --- SECURE SETTINGS: API KEYS ---
    getGeminiApiKey() {
        const ns = getDbNamespace();
        if (!ns) return "";
        return localStorage.getItem(`${ns}_gemini_api_key`) || "";
    },

    setGeminiApiKey(key) {
        const ns = getDbNamespace();
        if (!ns) return;
        localStorage.setItem(`${ns}_gemini_api_key`, key.trim());
    }
};

window.db = db;
