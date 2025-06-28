# Calendar Component (calendar.md)

## Purpose
The Calendar component is the core UI for visualizing and managing shift assignments. It displays a monthly view, allows navigation between months, and provides interactive features for viewing and editing shifts.

## Key Features
- Monthly grid with days and shift assignments
- Navigation between months
- Clickable days to view or manage shifts
- Visual indicators for shift status (e.g., sick, open, covered)
- Responsive design for desktop and mobile

## Data Flow
- Reads shift and employee data from `DataManager`
- Renders shifts for each day using `DataManager.getShiftsForDate(date)`
- Updates UI in real time when data changes (localStorage events)

## Main Functions
- `Calendar.render(year, month)`: Renders the calendar grid for the given month
- Handles click events for days and shifts
- Integrates with modals for shift add/edit/view

## Example Usage
- On page load, `Calendar.render(currentYear, currentMonth)` is called
- When a day is clicked, a modal shows all assigned employees and their shifts for that day

## Related Files
- `js/calendar.js`: Calendar logic
- `js/main.js`: Initialization and event binding
- `index.html`, `calendar.html`: Calendar UI
