/**
 * ShiftPatterns.js - Advanced Shift Pattern Engine
 * Handles complex shift patterns, rotations, and template-based scheduling
 */

const ShiftPatterns = {
    
    // --- PATTERN GENERATORS ---
    
    /**
     * Generate a rotating shift pattern
     * @param {Object} config - Pattern configuration
     * @param {Array} employees - List of employees
     * @param {Date} startDate - Pattern start date
     * @param {number} durationDays - Pattern duration in days
     */
    generateRotatingPattern: function(config, employees, startDate, durationDays) {
        const pattern = config.pattern || [1, 1, 0, 0]; // Default: 2 days on, 2 days off
        const shifts = [];
        const employeeCount = employees.length;
        
        for (let day = 0; day < durationDays; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + day);
            const dateStr = currentDate.toISOString().slice(0, 10);
            
            // Determine which employees work today based on rotation
            for (let empIndex = 0; empIndex < employeeCount; empIndex++) {
                const employee = employees[empIndex];
                const rotationDay = (day + empIndex * config.offset || 0) % pattern.length;
                const shouldWork = pattern[rotationDay];
                
                if (shouldWork) {
                    // Determine shift type for this employee on this day
                    const shiftTypeId = this.determineShiftType(config, employee, day, empIndex);
                    
                    shifts.push({
                        date: dateStr,
                        employeeId: employee.id,
                        employeeName: employee.name,
                        shiftTypeId: shiftTypeId,
                        status: 'Scheduled',
                        patternGenerated: true,
                        patternId: config.id
                    });
                }
            }
        }
        
        return shifts;
    },

    /**
     * Generate a fixed shift pattern (same schedule every week)
     */
    generateFixedPattern: function(config, employees, startDate, durationDays) {
        const weeklyPattern = config.weeklySchedule || {};
        const shifts = [];
        
        for (let day = 0; day < durationDays; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + day);
            const dateStr = currentDate.toISOString().slice(0, 10);
            const dayName = this.getDayName(currentDate.getDay());
            
            // Check if there's a schedule for this day of the week
            if (weeklyPattern[dayName]) {
                weeklyPattern[dayName].forEach(assignment => {
                    const employee = employees.find(emp => emp.id === assignment.employeeId);
                    if (employee) {
                        shifts.push({
                            date: dateStr,
                            employeeId: employee.id,
                            employeeName: employee.name,
                            shiftTypeId: assignment.shiftTypeId,
                            status: 'Scheduled',
                            patternGenerated: true,
                            patternId: config.id
                        });
                    }
                });
            }
        }
        
        return shifts;
    },

    /**
     * Generate a split schedule pattern (different shifts throughout the day)
     */
    generateSplitPattern: function(config, employees, startDate, durationDays) {
        const shifts = [];
        const shiftRotation = config.shiftRotation || ['Morning', 'Evening', 'Night'];
        
        for (let day = 0; day < durationDays; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + day);
            const dateStr = currentDate.toISOString().slice(0, 10);
            
            // Apply split pattern logic
            employees.forEach((employee, empIndex) => {
                // Skip weekends if configured
                if (this.isWeekend(currentDate) && !config.includeWeekends) {
                    return;
                }
                
                // Determine shift assignment based on split rotation
                const shiftIndex = (day + empIndex) % shiftRotation.length;
                const shiftTypeName = shiftRotation[shiftIndex];
                const shiftType = DataManager.getShiftTypes().find(st => st.name === shiftTypeName);
                
                if (shiftType) {
                    shifts.push({
                        date: dateStr,
                        employeeId: employee.id,
                        employeeName: employee.name,
                        shiftTypeId: shiftType.id,
                        status: 'Scheduled',
                        patternGenerated: true,
                        patternId: config.id
                    });
                }
            });
        }
        
        return shifts;
    },

    /**
     * Generate a custom pattern based on advanced rules
     */
    generateCustomPattern: function(config, employees, startDate, durationDays) {
        const shifts = [];
        const rules = config.customRules || [];
        
        for (let day = 0; day < durationDays; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + day);
            const dateStr = currentDate.toISOString().slice(0, 10);
            
            // Apply each custom rule
            rules.forEach(rule => {
                if (this.matchesRule(rule, currentDate, day)) {
                    const applicableEmployees = this.filterEmployeesByRule(employees, rule);
                    
                    applicableEmployees.forEach(employee => {
                        if (this.shouldAssignShift(rule, employee, day)) {
                            shifts.push({
                                date: dateStr,
                                employeeId: employee.id,
                                employeeName: employee.name,
                                shiftTypeId: rule.shiftTypeId,
                                status: 'Scheduled',
                                patternGenerated: true,
                                patternId: config.id,
                                ruleId: rule.id
                            });
                        }
                    });
                }
            });
        }
        
        return shifts;
    },

    // --- PATTERN APPLICATION ---

    /**
     * Apply a pattern template to generate shifts
     */
    applyPattern: function(templateId, startDate, durationDays, employeeIds = null) {
        const template = DataManager.getShiftTemplates().find(t => t.id === templateId);
        if (!template) {
            throw new Error('Template not found');
        }

        const employees = employeeIds 
            ? DataManager.getEmployees().filter(emp => employeeIds.includes(emp.id))
            : DataManager.getEmployees();

        let shifts = [];
        
        switch (template.patternType) {
            case 'rotating':
                shifts = this.generateRotatingPattern(template, employees, startDate, durationDays);
                break;
            case 'fixed':
                shifts = this.generateFixedPattern(template, employees, startDate, durationDays);
                break;
            case 'split':
                shifts = this.generateSplitPattern(template, employees, startDate, durationDays);
                break;
            case 'custom':
                shifts = this.generateCustomPattern(template, employees, startDate, durationDays);
                break;
            default:
                throw new Error('Unknown pattern type');
        }

        return this.validateAndOptimizeShifts(shifts);
    },

    /**
     * Bulk apply pattern to the schedule
     */
    bulkApplyPattern: async function(templateId, startDate, endDate, options = {}) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const durationDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        
        try {
            const shifts = this.applyPattern(templateId, start, durationDays, options.employeeIds);
            
            // Apply shifts to the data manager
            for (const shift of shifts) {
                if (options.overwrite || !this.hasExistingShift(shift.date, shift.employeeId)) {
                    await DataManager.addShift(shift.date, shift);
                }
            }
            
            return {
                success: true,
                shiftsGenerated: shifts.length,
                message: `Successfully generated ${shifts.length} shifts using pattern`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },

    // --- UTILITY METHODS ---

    determineShiftType: function(config, employee, day, empIndex) {
        // Determine shift type based on various factors
        if (config.shiftAssignment === 'role-based') {
            const roleShifts = config.roleShiftMapping || {};
            return roleShifts[employee.roleId] || config.defaultShiftTypeId;
        } else if (config.shiftAssignment === 'rotation') {
            const shiftTypes = DataManager.getShiftTypes();
            const shiftIndex = (day + empIndex) % shiftTypes.length;
            return shiftTypes[shiftIndex]?.id || config.defaultShiftTypeId;
        }
        
        return config.defaultShiftTypeId;
    },

    getDayName: function(dayIndex) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayIndex];
    },

    isWeekend: function(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    },

    matchesRule: function(rule, currentDate, dayIndex) {
        // Check if the rule applies to this date
        if (rule.dayOfWeek && rule.dayOfWeek.length > 0) {
            const dayName = this.getDayName(currentDate.getDay());
            if (!rule.dayOfWeek.includes(dayName)) return false;
        }
        
        if (rule.frequency && rule.frequency > 1) {
            if (dayIndex % rule.frequency !== 0) return false;
        }
        
        if (rule.dateRange) {
            const start = new Date(rule.dateRange.start);
            const end = new Date(rule.dateRange.end);
            if (currentDate < start || currentDate > end) return false;
        }
        
        return true;
    },

    filterEmployeesByRule: function(employees, rule) {
        let filtered = employees;
        
        if (rule.roleIds && rule.roleIds.length > 0) {
            filtered = filtered.filter(emp => rule.roleIds.includes(emp.roleId));
        }
        
        if (rule.departmentIds && rule.departmentIds.length > 0) {
            filtered = filtered.filter(emp => rule.departmentIds.includes(emp.departmentId));
        }
        
        if (rule.employeeIds && rule.employeeIds.length > 0) {
            filtered = filtered.filter(emp => rule.employeeIds.includes(emp.id));
        }
        
        return filtered;
    },

    shouldAssignShift: function(rule, employee, dayIndex) {
        // Additional logic for whether to assign shift
        if (rule.maxAssignments && rule.maxAssignments > 0) {
            // Check how many times this employee has been assigned by this rule
            const existingAssignments = DataManager.getAllShifts().filter(s => 
                s.employeeId === employee.id && s.ruleId === rule.id
            );
            if (existingAssignments.length >= rule.maxAssignments) {
                return false;
            }
        }
        
        if (rule.probability && rule.probability < 1) {
            return Math.random() < rule.probability;
        }
        
        return true;
    },

    hasExistingShift: function(date, employeeId) {
        const existingShifts = DataManager.getShiftsForDate(date);
        return existingShifts.some(shift => shift.employeeId === employeeId);
    },

    validateAndOptimizeShifts: function(shifts) {
        // Remove duplicates and validate
        const uniqueShifts = [];
        const seenKey = new Set();
        
        shifts.forEach(shift => {
            const key = `${shift.date}-${shift.employeeId}`;
            if (!seenKey.has(key)) {
                seenKey.add(key);
                
                // Validate the shift
                const validation = DataManager.validateShiftAssignment(shift, shift.employeeId, shift.date);
                if (validation.valid) {
                    uniqueShifts.push(shift);
                }
            }
        });
        
        return uniqueShifts;
    },

    // --- PREDEFINED PATTERNS ---

    getPredefinedPatterns: function() {
        return {
            'continental': {
                name: 'Continental Rotation',
                description: '2-2-3 rotating schedule (2 days on, 2 off, 3 on, 2 off, 2 on, 3 off)',
                pattern: [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0],
                type: 'rotating'
            },
            'panama': {
                name: 'Panama Schedule',
                description: '2-2-3 schedule with 12-hour shifts',
                pattern: [1, 1, 0, 0, 1, 1, 1],
                type: 'rotating'
            },
            'dupont': {
                name: 'DuPont Schedule',
                description: '4-day rotation with day and night shifts',
                pattern: [1, 1, 1, 1, 0, 0, 0],
                type: 'rotating'
            },
            'pitman': {
                name: 'Pitman Schedule',
                description: '2-3-2 rotating schedule',
                pattern: [1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1],
                type: 'rotating'
            },
            '4-10': {
                name: '4-10 Compressed',
                description: '4 days on, 10 hours each, 3 days off',
                pattern: [1, 1, 1, 1, 0, 0, 0],
                type: 'fixed'
            }
        };
    },

    // --- PATTERN ANALYSIS ---

    analyzePatternCoverage: function(templateId, startDate, durationDays) {
        const shifts = this.applyPattern(templateId, new Date(startDate), durationDays);
        const shiftTypes = DataManager.getShiftTypes();
        const employees = DataManager.getEmployees();
        
        const analysis = {
            totalShifts: shifts.length,
            coverage: {},
            employeeWorkload: {},
            shiftDistribution: {}
        };
        
        // Analyze coverage by date
        for (let day = 0; day < durationDays; day++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + day);
            const dateStr = date.toISOString().slice(0, 10);
            
            const dayShifts = shifts.filter(s => s.date === dateStr);
            analysis.coverage[dateStr] = {
                shiftsScheduled: dayShifts.length,
                employeesWorking: [...new Set(dayShifts.map(s => s.employeeId))].length
            };
        }
        
        // Analyze employee workload
        employees.forEach(emp => {
            const empShifts = shifts.filter(s => s.employeeId === emp.id);
            analysis.employeeWorkload[emp.id] = {
                name: emp.name,
                totalShifts: empShifts.length,
                shiftDates: empShifts.map(s => s.date)
            };
        });
        
        // Analyze shift type distribution
        shiftTypes.forEach(st => {
            const typeShifts = shifts.filter(s => s.shiftTypeId === st.id);
            analysis.shiftDistribution[st.id] = {
                name: st.name,
                count: typeShifts.length,
                percentage: (typeShifts.length / shifts.length * 100).toFixed(1)
            };
        });
        
        return analysis;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShiftPatterns;
}