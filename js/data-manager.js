const DataManager = {
    // In-memory stores
    shifts: {}, 
    settings: {},

    // --- INITIALIZATION ---
    loadData: function() {
        // Load settings first, as they are required for shift data context
        this.loadSettings();
        this.loadShifts();
    },

    loadSettings: function() {
        const storedSettings = localStorage.getItem('shiftPilotPro_settings');
        if (storedSettings) {
            this.settings = JSON.parse(storedSettings);
        } else {
            // Default empty structure if no settings exist
            this.settings = {
                employees: [],
                roles: [],
                shiftTypes: [],
                policy: {
                    defaultOffDays: [],
                    employeeOffDays: {}
                }
            };
        }
        console.log('Settings loaded.');
    },

    // --- GETTERS (now dynamic) ---
    getEmployees: function() {
        return this.settings.employees || [];
    },

    getShiftTypes: function() {
        return this.settings.shiftTypes || [];
    },

    getPolicySettings: function() {
        return this.settings.policy || { defaultOffDays: [], employeeOffDays: {} };
    },

    // --- LOCAL STORAGE OPERATIONS for Shifts ---
    loadShifts: function() {
        const storedShifts = localStorage.getItem('shiftPilotPro_shifts');
        this.shifts = storedShifts ? JSON.parse(storedShifts) : {};
        console.log('Shifts loaded.');
    },

    saveShifts: function() {
        localStorage.setItem('shiftPilotPro_shifts', JSON.stringify(this.shifts));
        console.log('Shifts saved.');
    },

    // --- CRUD OPERATIONS (no changes needed here) ---
    getShiftsForDate: function(dateStr) {
        return this.shifts[dateStr] || [];
    },

    addShift: function(dateStr, shiftData) {
        if (!this.shifts[dateStr]) this.shifts[dateStr] = [];
        shiftData.id = `shift_${Date.now()}`; 
        this.shifts[dateStr].push(shiftData);
        this.saveShifts();
    },

    updateShift: function(dateStr, updatedShiftData) {
        if (!this.shifts[dateStr]) return;
        const shiftIndex = this.shifts[dateStr].findIndex(s => s.id === updatedShiftData.id);
        if (shiftIndex !== -1) {
            this.shifts[dateStr][shiftIndex] = updatedShiftData;
            this.saveShifts();
        }
    },
    
    deleteShift: function(dateStr, shiftId) {
        if (!this.shifts[dateStr]) return;
        this.shifts[dateStr] = this.shifts[dateStr].filter(s => s.id !== shiftId);
        if (this.shifts[dateStr].length === 0) delete this.shifts[dateStr];
        this.saveShifts();
    },

    // --- EXPORT LOGIC (now dynamic) ---
    exportToCSV: function(year, month) {
        const employees = this.getEmployees();
        if (employees.length === 0) {
            alert("No employees found in settings. Please add employees first.");
            return;
        }
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let header = "Employee";
        for (let day = 1; day <= daysInMonth; day++) header += `,${day}`;
        let csvRows = [header];
        employees.forEach(emp => {
            let row = [emp.name];
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const employeeShift = this.getShiftsForDate(dateStr).find(s => s.employeeId === emp.id);
                const shiftInitial = employeeShift ? employeeShift.shiftType.split(' ')[0].charAt(0) : '';
                row.push(shiftInitial);
            }
            csvRows.push(row.join(','));
        });
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\r\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `shift_schedule_${year}_${String(month + 1).padStart(2, '0')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};