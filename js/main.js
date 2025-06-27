$(document).ready(function() {
    // --- STATE ---
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();
    let currentlyEditingShift = null;

    // --- INITIALIZATION ---
    function init() {
        DataManager.loadData(); // This now loads both settings and shifts
        populateDynamicElements();
        renderCurrentMonth();
        setupEventListeners();
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
        if (date) openModalForAdd(date);
    }

    function handleShiftClick(e) {
        e.stopPropagation();
        const shiftId = $(this).data('shift-id');
        const date = $(this).closest('.calendar-day').data('date');
        openModalForEdit(date, shiftId);
    }

    function handleSaveShift() {
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
        $('#shift-modal').show();
    }
    
    function closeModal() {
        $('#shift-modal').hide();
        currentlyEditingShift = null;
    }

    // --- START THE APP ---
    init();
});