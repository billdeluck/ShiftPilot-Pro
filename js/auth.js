$(document).ready(function() {
    const HASH_SALT_ROUNDS = 10; // For bcrypt-like hashing (client-side simulation)

    // --- UI Elements ---
    const $loginSection = $('.login-section');
    const $registerSection = $('.register-section');
    const $showRegisterLink = $('#show-register');
    const $showLoginLink = $('#show-login');
    const $usernameInput = $('#username');
    const $passwordInput = $('#password');
    const $loginBtn = $('#login-btn');
    const $loginMessage = $('#login-message');
    const $regUsernameInput = $('#reg-username');
    const $regPasswordInput = $('#reg-password');
    const $regConfirmPasswordInput = $('#reg-confirm-password');
    const $registerBtn = $('#register-btn');
    const $registerMessage = $('#register-message');

    // --- Event Listeners ---
    $showRegisterLink.on('click', function(e) {
        e.preventDefault();
        $loginSection.hide();
        $registerSection.show();
        clearMessages();
    });

    $showLoginLink.on('click', function(e) {
        e.preventDefault();
        $registerSection.hide();
        $loginSection.show();
        clearMessages();
    });

    $loginBtn.on('click', login);
    $registerBtn.on('click', register);

    // Check if admin exists on page load
    checkFirstRun();

    // --- Functions ---
    function checkFirstRun() {
        const users = JSON.parse(localStorage.getItem('shiftPilotPro_users') || '[]');
        if (users.length === 0) {
            // No users, assume first run, show registration
            $loginSection.hide();
            $registerSection.show();
            $showRegisterLink.hide(); // Hide register link on first run
            $showLoginLink.hide(); // Hide login link on first run
            $registerMessage.text('Welcome! Please register the Super Admin account.');
        } else {
            // Users exist, show login
            $loginSection.show();
            $registerSection.hide();
            $showRegisterLink.show();
            $showLoginLink.show();
        }
    }

    async function register() {
        const username = $regUsernameInput.val().trim();
        const password = $regPasswordInput.val();
        const confirmPassword = $regConfirmPasswordInput.val();

        clearMessages();

        if (!username || !password || !confirmPassword) {
            $registerMessage.text('All fields are required.');
            return;
        }
        if (password !== confirmPassword) {
            $registerMessage.text('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            $registerMessage.text('Password must be at least 6 characters long.');
            return;
        }

        const users = JSON.parse(localStorage.getItem('shiftPilotPro_users') || '[]');
        if (users.some(user => user.username === username)) {
            $registerMessage.text('Username already exists.');
            return;
        }

        // Simulate password hashing (for client-side only, not truly secure)
        const hashedPassword = await hashPassword(password);

        const newUser = {
            id: `user_${Date.now()}`,
            username: username,
            password: hashedPassword, // Store hashed password
            role: 'Super Admin' // First user is Super Admin
        };
        users.push(newUser);
        localStorage.setItem('shiftPilotPro_users', JSON.stringify(users));

        $registerMessage.text('Registration successful! Please log in.');
        $regUsernameInput.val('');
        $regPasswordInput.val('');
        $regConfirmPasswordInput.val('');
        
        // After successful registration, switch to login view
        $loginSection.show();
        $registerSection.hide();
        $showRegisterLink.show();
        $showLoginLink.show();
    }

    async function login() {
        const username = $usernameInput.val().trim();
        const password = $passwordInput.val();

        clearMessages();

        if (!username || !password) {
            $loginMessage.text('Username and password are required.');
            return;
        }

        const users = JSON.parse(localStorage.getItem('shiftPilotPro_users') || '[]');
        const user = users.find(u => u.username === username);

        if (user) {
            // Simulate password verification
            const isMatch = await verifyPassword(password, user.password);
            if (isMatch) {
                // Store session (simple localStorage for offline-first)
                localStorage.setItem('shiftPilotPro_currentUser', JSON.stringify({ id: user.id, username: user.username, role: user.role }));
                $loginMessage.text('Login successful! Redirecting...');
                window.location.href = 'index.html'; // Redirect to main app
            } else {
                $loginMessage.text('Invalid username or password.');
            }
        } else {
            $loginMessage.text('Invalid username or password.');
        }
    }

    function logout() {
        localStorage.removeItem('shiftPilotPro_currentUser');
        window.location.href = 'login.html'; // Redirect to login page
    }

    function getCurrentUser() {
        const user = localStorage.getItem('shiftPilotPro_currentUser');
        return user ? JSON.parse(user) : null;
    }

    function clearMessages() {
        $loginMessage.text('');
        $registerMessage.text('');
    }

    // --- Client-side "Hashing" (for demonstration, NOT for production security) ---
    // In a real app, hashing would happen on a secure backend.
    // This is a very basic simulation for offline client-side storage.
    async function hashPassword(password) {
        // Using Web Crypto API for a simple hash (SHA-256)
        const textEncoder = new TextEncoder();
        const data = textEncoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashedPassword = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashedPassword;
    }

    async function verifyPassword(password, hashedPassword) {
        const inputHashed = await hashPassword(password);
        return inputHashed === hashedPassword;
    }

    // Expose some functions globally if needed by other modules (e.g., for logout button)
    window.Auth = {
        logout: logout,
        getCurrentUser: getCurrentUser
    };
});