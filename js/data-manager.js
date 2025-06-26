const DataManager = {
    // --- PROPERTIES ---
    shifts: {}, // In-memory store for shifts: { "YYYY-MM-DD": [{...}, {...}] }
    
    // --- INITIAL STATIC DATA ---
    getEmployees: function() {
        // In a future phase, this will be loaded from settings
        return [
            { id: 'emp01', name: 'Alice Mwale' },
            { id: 'emp02', name: 'David Phiri' },
            { id: 'emp03', name: 'Mercy Banda' },
            { id: 'emp04', name: 'John Zulu' }
        ];
    },

    getShiftTypes: function() {
        // In a future phase, this will be loaded from settings
        return ['Morning (08-16)', 'Evening (16-00)', 'Night (00-08)', 'Off'];
    },

    // --- LOCAL STORAGE OPERATIONS ---
    loadShifts: function() {
        const storedShifts = localStorage.getItem('shiftPilotPro_shifts');
        if (storedShifts) {
            this.shifts = JSON.parse(storedShifts);
        } else {
            this.shifts = {};
        }
        console.log('Shifts loaded from localStorage.');
    },

    saveShifts: function() {
        localStorage.setItem('shiftPilotPro_shifts', JSON.stringify(this.shifts));
        console.log('Shifts saved to localStorage.');
    },

    // --- CRUD OPERATIONS ---
    getShiftsForDate: function(dateStr) { // dateStr is "YYYY-MM-DD"
        return this.shifts[dateStr] || [];
    },

    addShift: function(dateStr, shiftData) {
        if (!this.shifts[dateStr]) {
            this.shifts[dateStr] = [];
        }
        // Add a unique ID to the shift for easier updates/deletes
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
        // If the date has no more shifts, remove the key to keep data clean
        if (this.shifts[dateStr].length === 0) {
            delete this.shifts[dateStr];
        }
        this.saveShifts();
    },

    // --- EXPORT LOGIC ---
    exportToCSV: function(year, month) {
        const employees = this.getEmployees();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Header Row
        let header = "Employee";
        for (let day = 1; day <= daysInMonth; day++) {
            header += `,${day}`;
        }
        csvContent += header + "\r\n";

        // Data Rows
        employees.forEach(emp => {
            let row = emp.name;
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const shiftsForDay = this.getShiftsForDate(dateStr);
                const employeeShift = shiftsForDay.find(s => s.employeeId === emp.id);
                
                // Use first letter of shift type for brevity in CSV (M, E, N, O)
                const shiftInitial = employeeShift ? employeeShift.shiftType.charAt(0) : '';
                row += `,${shiftInitial}`;
            }
            csvContent += row + "\r\n";
        });

        // Trigger Download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `shift_schedule_${year}_${String(month + 1).padStart(2, '0')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};