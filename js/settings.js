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
                // Enhanced shift management settings
                shiftRules: {
                    capacityRules: [], // { shiftTypeId, roleId, minRequired, maxAllowed }
                    constraints: {
                        minHoursBetween: 8,
                        maxConsecutiveDays: 7,
                        maxWeeklyHours: 40,
                        maxDailyHours: 12
                    }
                },
                shiftTemplates: [], // { id, name, patternType, description, pattern }
                rotationSettings: {
                    enableAutoRotation: false,
                    rotationPeriod: 14,
                    rotationStartDate: null,
                    fairnessAlgorithm: 'round-robin'
                },
                departments: [], // { id, name, managerId, budgetCode }
                locations: [], // { id, name, address, timeZone }
                compliance: {
                    breakRules: {
                        minBreakDuration: 15,
                        breakFrequency: 4,
                        mealBreakDuration: 30,
                        mealBreakAfter: 6,
                        unpaidMealBreaks: true
                    },
                    overtimeRules: {
                        regularDailyHours: 8,
                        regularWeeklyHours: 40,
                        overtimeRate: 1.5,
                        doubleTimeAfter: 12,
                        weekendOvertime: false,
                        holidayOvertime: true
                    }
                },
                workflows: {
                    shiftSwaps: {
                        enabled: true,
                        swapDeadline: 24,
                        maxPendingSwaps: 3,
                        approvalLevel: 'manager'
                    },
                    approvals: {
                        autoApproveSameRole: false,
                        requireDeptApproval: true,
                        approvalTimeout: 48,
                        notificationMethod: 'in-app'
                    }
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
        renderShiftRules();
        renderShiftTemplates();
        renderDepartments();
        renderLocations();
        renderComplianceSettings();
        renderWorkflowSettings();
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

    // --- NEW RENDER FUNCTIONS FOR ADVANCED SETTINGS ---

    function renderShiftRules() {
        // Render shift capacity rules table
        const capacityTableBody = $('#shift-capacity-table tbody');
        capacityTableBody.empty();
        
        settings.shiftRules.capacityRules.forEach(rule => {
            const shiftType = settings.shiftTypes.find(st => st.id === rule.shiftTypeId) || { name: 'Unknown' };
            const role = settings.roles.find(r => r.id === rule.roleId) || { name: 'Unknown' };
            const row = `
                <tr>
                    <td>${shiftType.name}</td>
                    <td>${role.name}</td>
                    <td>${rule.minRequired}</td>
                    <td>${rule.maxAllowed}</td>
                    <td><button class="delete-btn" data-type="capacity-rule" data-id="${rule.id}">Delete</button></td>
                </tr>
            `;
            capacityTableBody.append(row);
        });

        // Populate dropdowns for adding capacity rules
        const capacityShiftSelect = $('#capacity-shift-select');
        const capacityRoleSelect = $('#capacity-role-select');
        
        capacityShiftSelect.empty();
        capacityRoleSelect.empty();
        
        settings.shiftTypes.forEach(st => {
            capacityShiftSelect.append(`<option value="${st.id}">${st.name}</option>`);
        });
        
        settings.roles.forEach(role => {
            capacityRoleSelect.append(`<option value="${role.id}">${role.name}</option>`);
        });

        // Render time constraints
        $('#min-hours-between').val(settings.shiftRules.constraints.minHoursBetween);
        $('#max-consecutive-days').val(settings.shiftRules.constraints.maxConsecutiveDays);
        $('#max-weekly-hours').val(settings.shiftRules.constraints.maxWeeklyHours);
        $('#max-daily-hours').val(settings.shiftRules.constraints.maxDailyHours);
    }

    function renderShiftTemplates() {
        const templatesTableBody = $('#shift-templates-table tbody');
        templatesTableBody.empty();
        
        settings.shiftTemplates.forEach(template => {
            const row = `
                <tr>
                    <td>${template.name}</td>
                    <td>${template.patternType}</td>
                    <td>${template.description}</td>
                    <td>
                        <button class="delete-btn" data-type="shift-template" data-id="${template.id}">Delete</button>
                        <button class="preview-template-btn" data-id="${template.id}">Preview</button>
                    </td>
                </tr>
            `;
            templatesTableBody.append(row);
        });

        // Render rotation settings
        $('#enable-auto-rotation').prop('checked', settings.rotationSettings.enableAutoRotation);
        $('#rotation-period').val(settings.rotationSettings.rotationPeriod);
        $('#rotation-start-date').val(settings.rotationSettings.rotationStartDate || '');
        $('#fairness-algorithm').val(settings.rotationSettings.fairnessAlgorithm);
        
        // Update pattern configuration dropdowns
        updatePatternConfigDropdowns();
        
        // Update apply template dropdown
        const applySelect = $('#apply-template-select');
        applySelect.empty().append('<option value="">Select a Template</option>');
        settings.shiftTemplates.forEach(template => {
            applySelect.append(`<option value="${template.id}">${template.name}</option>`);
        });
        
        // Update apply employees dropdown
        const employeesSelect = $('#apply-employees-select');
        employeesSelect.empty();
        settings.employees.forEach(emp => {
            employeesSelect.append(`<option value="${emp.id}">${emp.name}</option>`);
        });
    }

    function updatePatternConfigDropdowns() {
        // Update shift type dropdowns
        const rotatingSelect = $('#rotating-shift-select');
        const dayShiftSelects = $('.day-shift-select');
        
        rotatingSelect.empty();
        dayShiftSelects.empty();
        
        settings.shiftTypes.forEach(st => {
            rotatingSelect.append(`<option value="${st.id}">${st.name}</option>`);
            dayShiftSelects.append(`<option value="${st.id}">${st.name}</option>`);
        });
    }

    function renderDepartments() {
        const departmentsTableBody = $('#departments-table tbody');
        const deptManagerSelect = $('#dept-manager-select');
        
        departmentsTableBody.empty();
        deptManagerSelect.empty().append('<option value="">Select Manager</option>');
        
        // Populate manager dropdown
        settings.employees.forEach(emp => {
            deptManagerSelect.append(`<option value="${emp.id}">${emp.name}</option>`);
        });

        settings.departments.forEach(dept => {
            const manager = settings.employees.find(e => e.id === dept.managerId) || { name: 'N/A' };
            const row = `
                <tr>
                    <td>${dept.name}</td>
                    <td>${manager.name}</td>
                    <td>${dept.budgetCode}</td>
                    <td><button class="delete-btn" data-type="department" data-id="${dept.id}">Delete</button></td>
                </tr>
            `;
            departmentsTableBody.append(row);
        });
    }

    function renderLocations() {
        const locationsTableBody = $('#locations-table tbody');
        locationsTableBody.empty();
        
        settings.locations.forEach(location => {
            const row = `
                <tr>
                    <td>${location.name}</td>
                    <td>${location.address}</td>
                    <td>${location.timeZone}</td>
                    <td><button class="delete-btn" data-type="location" data-id="${location.id}">Delete</button></td>
                </tr>
            `;
            locationsTableBody.append(row);
        });
    }

    function renderComplianceSettings() {
        // Break rules
        $('#min-break-duration').val(settings.compliance.breakRules.minBreakDuration);
        $('#break-frequency').val(settings.compliance.breakRules.breakFrequency);
        $('#meal-break-duration').val(settings.compliance.breakRules.mealBreakDuration);
        $('#meal-break-after').val(settings.compliance.breakRules.mealBreakAfter);
        $('#unpaid-meal-breaks').prop('checked', settings.compliance.breakRules.unpaidMealBreaks);

        // Overtime rules
        $('#regular-daily-hours').val(settings.compliance.overtimeRules.regularDailyHours);
        $('#regular-weekly-hours').val(settings.compliance.overtimeRules.regularWeeklyHours);
        $('#overtime-rate').val(settings.compliance.overtimeRules.overtimeRate);
        $('#double-time-after').val(settings.compliance.overtimeRules.doubleTimeAfter);
        $('#weekend-overtime').prop('checked', settings.compliance.overtimeRules.weekendOvertime);
        $('#holiday-overtime').prop('checked', settings.compliance.overtimeRules.holidayOvertime);
    }

    function renderWorkflowSettings() {
        // Shift swap settings
        $('#enable-shift-swaps').prop('checked', settings.workflows.shiftSwaps.enabled);
        $('#swap-deadline').val(settings.workflows.shiftSwaps.swapDeadline);
        $('#max-pending-swaps').val(settings.workflows.shiftSwaps.maxPendingSwaps);
        $('#swap-approval-level').val(settings.workflows.shiftSwaps.approvalLevel);

        // Approval workflow settings
        $('#auto-approve-same-role').prop('checked', settings.workflows.approvals.autoApproveSameRole);
        $('#require-dept-approval').prop('checked', settings.workflows.approvals.requireDeptApproval);
        $('#approval-timeout').val(settings.workflows.approvals.approvalTimeout);
        $('#notification-method').val(settings.workflows.approvals.notificationMethod);
    }

     // --- EVENT LISTENERS ---
     function setupEventListeners() {
         // Existing event listeners
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

         // New advanced settings event listeners
         $('#add-capacity-rule-btn').on('click', addCapacityRule);
         $('#save-constraints-btn').on('click', saveTimeConstraints);
         $('#add-template-btn').on('click', addShiftTemplate);
         $('#save-rotation-settings-btn').on('click', saveRotationSettings);
         $('#add-department-btn').on('click', addDepartment);
         $('#add-location-btn').on('click', addLocation);
         $('#save-break-rules-btn').on('click', saveBreakRules);
         $('#save-overtime-rules-btn').on('click', saveOvertimeRules);
         $('#save-swap-settings-btn').on('click', saveSwapSettings);
         $('#save-workflow-settings-btn').on('click', saveWorkflowSettings);

         // Pattern management event listeners
         $('#template-pattern-type').on('change', togglePatternConfig);
         $('#apply-pattern-btn').on('click', applySelectedPattern);
         $('#preview-pattern-btn').on('click', previewSelectedPattern);
         $('.use-pattern-btn').on('click', usePredefinedPattern);
         $('#add-custom-rule-btn').on('click', addCustomRule);

         // Use event delegation for delete buttons since they are created dynamically
         $('.settings-content').on('click', '.delete-btn', handleDelete);
         $('.settings-content').on('click', '.remove-rule-btn', removeCustomRule);
         $('.settings-content').on('click', '.preview-template-btn', previewTemplate);
     }

    // --- HANDLERS ---
    // RBAC utility
    function hasRole(roles) {
        const user = Auth.getCurrentUser();
        if (!user) return false;
        if (Array.isArray(roles)) return roles.includes(user.role);
        return user.role === roles;
    }

    // --- NEW ADVANCED SETTINGS HANDLERS ---

    function addCapacityRule() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to modify capacity rules.');
            return;
        }
        const shiftTypeId = $('#capacity-shift-select').val();
        const roleId = $('#capacity-role-select').val();
        const minRequired = parseInt($('#min-capacity').val()) || 0;
        const maxAllowed = parseInt($('#max-capacity').val()) || 1;

        if (shiftTypeId && roleId && maxAllowed >= minRequired) {
            settings.shiftRules.capacityRules.push({
                id: `cap_${Date.now()}`,
                shiftTypeId,
                roleId,
                minRequired,
                maxAllowed
            });
            saveSettings();
            $('#min-capacity, #max-capacity').val('');
        } else {
            alert('Please select shift type, role and ensure max >= min capacity.');
        }
    }

    function saveTimeConstraints() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to modify time constraints.');
            return;
        }
        settings.shiftRules.constraints = {
            minHoursBetween: parseInt($('#min-hours-between').val()) || 8,
            maxConsecutiveDays: parseInt($('#max-consecutive-days').val()) || 7,
            maxWeeklyHours: parseInt($('#max-weekly-hours').val()) || 40,
            maxDailyHours: parseInt($('#max-daily-hours').val()) || 12
        };
        saveSettings();
        alert('Time constraints saved successfully!');
    }

    function addShiftTemplate() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to add shift templates.');
            return;
        }
        const name = $('#template-name').val().trim();
        const patternType = $('#template-pattern-type').val();
        const description = $('#template-description').val().trim();

        if (name && patternType && description) {
            const template = {
                id: `template_${Date.now()}`,
                name,
                patternType,
                description
            };

            // Add pattern-specific configuration
            switch(patternType) {
                case 'rotating':
                    template.pattern = $('#rotating-pattern').val().split(',').map(v => parseInt(v.trim()));
                    template.offset = parseInt($('#rotating-offset').val()) || 0;
                    template.defaultShiftTypeId = $('#rotating-shift-select').val();
                    break;
                case 'fixed':
                    template.weeklySchedule = {};
                    $('.day-schedule').each(function() {
                        const day = $(this).data('day');
                        const selectedShifts = $(this).find('.day-shift-select').val() || [];
                        if (selectedShifts.length > 0) {
                            template.weeklySchedule[day] = selectedShifts.map(shiftId => ({ shiftTypeId: shiftId }));
                        }
                    });
                    break;
                case 'split':
                    template.shiftRotation = $('#split-rotation').val().split(',').map(s => s.trim());
                    template.includeWeekends = $('#split-weekends').is(':checked');
                    break;
                case 'custom':
                    template.customRules = getCurrentCustomRules();
                    break;
            }

            settings.shiftTemplates.push(template);
            saveSettings();
            $('#template-name, #template-description').val('');
            resetPatternConfig();
        } else {
            alert('Please provide name, pattern type and description.');
        }
    }

    function togglePatternConfig() {
        const selectedType = $('#template-pattern-type').val();
        $('.pattern-config-option').hide();
        $(`#${selectedType}-config`).show();
    }

    function resetPatternConfig() {
        $('#rotating-pattern').val('1,1,0,0');
        $('#rotating-offset').val('2');
        $('#split-rotation').val('Morning,Evening,Night');
        $('#split-weekends').prop('checked', false);
        $('.day-shift-select').val([]);
        $('#custom-rules-list').empty();
    }

    async function applySelectedPattern() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to apply patterns.');
            return;
        }

        const templateId = $('#apply-template-select').val();
        const startDate = $('#apply-start-date').val();
        const endDate = $('#apply-end-date').val();
        const selectedEmployees = $('#apply-employees-select').val() || [];
        const overwrite = $('#overwrite-existing').is(':checked');

        if (!templateId || !startDate || !endDate) {
            alert('Please select template and date range.');
            return;
        }

        if (!confirm('This will generate shifts based on the selected pattern. Continue?')) {
            return;
        }

        try {
            const result = await ShiftPatterns.bulkApplyPattern(templateId, startDate, endDate, {
                employeeIds: selectedEmployees.length > 0 ? selectedEmployees : null,
                overwrite: overwrite
            });

            if (result.success) {
                alert(`Success! Generated ${result.shiftsGenerated} shifts using the pattern.`);
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            alert(`Error applying pattern: ${error.message}`);
        }
    }

    function previewSelectedPattern() {
        const templateId = $('#apply-template-select').val();
        const startDate = $('#apply-start-date').val();
        const endDate = $('#apply-end-date').val();
        const selectedEmployees = $('#apply-employees-select').val() || [];

        if (!templateId || !startDate || !endDate) {
            alert('Please select template and date range.');
            return;
        }

        try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
            
            const analysis = ShiftPatterns.analyzePatternCoverage(templateId, start, durationDays);
            displayPatternPreview(analysis, start, durationDays);
            $('#pattern-preview').show();
        } catch (error) {
            alert(`Error previewing pattern: ${error.message}`);
        }
    }

    function displayPatternPreview(analysis, startDate, durationDays) {
        // Display analysis summary
        const analysisHtml = `
            <div class="analysis-summary">
                <p><strong>Total Shifts:</strong> ${analysis.totalShifts}</p>
                <p><strong>Pattern Coverage:</strong> ${Object.keys(analysis.coverage).length} days</p>
                <p><strong>Employees Involved:</strong> ${Object.keys(analysis.employeeWorkload).length}</p>
            </div>
        `;
        $('#preview-analysis').html(analysisHtml);

        // Create preview table
        const table = $('#preview-table');
        const headerRow = $('#preview-header');
        const bodySection = $('#preview-body');
        
        // Clear previous content
        headerRow.empty();
        bodySection.empty();

        // Build header with dates
        headerRow.append('<th>Employee</th>');
        for (let day = 0; day < Math.min(durationDays, 14); day++) { // Show max 14 days
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + day);
            headerRow.append(`<th>${date.toLocaleDateString()}</th>`);
        }

        // Build rows for each employee
        Object.entries(analysis.employeeWorkload).forEach(([empId, workload]) => {
            const row = $(`<tr><td>${workload.name}</td></tr>`);
            
            for (let day = 0; day < Math.min(durationDays, 14); day++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + day);
                const dateStr = date.toISOString().slice(0, 10);
                
                const hasShift = workload.shiftDates.includes(dateStr);
                const cellContent = hasShift ? '✓' : '';
                const cellClass = hasShift ? 'has-shift' : 'no-shift';
                row.append(`<td class="${cellClass}">${cellContent}</td>`);
            }
            
            bodySection.append(row);
        });
    }

    function usePredefinedPattern() {
        const patternKey = $(this).closest('.pattern-card').data('pattern');
        const predefinedPatterns = ShiftPatterns.getPredefinedPatterns();
        const pattern = predefinedPatterns[patternKey];
        
        if (pattern) {
            $('#template-name').val(pattern.name);
            $('#template-pattern-type').val(pattern.type);
            $('#template-description').val(pattern.description);
            
            if (pattern.type === 'rotating' && pattern.pattern) {
                $('#rotating-pattern').val(pattern.pattern.join(','));
            }
            
            togglePatternConfig();
        }
    }

    function addCustomRule() {
        const ruleHtml = `
            <div class="custom-rule">
                <h5>Custom Rule ${$('#custom-rules-list .custom-rule').length + 1}</h5>
                <label>Rule Name: <input type="text" class="rule-name" placeholder="Rule Name"></label>
                <label>Shift Type: <select class="rule-shift-type"></select></label>
                <label>Apply to Roles: <select class="rule-roles" multiple></select></label>
                <label>Days of Week: <select class="rule-days" multiple>
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                </select></label>
                <label>Frequency (every N days): <input type="number" class="rule-frequency" min="1" value="1"></label>
                <button class="remove-rule-btn">Remove Rule</button>
            </div>
        `;
        
        $('#custom-rules-list').append(ruleHtml);
        
        // Populate dropdowns in the new rule
        const newRule = $('#custom-rules-list .custom-rule').last();
        const shiftSelect = newRule.find('.rule-shift-type');
        const roleSelect = newRule.find('.rule-roles');
        
        settings.shiftTypes.forEach(st => {
            shiftSelect.append(`<option value="${st.id}">${st.name}</option>`);
        });
        
        settings.roles.forEach(role => {
            roleSelect.append(`<option value="${role.id}">${role.name}</option>`);
        });
    }

    function getCurrentCustomRules() {
        const rules = [];
        $('#custom-rules-list .custom-rule').each(function() {
            const rule = {
                id: `rule_${Date.now()}_${Math.random()}`,
                name: $(this).find('.rule-name').val(),
                shiftTypeId: $(this).find('.rule-shift-type').val(),
                roleIds: $(this).find('.rule-roles').val() || [],
                dayOfWeek: $(this).find('.rule-days').val() || [],
                frequency: parseInt($(this).find('.rule-frequency').val()) || 1
            };
            
            if (rule.name && rule.shiftTypeId) {
                rules.push(rule);
            }
        });
        
        return rules;
    }

    function removeCustomRule() {
        $(this).closest('.custom-rule').remove();
    }

    function previewTemplate() {
        const templateId = $(this).data('id');
        $('#apply-template-select').val(templateId);
        
        // Set default dates (next 14 days)
        const today = new Date();
        const twoWeeksLater = new Date(today.getTime() + (14 * 24 * 60 * 60 * 1000));
        
        $('#apply-start-date').val(today.toISOString().slice(0, 10));
        $('#apply-end-date').val(twoWeeksLater.toISOString().slice(0, 10));
        
        // Trigger preview
        previewSelectedPattern();
        
        // Scroll to preview section
        $('#pattern-preview')[0].scrollIntoView({ behavior: 'smooth' });
    }

    function saveRotationSettings() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to modify rotation settings.');
            return;
        }
        settings.rotationSettings = {
            enableAutoRotation: $('#enable-auto-rotation').is(':checked'),
            rotationPeriod: parseInt($('#rotation-period').val()) || 14,
            rotationStartDate: $('#rotation-start-date').val() || null,
            fairnessAlgorithm: $('#fairness-algorithm').val()
        };
        saveSettings();
        alert('Rotation settings saved successfully!');
    }

    function addDepartment() {
        if (!hasRole(['HR', 'Super Admin'])) {
            alert('You do not have permission to add departments.');
            return;
        }
        const name = $('#dept-name').val().trim();
        const managerId = $('#dept-manager-select').val();
        const budgetCode = $('#dept-budget-code').val().trim();

        if (name) {
            settings.departments.push({
                id: `dept_${Date.now()}`,
                name,
                managerId,
                budgetCode
            });
            saveSettings();
            $('#dept-name, #dept-budget-code').val('');
            $('#dept-manager-select').val('');
        } else {
            alert('Please provide department name.');
        }
    }

    function addLocation() {
        if (!hasRole(['HR', 'Super Admin'])) {
            alert('You do not have permission to add locations.');
            return;
        }
        const name = $('#location-name').val().trim();
        const address = $('#location-address').val().trim();
        const timeZone = $('#location-timezone').val();

        if (name && address) {
            settings.locations.push({
                id: `loc_${Date.now()}`,
                name,
                address,
                timeZone
            });
            saveSettings();
            $('#location-name, #location-address').val('');
        } else {
            alert('Please provide location name and address.');
        }
    }

    function saveBreakRules() {
        if (!hasRole(['HR', 'Super Admin'])) {
            alert('You do not have permission to modify break rules.');
            return;
        }
        settings.compliance.breakRules = {
            minBreakDuration: parseInt($('#min-break-duration').val()) || 15,
            breakFrequency: parseInt($('#break-frequency').val()) || 4,
            mealBreakDuration: parseInt($('#meal-break-duration').val()) || 30,
            mealBreakAfter: parseInt($('#meal-break-after').val()) || 6,
            unpaidMealBreaks: $('#unpaid-meal-breaks').is(':checked')
        };
        saveSettings();
        alert('Break rules saved successfully!');
    }

    function saveOvertimeRules() {
        if (!hasRole(['HR', 'Super Admin'])) {
            alert('You do not have permission to modify overtime rules.');
            return;
        }
        settings.compliance.overtimeRules = {
            regularDailyHours: parseInt($('#regular-daily-hours').val()) || 8,
            regularWeeklyHours: parseInt($('#regular-weekly-hours').val()) || 40,
            overtimeRate: parseFloat($('#overtime-rate').val()) || 1.5,
            doubleTimeAfter: parseInt($('#double-time-after').val()) || 12,
            weekendOvertime: $('#weekend-overtime').is(':checked'),
            holidayOvertime: $('#holiday-overtime').is(':checked')
        };
        saveSettings();
        alert('Overtime rules saved successfully!');
    }

    function saveSwapSettings() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to modify swap settings.');
            return;
        }
        settings.workflows.shiftSwaps = {
            enabled: $('#enable-shift-swaps').is(':checked'),
            swapDeadline: parseInt($('#swap-deadline').val()) || 24,
            maxPendingSwaps: parseInt($('#max-pending-swaps').val()) || 3,
            approvalLevel: $('#swap-approval-level').val()
        };
        saveSettings();
        alert('Shift swap settings saved successfully!');
    }

    function saveWorkflowSettings() {
        if (!hasRole(['Manager', 'Super Admin'])) {
            alert('You do not have permission to modify workflow settings.');
            return;
        }
        settings.workflows.approvals = {
            autoApproveSameRole: $('#auto-approve-same-role').is(':checked'),
            requireDeptApproval: $('#require-dept-approval').is(':checked'),
            approvalTimeout: parseInt($('#approval-timeout').val()) || 48,
            notificationMethod: $('#notification-method').val()
        };
        saveSettings();
        alert('Workflow settings saved successfully!');
    }

    function addEmployee() {
        if (!hasRole(['HR', 'Super Admin'])) {
            alert('You do not have permission to add employees.');
            return;
        }
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
        if (!hasRole(['HR', 'Super Admin'])) {
            alert('You do not have permission to add roles.');
            return;
        }
        const name = $('#new-role-name').val().trim();
        if (name) {
            settings.roles.push({ id: `role_${Date.now()}`, name });
            saveSettings();
            $('#new-role-name').val('');
        }
    }

    function addShiftType() {
        if (!hasRole(['HR', 'Super Admin'])) {
            alert('You do not have permission to add shift types.');
            return;
        }
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
        if (!hasRole(['HR', 'Super Admin'])) {
            alert('You do not have permission to delete items.');
            return;
        }
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
            case 'capacity-rule':
                settings.shiftRules.capacityRules = settings.shiftRules.capacityRules.filter(rule => rule.id !== id);
                break;
            case 'shift-template':
                settings.shiftTemplates = settings.shiftTemplates.filter(template => template.id !== id);
                break;
            case 'department':
                settings.departments = settings.departments.filter(dept => dept.id !== id);
                break;
            case 'location':
                settings.locations = settings.locations.filter(loc => loc.id !== id);
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

    window.addEventListener('storage', function(e) {
      if (e.key === 'shiftPilotPro_settings') {
        location.reload();
      }
    });
});