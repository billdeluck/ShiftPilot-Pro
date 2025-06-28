# Reports & Analytics (reports.md)

## Purpose
Provides advanced reporting and visualization for staff, shifts, absenteeism, and more. Helps managers make data-driven decisions.

## Key Features
- Dedicated reports page with multiple report types
- Staff summary, missed shifts, cover-up, salary deduction
- Data visualization using Chart.js
- Export to CSV/XLSX

## Data Flow
- Fetches data from DataManager for all reports
- Aggregates and visualizes data for the selected period
- Updates in real time as data changes

## Main Functions
- `renderStaffSummary()`: Shows employee/role summary
- `renderMissedShifts()`, `renderCoverUp()`, `renderSalaryDeduction()`: Specialized reports
- `renderChart()`: Visualizes data with Chart.js

## Example Usage
- Manager views monthly staff summary and missed shifts
- HR exports reports for payroll or compliance

## Related Files
- `reports.html`: Reports UI
- `js/reports.js`: Report logic
- `js/data-manager.js`: Data source
