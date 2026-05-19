/* global db, showToast, formatCurrency, marked */
// --- AI INSIGHTS CONTROLLER ---
document.addEventListener("DOMContentLoaded", () => {
    const currentUser = JSON.parse(localStorage.getItem("travel_tracker_user"));
    if (!currentUser) return;

    setupApiSettings();
    setupChatLogic();
});

function setupApiSettings() {
    const keyInput = document.getElementById("gemini-key-input");
    const saveBtn = document.getElementById("save-key-btn");
    const toggleBtn = document.getElementById("toggle-key-visibility");
    const statusBadge = document.getElementById("api-status-badge");

    // Load existing key
    const savedKey = db.getGeminiApiKey();
    if (savedKey) {
        keyInput.value = savedKey;
        updateStatusActive(true);
    }

    // Save key trigger
    saveBtn.addEventListener("click", () => {
        const key = keyInput.value.trim();
        db.setGeminiApiKey(key);
        if (key) {
            showToast("Gemini API key saved!", "success");
            updateStatusActive(true);
        } else {
            showToast("Gemini API key removed. Switched to offline mode.", "warning");
            updateStatusActive(false);
        }
    });

    // Eye button visibility toggle
    toggleBtn.addEventListener("click", () => {
        const isPassword = keyInput.type === "password";
        keyInput.type = isPassword ? "text" : "password";
        toggleBtn.innerHTML = isPassword ? `<i class="bi bi-eye-slash"></i>` : `<i class="bi bi-eye"></i>`;
    });

    function updateStatusActive(active) {
        if (active) {
            statusBadge.innerHTML = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--success); box-shadow: 0 0 8px var(--success);"></span> Gemini Active`;
            // If first time loading and key exists, update welcome text
            const firstMsg = document.querySelector(".message-ai");
            if (firstMsg && firstMsg.innerText.includes("Offline Fallback Mode")) {
                firstMsg.innerHTML = `
                    Hello! I am your intelligent Travel Finance Assistant. I am connected successfully to the **Gemini 2.5 API**!<br><br>
                    Ask me any questions about your trips, expense habits, budget allocations, or travel savings, and I will perform deep analysis on your real ledger details!
                `;
            }
        } else {
            statusBadge.innerHTML = `<span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--danger);"></span> Offline Mode`;
        }
    }
}

function setupChatLogic() {
    const chatInput = document.getElementById("chat-input-field");
    const sendBtn = document.getElementById("chat-send-btn");
    const messagesContainer = document.getElementById("chat-messages-container");
    const typingStatus = document.getElementById("ai-typing-status");

    const sendMessage = async () => {
        const query = chatInput.value.trim();
        if (!query) return;

        // Clear input
        chatInput.value = "";

        // Append User Message
        appendMessage(query, "user");

        // Set typing status
        typingStatus.innerText = "Gemini is thinking...";
        appendTypingPlaceholder();

        // Get AI Response
        const responseText = await fetchAiResponse(query);

        // Remove placeholder and append AI message
        removeTypingPlaceholder();
        appendMessage(responseText, "ai");
        typingStatus.innerText = "Ready to advise";
    };

    sendBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // Quick Recommended Prompts
    document.querySelectorAll(".quick-prompt-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            chatInput.value = btn.innerText.trim();
            sendMessage();
        });
    });

    function appendMessage(text, sender) {
        const msg = document.createElement("div");
        msg.className = `message message-${sender}`;
        
        // Clean markdown backticks and bullets slightly for nicer layout in simple chat
        msg.innerHTML = formatChatText(text);
        
        messagesContainer.appendChild(msg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function appendTypingPlaceholder() {
        const placeholder = document.createElement("div");
        placeholder.className = "message message-ai typing-placeholder";
        placeholder.id = "ai-typing-placeholder";
        placeholder.innerHTML = `
            <span class="dot"></span>
            <span class="dot" style="animation-delay: 0.2s"></span>
            <span class="dot" style="animation-delay: 0.4s"></span>
            <style>
                .typing-placeholder .dot {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: var(--text-secondary);
                    border-radius: 50%;
                    margin-right: 4px;
                    animation: bounce 1.2s infinite alternate;
                }
                @keyframes bounce {
                    from { transform: translateY(0); opacity: 0.4; }
                    to { transform: translateY(-8px); opacity: 1; }
                }
            </style>
        `;
        messagesContainer.appendChild(placeholder);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeTypingPlaceholder() {
        const p = document.getElementById("ai-typing-placeholder");
        if (p) p.remove();
    }
}

async function fetchAiResponse(question) {
    const apiKey = db.getGeminiApiKey();
    const trips = db.getTrips();
    const expenses = db.getExpenses();
    const stats = db.getStats();

    // Context preparation
    const contextStr = `
You are a senior professional travel advisor and budgeting analyst.
Here is the user's travel expense data:
- Number of active trips: ${stats.tripCount}
- Active Trips list: ${JSON.stringify(trips.map(t => ({ destination: t.destination, budget: t.budget, dates: `${t.startDate} to ${t.endDate}` })))}
- Logged Expenses list: ${JSON.stringify(expenses.map(e => ({ title: e.title, amount: e.amount, category: e.category, date: e.date })))}
- Combined statistics: Total budget: $${stats.totalBudget.toFixed(2)}, Total spent: $${stats.totalSpent.toFixed(2)}.
- Spent by categories: Food: $${stats.categories.food.toFixed(2)}, Transport: $${stats.categories.transport.toFixed(2)}, Lodging: $${stats.categories.lodging.toFixed(2)}, Activities: $${stats.categories.activities.toFixed(2)}, Other: $${stats.categories.other.toFixed(2)}.

Answer the user's question with precise calculations, helpful budgeting recommendations, and safety alerts if necessary. Keep responses professional, highly informative, and easy to read.
Question: "${question}"
`;

    // 1. LIVE GEMINI API MODE
    if (apiKey) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: contextStr }]
                    }]
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error?.message || "HTTP error");
            }

            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Gemini API Error:", error);
            return `⚠️ **Gemini API Error:** ${error.message}. Please check your API key validity. Falling back to offline analyzer: \n\n` + getFallbackResponse(question, stats, trips, expenses);
        }
    }

    // 2. MOCK OFFLINE ASSISTANT MODE
    // Wait 1.5 seconds to simulate thinking
    await new Promise(resolve => setTimeout(resolve, 1500));
    return getFallbackResponse(question, stats, trips, expenses);
}

function getFallbackResponse(question, stats, trips, expenses) {
    const q = question.toLowerCase();

    if (q.includes("analyze") || q.includes("budget") || q.includes("current")) {
        let analysis = `### 📊 Real-Time Budget Analysis\n\n`;
        analysis += `Reviewing your travel data for **${stats.tripCount} planned trips**:\n\n`;
        analysis += `- **Combined Budget Limit:** $${stats.totalBudget.toFixed(2)}\n`;
        analysis += `- **Combined Spent:** $${stats.totalSpent.toFixed(2)}\n`;
        
        if (stats.totalBudget > 0) {
            const ratio = (stats.totalSpent / stats.totalBudget) * 100;
            analysis += `- **Exhaustion Ratio:** **${Math.round(ratio)}%**\n\n`;
            
            if (ratio > 90) {
                analysis += `⚠️ **CRITICAL ALERT:** You have exhausted almost all of your allocated travel funds! Stop lodging non-essential transactions.\n\n`;
            } else if (ratio > 70) {
                analysis += `⚠️ **WARNING:** You are nearing your combined budget limits (currently at ${Math.round(ratio)}%). I recommend reviewing upcoming transport and food choices.\n\n`;
            } else {
                analysis += `✅ **HEALTHY STATUS:** Your travel spending is well within safe thresholds! You have **$${(stats.totalBudget - stats.totalSpent).toFixed(2)} left** to spend.\n\n`;
            }
        } else {
            analysis += `\n*Note: You haven't added any trips with a budget. Plan a trip in the 'My Trips' page first to see comprehensive ratios!*\n\n`;
        }

        analysis += `### 🏷️ Category Allocation Insights:\n`;
        analysis += `- **Lodging:** $${stats.categories.lodging.toFixed(2)} (Accommodation costs)\n`;
        analysis += `- **Food:** $${stats.categories.food.toFixed(2)} (Bistros, dinners)\n`;
        analysis += `- **Transport:** $${stats.categories.transport.toFixed(2)} (Flights, trains, metro)\n`;
        analysis += `- **Activities:** $${stats.categories.activities.toFixed(2)} (Museums, tours)\n\n`;

        analysis += `💡 **Pro Tip:** Your lodging represents the highest fixed expense. In your future trips, consider hostel booking or boutique apartments in outlying neighborhoods to optimize capital.`;
        return analysis;
    }

    if (q.includes("lodging") || q.includes("hotel") || q.includes("accommodation")) {
        return `### 🏨 Lodging Optimization Strategies\n\nBased on your travel ledger, accommodation takes a significant share of your budget ($${stats.categories.lodging.toFixed(2)} spent).\n\nHere are three actionable ways to reduce this cost on your upcoming travels:\n\n1. **Dynamic Re-booking:** Many hotels on Booking.com or Agoda offer free cancellation. Check hotel rates again 48 hours before check-in; they often drop by 15-20% to fill remaining rooms.\n2. **Outlying Hubs:** Choose lodging located near a major metro subway line but outside the central downtown core. You'll save up to 40% on room rates while retaining fast commute access.\n3. **Loyalty & Incognito:** Always search for accommodations in Chrome Incognito mode to bypass cookie-based price tracking, and check mobile app prices, which are routinely 10% lower.`;
    }

    if (q.includes("checklist") || q.includes("saving") || q.includes("tips")) {
        return `### ✈️ Smart Travel Saving Checklist\n\nHere is a checklist to follow before and during your travel to maximize your remaining **$${(stats.totalBudget - stats.totalSpent).toFixed(2)}**:\n\n*   **[ ] Transport:** Set Google Flights trackers 3 months early. Utilize local high-speed rail passes (like JR Pass or Eurail) if making multiple intercity transits.\n*   **[ ] Dining:** Eat your main meal during lunch hours. Most mid-tier restaurants in Europe and Asia offer a "Menu du Jour" or lunch special which is 50% cheaper than dinner menus for identical items.\n*   **[ ] Bank Charges:** Never select "Pay in USD" on foreign credit card terminals. Always pay in local currency (EUR, JPY, GBP) to let your bank handle the exchange rate, saving 3-5% on dynamic conversion markups.\n*   **[ ] Activities:** Check free museum days! Almost all major European hubs have free entry on the first Sunday of the month. Use Klook or GetYourGuide to bundle tours early.`;
    }

    // Default response
    return `I received your inquiry: *"${question}"*.\n\nSince we are in **Offline Mode**, I can give you custom analysis when you search for keywords like **'analyze budget'**, **'lodging optimization'**, or **'saving checklist'**.\n\nTo unlock completely customized AI answers to any travel inquiry, please enter your **Google Gemini API Key** on the left! It will make direct, secure client-side queries to Gemini 2.5 Flash and answer you instantly with deep financial reasoning.`;
}

function formatChatText(text) {
    // Basic Markdown converter
    let formatted = text
        .replace(/\n/g, "<br>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/### (.*?)(<br>|$)/g, "<h4 style='margin-top: 15px; margin-bottom: 8px; font-weight: 700; color: var(--secondary);'>$1</h4>")
        .replace(/## (.*?)(<br>|$)/g, "<h3 style='margin-top: 18px; margin-bottom: 10px; font-weight: 800; color: var(--primary);'>$1</h3>")
        .replace(/-\s(.*?)(<br>|$)/g, "<div style='display: flex; gap: 8px; margin-left: 10px;'><span>•</span><span>$1</span></div>")
        .replace(/\*\s(.*?)(<br>|$)/g, "<div style='display: flex; gap: 8px; margin-left: 10px;'><span>•</span><span>$1</span></div>");
    
    return formatted;
}
