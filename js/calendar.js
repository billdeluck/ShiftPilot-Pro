const Calendar = {
    render: function(year, month) {
        const calendarGrid = $('#calendar-grid');
        calendarGrid.empty(); // Clear previous month's view

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();
        const startDayOfWeek = firstDayOfMonth.getDay(); // 0=Sun, 1=Mon, ...

        // Update header
        $('#current-month-year').text(
            firstDayOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' })
        );

        // Add day of week headers
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        weekdays.forEach(day => {
            calendarGrid.append(`<div class="calendar-day day-header">${day}</div>`);
        });

        // Add blank days for the start of the month
        for (let i = 0; i < startDayOfWeek; i++) {
            calendarGrid.append('<div class="calendar-day other-month"></div>');
        }

        // Add days of the current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayElement = $(`
                <div class="calendar-day" data-date="${dateStr}">
                    <div class="day-number">${day}</div>
                    <ul class="shifts-list"></ul>
                </div>
            `);
            
            // Populate shifts for this day
            const shifts = DataManager.getShiftsForDate(dateStr);
            const shiftsList = dayElement.find('.shifts-list');
            shifts.forEach(shift => {
                const employee = DataManager.getEmployees().find(e => e.id === shift.employeeId);
                if (employee) {
                    const shiftElement = $(`
                        <li data-shift-id="${shift.id}">
                            <strong>${employee.name}:</strong> ${shift.shiftType}
                        </li>
                    `);
                    shiftsList.append(shiftElement);
                }
            });

            calendarGrid.append(dayElement);
        }
    }
};