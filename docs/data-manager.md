# Data Manager Component (data-manager.md)

## Purpose
The Data Manager is responsible for all data operations in ShiftPilot Pro. It acts as the single source of truth for employees, shifts, roles, settings, and policies.

## Key Features
- Loads and saves data to localStorage (or other sources)
- Provides CRUD operations for shifts, employees, roles, and settings
- Ensures data consistency across the app
- Supports export/import and backup

## Data Flow
- Loads settings and shifts from localStorage on startup
- Exposes methods like `getEmployees()`, `getShiftsForDate(date)`, `addShift()`, `updateShift()`, etc.
- Notifies UI components to update when data changes

## Main Functions
- `loadData()`: Loads all settings and shifts
- `getEmployees()`, `getShiftTypes()`, `getPolicySettings()`
- `addShift(date, shiftData)`, `updateShift(date, shiftData)`, `deleteShift(date, shiftId)`
- `exportToCSV(year, month)`: Exports shift data for reporting

## Example Usage
- The calendar and reports use DataManager to fetch and display data
- All add/edit/delete actions go through DataManager

## Related Files
- `js/data-manager.js`: Data logic
- `db.json`: Example/sample data
- `js/main.js`, `js/settings.js`: Use DataManager for UI updates
