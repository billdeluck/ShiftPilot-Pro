// --- INDEXEDDB WRAPPER ---
const DB_NAME = 'ShiftPilotProDB';
const DB_VERSION = 1;
const DB_STORES = ['shifts', 'settings', 'auditLog'];

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function(e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('shifts')) db.createObjectStore('shifts', { keyPath: 'date' });
            if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
            if (!db.objectStoreNames.contains('auditLog')) db.createObjectStore('auditLog', { autoIncrement: true });
        };
        req.onsuccess = function(e) { resolve(e.target.result); };
        req.onerror = function(e) { reject(e.target.error); };
    });
}
async function idbGet(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function idbPut(store, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).put(value);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
async function idbDelete(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        const req = tx.objectStore(store).delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
async function idbGetAll(store) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// --- DataManager IndexedDB Integration ---
const DataManager = {
    // In-memory stores
    shifts: {}, 
    settings: {},

    // --- INITIALIZATION ---
    loadData: async function() {
        // Load settings first, as they are required for shift data context
        await this.loadSettings();
        await this.loadShifts();
    },

    loadSettings: async function() {
        let settings = await idbGet('settings', 'main');
        if (!settings) {
            // Try to load from db.json if IndexedDB and localStorage are empty
            const storedSettings = localStorage.getItem('shiftPilotPro_settings');
            if (storedSettings) {
                settings = JSON.parse(storedSettings);
            } else if (window._shiftPilotSeedData && window._shiftPilotSeedData.settings) {
                settings = window._shiftPilotSeedData.settings;
            } else {
                settings = { employees: [], roles: [], shiftTypes: [], policy: { defaultOffDays: [], employeeOffDays: {} } };
            }
            await idbPut('settings', { ...settings, id: 'main' });
        }
        this.settings = settings;
        return settings;
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

    getAllShifts: function() {
        let allShifts = [];
        for (const date in this.shifts) {
            allShifts = allShifts.concat(this.shifts[date]);
        }
        return allShifts;
    },

    getOpenShifts: function() {
        // Currently, all shifts are assigned to an employee.
        // If "open shifts" refers to shifts that are defined but not yet assigned,
        // the data model needs to be extended to support unassigned shifts.
        // For now, returning an empty array or placeholder.
        return []; 
    },
    // --- LOCAL STORAGE OPERATIONS for Shifts ---
    loadShifts: async function() {
        let all = await idbGetAll('shifts');
        if (!all || all.length === 0) {
            // Try to load from db.json if IndexedDB and localStorage are empty
            const storedShifts = localStorage.getItem('shiftPilotPro_shifts');
            if (storedShifts) {
                this.shifts = JSON.parse(storedShifts);
            } else if (window._shiftPilotSeedData && window._shiftPilotSeedData.shifts) {
                this.shifts = {};
                window._shiftPilotSeedData.shifts.forEach(entry => {
                    this.shifts[entry.date] = entry.shifts;
                });
            } else {
                this.shifts = {};
            }
            // Migrate to IndexedDB
            for (const date in this.shifts) {
                await idbPut('shifts', { date, shifts: this.shifts[date] });
            }
        } else {
            this.shifts = {};
            all.forEach(entry => { this.shifts[entry.date] = entry.shifts; });
        }
        return this.shifts;
    },
    saveShifts: async function() {
        for (const date in this.shifts) {
            await idbPut('shifts', { date, shifts: this.shifts[date] });
        }
        localStorage.setItem('shiftPilotPro_shifts', JSON.stringify(this.shifts));
    },
    // --- CRUD (async) ---
    getShiftsForDate: function(dateStr) {
        return this.shifts[dateStr] || [];
    },
    addShift: async function(dateStr, shiftData) {
        if (!this.shifts[dateStr]) this.shifts[dateStr] = [];
        shiftData.id = `shift_${Date.now()}`;
        this.shifts[dateStr].push(shiftData);
        await this.saveShifts();
    },
    updateShift: async function(dateStr, updatedShiftData) {
        if (!this.shifts[dateStr]) return;
        const shiftIndex = this.shifts[dateStr].findIndex(s => s.id === updatedShiftData.id);
        if (shiftIndex !== -1) {
            this.shifts[dateStr][shiftIndex] = updatedShiftData;
            await this.saveShifts();
        }
    },
    deleteShift: async function(dateStr, shiftId) {
        if (!this.shifts[dateStr]) return;
        this.shifts[dateStr] = this.shifts[dateStr].filter(s => s.id !== shiftId);
        if (this.shifts[dateStr].length === 0) delete this.shifts[dateStr];
        await this.saveShifts();
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
    },

    // --- DASHBOARD WIDGET HELPERS ---
    countTotalShiftsInMonth: function(year, month) {
        const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
        return this.getAllShifts().filter(s => s.date && s.date.startsWith(monthStr)).length;
    },
    countStatusInMonth: function(status, year, month) {
        const monthStr = `${year}-${String(month+1).padStart(2,'0')}`;
        return this.getAllShifts().filter(s => s.date && s.date.startsWith(monthStr) && s.status === status).length;
    },
    getEmployeeCount: function() {
        return this.getEmployees().length;
    },
    // --- ACTIONABLE ITEMS ---
    findActionableItems: function() {
        // Example: Find uncovered shifts (Sick and not covered), open roles, reminders
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 86400000);
        const days = [today, tomorrow];
        let items = [];
        days.forEach(day => {
            const dateStr = day.toISOString().slice(0,10);
            const shifts = this.getShiftsForDate(dateStr);
            shifts.forEach(shift => {
                if (shift.status === 'Sick' && !shift.coveredBy) {
                    items.push(`Uncovered shift: ${shift.shiftType} for ${shift.employeeName || shift.employeeId} on ${dateStr}`);
                }
                // Add more logic for open roles if needed
            });
        });
        // Example system reminder
        items.push('Time to generate the schedule for next month.');
        return items;
    },
    // --- WEEKLY WORKLOAD ---
    getWeeklyShiftCounts: function() {
        const employees = this.getEmployees();
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay()); // Sunday
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // Saturday
        let counts = {};
        employees.forEach(emp => {
            counts[emp.name] = 0;
        });
        this.getAllShifts().forEach(shift => {
            const d = new Date(shift.date);
            if (d >= weekStart && d <= weekEnd) {
                const emp = employees.find(e => e.id === shift.employeeId);
                if (emp) counts[emp.name]++;
            }
        });
        return counts;
    },
};