// shift-mgmt.js: Shift Management Modal and Bulk Off-Days
$(document).ready(function() {
    $('#open-shift-mgmt-btn').on('click', function() {
        $('#shift-mgmt-modal').fadeIn();
        showMgmtTab('day');
    });
    $('#close-shift-mgmt-btn').on('click', function() {
        $('#shift-mgmt-modal').fadeOut();
    });
    $('.mgmt-tab-btn').on('click', function() {
        showMgmtTab($(this).data('tab'));
    });
    function showMgmtTab(tab) {
        $('.mgmt-tab-btn').removeClass('active');
        $(`.mgmt-tab-btn[data-tab="${tab}"]`).addClass('active');
        if (tab === 'offdays') renderBulkOffDays();
        else $('#shift-mgmt-content').html(`<em>${tab.charAt(0).toUpperCase()+tab.slice(1)}-wise shift management coming soon.</em>`);
    }
    function renderBulkOffDays() {
        const employees = DataManager.getEmployees();
        let html = '<h4>Bulk Off-Days Assignment</h4>';
        html += '<table class="bulk-offdays-table"><thead><tr><th>Employee</th><th>Off-Days (comma separated)</th></tr></thead><tbody>';
        employees.forEach(emp => {
            const offDays = (DataManager.getPolicySettings().employeeOffDays[emp.id]||[]).join(', ');
            html += `<tr><td>${emp.name}</td><td><input type="text" class="bulk-offdays-input" data-id="${emp.id}" value="${offDays}"></td></tr>`;
        });
        html += '</tbody></table>';
        html += '<button id="save-bulk-offdays-btn">Save All</button>';
        $('#shift-mgmt-content').html(html);
        $('#save-bulk-offdays-btn').on('click', function() {
            $('.bulk-offdays-input').each(function() {
                const empId = $(this).data('id');
                const days = $(this).val().split(',').map(d=>d.trim()).filter(Boolean);
                const settings = DataManager.settings;
                settings.policy.employeeOffDays[empId] = days;
                localStorage.setItem('shiftPilotPro_settings', JSON.stringify(settings));
            });
            alert('Bulk off-days updated!');
        });
    }
});

// --- ADVANCED SHIFT MANAGEMENT TABLE ---
$(document).ready(function() {
    async function renderShiftTable(filteredShifts) {
        const shifts = filteredShifts || DataManager.getAllShifts();
        const employees = DataManager.getEmployees();
        const shiftTypeColors = {
            'Morning': '#e3f2fd',
            'Evening': '#fff3e0',
            'Night': '#ede7f6',
            'Holiday': '#ffe0e0',
            'Default': '#f5f5f5'
        };
        const statusColors = {
            'Sick': '#d9534f',
            'Off': '#888',
            'Covered': '#5cb85c',
            'Default': '#333'
        };
        const tbody = $('#shift-table tbody');
        tbody.empty();
        shifts.forEach(shift => {
            const emp = employees.find(e => e.id === shift.employeeId);
            const typeColor = shiftTypeColors[shift.shiftType] || shiftTypeColors['Default'];
            const statusColor = statusColors[shift.status] || statusColors['Default'];
            // Detect conflicts: same employee, same date, overlapping shift type
            const conflicts = shifts.filter(s => s.employeeId === shift.employeeId && s.date === shift.date && s.id !== shift.id);
            let conflictClass = '';
            let conflictMsg = '';
            if (conflicts.length > 0) {
                conflictClass = 'conflict-row';
                conflictMsg = ' (Conflict!)';
            }
            const row = $(`
                <tr data-id="${shift.id}" class="${conflictClass}">
                    <td>${emp ? emp.name : 'Unknown'}</td>
                    <td contenteditable="true" class="edit-date">${shift.date}</td>
                    <td contenteditable="true" class="edit-type" style="background:${typeColor}">${shift.shiftType}</td>
                    <td contenteditable="true" class="edit-status" style="color:${statusColor}">${shift.status||''}${conflictMsg}</td>
                    <td>
                        <button class="delete-shift-btn">Delete</button>
                        <button class="swap-shift-btn">Request Swap</button>
                    </td>
                </tr>
            `);
            tbody.append(row);
        });
        // Enable drag-and-drop reordering
        new Sortable(tbody[0], {
            animation: 150,
            onEnd: function(evt) {
                // Optionally, update order in DataManager if needed
            }
        });
        // Inline editing: save on blur
        tbody.off('blur', '[contenteditable]');
        tbody.on('blur', '[contenteditable]', async function() {
            const row = $(this).closest('tr');
            const id = row.data('id');
            const date = row.find('.edit-date').text();
            const type = row.find('.edit-type').text();
            const status = row.find('.edit-status').text();
            const shift = shifts.find(s => s.id === id);
            if (shift) {
                shift.date = date;
                shift.shiftType = type;
                shift.status = status;
                await DataManager.updateShift(date, shift);
                await renderShiftTable();
            }
        });
        // Delete shift
        tbody.off('click', '.delete-shift-btn');
        tbody.on('click', '.delete-shift-btn', async function() {
            const row = $(this).closest('tr');
            const id = row.data('id');
            const shift = shifts.find(s => s.id === id);
            if (shift) {
                await DataManager.deleteShift(shift.date, id);
                await renderShiftTable();
            }
        });
    }
    // Initial render
    renderShiftTable();
    // Add Shift button logic (multi-day/recurring)
    $('#add-shift-btn').off('click').on('click', async function() {
        const employees = DataManager.getEmployees();
        const empName = prompt('Employee name:');
        const emp = employees.find(e => e.name === empName);
        if (!emp) return alert('Employee not found!');
        const shiftType = prompt('Shift type:');
        const status = prompt('Status (optional):');
        if ($('#recurring-checkbox').is(':checked')) {
            const pattern = $('#recurring-pattern').val();
            const start = $('#multi-day-start').val();
            const end = $('#multi-day-end').val();
            if (!start || !end) return alert('Select start and end dates.');
            let dates = [];
            let d = new Date(start);
            const endDate = new Date(end);
            while (d <= endDate) {
                if (pattern === 'daily' || (pattern === 'weekly' && d.getDay() === new Date(start).getDay())) {
                    dates.push(d.toISOString().slice(0,10));
                }
                d.setDate(d.getDate()+1);
            }
            for (const dateStr of dates) {
                await DataManager.addShift(dateStr, { employeeId: emp.id, shiftType, status });
            }
        } else {
            const date = prompt('Date (YYYY-MM-DD):');
            if (!date) return;
            await DataManager.addShift(date, { employeeId: emp.id, shiftType, status });
        }
        await renderShiftTable();
    });
    // Multi-day and recurring shift UI logic
    $('#recurring-checkbox').on('change', function() {
        if ($(this).is(':checked')) {
            $('#recurring-pattern').show();
            $('#multi-day-start').show();
            $('#multi-day-end').show();
        } else {
            $('#recurring-pattern').hide();
            $('#multi-day-start').hide();
            $('#multi-day-end').hide();
        }
    });
    // Multi-ticking for off-days/holidays
    $('#bulk-ops-btn').on('click', function() {
        const employees = DataManager.getEmployees();
        let html = '<h4>Bulk Off-Days/Holiday Assignment</h4>';
        html += '<table class="bulk-offdays-table"><thead><tr><th><input type="checkbox" id="select-all-emps"></th><th>Employee</th><th>Off-Days</th></tr></thead><tbody>';
        employees.forEach(emp => {
            html += `<tr><td><input type="checkbox" class="emp-bulk-tick" data-id="${emp.id}"></td><td>${emp.name}</td><td><input type="text" class="bulk-offdays-input" data-id="${emp.id}" placeholder="e.g. 2025-07-01, 2025-07-04"></td></tr>`;
        });
        html += '</tbody></table>';
        html += '<button id="save-bulk-offdays-btn">Save All</button>';
        $('#shift-management-widget').prepend(`<div id="bulk-ops-modal" class="modal-overlay"><div class="modal-content">${html}<button id="close-bulk-ops">Close</button></div></div>`);
        $('#close-bulk-ops').on('click', function() { $('#bulk-ops-modal').remove(); });
        $('#select-all-emps').on('change', function() {
            $('.emp-bulk-tick').prop('checked', this.checked);
        });
        $('#save-bulk-offdays-btn').on('click', function() {
            $('.emp-bulk-tick:checked').each(function() {
                const empId = $(this).data('id');
                const days = $(`.bulk-offdays-input[data-id='${empId}']`).val().split(',').map(d=>d.trim()).filter(Boolean);
                const settings = DataManager.settings;
                settings.policy.employeeOffDays[empId] = days;
                localStorage.setItem('shiftPilotPro_settings', JSON.stringify(settings));
            });
            alert('Bulk off-days/holidays updated!');
            $('#bulk-ops-modal').remove();
        });
    });
});

// --- SHIFT SWAP REQUESTS AND APPROVALS ---
$(document).ready(function() {
    // Add Swap button to each shift row
    function renderShiftTable() {
        const shifts = DataManager.getAllShifts();
        const employees = DataManager.getEmployees();
        const tbody = $('#shift-table tbody');
        tbody.empty();
        shifts.forEach(shift => {
            const emp = employees.find(e => e.id === shift.employeeId);
            const row = $(`
                <tr data-id="${shift.id}">
                    <td>${emp ? emp.name : 'Unknown'}</td>
                    <td contenteditable="true" class="edit-date">${shift.date}</td>
                    <td contenteditable="true" class="edit-type">${shift.shiftType}</td>
                    <td contenteditable="true" class="edit-status">${shift.status||''}</td>
                    <td>
                        <button class="delete-shift-btn">Delete</button>
                        <button class="swap-shift-btn">Request Swap</button>
                    </td>
                </tr>
            `);
            tbody.append(row);
        });
        // Enable drag-and-drop reordering
        new Sortable(tbody[0], {
            animation: 150,
            onEnd: function(evt) {
                // Optionally, update order in DataManager if needed
            }
        });
        // Inline editing: save on blur
        tbody.on('blur', '[contenteditable]', function() {
            const row = $(this).closest('tr');
            const id = row.data('id');
            const date = row.find('.edit-date').text();
            const type = row.find('.edit-type').text();
            const status = row.find('.edit-status').text();
            const shift = shifts.find(s => s.id === id);
            if (shift) {
                shift.date = date;
                shift.shiftType = type;
                shift.status = status;
                DataManager.updateShift(date, shift);
            }
        });
        // Delete shift
        tbody.on('click', '.delete-shift-btn', function() {
            const row = $(this).closest('tr');
            const id = row.data('id');
            const shift = shifts.find(s => s.id === id);
            if (shift) {
                DataManager.deleteShift(shift.date, id);
                renderShiftTable();
            }
        });
    }
    // Handle swap request
    $('#shift-table').on('click', '.swap-shift-btn', function() {
        const row = $(this).closest('tr');
        const id = row.data('id');
        const shift = DataManager.getAllShifts().find(s => s.id === id);
        if (!shift) return;
        const swapWith = prompt('Enter the name of the employee you want to swap with:');
        const employees = DataManager.getEmployees();
        const targetEmp = employees.find(e => e.name === swapWith);
        if (!targetEmp) return alert('Employee not found!');
        // Store swap request in localStorage
        const swapRequests = JSON.parse(localStorage.getItem('shiftPilotPro_swapRequests') || '[]');
        swapRequests.push({
            shiftId: id,
            from: shift.employeeId,
            to: targetEmp.id,
            date: shift.date,
            status: 'Pending'
        });
        localStorage.setItem('shiftPilotPro_swapRequests', JSON.stringify(swapRequests));
        alert('Swap request submitted!');
    });
    // Manager approval UI
    $('#shift-management-widget').prepend('<button id="view-swap-requests-btn">View Swap Requests</button>');
    $('#view-swap-requests-btn').on('click', function() {
        const swapRequests = JSON.parse(localStorage.getItem('shiftPilotPro_swapRequests') || '[]');
        let html = '<h4>Swap Requests</h4>';
        if (swapRequests.length === 0) html += '<p>No swap requests.</p>';
        else {
            html += '<table><thead><tr><th>From</th><th>To</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>';
            swapRequests.forEach((req, idx) => {
                const fromEmp = DataManager.getEmployees().find(e => e.id === req.from);
                const toEmp = DataManager.getEmployees().find(e => e.id === req.to);
                html += `<tr><td>${fromEmp ? fromEmp.name : req.from}</td><td>${toEmp ? toEmp.name : req.to}</td><td>${req.date}</td><td>${req.status}</td><td>`;
                if (req.status === 'Pending') {
                    html += `<button class="approve-swap-btn" data-idx="${idx}">Approve</button> <button class="deny-swap-btn" data-idx="${idx}">Deny</button>`;
                }
                html += '</td></tr>';
            });
            html += '</tbody></table>';
        }
        $('#shift-management-widget').prepend(`<div id="swap-requests-modal" class="modal-overlay"><div class="modal-content">${html}<button id="close-swap-requests">Close</button></div></div>`);
        $('#close-swap-requests').on('click', function() { $('#swap-requests-modal').remove(); });
        $('.approve-swap-btn').on('click', function() {
            const idx = $(this).data('idx');
            const swapRequests = JSON.parse(localStorage.getItem('shiftPilotPro_swapRequests') || '[]');
            const req = swapRequests[idx];
            // Perform the swap
            const shifts = DataManager.getAllShifts();
            const shift = shifts.find(s => s.id === req.shiftId);
            if (shift) {
                shift.employeeId = req.to;
                DataManager.updateShift(shift.date, shift);
            }
            req.status = 'Approved';
            localStorage.setItem('shiftPilotPro_swapRequests', JSON.stringify(swapRequests));
            alert('Swap approved!');
            $('#swap-requests-modal').remove();
            renderShiftTable();
        });
        $('.deny-swap-btn').on('click', function() {
            const idx = $(this).data('idx');
            const swapRequests = JSON.parse(localStorage.getItem('shiftPilotPro_swapRequests') || '[]');
            swapRequests[idx].status = 'Denied';
            localStorage.setItem('shiftPilotPro_swapRequests', JSON.stringify(swapRequests));
            alert('Swap denied.');
            $('#swap-requests-modal').remove();
        });
    });
});

// --- SMART SHIFT SUGGESTIONS ---
$(document).ready(function() {
    // Smart shift suggestions
    $('#shift-management-controls').append('<button id="suggest-shift-btn">Suggest Shift</button>');
    $('#suggest-shift-btn').on('click', function() {
        const employees = DataManager.getEmployees();
        const allShifts = DataManager.getAllShifts();
        // Calculate workload for each employee (shifts this month)
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
        const workload = {};
        employees.forEach(emp => {
            workload[emp.id] = allShifts.filter(s => s.employeeId === emp.id && s.date && s.date.startsWith(monthStr)).length;
        });
        // Find employees with least workload and not on off-days
        const offDays = DataManager.getPolicySettings().employeeOffDays || {};
        const todayStr = now.toISOString().slice(0,10);
        const available = employees.filter(emp => !(offDays[emp.id]||[]).includes(todayStr));
        if (available.length === 0) return alert('No available employees for today!');
        // Sort by workload, then by name
        available.sort((a, b) => workload[a.id] - workload[b.id] || a.name.localeCompare(b.name));
        const best = available[0];
        alert(`Suggested: ${best.name} (least workload: ${workload[best.id]} shifts this month)`);
    });
});

// --- BULK SHIFT OPERATIONS ---
$(document).ready(function() {
    // Bulk shift operations UI
    $('#shift-management-controls').append('<button id="bulk-select-btn">Bulk Select</button> <button id="bulk-delete-btn">Delete Selected</button> <button id="bulk-copy-btn">Copy Selected</button> <button id="bulk-move-btn">Move Selected</button>');
    let bulkMode = false;
    $('#bulk-select-btn').on('click', function() {
        bulkMode = !bulkMode;
        $('#shift-table tbody tr').toggleClass('bulk-selectable', bulkMode);
        if (bulkMode) {
            $('#shift-table tbody tr').prepend('<td><input type="checkbox" class="bulk-shift-checkbox"></td>');
        } else {
            $('#shift-table tbody tr td:first-child').remove();
        }
    });
    $('#bulk-delete-btn').on('click', function() {
        $('#shift-table tbody tr').each(function() {
            if ($(this).find('.bulk-shift-checkbox').is(':checked')) {
                const id = $(this).data('id');
                const shift = DataManager.getAllShifts().find(s => s.id === id);
                if (shift) DataManager.deleteShift(shift.date, id);
            }
        });
        renderShiftTable();
    });
    $('#bulk-copy-btn').on('click', function() {
        const selected = [];
        $('#shift-table tbody tr').each(function() {
            if ($(this).find('.bulk-shift-checkbox').is(':checked')) {
                const id = $(this).data('id');
                const shift = DataManager.getAllShifts().find(s => s.id === id);
                if (shift) selected.push(shift);
            }
        });
        if (selected.length === 0) return alert('No shifts selected.');
        const newDate = prompt('Enter new date for copied shifts (YYYY-MM-DD):');
        if (!newDate) return;
        selected.forEach(shift => {
            DataManager.addShift(newDate, { employeeId: shift.employeeId, shiftType: shift.shiftType, status: shift.status });
        });
        renderShiftTable();
    });
    $('#bulk-move-btn').on('click', function() {
        const selected = [];
        $('#shift-table tbody tr').each(function() {
            if ($(this).find('.bulk-shift-checkbox').is(':checked')) {
                const id = $(this).data('id');
                const shift = DataManager.getAllShifts().find(s => s.id === id);
                if (shift) selected.push(shift);
            }
        });
        if (selected.length === 0) return alert('No shifts selected.');
        const newDate = prompt('Enter new date for moved shifts (YYYY-MM-DD):');
        if (!newDate) return;
        selected.forEach(shift => {
            DataManager.deleteShift(shift.date, shift.id);
            DataManager.addShift(newDate, { employeeId: shift.employeeId, shiftType: shift.shiftType, status: shift.status });
        });
        renderShiftTable();
    });
});

// --- SHIFT REMINDERS & NOTIFICATIONS ---
$(document).ready(function() {
    // Load and render reminder settings
    function loadReminderSettings() {
        const settings = JSON.parse(localStorage.getItem('shiftPilotPro_reminderSettings') || '{}');
        $('#enable-shift-reminders').prop('checked', settings.enabled ?? false);
        $('#reminder-minutes').val(settings.minutesBefore ?? 30);
    }
    function saveReminderSettings() {
        const enabled = $('#enable-shift-reminders').is(':checked');
        const minutesBefore = parseInt($('#reminder-minutes').val(), 10) || 30;
        localStorage.setItem('shiftPilotPro_reminderSettings', JSON.stringify({ enabled, minutesBefore }));
        $('#reminder-status').text('Reminder settings saved.');
        if (enabled) {
            requestNotificationPermission();
        }
    }
    function requestNotificationPermission() {
        if (window.Notification && Notification.permission !== 'granted') {
            Notification.requestPermission().then(function(permission) {
                if (permission !== 'granted') {
                    $('#reminder-status').text('Notifications are blocked. Please enable them in your browser.');
                }
            });
        }
    }
    $('#save-reminder-settings-btn').on('click', saveReminderSettings);
    loadReminderSettings();
    // Periodically check for upcoming shifts and notify
    setInterval(function() {
        const reminderSettings = JSON.parse(localStorage.getItem('shiftPilotPro_reminderSettings') || '{}');
        if (!reminderSettings.enabled) return;
        if (!window.Notification || Notification.permission !== 'granted') return;
        const minutesBefore = reminderSettings.minutesBefore ?? 30;
        const now = new Date();
        const shifts = DataManager.getAllShifts();
        const employees = DataManager.getEmployees();
        const user = Auth.getCurrentUser();
        if (!user) return;
        // Only remind for shifts assigned to current user (if employee), or all if manager/admin
        const userShifts = (user.role === 'Employee')
            ? shifts.filter(s => s.employeeId === user.id)
            : shifts;
        userShifts.forEach(shift => {
            if (!shift.date || !shift.shiftType) return;
            // Assume shiftType start time is in DataManager.getShiftTypes()
            const shiftType = DataManager.getShiftTypes().find(st => st.name === shift.shiftType);
            if (!shiftType || !shiftType.startTime) return;
            const shiftDateTime = new Date(shift.date + 'T' + shiftType.startTime);
            const diffMin = Math.floor((shiftDateTime - now) / 60000);
            if (diffMin === minutesBefore && !shift._notified) {
                // Prevent duplicate notifications in this session
                shift._notified = true;
                const emp = employees.find(e => e.id === shift.employeeId);
                const msg = `Upcoming shift for ${emp ? emp.name : 'Unknown'}: ${shift.shiftType} at ${shiftType.startTime} (${shift.date})`;
                new Notification('Shift Reminder', { body: msg });
            }
        });
    }, 60000); // Check every minute
});

// --- PRINTABLE SHIFT ROSTER & EXPORT TO PDF ---
$(document).ready(function() {
    $('#print-roster-btn').on('click', function() {
        // Create a printable HTML table from the current shift table
        const shifts = DataManager.getAllShifts();
        const employees = DataManager.getEmployees();
        let html = '<h2>Shift Roster</h2>';
        html += '<table border="1" cellpadding="4" cellspacing="0" style="width:100%;border-collapse:collapse;">';
        html += '<thead><tr><th>Employee</th><th>Date</th><th>Shift Type</th><th>Status</th></tr></thead><tbody>';
        shifts.forEach(shift => {
            const emp = employees.find(e => e.id === shift.employeeId);
            html += `<tr><td>${emp ? emp.name : 'Unknown'}</td><td>${shift.date}</td><td>${shift.shiftType}</td><td>${shift.status||''}</td></tr>`;
        });
        html += '</tbody></table>';
        // Show print dialog or export to PDF
        const win = window.open('', '', 'width=900,height=700');
        win.document.write('<html><head><title>Print Shift Roster</title>');
        win.document.write('<style>body{font-family:sans-serif;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #333;padding:4px;}</style>');
        win.document.write('</head><body>');
        win.document.write(html);
        win.document.write('<br><button onclick="window.print()">Print</button>');
        win.document.write('<button id="export-pdf-btn">Export to PDF</button>');
        win.document.write('</body></html>');
        win.document.close();
        win.onload = function() {
            win.document.getElementById('export-pdf-btn').onclick = function() {
                const jsPDF = window.jspdf.jsPDF;
                const doc = new jsPDF('l', 'pt', 'a4');
                doc.html(win.document.body, {
                    callback: function (doc) {
                        doc.save('shift_roster.pdf');
                    },
                    x: 10,
                    y: 10
                });
            };
        };
    });
});

// --- ACCESSIBILITY, AUDIT TRAIL, FILTERING, MOBILE, HIGH CONTRAST ---
$(document).ready(function() {
    // High contrast toggle
    $('#toggle-contrast-btn').on('click', function() {
        $('body').toggleClass('high-contrast');
        $(this).attr('aria-pressed', $('body').hasClass('high-contrast'));
    });
    // Populate filter dropdowns
    function populateFilters() {
        const employees = DataManager.getEmployees();
        const roles = DataManager.getRoles ? DataManager.getRoles() : [];
        const statuses = ['','Scheduled','Sick','Off','Covered','Uncovered'];
        $('#filter-employee').empty().append('<option value="">All Employees</option>');
        employees.forEach(e=>$('#filter-employee').append(`<option value="${e.id}">${e.name}</option>`));
        $('#filter-role').empty().append('<option value="">All Roles</option>');
        roles.forEach(r=>$('#filter-role').append(`<option value="${r.id}">${r.name}</option>`));
        $('#filter-status').empty().append('<option value="">All Statuses</option>');
        statuses.forEach(s=>$('#filter-status').append(`<option value="${s}">${s||'All'}</option>`));
    }
    populateFilters();
    // Filtering logic
    function filterShifts() {
        const empId = $('#filter-employee').val();
        const roleId = $('#filter-role').val();
        const date = $('#filter-date').val();
        const status = $('#filter-status').val();
        const search = $('#shift-search').val().toLowerCase();
        let shifts = DataManager.getAllShifts();
        if (empId) shifts = shifts.filter(s=>s.employeeId===empId);
        if (roleId) {
            const emps = DataManager.getEmployees().filter(e=>e.roleId===roleId).map(e=>e.id);
            shifts = shifts.filter(s=>emps.includes(s.employeeId));
        }
        if (date) shifts = shifts.filter(s=>s.date===date);
        if (status) shifts = shifts.filter(s=>s.status===status);
        if (search) shifts = shifts.filter(s=>{
            const emp = DataManager.getEmployees().find(e=>e.id===s.employeeId);
            return (emp && emp.name.toLowerCase().includes(search)) ||
                (s.shiftType && s.shiftType.toLowerCase().includes(search)) ||
                (s.status && s.status.toLowerCase().includes(search));
        });
        renderShiftTable(shifts);
    }
    $('#filter-employee,#filter-role,#filter-date,#filter-status,#shift-search').on('input change', filterShifts);
    // Keyboard navigation for shift table
    $('#shift-table').attr('tabindex',0).on('keydown', function(e) {
        const $rows = $(this).find('tbody tr');
        let idx = $rows.index($rows.filter('.row-focus'));
        if (e.key === 'ArrowDown') {
            $rows.removeClass('row-focus');
            idx = Math.min(idx+1, $rows.length-1);
            $rows.eq(idx).addClass('row-focus').focus();
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            $rows.removeClass('row-focus');
            idx = Math.max(idx-1, 0);
            $rows.eq(idx).addClass('row-focus').focus();
            e.preventDefault();
        }
    });
    $('#shift-table tbody').on('focus','tr',function(){ $(this).addClass('row-focus'); }).on('blur','tr',function(){ $(this).removeClass('row-focus'); });
    // ARIA for table
    $('#shift-table').attr({'role':'table','aria-label':'Shift table'});
    $('#shift-table thead tr').attr('role','row');
    $('#shift-table thead th').attr('role','columnheader');
    $('#shift-table tbody tr').attr('role','row');
    $('#shift-table tbody td').attr('role','cell');
    // --- AUDIT TRAIL ---
    function logAudit(action, details) {
        const log = JSON.parse(localStorage.getItem('shiftPilotPro_auditLog')||'[]');
        log.unshift({ action, details, user: (Auth.getCurrentUser()||{}).name||'Unknown', time: new Date().toISOString() });
        localStorage.setItem('shiftPilotPro_auditLog', JSON.stringify(log));
    }
    // Patch DataManager shift actions
    const origAdd = DataManager.addShift;
    DataManager.addShift = function(date, shift) {
        logAudit('Add Shift', { date, shift });
        return origAdd.apply(this, arguments);
    };
    const origUpdate = DataManager.updateShift;
    DataManager.updateShift = function(date, shift) {
        logAudit('Update Shift', { date, shift });
        return origUpdate.apply(this, arguments);
    };
    const origDelete = DataManager.deleteShift;
    DataManager.deleteShift = function(date, id) {
        logAudit('Delete Shift', { date, id });
        return origDelete.apply(this, arguments);
    };
    // Audit log modal
    $('#view-audit-log-btn').on('click', function() {
        const log = JSON.parse(localStorage.getItem('shiftPilotPro_auditLog')||'[]');
        let html = '<h3>Audit Trail</h3><table style="width:100%"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead><tbody>';
        log.forEach(entry=>{
            html += `<tr><td>${new Date(entry.time).toLocaleString()}</td><td>${entry.user}</td><td>${entry.action}</td><td><pre>${JSON.stringify(entry.details,null,2)}</pre></td></tr>`;
        });
        html += '</tbody></table><button id="close-audit-log">Close</button>';
        $('#shift-management-widget').prepend(`<div id="audit-log-modal" class="modal-overlay"><div class="modal-content">${html}</div></div>`);
        $('#close-audit-log').on('click', function(){ $('#audit-log-modal').remove(); });
    });

    // --- INTELLIGENT SCHEDULING FUNCTIONALITY ---
    
    // Initialize intelligent scheduling controls
    function initializeIntelligentScheduling() {
        // Set default dates
        const today = new Date();
        const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
        
        $('#schedule-start-date').val(today.toISOString().slice(0, 10));
        $('#schedule-end-date').val(nextWeek.toISOString().slice(0, 10));
        
        // Populate quick assignment dropdowns
        populateQuickAssignmentDropdowns();
        
        // Event listeners for intelligent scheduling
        $('#generate-schedule-btn').on('click', generateOptimalSchedule);
        $('#preview-schedule-btn').on('click', previewSchedule);
        $('#analyze-current-btn').on('click', analyzeCurrentSchedule);
        $('#suggest-employees-btn').on('click', suggestEmployeesForShift);
        $('#apply-preview-btn').on('click', applyPreviewedSchedule);
        $('#cancel-preview-btn').on('click', cancelSchedulePreview);
    }

    function populateQuickAssignmentDropdowns() {
        const shiftTypes = DataManager.getShiftTypes();
        const quickShiftSelect = $('#quick-shift-type-select');
        
        quickShiftSelect.empty().append('<option value="">Select Shift Type</option>');
        shiftTypes.forEach(st => {
            quickShiftSelect.append(`<option value="${st.id}">${st.name} (${st.startTime}-${st.endTime})</option>`);
        });
        
        // Populate date dropdown with next 14 days
        const quickDateSelect = $('#quick-date-select');
        quickDateSelect.empty().append('<option value="">Select Date</option>');
        
        for (let i = 0; i < 14; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().slice(0, 10);
            const dateLabel = date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            quickDateSelect.append(`<option value="${dateStr}">${dateLabel}</option>`);
        }
    }

    async function generateOptimalSchedule() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to generate schedules.');
            return;
        }

        const startDate = new Date($('#schedule-start-date').val());
        const endDate = new Date($('#schedule-end-date').val());
        const algorithm = $('#scheduling-algorithm').val();
        const includeWeekends = $('#include-weekends').is(':checked');
        const overwrite = $('#overwrite-schedule').is(':checked');

        if (!startDate || !endDate || startDate >= endDate) {
            alert('Please select a valid date range.');
            return;
        }

        if (!overwrite) {
            // Check for existing shifts in the date range
            const hasExisting = checkForExistingShifts(startDate, endDate);
            if (hasExisting && !confirm('There are existing shifts in this date range. This will only fill gaps. Continue?')) {
                return;
            }
        }

        try {
            showSchedulingProgress('Generating optimal schedule...');
            
            const result = SchedulingEngine.generateOptimalSchedule(startDate, endDate, {
                algorithm: algorithm,
                includeWeekends: includeWeekends,
                overwriteExisting: overwrite
            });

            hideSchedulingProgress();
            
            if (result.errors.length > 0) {
                alert(`Schedule generation completed with ${result.errors.length} errors. Check the analysis for details.`);
            }

            // Apply the generated schedule
            await applyGeneratedSchedule(result.schedule, overwrite);
            
            // Show analysis
            displayScheduleAnalysis(result);
            
            // Refresh the shift table
            renderShiftTable();
            
            alert(`Schedule generated successfully! ${result.summary.totalShifts} shifts created across ${result.summary.totalDays} days.`);

        } catch (error) {
            hideSchedulingProgress();
            alert(`Error generating schedule: ${error.message}`);
        }
    }

    function previewSchedule() {
        const startDate = new Date($('#schedule-start-date').val());
        const endDate = new Date($('#schedule-end-date').val());
        const algorithm = $('#scheduling-algorithm').val();
        const includeWeekends = $('#include-weekends').is(':checked');

        if (!startDate || !endDate || startDate >= endDate) {
            alert('Please select a valid date range.');
            return;
        }

        try {
            showSchedulingProgress('Generating schedule preview...');
            
            const result = SchedulingEngine.generateOptimalSchedule(startDate, endDate, {
                algorithm: algorithm,
                includeWeekends: includeWeekends,
                preview: true
            });

            hideSchedulingProgress();
            
            // Store preview data for later application
            window.previewData = result;
            
            // Display preview
            displaySchedulePreview(result);
            $('#schedule-preview').show();
            
        } catch (error) {
            hideSchedulingProgress();
            alert(`Error generating preview: ${error.message}`);
        }
    }

    function analyzeCurrentSchedule() {
        const startDate = new Date($('#schedule-start-date').val());
        const endDate = new Date($('#schedule-end-date').val());

        if (!startDate || !endDate) {
            // Analyze current week if no dates specified
            const today = new Date();
            const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
            const weekEnd = new Date(weekStart.getTime() + (6 * 24 * 60 * 60 * 1000));
            
            $('#schedule-start-date').val(weekStart.toISOString().slice(0, 10));
            $('#schedule-end-date').val(weekEnd.toISOString().slice(0, 10));
        }

        try {
            const analysis = analyzeScheduleRange(startDate, endDate);
            displayScheduleAnalysis(analysis);
            $('#schedule-analysis').show();
        } catch (error) {
            alert(`Error analyzing schedule: ${error.message}`);
        }
    }

    function suggestEmployeesForShift() {
        const date = $('#quick-date-select').val();
        const shiftTypeId = $('#quick-shift-type-select').val();

        if (!date || !shiftTypeId) {
            alert('Please select both date and shift type.');
            return;
        }

        try {
            const suggestions = DataManager.suggestOptimalShiftAssignment(shiftTypeId, date);
            displayEmployeeSuggestions(suggestions, date, shiftTypeId);
        } catch (error) {
            alert(`Error generating suggestions: ${error.message}`);
        }
    }

    function displayEmployeeSuggestions(suggestions, date, shiftTypeId) {
        const suggestionsList = $('#employee-suggestions');
        suggestionsList.empty();

        if (suggestions.length === 0) {
            suggestionsList.html('<p>No suitable employees found for this shift.</p>');
            return;
        }

        let html = '<h4>Suggested Employees</h4>';
        suggestions.forEach((suggestion, index) => {
            html += `
                <div class="suggestion-item" data-employee-id="${suggestion.employeeId}">
                    <div class="suggestion-info">
                        <strong>#${index + 1}: ${suggestion.employeeName}</strong>
                        <span class="suggestion-role">${suggestion.role}</span>
                        <span class="suggestion-reason">${suggestion.reason}</span>
                    </div>
                    <button class="assign-suggested-btn" data-employee-id="${suggestion.employeeId}" data-date="${date}" data-shift-type="${shiftTypeId}">
                        Assign
                    </button>
                </div>
            `;
        });

        suggestionsList.html(html);

        // Add event listeners for assign buttons
        $('.assign-suggested-btn').on('click', function() {
            const employeeId = $(this).data('employee-id');
            const assignDate = $(this).data('date');
            const assignShiftType = $(this).data('shift-type');
            
            assignShiftFromSuggestion(employeeId, assignDate, assignShiftType);
        });
    }

    async function assignShiftFromSuggestion(employeeId, date, shiftTypeId) {
        try {
            const employee = DataManager.getEmployees().find(e => e.id === employeeId);
            const shiftType = DataManager.getShiftTypes().find(st => st.id === shiftTypeId);
            
            const shiftData = {
                employeeId: employeeId,
                employeeName: employee.name,
                shiftTypeId: shiftTypeId,
                shiftTypeName: shiftType.name,
                status: 'Scheduled',
                assignedBy: 'QuickAssign'
            };

            await DataManager.addShift(date, shiftData);
            
            // Refresh displays
            renderShiftTable();
            suggestEmployeesForShift(); // Refresh suggestions
            
            alert(`Successfully assigned ${employee.name} to ${shiftType.name} shift on ${date}.`);
            
        } catch (error) {
            alert(`Error assigning shift: ${error.message}`);
        }
    }

    function displayScheduleAnalysis(analysis) {
        const summaryDiv = $('#analysis-summary');
        const detailsDiv = $('#analysis-details');
        const recommendationsDiv = $('#optimization-recommendations');

        // Summary
        let summaryHtml = `
            <div class="analysis-cards">
                <div class="analysis-card">
                    <h4>Total Shifts</h4>
                    <div class="metric">${analysis.summary.totalShifts}</div>
                </div>
                <div class="analysis-card">
                    <h4>Days Covered</h4>
                    <div class="metric">${analysis.summary.totalDays}</div>
                </div>
                <div class="analysis-card">
                    <h4>Warning Rate</h4>
                    <div class="metric">${analysis.summary.warningRate}%</div>
                </div>
                <div class="analysis-card">
                    <h4>Optimization Score</h4>
                    <div class="metric">${analysis.optimization?.overallScore || 'N/A'}</div>
                </div>
            </div>
        `;
        summaryDiv.html(summaryHtml);

        // Details
        let detailsHtml = '<h4>Workload Distribution</h4>';
        if (analysis.summary.employeeWorkload) {
            detailsHtml += '<div class="workload-chart">';
            Object.entries(analysis.summary.employeeWorkload).forEach(([empId, shifts]) => {
                const employee = DataManager.getEmployees().find(e => e.id === empId);
                const name = employee ? employee.name : empId;
                const percentage = analysis.summary.totalShifts > 0 ? 
                    (shifts / analysis.summary.totalShifts * 100).toFixed(1) : 0;
                
                detailsHtml += `
                    <div class="workload-bar">
                        <span class="employee-name">${name}</span>
                        <div class="bar-container">
                            <div class="bar-fill" style="width: ${Math.min(percentage * 2, 100)}%"></div>
                        </div>
                        <span class="shift-count">${shifts} shifts (${percentage}%)</span>
                    </div>
                `;
            });
            detailsHtml += '</div>';
        }
        detailsDiv.html(detailsHtml);

        // Recommendations
        if (analysis.optimization?.recommendations) {
            let recHtml = '<h4>Optimization Recommendations</h4><ul>';
            analysis.optimization.recommendations.forEach(rec => {
                recHtml += `<li>${rec}</li>`;
            });
            recHtml += '</ul>';
            recommendationsDiv.html(recHtml);
        }

        $('#schedule-analysis').show();
    }

    function displaySchedulePreview(result) {
        const previewTable = $('#preview-schedule-table');
        const headerRow = $('#preview-schedule-header');
        const bodySection = $('#preview-schedule-body');
        
        // Clear previous content
        headerRow.empty();
        bodySection.empty();

        if (!result.schedule || result.schedule.length === 0) {
            bodySection.html('<tr><td colspan="100%">No shifts to preview</td></tr>');
            return;
        }

        // Build header with dates
        headerRow.append('<th>Employee</th>');
        result.schedule.forEach(day => {
            const date = new Date(day.date);
            headerRow.append(`<th>${date.toLocaleDateString()}</th>`);
        });

        // Build rows for each employee
        const employees = DataManager.getEmployees();
        employees.forEach(employee => {
            const row = $(`<tr><td>${employee.name}</td></tr>`);
            
            result.schedule.forEach(day => {
                const empShifts = day.shifts.filter(s => s.employeeId === employee.id);
                let cellContent = '';
                
                if (empShifts.length > 0) {
                    cellContent = empShifts.map(s => s.shiftTypeName).join(', ');
                }
                
                const cellClass = empShifts.length > 0 ? 'has-shift' : 'no-shift';
                row.append(`<td class="${cellClass}">${cellContent}</td>`);
            });
            
            bodySection.append(row);
        });
    }

    async function applyPreviewedSchedule() {
        if (!window.previewData) {
            alert('No preview data available.');
            return;
        }

        if (!confirm('Apply the previewed schedule? This will create all the shifts shown in the preview.')) {
            return;
        }

        try {
            await applyGeneratedSchedule(window.previewData.schedule, false);
            renderShiftTable();
            cancelSchedulePreview();
            alert('Schedule applied successfully!');
        } catch (error) {
            alert(`Error applying schedule: ${error.message}`);
        }
    }

    function cancelSchedulePreview() {
        $('#schedule-preview').hide();
        window.previewData = null;
    }

    async function applyGeneratedSchedule(schedule, overwrite) {
        for (const day of schedule) {
            for (const shift of day.shifts) {
                // Check if shift already exists (unless overwriting)
                if (!overwrite) {
                    const existing = DataManager.getShiftsForDate(day.date).find(s => 
                        s.employeeId === shift.employeeId && s.shiftTypeId === shift.shiftTypeId
                    );
                    if (existing) {
                        continue; // Skip existing shifts
                    }
                }
                
                await DataManager.addShift(day.date, shift);
            }
        }
    }

    function checkForExistingShifts(startDate, endDate) {
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            const shifts = DataManager.getShiftsForDate(dateStr);
            if (shifts.length > 0) {
                return true;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return false;
    }

    function analyzeScheduleRange(startDate, endDate) {
        // Create a mock result structure for existing schedule analysis
        const schedule = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            const shifts = DataManager.getShiftsForDate(dateStr);
            
            schedule.push({
                date: dateStr,
                shifts: shifts,
                coverage: {},
                warnings: []
            });
            
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            schedule: schedule,
            summary: SchedulingEngine.generateScheduleSummary(schedule),
            optimization: SchedulingEngine.analyzeScheduleOptimization(schedule)
        };
    }

    function showSchedulingProgress(message) {
        // Show a loading indicator
        const progressHtml = `
            <div id="scheduling-progress" class="progress-overlay">
                <div class="progress-content">
                    <div class="spinner"></div>
                    <p>${message}</p>
                </div>
            </div>
        `;
        $('body').append(progressHtml);
    }

    function hideSchedulingProgress() {
        $('#scheduling-progress').remove();
    }

    // Initialize intelligent scheduling when document is ready
    initializeIntelligentScheduling();
});
