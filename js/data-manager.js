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

    // --- ADVANCED SETTINGS GETTERS ---
    
    getShiftRules: function() {
        return this.settings.shiftRules || {
            capacityRules: [],
            constraints: {
                minHoursBetween: 8,
                maxConsecutiveDays: 7,
                maxWeeklyHours: 40,
                maxDailyHours: 12
            }
        };
    },

    getShiftTemplates: function() {
        return this.settings.shiftTemplates || [];
    },

    getRotationSettings: function() {
        return this.settings.rotationSettings || {
            enableAutoRotation: false,
            rotationPeriod: 14,
            rotationStartDate: null,
            fairnessAlgorithm: 'round-robin'
        };
    },

    getDepartments: function() {
        return this.settings.departments || [];
    },

    getLocations: function() {
        return this.settings.locations || [];
    },

    getComplianceSettings: function() {
        return this.settings.compliance || {
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
        };
    },

    getWorkflowSettings: function() {
        return this.settings.workflows || {
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
        };
    },

    // --- SHIFT VALIDATION METHODS ---

    validateShiftAssignment: function(shift, employeeId, date) {
        const employee = this.getEmployees().find(emp => emp.id === employeeId);
        if (!employee) return { valid: false, reason: 'Employee not found' };

        const shiftRules = this.getShiftRules();
        const compliance = this.getComplianceSettings();
        
        // Check capacity rules
        const capacityRule = shiftRules.capacityRules.find(rule => 
            rule.shiftTypeId === shift.shiftTypeId && rule.roleId === employee.roleId
        );
        
        if (capacityRule) {
            const existingShifts = this.getShiftsForDate(date).filter(s => 
                s.shiftTypeId === shift.shiftTypeId && 
                this.getEmployees().find(emp => emp.id === s.employeeId)?.roleId === employee.roleId
            );
            
            if (existingShifts.length >= capacityRule.maxAllowed) {
                return { valid: false, reason: `Maximum capacity reached for this role in this shift` };
            }
        }

        // Check time constraints
        const constraints = shiftRules.constraints;
        const employeeShifts = this.getAllShifts().filter(s => s.employeeId === employeeId);
        
        // Check maximum daily hours
        const dailyShifts = this.getShiftsForDate(date).filter(s => s.employeeId === employeeId);
        const dailyHours = dailyShifts.reduce((total, s) => {
            const shiftType = this.getShiftTypes().find(st => st.id === s.shiftTypeId);
            return total + this.calculateShiftDuration(shiftType);
        }, 0) + this.calculateShiftDuration(this.getShiftTypes().find(st => st.id === shift.shiftTypeId));
        
        if (dailyHours > constraints.maxDailyHours) {
            return { valid: false, reason: `Would exceed maximum daily hours (${constraints.maxDailyHours})` };
        }

        return { valid: true };
    },

    calculateShiftDuration: function(shiftType) {
        if (!shiftType || !shiftType.startTime || !shiftType.endTime) return 0;
        
        const start = new Date(`2000-01-01 ${shiftType.startTime}`);
        const end = new Date(`2000-01-01 ${shiftType.endTime}`);
        
        // Handle overnight shifts
        if (end <= start) {
            end.setDate(end.getDate() + 1);
        }
        
        return (end - start) / (1000 * 60 * 60); // Hours
    },

    // --- SCHEDULING ALGORITHMS ---

    suggestOptimalShiftAssignment: function(shiftTypeId, date, excludeEmployees = []) {
        const shiftType = this.getShiftTypes().find(st => st.id === shiftTypeId);
        if (!shiftType) return null;

        const shiftRules = this.getShiftRules();
        const rotationSettings = this.getRotationSettings();
        
        // Find capacity rules for this shift type
        const capacityRules = shiftRules.capacityRules.filter(rule => rule.shiftTypeId === shiftTypeId);
        
        let suggestions = [];
        
        // For each role that has capacity rules for this shift
        capacityRules.forEach(rule => {
            const roleEmployees = this.getEmployees().filter(emp => 
                emp.roleId === rule.roleId && 
                !excludeEmployees.includes(emp.id)
            );
            
            // Apply fairness algorithm
            let sortedEmployees = [];
            switch (rotationSettings.fairnessAlgorithm) {
                case 'balanced-workload':
                    sortedEmployees = this.sortByWorkload(roleEmployees, date);
                    break;
                case 'seniority':
                    sortedEmployees = this.sortBySeniority(roleEmployees);
                    break;
                case 'preference':
                    sortedEmployees = this.sortByPreference(roleEmployees, shiftTypeId);
                    break;
                default: // round-robin
                    sortedEmployees = this.sortByRotation(roleEmployees, date);
            }

            // Check how many are needed
            const currentAssigned = this.getShiftsForDate(date).filter(s => 
                s.shiftTypeId === shiftTypeId &&
                this.getEmployees().find(emp => emp.id === s.employeeId)?.roleId === rule.roleId
            ).length;
            
            const needed = rule.minRequired - currentAssigned;
            
            if (needed > 0) {
                for (let i = 0; i < Math.min(needed, sortedEmployees.length); i++) {
                    const employee = sortedEmployees[i];
                    const validation = this.validateShiftAssignment(
                        { shiftTypeId, employeeId: employee.id },
                        employee.id,
                        date
                    );
                    
                    if (validation.valid) {
                        suggestions.push({
                            employeeId: employee.id,
                            employeeName: employee.name,
                            role: this.getEmployees().find(r => r.id === employee.roleId)?.name,
                            priority: i + 1,
                            reason: `Required ${rule.roleId} for ${shiftType.name}`
                        });
                    }
                }
            }
        });

        return suggestions;
    },

    sortByWorkload: function(employees, currentDate) {
        // Sort by least worked hours in current week
        const weekStart = new Date(currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        return employees.sort((a, b) => {
            const aHours = this.calculateWeeklyHours(a.id, weekStart);
            const bHours = this.calculateWeeklyHours(b.id, weekStart);
            return aHours - bHours;
        });
    },

    sortBySeniority: function(employees) {
        // Sort by employee creation date (assuming earlier = senior)
        return employees.sort((a, b) => {
            // Extract timestamp from ID or use creation order
            const aTime = parseInt(a.id.split('_')[1]) || 0;
            const bTime = parseInt(b.id.split('_')[1]) || 0;
            return aTime - bTime;
        });
    },

    sortByRotation: function(employees, currentDate) {
        // Simple round-robin based on date and employee count
        const daysSinceEpoch = Math.floor(new Date(currentDate).getTime() / (1000 * 60 * 60 * 24));
        const rotationIndex = daysSinceEpoch % employees.length;
        
        return [...employees.slice(rotationIndex), ...employees.slice(0, rotationIndex)];
    },

    sortByPreference: function(employees, shiftTypeId) {
        // For now, just return employees as-is
        // In a full implementation, this would check employee preferences
        return employees;
    },

    calculateWeeklyHours: function(employeeId, weekStart) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        let totalHours = 0;
        const shifts = this.getAllShifts().filter(shift => {
            const shiftDate = new Date(shift.date);
            return shift.employeeId === employeeId && 
                   shiftDate >= weekStart && 
                   shiftDate <= weekEnd;
        });
        
        shifts.forEach(shift => {
            const shiftType = this.getShiftTypes().find(st => st.id === shift.shiftTypeId);
            totalHours += this.calculateShiftDuration(shiftType);
        });
        
        return totalHours;
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