$(document).ready(function() {
    // --- STATE ---
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth();
    let currentlyEditingShift = null; // Holds shift data if editing, null if adding

    // --- INITIALIZATION ---
    function init() {
        DataManager.loadShifts();
        populateStaticElements();
        renderCurrentMonth();
        setupEventListeners();
    }

    function renderCurrentMonth() {
        Calendar.render(currentYear, currentMonth);
    }

    function populateStaticElements() {
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

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Calendar Navigation
        $('#prev-month-btn').on('click', navigateToPrevMonth);
        $('#next-month-btn').on('click', navigateToNextMonth);
        
        // Modal Triggers
        $('#calendar-grid').on('click', '.calendar-day', handleDayClick);
        $('#calendar-grid').on('click', '.shifts-list li', handleShiftClick);

        // Modal Actions
        $('#save-shift-btn').on('click', handleSaveShift);
        $('#delete-shift-btn').on('click', handleDeleteShift);
        $('#close-modal-btn').on('click', closeModal);
        $('.modal-overlay').on('click', function(e) {
            if (e.target === this) closeModal();
        });

        // Export
        $('#export-csv-btn').on('click', handleExport);
    }

    // --- EVENT HANDLERS ---
    function navigateToPrevMonth() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCurrentMonth();
    }

    function navigateToNextMonth() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCurrentMonth();
    }

    function handleDayClick(e) {
        // Prevent opening modal when clicking on an existing shift
        if ($(e.target).closest('.shifts-list li').length) return;

        const date = $(this).data('date');
        if (date) {
            openModalForAdd(date);
        }
    }

    function handleShiftClick(e) {
        e.stopPropagation(); // Prevent day click from firing
        const shiftId = $(this).data('shift-id');
        const date = $(this).closest('.calendar-day').data('date');
        openModalForEdit(date, shiftId);
    }

    function handleSaveShift() {
        const date = $('#modal-selected-date').val();
        const employeeId = $('#employee-select').val();
        const shiftType = $('#shift-type-select').val();
        
        if (!employeeId || !shiftType) {
            alert('Please select an employee and a shift type.');
            return;
        }

        if (currentlyEditingShift) {
            // Update existing shift
            const updatedShift = {
                ...currentlyEditingShift,
                employeeId,
                shiftType
            };
            DataManager.updateShift(date, updatedShift);
        } else {
            // Add new shift
            const newShift = {
                employeeId,
                shiftType
            };
            DataManager.addShift(date, newShift);
        }
        
        closeModal();
        renderCurrentMonth();
    }

    function handleDeleteShift() {
        if (!currentlyEditingShift) return;
        
        const date = $('#modal-selected-date').val();
        const shiftId = currentlyEditingShift.id;

        if (confirm('Are you sure you want to delete this shift?')) {
            DataManager.deleteShift(date, shiftId);
            closeModal();
            renderCurrentMonth();
        }
    }
    
    function handleExport() {
        DataManager.exportToCSV(currentYear, currentMonth);
    }

    // --- MODAL HELPERS ---
    function openModalForAdd(date) {
        currentlyEditingShift = null;
        $('#modal-selected-date').val(date);
        $('#modal-date-display').text(`Date: ${date}`);
        $('#modal-title').text('Add Shift');
        $('#delete-shift-btn').hide();
        $('#shift-modal').show();
        // Reset form
        $('#employee-select').val($('#employee-select option:first').val());
        $('#shift-type-select').val($('#shift-type-select option:first').val());
    }

    function openModalForEdit(date, shiftId) {
        const shiftsOnDate = DataManager.getShiftsForDate(date);
        const shiftToEdit = shiftsOnDate.find(s => s.id === shiftId);

        if (!shiftToEdit) return;

        currentlyEditingShift = shiftToEdit;
        $('#modal-selected-date').val(date);
        $('#modal-date-display').text(`Date: ${date}`);
        $('#modal-title').text('Edit Shift');
        
        // Populate form with existing data
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