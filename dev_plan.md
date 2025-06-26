This plan is designed to build the system in logical, incremental phases. Each phase delivers a fully functional and testable set of features, providing value at every step while managing complexity. We will follow a Frontend-First, Offline-First approach, ensuring the core application is robust and usable in the browser before layering on advanced connectivity and AI.
Project: ShiftPilot Pro - Phased Development Plan
Vision: To create a lightweight, modular, and secure shift management platform that works flawlessly offline, supports AI-driven predictions, and is fully customizable to the unique needs of any small to medium-sized team.
Phase 1: The Core Foundation - A Manual Offline Scheduler
Goal: To build the minimum viable product (MVP) that provides immediate value. This phase creates a functional, standalone manual scheduler that works entirely offline within the browser.
Features to Implement:
Monthly Calendar UI: An interactive calendar grid to display shifts for the current month.
Core CRUD: Manually Create, Read, Update, and Delete shifts directly on the calendar.
Local Persistence: All schedule data is automatically saved to the browser's localStorage, so work is never lost on refresh.
Static Data Model: The system will use a hardcoded list of employees and shift types for simplicity.
Basic Data Export: A simple button to export the current month's schedule to a standard .csv file.
Functional Outcome: A manager can open index.html and immediately start creating a shift schedule for their team. The application is self-contained, requires no setup, and is instantly useful for basic planning.
Key Files/Modules:
index.html: Main application shell.
css/style.css: Core visual styling.
js/main.js: Main application controller and event handling.
js/calendar.js: Logic for rendering the calendar UI.
js/data-manager.js: Handles all localStorage interactions and basic CSV export.
Phase 2: The Control Center - Dynamic Settings & Configuration
Goal: To make the system adaptable to any team's specific structure and rules. This phase replaces the static data model with a powerful, user-configurable settings engine.
Features to Implement:
Dedicated Settings Page: A new UI for system configuration.
Dynamic Shift Definitions: Admins can define their own shift types (e.g., "Morning," "Swing," "Deep Clean"), including start/end times.
Dynamic Role Management: Create and manage employee roles (e.g., "Supervisor," "Cashier," "Specialist").
Dynamic Employee Management: Add, edit, and remove employees, assigning them specific roles.
Basic Policy Rules:
Set default weekend off-days (e.g., Saturday, Sunday).
Allow for employee-specific overrides (e.g., one "Helper" works weekends, another doesn't).
Persistent Settings: All configurations are saved to a settings.json model within localStorage.
Functional Outcome: The system is no longer one-size-fits-all. An admin can set up the app to perfectly match their company's operational reality, from shift times to team roles. The scheduling engine will now use these dynamic rules.
Key Files/Modules:
settings.html: The UI for the new settings page.
js/settings.js: Logic for managing and saving all configurations.
js/data-manager.js: Updated to read employees and shift types from the settings model instead of static data.
Phase 3: The Data Hub - Advanced Import & Secure Backups
Goal: To enable efficient data management, scaling, and ensure data security and trustworthiness.
Features to Implement:
Bulk Employee Import: An interface to import employees from a .csv or .json file.
Dynamic Field Mapping: The system intelligently detects imported data fields (e.g., "name," "phone," "role").
Partial Data Handling & Validation: If an import is incomplete (e.g., only names are provided), the system accepts it and generates a report on missing fields, allowing for later enrichment.
Secure ZIP Backups: Implement the ability to export all shift and settings data into a single, password-protected .zip file.
Google Drive Integration (Optional Sync): An option in the settings to connect a Google account and automatically back up the encrypted ZIP file to Google Drive when online.
Functional Outcome: Onboarding a new team is now effortless. Data is portable and, most importantly, secure. The business can trust that its operational data is safe from loss and unauthorized access, even when operating offline.
Key Files/Modules:
import.html (or a modal in settings): UI for the import workflow.
js/import-manager.js: Handles file parsing (PapaParse for CSV), validation, and reporting.
js/backup.js: Manages CSV generation, zipping (JSZip/fflate), AES encryption, and Google Drive API calls.
Phase 4: The Gatekeeper - User Authentication & Roles
Goal: To secure the system and introduce collaborative, permission-based access for different team members.
Features to Implement:
First-Run Admin Setup: When the application is launched for the first time, it prompts the user to create a Super Admin account (username/password).
Login System: A secure login page to protect access to the application.
Role-Based Access Control (RBAC):
Super Admin: Full control. Can manage settings, users, and backups.
Manager: Can create/edit schedules and run reports. Cannot change core settings or manage users.
Viewer: Read-only access to the schedule.
User Management Panel: An admin-only area to add/remove users and assign roles.
Functional Outcome: The system transforms from a single-user tool into a secure, multi-user platform. Sensitive actions like deleting data or changing policies are now restricted, ensuring operational integrity.
Key Files/Modules:
login.html: The login page.
js/auth.js: Handles login, logout, password hashing (client-side for offline), and session management.
js/user-manager.js: Logic for the user management panel.
All other JS files will be updated to check user roles before performing actions.
Phase 5: The AI Co-Pilot - Predictive Scheduling & Chat Interface
Goal: To reduce the manual workload of scheduling by introducing smart automation and a natural language interface. This layer is AI-optional.
Features to Implement:
Rule-Based Reassignment: A non-AI function to automatically suggest a replacement when an employee is marked as "Sick," based on availability and role.
Conversational Chat UI: A chat panel for interacting with the system.
Natural Language Command Parsing (Rule-Based): The chat will understand basic commands like:
"Show today's schedule"
"Who works tomorrow?"
"Mark Alice sick today" (triggers rule-based reassignment).
Gemini API Integration (Optional):
An "AI Assist" toggle in the settings.
When enabled, commands like "Balance the schedule for next week" or "Suggest a replacement for John" are sent to the Gemini API for more intelligent, context-aware suggestions.
The system must remain 100% functional if the AI is disabled or offline.
Functional Outcome: Shift management becomes faster and more proactive. Managers can make changes with simple text commands, and the system intelligently handles the consequences, whether through simple rules or advanced AI.
Key Files/Modules:
js/chat-handler.js: Parses user input and routes commands.
js/shift-rules.js: Contains the logic for rule-based automation (e.g., finding available replacements).
js/predictor.js: The module that (optionally) connects to the Gemini API.
Node.js Backend: A minimal backend will be created in this phase only to securely handle the Gemini API key. The frontend will call this simple backend endpoint.
Phase 6: The Analyst - Advanced Reporting & Visualization
Goal: To provide actionable insights from the shift data, helping management make informed decisions about staffing, payroll, and performance.
Features to Implement:
Dedicated Reports Page: A centralized dashboard for all analytics.
Comprehensive Reports: Generate the following reports based on the monthly data:
Staff Summary: Total shifts/hours worked per employee.
Missed Shifts Log: A log of all sick days and no-shows.
Cover-Up Report: Tracks who covered for whom, and whether the cover was accepted or declined.
Potential Salary Deduction Report: Flags employees who declined to cover shifts (based on company policy set in Phase 2).
Data Visualization: Use a library like Chart.js to create simple bar charts or pie charts (e.g., "Shifts by Employee," "Shift Type Distribution").
Functional Outcome: The system is no longer just an operational tool; it's a strategic asset. Management can easily visualize workload distribution, track attendance patterns, and get the data needed for payroll adjustments, all with a few clicks.
Key Files/Modules:
reports.html: The UI for the reporting dashboard.
js/report-generator.js: Contains the logic to process shift data and generate all report metrics.
js/libs/chart.min.js: The charting library for visualizations.