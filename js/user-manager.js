$(document).ready(function() {
    // --- UI Elements ---
    const $userTableBody = $('#users-table tbody');
    const $newUserUsernameInput = $('#new-user-username');
    const $newUserPasswordInput = $('#new-user-password');
    const $newUserRoleSelect = $('#new-user-role');
    const $addUserBtn = $('#add-user-btn');
    const $userMessage = $('#user-message');

    // --- Initialization ---
    function init() {
        renderUsers();
        populateRoles();
        setupEventListeners();
    }

    // --- Render Functions ---
    function renderUsers() {
        $userTableBody.empty();
        const users = JSON.parse(localStorage.getItem('shiftPilotPro_users') || '[]');
        users.forEach(user => {
            const row = `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.role}</td>
                    <td>
                        ${user.role !== 'Super Admin' ? `<button class="delete-user-btn" data-id="${user.id}">Delete</button>` : ''}
                    </td>
                </tr>
            `;
            $userTableBody.append(row);
        });
    }

    function populateRoles() {
        $newUserRoleSelect.empty();
        const roles = DataManager.settings.roles; // Assuming DataManager has loaded settings
        // Add default roles if needed, or ensure they are defined in settings
        const defaultRoles = [
            { id: 'role_super_admin', name: 'Super Admin' }, // Super Admin is special, not managed here
            { id: 'role_manager', name: 'Manager' },
            { id: 'role_viewer', name: 'Viewer' },
            { id: 'role_hr', name: 'HR Admin' }
        ];

        // Combine roles from settings and default roles, avoiding duplicates
        const allRoles = [...new Map([...defaultRoles, ...roles].map(item => [item['id'], item])).values()];

        allRoles.forEach(role => {
            if (role.name !== 'Super Admin') { // Super Admin role is not assignable via this panel
                $newUserRoleSelect.append(`<option value="${role.id}">${role.name}</option>`);
            }
        });
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        $addUserBtn.on('click', addUser);
        $userTableBody.on('click', '.delete-user-btn', deleteUser);
    }

    // --- Handlers ---
    async function addUser() {
        const username = $newUserUsernameInput.val().trim();
        const password = $newUserPasswordInput.val();
        const roleId = $newUserRoleSelect.val();
        const roleName = $newUserRoleSelect.find('option:selected').text();

        clearMessage();

        if (!username || !password || !roleId) {
            $userMessage.text('All fields are required.');
            return;
        }
        if (password.length < 6) {
            $userMessage.text('Password must be at least 6 characters long.');
            return;
        }

        let users = JSON.parse(localStorage.getItem('shiftPilotPro_users') || '[]');
        if (users.some(user => user.username === username)) {
            $userMessage.text('Username already exists.');
            return;
        }

        const hashedPassword = await Auth.hashPassword(password); // Use Auth.hashPassword

        const newUser = {
            id: `user_${Date.now()}`,
            username: username,
            password: hashedPassword,
            role: roleName, // Store role name for display
            roleId: roleId // Store role ID for internal use
        };
        users.push(newUser);
        localStorage.setItem('shiftPilotPro_users', JSON.stringify(users));

        $userMessage.text('User added successfully!');
        $newUserUsernameInput.val('');
        $newUserPasswordInput.val('');
        renderUsers();
    }

    function deleteUser(e) {
        const userIdToDelete = $(e.target).data('id');
        if (!confirm('Are you sure you want to delete this user?')) {
            return;
        }

        let users = JSON.parse(localStorage.getItem('shiftPilotPro_users') || '[]');
        users = users.filter(user => user.id !== userIdToDelete);
        localStorage.setItem('shiftPilotPro_users', JSON.stringify(users));
        $userMessage.text('User deleted successfully!');
        renderUsers();
    }

    function clearMessage() {
        $userMessage.text('');
    }

    // --- Start the module ---
    init();
});