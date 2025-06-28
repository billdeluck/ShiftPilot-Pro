# Authentication & User Management (auth-user.md)

## Purpose
Handles secure login, Super Admin creation, and user role management. Ensures only authorized users can access management features.

## Key Features
- First-run Super Admin registration (only once)
- Login system for all users
- Role-based access control (RBAC)
- User management panel for Super Admin
- Session management using localStorage

## Data Flow
- User credentials and roles are stored in localStorage (`shiftPilotPro_users`)
- Current session is tracked in `shiftPilotPro_currentUser`
- UI adapts based on login state and user role

## Main Functions
- `register()`: Registers Super Admin (first run only)
- `login()`: Authenticates user and starts session
- `logout()`: Ends session and returns to login
- `getCurrentUser()`: Returns current logged-in user
- User management: add/delete users, assign roles (Super Admin only)

## Example Usage
- If not logged in, only the calendar is visible; management features are hidden
- Super Admin can add/manage users from the admin panel

## Related Files
- `js/auth.js`: Auth logic
- `js/user-manager.js`: User management
- `admin-panel.html`, `login.html`: UI for login and user management
