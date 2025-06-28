$(document).ready(function() {
    // --- STATE ---
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();
    let currentlyEditingShift = null;

    // --- INITIALIZATION ---
    function init() {
        // Remove duplicate dashboard overview if present
        $('.dashboard-overview').remove();
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            // Hide all except calendar
            $('.sidebar, .dashboard-overview, #open-shift-mgmt-btn, #export-csv-btn').hide();
            // Optionally show a login prompt or overlay
            if ($('#login-overlay').length === 0) {
                $('body').append('<div id="login-overlay" style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(255,255,255,0.95);z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="background:#fff;padding:2rem 2.5rem;border-radius:10px;box-shadow:0 2px 16px rgba(0,0,0,0.08);max-width:350px;width:100%;"><h2>Login Required</h2><p style="margin-bottom:1.5em;">Please log in to access management features.</p><a href="login.html" class="btn-primary" style="display:inline-block;padding:0.7em 2em;background:#4a90e2;color:#fff;border-radius:5px;text-decoration:none;font-weight:bold;">Login</a></div></div>');
            }
        } else {
            $('.sidebar, #open-shift-mgmt-btn, #export-csv-btn').show();
            $('#login-overlay').remove();
        }
        DataManager.loadData().then(() => {
            populateDynamicElements();
            populateProfileAndMetrics();
            populateUpcomingShifts();
            renderCurrentMonth();
            setupEventListeners();
            updateDashboardWidgets();
            renderDashboardOverview();
        });
    }

    function populateProfileAndMetrics() {
        // Populate profile information
        const currentUser = Auth.getCurrentUser();
        if (currentUser) {
            $('#user-name').text(currentUser.name);
            $('#user-role').text(currentUser.role);
        }

        // Populate key metrics (replace with actual data retrieval logic)
        $('#total-shifts').text(DataManager.getAllShifts().length);
        $('#open-shifts').text(DataManager.getOpenShifts().length); // Will be 0 for now
        // Calculating employee availability is more complex and depends on defining "availability"
        // For now, we'll keep a placeholder or indicate N/A
    function populateUpcomingShifts() {
        const currentUser = Auth.getCurrentUser();
        const myShiftsList = $('#my-shifts-list');
        myShiftsList.empty();

        if (!currentUser) {
            myShiftsList.append('<li>Please log in to see your upcoming shifts.</li>');
            return;
        }

        const allShifts = DataManager.getAllShifts();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const upcomingShifts = allShifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            shiftDate.setHours(0, 0, 0, 0);
            return shift.employeeId === currentUser.id && shiftDate >= today;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        if (upcomingShifts.length === 0) {
            myShiftsList.append('<li>No upcoming shifts.</li>');
        // Quick Actions button event listeners
        $('#add-new-shift-btn').on('click', function() {
            // Assuming you have a way to open the add shift modal, e.g., openModalForAdd(new Date().toISOString().slice(0, 10));
            alert('Add New Shift clicked! (Implementation needed to open modal)');
        });
        $('#view-reports-btn').on('click', function() {
            window.location.href = 'reports.html';
        });
        $('#manage-employees-btn').on('click', function() {
            window.location.href = 'settings.html'; // Assuming employee management is in settings
        });
        } else {
            upcomingShifts.forEach(shift => {
                const employee = DataManager.getEmployees().find(emp => emp.id === shift.employeeId);
                const employeeName = employee ? employee.name : 'Unknown Employee';
                myShiftsList.append(`<li>${shift.date}: ${employeeName} - ${shift.shiftType}</li>`);
            });
        }
    }
        $('#employee-availability').text('N/A');
    }
    function populateProfileAndMetrics() {
        // Populate profile information
        const currentUser = Auth.getCurrentUser();
        if (currentUser) {
            $('#user-name').text(currentUser.name);
            $('#user-role').text(currentUser.role);
        }

        // Populate key metrics (replace with actual data retrieval logic)
        $('#total-shifts').text(DataManager.getShifts().length);
        $('#open-shifts').text(DataManager.getOpenShifts().length);
        $('#employee-availability').text('80%'); // Replace with actual calculation
    }
    function renderCurrentMonth() {
        Calendar.render(currentYear, currentMonth);
    }

    function populateDynamicElements() {
        // Populate sidebar employee list
        const employeeList = $('#employee-list');
        employeeList.empty();
        DataManager.getEmployees().forEach(emp => {
            employeeList.append(`<li>${emp.name}</li>`);
        });

        // Populate modal dropdowns
        const employeeSelect = $('#employee-select');
        employeeSelect.empty();
        DataManager.getEmployees().forEach(emp => {
            employeeSelect.append(`<option value="${emp.id}">${emp.name}</option>`);
        });

        const shiftTypeSelect = $('#shift-type-select');
        shiftTypeSelect.empty();
        DataManager.getShiftTypes().forEach(type => {
            shiftTypeSelect.append(`<option value="${type}">${type}</option>`);
        });
    }

    // --- EVENT LISTENERS (no changes) ---
    function setupEventListeners() {
        $('#prev-month-btn').on('click', navigateToPrevMonth);
        $('#next-month-btn').on('click', navigateToNextMonth);
        $('#calendar-grid').on('click', '.calendar-day', handleDayClick);
        $('#calendar-grid').on('click', '.shifts-list li', handleShiftClick);
        $('#save-shift-btn').on('click', handleSaveShift);
        $('#delete-shift-btn').on('click', handleDeleteShift);
        $('#close-modal-btn').on('click', closeModal);
        $('#shift-modal').on('click', function(e) { if (e.target === this) closeModal(); });
        $('#export-csv-btn').on('click', handleExport);
    }
    
    // All other functions below this point (navigateToPrevMonth, handleDayClick, etc.)
    // do not need to be changed for Phase 2. The code from Phase 1 is fine.
    
    function navigateToPrevMonth() {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCurrentMonth();
    }

    function navigateToNextMonth() {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCurrentMonth();
    }

    function handleDayClick(e) {
        if ($(e.target).closest('.shifts-list li').length || $(this).hasClass('other-month')) return;
        const date = $(this).data('date');
        if (date) {
            // Show modal with all assigned employees and shifts for the day
            const shifts = DataManager.getShiftsForDate(date);
            let details = `<strong>Shifts for ${date}:</strong><ul>`;
            if (shifts.length === 0) {
                details += '<li>No shifts assigned.</li>';
            } else {
                shifts.forEach(s => {
                    const emp = DataManager.getEmployees().find(e => e.id === s.employeeId);
                    details += `<li>${emp ? emp.name : 'Unknown'}: ${s.shiftType}</li>`;
                });
            }
            details += '</ul>';
            $('#modal-title').text('Day Details');
            $('#modal-date-display').html(details);
            $('#employee-select, #shift-type-select, #delete-shift-btn, #save-shift-btn').hide();
            $('#close-modal-btn').text('Close');
            $('#shift-modal').show();
        }
    }

    function handleShiftClick(e) {
        e.stopPropagation();
        const shiftId = $(this).data('shift-id');
        const date = $(this).closest('.calendar-day').data('date');
        openModalForEdit(date, shiftId);
    }

    // RBAC utility
function hasRole(roles) {
    const user = Auth.getCurrentUser();
    if (!user) return false;
    if (Array.isArray(roles)) return roles.includes(user.role);
    return user.role === roles;
}

    // Example usage in main.js (edit, delete, add shift):
    // Only allow Managers and Super Admin to add/edit/delete shifts
    function handleSaveShift() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to edit shifts.');
            return;
        }
        const date = $('#modal-selected-date').val();
        const employeeId = $('#employee-select').val();
        const shiftType = $('#shift-type-select').val();
        if (!employeeId || !shiftType) { alert('Please select an employee and a shift type.'); return; }
        if (currentlyEditingShift) {
            DataManager.updateShift(date, { ...currentlyEditingShift, employeeId, shiftType });
        } else {
            DataManager.addShift(date, { employeeId, shiftType });
        }
        closeModal();
        renderCurrentMonth();
    }

    function handleDeleteShift() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to delete shifts.');
            return;
        }
        if (!currentlyEditingShift || !confirm('Are you sure you want to delete this shift?')) return;
        DataManager.deleteShift($('#modal-selected-date').val(), currentlyEditingShift.id);
        closeModal();
        renderCurrentMonth();
    }
    
    function handleExport() {
        DataManager.exportToCSV(currentYear, currentMonth);
    }

    function openModalForAdd(date) {
        if (DataManager.getEmployees().length === 0 || DataManager.getShiftTypes().length === 0) {
            alert("Please add employees and shift types in the Settings page first.");
            return;
        }
        currentlyEditingShift = null;
        $('#modal-selected-date').val(date);
        $('#modal-date-display').text(`Date: ${date}`);
        $('#modal-title').text('Add Shift');
        $('#delete-shift-btn').hide();
        $('#employee-select').val($('#employee-select option:first').val());
        $('#shift-type-select').val($('#shift-type-select option:first').val());
        $('#employee-select, #shift-type-select, #delete-shift-btn, #save-shift-btn').show();
        $('#close-modal-btn').text('Cancel');
        $('#shift-modal').show();
    }

    function openModalForEdit(date, shiftId) {
        const shiftToEdit = DataManager.getShiftsForDate(date).find(s => s.id === shiftId);
        if (!shiftToEdit) return;
        currentlyEditingShift = shiftToEdit;
        $('#modal-selected-date').val(date);
        $('#modal-date-display').text(`Date: ${date}`);
        $('#modal-title').text('Edit Shift');
        $('#employee-select').val(shiftToEdit.employeeId);
        $('#shift-type-select').val(shiftToEdit.shiftType);
        $('#delete-shift-btn').show();
        $('#employee-select, #shift-type-select, #delete-shift-btn, #save-shift-btn').show();
        $('#close-modal-btn').text('Cancel');
        $('#shift-modal').show();
    }
    
    function closeModal() {
        $('#shift-modal').hide();
        currentlyEditingShift = null;
    }

    // --- DASHBOARD WIDGETS LOGIC ---
    function updateDashboardWidgets() {
        updateTodayAtAGlance();
        updateQuickStats();
        updateUrgentActions();
        updateWeeklyWorkload();
        updateActivityLog();
    }

    function updateTodayAtAGlance() {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10);
        const shifts = DataManager.getShiftsForDate(dateStr);
        const employees = DataManager.getEmployees();
        const $list = $('#today-shift-list');
        $list.empty();
        if (shifts.length === 0) {
            $list.append('<li>No shifts scheduled for today.</li>');
            return;
        }
        shifts.forEach(shift => {
            const emp = employees.find(e => e.id === shift.employeeId);
            let status = '';
            if (shift.status === 'Sick') status = '<span style="color:#d9534f;font-weight:bold;">SICK</span>';
            if (shift.status === 'Off') status = '<span style="color:#888;">OFF</span>';
            let uncovered = '';
            if (shift.status === 'Sick' && !shift.coveredBy) uncovered = ' <span title="Uncovered" style="color:#d9534f;font-size:1.2em;">&#x1F534;</span>';
            $list.append(`<li>${emp ? emp.name : 'Unknown'} - ${shift.shiftType} ${status}${uncovered}</li>`);
        });
    }

    function updateQuickStats() {
        const employees = DataManager.getEmployees();
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const allShifts = DataManager.getAllShifts();
        const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
        const shiftsThisMonth = allShifts.filter(s => s.date && s.date.startsWith(monthStr));
        const sickDays = shiftsThisMonth.filter(s => s.status === 'Sick').length;
        $('#stat-active-employees').text(employees.length);
        $('#stat-total-shifts').text(shiftsThisMonth.length);
        $('#stat-sick-days').text(sickDays);
    }

    function updateUrgentActions() {
        const $list = $('#urgent-action-list');
        $list.empty();
        const items = DataManager.findActionableItems ? DataManager.findActionableItems() : [];
        if (!items || items.length === 0) {
            $list.append('<li>No urgent actions.</li>');
            return;
        }
        items.forEach(item => {
            $list.append(`<li>${item}</li>`);
        });
    }

    function updateWeeklyWorkload() {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('workload-bar-chart').getContext('2d');
        const data = DataManager.getWeeklyShiftCounts ? DataManager.getWeeklyShiftCounts() : {};
        const labels = Object.keys(data);
        const values = Object.values(data);
        if (window._workloadChart) window._workloadChart.destroy();
        window._workloadChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Shifts This Week',
                    data: values,
                    backgroundColor: '#4a90e2',
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true } }
            }
        });
    }

    function updateActivityLog() {
        const $list = $('#activity-log-list');
        $list.empty();
        const log = DataManager.getActivityLog ? DataManager.getActivityLog() : [];
        if (!log.length) {
            $list.append('<li>No recent activity.</li>');
            return;
        }
        log.slice(-10).reverse().forEach(entry => {
            $list.append(`<li><span style=\"color:#888;font-size:0.9em;\">[${entry.time}]</span> ${entry.text}</li>`);
        });
    }

    // Dashboard Overview Rendering
function renderDashboardOverview() {
    const employees = DataManager.getEmployees();
    let totalShifts = 0, sickCount = 0, coveredCount = 0, openCount = 0, swapCount = 0;
    // Aggregate from all days
    if (Array.isArray(window.sampleShifts)) {
        window.sampleShifts.forEach(day => {
            day.shifts.forEach(shift => {
                totalShifts++;
                if (shift.status === 'Sick') sickCount++;
                if (shift.status === 'Covered') coveredCount++;
                if (shift.status === 'Open') openCount++;
                if (shift.status === 'SwapRequested') swapCount++;
            });
        });
    }
    const html = `
        <div class="dashboard-overview">
            <div class="overview-card"><strong>Total Employees:</strong> ${employees.length}</div>
            <div class="overview-card"><strong>Total Shifts:</strong> ${totalShifts}</div>
            <div class="overview-card"><strong>Sick:</strong> ${sickCount}</div>
            <div class="overview-card"><strong>Covered:</strong> ${coveredCount}</div>
            <div class="overview-card"><strong>Open:</strong> ${openCount}</div>
            <div class="overview-card"><strong>Swap Requests:</strong> ${swapCount}</div>
        </div>
    `;
    $(".main-content").prepend(html);
}

    // Load sample data for dashboard
    window.sampleShifts = [];
    try {
        // If using localStorage, load from there; else, load from db.json (simulate)
        if (localStorage.getItem('shiftPilotPro_shifts')) {
            // ...existing code...
        } else {
            // Simulate loading from db.json
            window.sampleShifts = [
                {"date": "2025-06-27", "shifts": [
                  {"id": "shift_1", "employeeId": "emp_1", "employeeName": "Alice Smith", "shiftType": "Morning", "date": "2025-06-27", "status": "Scheduled"},
                  {"id": "shift_2", "employeeId": "emp_2", "employeeName": "Bob Jones", "shiftType": "Evening", "date": "2025-06-27", "status": "Scheduled"},
                  {"id": "shift_3", "employeeId": "emp_3", "employeeName": "Carol Lee", "shiftType": "Night", "date": "2025-06-27", "status": "Scheduled"}
                ]},
                {"date": "2025-06-28", "shifts": [
                  {"id": "shift_4", "employeeId": "emp_2", "employeeName": "Bob Jones", "shiftType": "Morning", "date": "2025-06-28", "status": "Scheduled"},
                  {"id": "shift_5", "employeeId": "emp_3", "employeeName": "Carol Lee", "shiftType": "Evening", "date": "2025-06-28", "status": "Sick", "coveredBy": null},
                  {"id": "shift_6", "employeeId": "emp_4", "employeeName": "David Kim", "shiftType": "Night", "date": "2025-06-28", "status": "Open"}
                ]},
                {"date": "2025-06-29", "shifts": [
                  {"id": "shift_7", "employeeId": "emp_1", "employeeName": "Alice Smith", "shiftType": "Morning", "date": "2025-06-29", "status": "Scheduled"},
                  {"id": "shift_8", "employeeId": "emp_2", "employeeName": "Bob Jones", "shiftType": "Evening", "date": "2025-06-29", "status": "SwapRequested", "swapWith": "emp_3"},
                  {"id": "shift_9", "employeeId": "emp_3", "employeeName": "Carol Lee", "shiftType": "Night", "date": "2025-06-29", "status": "Scheduled"}
                ]},
                {"date": "2025-06-30", "shifts": [
                  {"id": "shift_10", "employeeId": "emp_4", "employeeName": "David Kim", "shiftType": "Morning", "date": "2025-06-30", "status": "Scheduled"},
                  {"id": "shift_11", "employeeId": "emp_1", "employeeName": "Alice Smith", "shiftType": "Evening", "date": "2025-06-30", "status": "Scheduled"},
                  {"id": "shift_12", "employeeId": "emp_2", "employeeName": "Bob Jones", "shiftType": "Night", "date": "2025-06-30", "status": "Covered", "coveredBy": "emp_4"}
                ]}
            ];
        }
    } catch (e) { window.sampleShifts = []; }
    renderDashboardOverview();
    // --- START THE APP ---
    init();
});

window.addEventListener('storage', function(e) {
  if (e.key === 'shiftPilotPro_settings' || e.key === 'shiftPilotPro_shifts') {
    location.reload();
  }
});