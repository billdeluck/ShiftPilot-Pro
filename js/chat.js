$(document).ready(function() {
    // Simple chat UI logic
    $('#chat-send-btn').on('click', function() {
        const input = $('#chat-input').val();
        if (!input) return;
        $('#chat-log').append('<div class="chat-user">' + input + '</div>');
        // Use AI.parseChatCommand for rule-based commands
        const response = AI.parseChatCommand(input);
        $('#chat-log').append('<div class="chat-bot">' + response + '</div>');
        $('#chat-input').val('');
    });
});
