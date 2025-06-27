$(document).ready(function() {
    // --- STATE ---
    let settings = {};

    // --- INITIALIZATION ---
    function init() {
        loadSettings();
        renderAll();
        setupEventListeners();
    }

    function loadSettings() {
        const storedSettings = localStorage.getItem('shiftPilotPro_settings');
        if (storedSettings) {
            settings = JSON.parse(storedSettings);
        } else {
            // Default structure if no settings exist
            settings = {
                employees: [],
                roles: [],
                shiftTypes: [],
                policy: {
                    defaultOffDays: [],
                    employeeOffDays: {}
                },
                colorSettings: {
                    primary: '#4a90e2',
                    secondary: '#f5f7fa',
                    danger: '#d9534f'
                },
                apiSettings: {
                    geminiApiKey: '',
                    gdriveClientId: ''
                }
            };
        }
    }

    function saveSettings() {
        localStorage.setItem('shiftPilotPro_settings', JSON.stringify(settings));
        console.log("Settings saved.");
        renderAll(); // Re-render everything to reflect changes
    }

    // --- RENDER FUNCTIONS ---
    function renderAll() {
        renderRoles();
        renderEmployees();
        renderShiftTypes();
        renderPolicySettings();
        renderColorSettings();
        renderApiSettings();
        applyColorSettings();
    }

    function renderEmployees() {
        const tableBody = $('#employees-table tbody');
        tableBody.empty();
        settings.employees.forEach(emp => {
            const role = settings.roles.find(r => r.id === emp.roleId) || { name: 'N/A' };
            const row = `
                <tr>
                    <td>${emp.name}</td>
                    <td>${role.name}</td>
                    <td><button class="delete-btn" data-type="employee" data-id="${emp.id}">Delete</button></td>
                </tr>
            `;
            tableBody.append(row);
        });
    }

    function renderRoles() {
        const rolesList = $('#roles-list');
        const employeeRoleSelect = $('#new-employee-role');
        rolesList.empty();
        employeeRoleSelect.empty();
        
        settings.roles.forEach(role => {
            const listItem = `<li>${role.name} <button class="delete-btn" data-type="role" data-id="${role.id}">Delete</button></li>`;
            rolesList.append(listItem);
            const optionItem = `<option value="${role.id}">${role.name}</option>`;
            employeeRoleSelect.append(optionItem);
        });
    }

    function renderShiftTypes() {
        const shiftTypesList = $('#shifttypes-list');
        shiftTypesList.empty();
        settings.shiftTypes.forEach(st => {
            const listItem = `<li>${st.name} (${st.startTime} - ${st.endTime}) <button class="delete-btn" data-type="shifttype" data-id="${st.id}">Delete</button></li>`;
            shiftTypesList.append(listItem);
        });
    }

    function renderPolicySettings() {
        // Default Weekend Off-Days
        $('#default-off-saturday').prop('checked', settings.policy.defaultOffDays.includes('Saturday'));
        $('#default-off-sunday').prop('checked', settings.policy.defaultOffDays.includes('Sunday'));

        // Employee Specific Off-Days
        const employeeOffDaySelect = $('#employee-off-day-select');
        employeeOffDaySelect.empty();
        settings.employees.forEach(emp => {
            employeeOffDaySelect.append(`<option value="${emp.id}">${emp.name}</option>`);
        });

        // Trigger change to load initial employee's off-days if any employee exists
        if (settings.employees.length > 0) {
            updateEmployeeOffDayCheckboxes();
        } else {
            $('#employee-off-day-checkboxes input').prop('checked', false).prop('disabled', true);
            $('#save-employee-off-days-btn').prop('disabled', true);
        }
    }
 
    function renderColorSettings() {
        $('#primary-color-picker').val(settings.colorSettings.primary);
        $('#secondary-color-picker').val(settings.colorSettings.secondary);
        $('#danger-color-picker').val(settings.colorSettings.danger);
    }

    function renderApiSettings() {
        $('#gemini-api-key').val(settings.apiSettings.geminiApiKey);
        $('#gdrive-client-id').val(settings.apiSettings.gdriveClientId);
    }

    function applyColorSettings() {
        document.documentElement.style.setProperty('--primary-color', settings.colorSettings.primary);
        document.documentElement.style.setProperty('--secondary-color', settings.colorSettings.secondary);
        document.documentElement.style.setProperty('--danger-color', settings.colorSettings.danger);
    }

     // --- EVENT LISTENERS ---
     function setupEventListeners() {
         $('#add-employee-btn').on('click', addEmployee);
         $('#add-role-btn').on('click', addRole);
         $('#add-shifttype-btn').on('click', addShiftType);
         $('#default-off-saturday').on('change', updateDefaultOffDays);
         $('#default-off-sunday').on('change', updateDefaultOffDays);
         $('#employee-off-day-select').on('change', updateEmployeeOffDayCheckboxes);
         $('#save-employee-off-days-btn').on('click', saveEmployeeOffDays);
         $('#create-backup-btn').on('click', createBackup);
         $('#restore-backup-btn').on('click', restoreBackup);
         $('#restore-file-input').on('change', handleRestoreFileSelect);
         $('#save-color-settings-btn').on('click', saveColorSettings);
         $('#save-api-settings-btn').on('click', saveApiSettings);
         // Use event delegation for delete buttons since they are created dynamically
         $('.settings-content').on('click', '.delete-btn', handleDelete);
     }

    // --- HANDLERS ---
    function addEmployee() {
        const name = $('#new-employee-name').val().trim();
        const roleId = $('#new-employee-role').val();
        if (name && roleId) {
            settings.employees.push({ id: `emp_${Date.now()}`, name, roleId });
            saveSettings();
            $('#new-employee-name').val('');
        } else {
            alert('Please provide a name and select a role.');
        }
    }

    function addRole() {
        const name = $('#new-role-name').val().trim();
        if (name) {
            settings.roles.push({ id: `role_${Date.now()}`, name });
            saveSettings();
            $('#new-role-name').val('');
        }
    }

    function addShiftType() {
        const name = $('#new-shifttype-name').val().trim();
        const startTime = $('#new-shifttype-start').val();
        const endTime = $('#new-shifttype-end').val();
        if (name && startTime && endTime) {
            settings.shiftTypes.push({ id: `st_${Date.now()}`, name, startTime, endTime });
            saveSettings();
            $('#new-shifttype-name').val('');
            $('#new-shifttype-start').val('');
            $('#new-shifttype-end').val('');
        }
    }

    function updateDefaultOffDays() {
        settings.policy.defaultOffDays = [];
        if ($('#default-off-saturday').is(':checked')) {
            settings.policy.defaultOffDays.push('Saturday');
        }
        if ($('#default-off-sunday').is(':checked')) {
            settings.policy.defaultOffDays.push('Sunday');
        }
        saveSettings();
    }

    function updateEmployeeOffDayCheckboxes() {
        const selectedEmployeeId = $('#employee-off-day-select').val();
        const checkboxes = $('#employee-off-day-checkboxes input');
        checkboxes.prop('disabled', !selectedEmployeeId);
        $('#save-employee-off-days-btn').prop('disabled', !selectedEmployeeId);

        checkboxes.prop('checked', false); // Uncheck all first

        if (selectedEmployeeId && settings.policy.employeeOffDays[selectedEmployeeId]) {
            settings.policy.employeeOffDays[selectedEmployeeId].forEach(day => {
                $(`.employee-off-day-checkbox[data-day="${day}"]`).prop('checked', true);
            });
        }
    }

    function saveEmployeeOffDays() {
        const selectedEmployeeId = $('#employee-off-day-select').val();
        if (!selectedEmployeeId) return;

        const selectedOffDays = [];
        $('#employee-off-day-checkboxes input:checked').each(function() {
            selectedOffDays.push($(this).data('day'));
        });

        settings.policy.employeeOffDays[selectedEmployeeId] = selectedOffDays;
        saveSettings();
        alert('Employee specific off-days saved!');
    }

    function saveColorSettings() {
        settings.colorSettings.primary = $('#primary-color-picker').val();
        settings.colorSettings.secondary = $('#secondary-color-picker').val();
        settings.colorSettings.danger = $('#danger-color-picker').val();
        saveSettings();
        applyColorSettings();
    }

    function saveApiSettings() {
        settings.apiSettings.geminiApiKey = $('#gemini-api-key').val();
        settings.apiSettings.gdriveClientId = $('#gdrive-client-id').val();
        saveSettings();
    }

    function handleDelete(e) {
        const target = $(e.target);
        const id = target.data('id');
        const type = target.data('type');

        if (!confirm(`Are you sure you want to delete this ${type}?`)) return;

        switch(type) {
            case 'employee':
                settings.employees = settings.employees.filter(emp => emp.id !== id);
                break;
            case 'role':
                // Prevent deleting a role if it's assigned to an employee
                const isAssigned = settings.employees.some(emp => emp.roleId === id);
                if (isAssigned) {
                    alert("Cannot delete this role because it is currently assigned to one or more employees.");
                    return;
                }
                settings.roles = settings.roles.filter(role => role.id !== id);
                break;
            case 'shifttype':
                settings.shiftTypes = settings.shiftTypes.filter(st => st.id !== id);
                break;
        }
        saveSettings();
    }

    // --- START THE APP ---
    function createBackup() {
        const password = $('#backup-password').val();
        if (!password) {
            alert('Please enter a password for the backup.');
            return;
        }
        BackupManager.createAndDownloadBackup(password);
    }

    let selectedRestoreFile = null;

    function handleRestoreFileSelect(event) {
        selectedRestoreFile = event.target.files[0];
    }

    async function restoreBackup() {
        if (!selectedRestoreFile) {
            alert('Please select a backup file to restore.');
            return;
        }

        const password = $('#backup-password').val();
        if (!password) {
            alert('Please enter the password for the backup file.');
            return;
        }

        if (!confirm('Restoring from backup will overwrite all current data. Are you sure you want to proceed?')) {
            return;
        }

        try {
            const restoredData = await BackupManager.restoreFromEncryptedZip(selectedRestoreFile, password);
            if (restoredData) {
                // Assuming restoredData contains 'shifts.json' and 'settings.json'
                if (restoredData['settings.json']) {
                    localStorage.setItem('shiftPilotPro_settings', restoredData['settings.json']);
                }
                if (restoredData['shifts.json']) {
                    localStorage.setItem('shiftPilotPro_shifts', restoredData['shifts.json']);
                }
                alert('Data restored successfully! Please refresh the page to see changes.');
                // Optionally, reload settings and render all
                loadSettings();
                renderAll();
            } else {
                alert('Failed to restore backup. Check password or file integrity.');
            }
        } catch (error) {
            console.error('Error during restore:', error);
            alert('Error restoring backup: ' + error.message);
        }
    }

    init();
    applyColorSettings();
});