// --- LOCAL PROFILE AUTHENTICATION ENGINE ---
const AUTH_USERS_KEY = "travel_tracker_registered_users";

function registerUser(name, email, password) {
    if (!name || !email || !password) {
        return { success: false, message: "All fields are required." };
    }

    const emailClean = email.trim().toLowerCase();
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];

    // Check if user already exists
    const userExists = users.some(u => u.email === emailClean);
    if (userExists) {
        return { success: false, message: "An account with this email already exists." };
    }

    // Register user
    const newUser = {
        id: "usr_" + Date.now().toString(36),
        name: name.trim(),
        email: emailClean,
        password: password // In a real app this would be hashed, but locally stored plain text is sufficient for demonstration.
    };

    users.push(newUser);
    localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));

    // Auto log-in
    localStorage.setItem("travel_tracker_user", JSON.stringify({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
    }));

    // Initialize mock data for a better user experience upon first signup!
    initializeMockDataForUser(newUser.email);

    return { success: true, message: "Registration successful!" };
}

function loginUser(email, password) {
    if (!email || !password) {
        return { success: false, message: "Email and password are required." };
    }

    const emailClean = email.trim().toLowerCase();
    const users = JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];

    const user = users.find(u => u.email === emailClean && u.password === password);
    if (!user) {
        return { success: false, message: "Invalid email or password." };
    }

    // Set active session
    localStorage.setItem("travel_tracker_user", JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email
    }));

    return { success: true, message: "Login successful!" };
}

// Automatically populate standard mock data so the user is WOWED by a fully populated dashboard and charts immediately!
function initializeMockDataForUser(email) {
    const tripsKey = `${email}_trips`;
    const expensesKey = `${email}_expenses`;

    // Only populate if they don't have trips yet
    if (!localStorage.getItem(tripsKey)) {
        const mockTrips = [
            {
                id: "trip_mock_paris",
                destination: "Paris, France",
                startDate: "2026-06-15",
                endDate: "2026-06-25",
                budget: 3500,
                image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80"
            },
            {
                id: "trip_mock_tokyo",
                destination: "Tokyo, Japan",
                startDate: "2026-10-05",
                endDate: "2026-10-18",
                budget: 5000,
                image: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?auto=format&fit=crop&w=800&q=80"
            }
        ];
        localStorage.setItem(tripsKey, JSON.stringify(mockTrips));
    }

    if (!localStorage.getItem(expensesKey)) {
        const mockExpenses = [
            {
                id: "exp_mock_1",
                tripId: "trip_mock_paris",
                title: "Boutique Hotel in Marais",
                amount: 1450,
                category: "lodging",
                date: "2026-06-16",
                paymentMethod: "Credit Card"
            },
            {
                id: "exp_mock_2",
                tripId: "trip_mock_paris",
                title: "Dinner at Le Jules Verne",
                amount: 320,
                category: "food",
                date: "2026-06-17",
                paymentMethod: "Credit Card"
            },
            {
                id: "exp_mock_3",
                tripId: "trip_mock_paris",
                title: "Louvre Museum Tickets",
                amount: 75,
                category: "activities",
                date: "2026-06-18",
                paymentMethod: "Cash"
            },
            {
                id: "exp_mock_4",
                tripId: "trip_mock_paris",
                title: "Metro Passes",
                amount: 45,
                category: "transport",
                date: "2026-06-15",
                paymentMethod: "Cash"
            },
            {
                id: "exp_mock_5",
                tripId: "trip_mock_tokyo",
                title: "Shinjuku Hotel stay",
                amount: 1200,
                category: "lodging",
                date: "2026-10-06",
                paymentMethod: "Credit Card"
            },
            {
                id: "exp_mock_6",
                tripId: "trip_mock_tokyo",
                title: "Sushi Dai gourmet dinner",
                amount: 180,
                category: "food",
                date: "2026-10-08",
                paymentMethod: "Credit Card"
            }
        ];
        localStorage.setItem(expensesKey, JSON.stringify(mockExpenses));
    }
}
