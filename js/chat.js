$(document).ready(function() {
    // Ensure AI Co-Pilot chat is injected on all pages
    if ($('#open-chat-btn').length === 0) {
        $('body').append(`
            <button id="open-chat-btn" class="chat-side-btn" title="Open AI Co-Pilot Chat">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>
            <div id="chat-panel" class="chat-panel" style="display:none;">
                <div class="chat-header">
                    <span>AI Co-Pilot</span>
                    <button id="close-chat-btn" title="Close">&times;</button>
                </div>
                <div id="chat-messages" class="chat-messages"></div>
                <form id="chat-form" autocomplete="off">
                    <input type="text" id="chat-input" placeholder="Ask ShiftPilot... (e.g., 'Reassign Alice on July 5')" />
                    <button type="submit">Send</button>
                </form>
            </div>
        `);
    }
    // Chat Side Button Logic
    $('#open-chat-btn').on('click', function() {
        $('#chat-panel').fadeIn();
        $('#chat-input').focus();
    });
    $('#close-chat-btn').on('click', function() {
        $('#chat-panel').fadeOut();
    });

    const $chatPanel = $('#chat-panel');
    const $chatMessages = $('#chat-messages');
    const $chatForm = $('#chat-form');
    const $chatInput = $('#chat-input');

    function appendMessage(sender, text) {
        $chatMessages.append(`<div class="chat-msg ${sender}"><strong>${sender}:</strong> ${text}</div>`);
        $chatMessages.scrollTop($chatMessages[0].scrollHeight);
    }

    $chatForm.on('submit', function(e) {
        e.preventDefault();
        const msg = $chatInput.val().trim();
        if (!msg) return;
        appendMessage('You', msg);
        handleCommand(msg);
        $chatInput.val('');
    });

    function handleCommand(msg) {
        // Simple rule-based parsing
        if (/reassign (\w+) on (.+)/i.test(msg)) {
            const [, name, date] = msg.match(/reassign (\w+) on (.+)/i);
            const employees = DataManager.getEmployees();
            const emp = employees.find(e => e.name.toLowerCase() === name.toLowerCase());
            if (!emp) {
                appendMessage('AI', `No employee named ${name}.`);
                return;
            }
            // Find shift for this employee on that date
            const dateStr = new Date(date).toISOString().slice(0,10);
            const shift = DataManager.getShiftsForDate(dateStr).find(s => s.employeeId === emp.id);
            if (!shift) {
                appendMessage('AI', `No shift found for ${name} on ${dateStr}.`);
                return;
            }
            const result = AI.reassignShift(dateStr, shift.id);
            if (result.success) {
                appendMessage('AI', `Shift reassigned to ${result.employee}.`);
            } else {
                appendMessage('AI', result.error);
            }
            return;
        }
        if (/show (this|next|last) week'?s? plan/i.test(msg)) {
            appendMessage('AI', 'Weekly plan feature coming soon.');
            return;
        }
        appendMessage('AI', "Sorry, I didn't understand that. Try: 'Reassign Alice on July 5'.");
    }
});
