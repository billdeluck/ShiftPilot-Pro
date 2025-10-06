/**
 * SchedulingEngine.js - Advanced Role-Based Shift Assignment and Capacity Management
 * Handles intelligent scheduling with conflict resolution and optimization
 */

const SchedulingEngine = {
    
    // --- CORE SCHEDULING FUNCTIONS ---
    
    /**
     * Generate optimal schedule for a date range with role-based assignment
     * @param {Date} startDate - Start date for scheduling
     * @param {Date} endDate - End date for scheduling  
     * @param {Object} options - Scheduling options
     */
    generateOptimalSchedule: function(startDate, endDate, options = {}) {
        const schedule = [];
        const errors = [];
        const warnings = [];
        
        const currentDate = new Date(startDate);
        const finalDate = new Date(endDate);
        
        while (currentDate <= finalDate) {
            const dateStr = currentDate.toISOString().slice(0, 10);
            
            try {
                const daySchedule = this.generateDaySchedule(dateStr, options);
                schedule.push({
                    date: dateStr,
                    shifts: daySchedule.shifts,
                    coverage: daySchedule.coverage,
                    warnings: daySchedule.warnings
                });
                
                warnings.push(...daySchedule.warnings);
            } catch (error) {
                errors.push({
                    date: dateStr,
                    error: error.message
                });
            }
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return {
            schedule,
            summary: this.generateScheduleSummary(schedule),
            errors,
            warnings,
            optimization: this.analyzeScheduleOptimization(schedule)
        };
    },

    /**
     * Generate shifts for a single day with role-based capacity management
     */
    generateDaySchedule: function(dateStr, options = {}) {
        const date = new Date(dateStr);
        const shifts = [];
        const warnings = [];
        const coverage = {};
        
        const shiftTypes = DataManager.getShiftTypes();
        const employees = DataManager.getEmployees();
        const shiftRules = DataManager.getShiftRules();
        const existingShifts = DataManager.getShiftsForDate(dateStr);
        
        // Skip weekends if not configured to work
        if (this.isWeekend(date) && !options.includeWeekends) {
            return { shifts: [], coverage: {}, warnings: [] };
        }
        
        // Process each shift type for this day
        shiftTypes.forEach(shiftType => {
            const shiftCoverage = this.calculateRequiredCoverage(shiftType, dateStr, options);
            coverage[shiftType.id] = shiftCoverage;
            
            // Get capacity rules for this shift type
            const capacityRules = shiftRules.capacityRules.filter(rule => 
                rule.shiftTypeId === shiftType.id
            );
            
            if (capacityRules.length === 0) {
                warnings.push(`No capacity rules defined for ${shiftType.name} on ${dateStr}`);
                return;
            }
            
            // Process each role's capacity requirements
            capacityRules.forEach(rule => {
                const assignments = this.assignRoleToShift(
                    shiftType, 
                    rule, 
                    dateStr, 
                    existingShifts,
                    options
                );
                
                shifts.push(...assignments.shifts);
                warnings.push(...assignments.warnings);
            });
        });
        
        // Optimize assignments to reduce conflicts
        const optimizedShifts = this.optimizeShiftAssignments(shifts, dateStr);
        
        return {
            shifts: optimizedShifts,
            coverage,
            warnings
        };
    },

    /**
     * Assign employees from a specific role to a shift type
     */
    assignRoleToShift: function(shiftType, capacityRule, dateStr, existingShifts, options) {
        const shifts = [];
        const warnings = [];
        
        // Get employees for this role
        const roleEmployees = DataManager.getEmployees().filter(emp => 
            emp.roleId === capacityRule.roleId
        );
        
        // Filter out employees already assigned to shifts on this date
        const alreadyAssigned = existingShifts.map(s => s.employeeId);
        const availableEmployees = roleEmployees.filter(emp => 
            !alreadyAssigned.includes(emp.id)
        );
        
        // Check current assignments for this shift type and role
        const currentRoleAssignments = existingShifts.filter(shift => {
            const employee = DataManager.getEmployees().find(e => e.id === shift.employeeId);
            return employee && employee.roleId === capacityRule.roleId && 
                   shift.shiftTypeId === shiftType.id;
        }).length;
        
        const needed = capacityRule.minRequired - currentRoleAssignments;
        
        if (needed <= 0) {
            return { shifts, warnings }; // Already adequately staffed
        }
        
        if (availableEmployees.length === 0) {
            warnings.push(`No available ${this.getRoleName(capacityRule.roleId)} for ${shiftType.name} on ${dateStr}`);
            return { shifts, warnings };
        }
        
        // Apply intelligent assignment algorithm
        const selectedEmployees = this.selectOptimalEmployees(
            availableEmployees, 
            needed, 
            shiftType, 
            dateStr,
            options
        );
        
        // Create shift assignments
        selectedEmployees.forEach(employee => {
            const validation = DataManager.validateShiftAssignment(
                { shiftTypeId: shiftType.id, employeeId: employee.id },
                employee.id,
                dateStr
            );
            
            if (validation.valid) {
                shifts.push({
                    id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    date: dateStr,
                    employeeId: employee.id,
                    employeeName: employee.name,
                    shiftTypeId: shiftType.id,
                    shiftTypeName: shiftType.name,
                    status: 'Scheduled',
                    assignedBy: 'AutoScheduler',
                    assignedAt: new Date().toISOString(),
                    roleId: employee.roleId
                });
            } else {
                warnings.push(`Cannot assign ${employee.name} to ${shiftType.name} on ${dateStr}: ${validation.reason}`);
            }
        });
        
        // Check if we still need more coverage
        if (shifts.length < needed) {
            warnings.push(`Insufficient ${this.getRoleName(capacityRule.roleId)} coverage for ${shiftType.name} on ${dateStr}. Need ${needed}, assigned ${shifts.length}`);
        }
        
        return { shifts, warnings };
    },

    /**
     * Select optimal employees using various algorithms
     */
    selectOptimalEmployees: function(availableEmployees, needed, shiftType, dateStr, options) {
        const rotationSettings = DataManager.getRotationSettings();
        const algorithm = options.algorithm || rotationSettings.fairnessAlgorithm;
        
        let sortedEmployees = [];
        
        switch (algorithm) {
            case 'balanced-workload':
                sortedEmployees = this.sortByWorkloadBalance(availableEmployees, dateStr);
                break;
            case 'seniority':
                sortedEmployees = this.sortBySeniority(availableEmployees);
                break;
            case 'preference':
                sortedEmployees = this.sortByShiftPreference(availableEmployees, shiftType);
                break;
            case 'availability-score':
                sortedEmployees = this.sortByAvailabilityScore(availableEmployees, dateStr);
                break;
            case 'skill-based':
                sortedEmployees = this.sortBySkillMatch(availableEmployees, shiftType);
                break;
            default: // round-robin
                sortedEmployees = this.sortByRotation(availableEmployees, dateStr);
        }
        
        // Apply additional filters
        sortedEmployees = this.applyAvailabilityFilters(sortedEmployees, dateStr);
        
        // Return the top N employees needed
        return sortedEmployees.slice(0, needed);
    },

    // --- SORTING ALGORITHMS ---
    
    sortByWorkloadBalance: function(employees, dateStr) {
        const weekStart = this.getWeekStart(new Date(dateStr));
        const monthStart = this.getMonthStart(new Date(dateStr));
        
        return employees.sort((a, b) => {
            const aWeeklyHours = DataManager.calculateWeeklyHours(a.id, weekStart);
            const bWeeklyHours = DataManager.calculateWeeklyHours(b.id, weekStart);
            
            // Primary sort by weekly hours (ascending - give shifts to those with fewer hours)
            if (aWeeklyHours !== bWeeklyHours) {
                return aWeeklyHours - bWeeklyHours;
            }
            
            // Secondary sort by monthly shifts (ascending)
            const aMonthlyShifts = this.calculateMonthlyShifts(a.id, monthStart);
            const bMonthlyShifts = this.calculateMonthlyShifts(b.id, monthStart);
            
            return aMonthlyShifts - bMonthlyShifts;
        });
    },

    sortBySeniority: function(employees) {
        return employees.sort((a, b) => {
            // Extract timestamp from employee ID (assuming format emp_timestamp)
            const aTime = parseInt(a.id.split('_')[1]) || 0;
            const bTime = parseInt(b.id.split('_')[1]) || 0;
            
            // Senior employees (earlier timestamp) get priority
            return aTime - bTime;
        });
    },

    sortByShiftPreference: function(employees, shiftType) {
        // For now, randomize - in full implementation, this would check actual preferences
        return this.shuffleArray([...employees]);
    },

    sortByAvailabilityScore: function(employees, dateStr) {
        const date = new Date(dateStr);
        
        return employees.sort((a, b) => {
            const aScore = this.calculateAvailabilityScore(a, date);
            const bScore = this.calculateAvailabilityScore(b, date);
            
            return bScore - aScore; // Higher score = better availability
        });
    },

    sortBySkillMatch: function(employees, shiftType) {
        // Placeholder for skill-based matching
        // In full implementation, this would match employee skills to shift requirements
        return [...employees];
    },

    sortByRotation: function(employees, dateStr) {
        const daysSinceEpoch = Math.floor(new Date(dateStr).getTime() / (1000 * 60 * 60 * 24));
        const rotationIndex = daysSinceEpoch % employees.length;
        
        // Rotate the array based on the date
        return [...employees.slice(rotationIndex), ...employees.slice(0, rotationIndex)];
    },

    // --- UTILITY FUNCTIONS ---
    
    calculateAvailabilityScore: function(employee, date) {
        let score = 100; // Base score
        
        // Check off-days
        const policySettings = DataManager.getPolicySettings();
        const dayName = this.getDayName(date.getDay());
        
        // Deduct for default off-days
        if (policySettings.defaultOffDays.includes(dayName)) {
            score -= 20;
        }
        
        // Deduct for employee-specific off-days
        const employeeOffDays = policySettings.employeeOffDays[employee.id] || [];
        if (employeeOffDays.includes(dayName)) {
            score -= 40;
        }
        
        // Check recent work pattern
        const recentShifts = this.getRecentShifts(employee.id, date, 7);
        if (recentShifts.length >= 5) { // Worked 5+ days in last week
            score -= 15;
        }
        
        // Check for consecutive days
        const yesterday = new Date(date);
        yesterday.setDate(date.getDate() - 1);
        const yesterdayShifts = DataManager.getShiftsForDate(yesterday.toISOString().slice(0, 10));
        if (yesterdayShifts.some(s => s.employeeId === employee.id)) {
            score -= 10; // Slight penalty for consecutive days
        }
        
        return Math.max(0, score); // Ensure score doesn't go negative
    },

    applyAvailabilityFilters: function(employees, dateStr) {
        const date = new Date(dateStr);
        const policySettings = DataManager.getPolicySettings();
        const dayName = this.getDayName(date.getDay());
        
        return employees.filter(employee => {
            // Hard filter: Employee-specific off-days
            const employeeOffDays = policySettings.employeeOffDays[employee.id] || [];
            if (employeeOffDays.includes(dayName)) {
                return false;
            }
            
            // Check maximum consecutive days constraint
            const shiftRules = DataManager.getShiftRules();
            const maxConsecutiveDays = shiftRules.constraints.maxConsecutiveDays;
            
            if (this.getConsecutiveWorkDays(employee.id, date) >= maxConsecutiveDays) {
                return false;
            }
            
            return true;
        });
    },

    optimizeShiftAssignments: function(shifts, dateStr) {
        // Remove duplicates and resolve conflicts
        const optimized = [];
        const employeeAssignments = new Map();
        
        shifts.forEach(shift => {
            const existing = employeeAssignments.get(shift.employeeId);
            
            if (!existing) {
                // First assignment for this employee
                employeeAssignments.set(shift.employeeId, shift);
                optimized.push(shift);
            } else {
                // Employee already has an assignment - check for conflicts
                const conflict = this.checkShiftConflict(existing, shift);
                if (conflict) {
                    // Keep the higher priority shift (could be based on role criticality)
                    const priority1 = this.getShiftPriority(existing);
                    const priority2 = this.getShiftPriority(shift);
                    
                    if (priority2 > priority1) {
                        // Replace existing with higher priority shift
                        const index = optimized.findIndex(s => s.id === existing.id);
                        optimized[index] = shift;
                        employeeAssignments.set(shift.employeeId, shift);
                    }
                    // If priority1 >= priority2, keep existing (do nothing)
                } else {
                    // No conflict, employee can work multiple shifts
                    optimized.push(shift);
                }
            }
        });
        
        return optimized;
    },

    // --- ANALYSIS AND REPORTING ---
    
    generateScheduleSummary: function(schedule) {
        let totalShifts = 0;
        let totalCoverage = 0;
        let daysWithWarnings = 0;
        const employeeWorkload = new Map();
        const shiftTypeDistribution = new Map();
        
        schedule.forEach(day => {
            totalShifts += day.shifts.length;
            if (day.warnings.length > 0) daysWithWarnings++;
            
            day.shifts.forEach(shift => {
                // Track employee workload
                const current = employeeWorkload.get(shift.employeeId) || 0;
                employeeWorkload.set(shift.employeeId, current + 1);
                
                // Track shift type distribution
                const shiftCurrent = shiftTypeDistribution.get(shift.shiftTypeId) || 0;
                shiftTypeDistribution.set(shift.shiftTypeId, shiftCurrent + 1);
            });
        });
        
        return {
            totalDays: schedule.length,
            totalShifts,
            daysWithWarnings,
            warningRate: (daysWithWarnings / schedule.length * 100).toFixed(1),
            averageShiftsPerDay: (totalShifts / schedule.length).toFixed(1),
            employeeWorkload: Object.fromEntries(employeeWorkload),
            shiftTypeDistribution: Object.fromEntries(shiftTypeDistribution)
        };
    },

    analyzeScheduleOptimization: function(schedule) {
        const employees = DataManager.getEmployees();
        const workloadVariance = this.calculateWorkloadVariance(schedule, employees);
        const coverageScore = this.calculateCoverageScore(schedule);
        const constraintViolations = this.checkConstraintViolations(schedule);
        
        return {
            workloadVariance,
            coverageScore,
            constraintViolations,
            overallScore: this.calculateOverallScore(workloadVariance, coverageScore, constraintViolations),
            recommendations: this.generateOptimizationRecommendations(schedule)
        };
    },

    // --- HELPER METHODS ---
    
    isWeekend: function(date) {
        const day = date.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
    },

    getDayName: function(dayIndex) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[dayIndex];
    },

    getWeekStart: function(date) {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart;
    },

    getMonthStart: function(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    },

    calculateMonthlyShifts: function(employeeId, monthStart) {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
        const allShifts = DataManager.getAllShifts();
        
        return allShifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            return shift.employeeId === employeeId && 
                   shiftDate >= monthStart && 
                   shiftDate <= monthEnd;
        }).length;
    },

    getRecentShifts: function(employeeId, fromDate, days) {
        const startDate = new Date(fromDate);
        startDate.setDate(fromDate.getDate() - days);
        
        const allShifts = DataManager.getAllShifts();
        return allShifts.filter(shift => {
            const shiftDate = new Date(shift.date);
            return shift.employeeId === employeeId && 
                   shiftDate >= startDate && 
                   shiftDate < fromDate;
        });
    },

    getConsecutiveWorkDays: function(employeeId, fromDate) {
        let consecutive = 0;
        const checkDate = new Date(fromDate);
        checkDate.setDate(fromDate.getDate() - 1); // Start from yesterday
        
        while (true) {
            const dateStr = checkDate.toISOString().slice(0, 10);
            const dayShifts = DataManager.getShiftsForDate(dateStr);
            
            if (dayShifts.some(s => s.employeeId === employeeId)) {
                consecutive++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        
        return consecutive;
    },

    calculateRequiredCoverage: function(shiftType, dateStr, options) {
        // Placeholder for coverage calculation
        // In full implementation, this would consider:
        // - Historical demand patterns
        // - Special events or holidays
        // - Business rules
        return {
            required: 1,
            current: 0,
            adequate: false
        };
    },

    getRoleName: function(roleId) {
        const role = DataManager.getEmployees().find(emp => emp.roleId === roleId);
        return role ? role.name : 'Unknown Role';
    },

    checkShiftConflict: function(shift1, shift2) {
        // Check if two shifts conflict (overlapping times)
        const shiftType1 = DataManager.getShiftTypes().find(st => st.id === shift1.shiftTypeId);
        const shiftType2 = DataManager.getShiftTypes().find(st => st.id === shift2.shiftTypeId);
        
        if (!shiftType1 || !shiftType2) return false;
        
        // For now, assume shifts conflict if they're on the same date
        // In full implementation, this would check actual time overlaps
        return shift1.date === shift2.date;
    },

    getShiftPriority: function(shift) {
        // Placeholder for priority calculation
        // Higher numbers = higher priority
        const shiftType = DataManager.getShiftTypes().find(st => st.id === shift.shiftTypeId);
        const basePriority = shiftType ? shiftType.priority || 1 : 1;
        
        // Could add role-based priorities, urgency factors, etc.
        return basePriority;
    },

    calculateWorkloadVariance: function(schedule, employees) {
        // Calculate how evenly workload is distributed
        const workloads = employees.map(emp => {
            return schedule.reduce((count, day) => {
                return count + day.shifts.filter(s => s.employeeId === emp.id).length;
            }, 0);
        });
        
        const mean = workloads.reduce((sum, w) => sum + w, 0) / workloads.length;
        const variance = workloads.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / workloads.length;
        
        return {
            mean: mean.toFixed(2),
            variance: variance.toFixed(2),
            standardDeviation: Math.sqrt(variance).toFixed(2)
        };
    },

    calculateCoverageScore: function(schedule) {
        // Calculate how well shifts meet coverage requirements
        let totalRequired = 0;
        let totalMet = 0;
        
        schedule.forEach(day => {
            Object.values(day.coverage || {}).forEach(coverage => {
                totalRequired += coverage.required || 0;
                totalMet += Math.min(coverage.current || 0, coverage.required || 0);
            });
        });
        
        return totalRequired > 0 ? (totalMet / totalRequired * 100).toFixed(1) : 100;
    },

    checkConstraintViolations: function(schedule) {
        const violations = [];
        const constraints = DataManager.getShiftRules().constraints;
        
        // Check various constraint violations
        schedule.forEach(day => {
            day.shifts.forEach(shift => {
                // Check maximum daily hours
                const dailyHours = this.calculateDailyHours(shift.employeeId, day.date);
                if (dailyHours > constraints.maxDailyHours) {
                    violations.push({
                        type: 'max_daily_hours',
                        employee: shift.employeeName,
                        date: day.date,
                        hours: dailyHours,
                        limit: constraints.maxDailyHours
                    });
                }
            });
        });
        
        return violations;
    },

    calculateDailyHours: function(employeeId, dateStr) {
        const dayShifts = DataManager.getShiftsForDate(dateStr).filter(s => s.employeeId === employeeId);
        let totalHours = 0;
        
        dayShifts.forEach(shift => {
            const shiftType = DataManager.getShiftTypes().find(st => st.id === shift.shiftTypeId);
            if (shiftType) {
                totalHours += DataManager.calculateShiftDuration(shiftType);
            }
        });
        
        return totalHours;
    },

    calculateOverallScore: function(workloadVariance, coverageScore, violations) {
        let score = parseFloat(coverageScore);
        
        // Penalize high workload variance
        const variance = parseFloat(workloadVariance.variance);
        if (variance > 2) score -= (variance - 2) * 5;
        
        // Penalize constraint violations
        score -= violations.length * 10;
        
        return Math.max(0, Math.min(100, score)).toFixed(1);
    },

    generateOptimizationRecommendations: function(schedule) {
        const recommendations = [];
        
        // Analyze patterns and suggest improvements
        const summary = this.generateScheduleSummary(schedule);
        
        if (parseFloat(summary.warningRate) > 20) {
            recommendations.push('High warning rate detected. Consider hiring more employees or adjusting capacity rules.');
        }
        
        if (parseFloat(summary.averageShiftsPerDay) < 3) {
            recommendations.push('Low shift coverage. Consider extending operating hours or adding shift types.');
        }
        
        return recommendations;
    },

    shuffleArray: function(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SchedulingEngine;
}