$(document).ready(function() {
    const requiredFields = ['name', 'role']; // Define core required fields

    // --- UI Elements ---
    const $dragDropArea = $('#drag-drop-area');
    const $fileInput = $('#file-input');
    const $uploadBtn = $('#upload-btn');
    const $pasteDataInput = $('#paste-data-input');
    const $pasteBtn = $('#paste-btn');
    const $fieldMappingSection = $('#field-mapping-section');
    const $mappingTable = $('#mapping-table tbody');
    const $confirmMappingBtn = $('#confirm-mapping-btn');
    const $previewValidationSection = $('#preview-validation-section');
    const $importSummary = $('#import-summary');
    const $previewTable = $('#preview-table');
    const $previewTableHead = $('#preview-table thead');
    const $previewTableBody = $('#preview-table tbody');
    const $saveImportedDataBtn = $('#save-imported-data-btn');

    let importedRawData = [];
    let mappedData = [];
    let currentFileFormat = ''; // 'csv', 'xlsx', 'json'

    // --- Event Listeners ---
    $dragDropArea.on('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).addClass('drag-over');
    });

    $dragDropArea.on('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('drag-over');
    });

    $dragDropArea.on('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        $(this).removeClass('drag-over');
        const files = e.originalEvent.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    $fileInput.on('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });

    $uploadBtn.on('click', function() {
        $fileInput.click(); // Trigger file input click
    });

    $pasteBtn.on('click', function() {
        const pastedText = $pasteDataInput.val().trim();
        if (pastedText) {
            processPastedData(pastedText);
        } else {
            alert('Please paste data into the text area.');
        }
    });

    $confirmMappingBtn.on('click', confirmMapping);
    $saveImportedDataBtn.on('click', saveImportedData);

    // --- File Handling ---
    function handleFile(file) {
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        currentFileFormat = fileExtension;

        const reader = new FileReader();
        reader.onload = function(e) {
            const data = e.target.result;
            if (fileExtension === 'csv') {
                parseCSV(data);
            } else if (fileExtension === 'xlsx') {
                parseXLSX(data);
            } else if (fileExtension === 'json') {
                parseJSON(data);
            } else {
                alert('Unsupported file type.');
            }
        };
        if (fileExtension === 'xlsx') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    }

    // --- Data Parsing ---
    function parseCSV(csvData) {
        PapaParse.parse(csvData, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                importedRawData = results.data;
                if (importedRawData.length > 0) {
                    showFieldMapping(Object.keys(importedRawData[0]));
                } else {
                    alert('No data found in CSV.');
                }
            },
            error: function(err) {
                alert('Error parsing CSV: ' + err.message);
            }
        });
    }

    function parseXLSX(data) {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        importedRawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Get as array of arrays first
        
        if (importedRawData.length > 0) {
            // Assume first row is header
            const headers = importedRawData[0];
            importedRawData = importedRawData.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i];
                });
                return obj;
            });
            showFieldMapping(headers);
        } else {
            alert('No data found in XLSX.');
        }
    }

    function parseJSON(jsonData) {
        try {
            importedRawData = JSON.parse(jsonData);
            if (Array.isArray(importedRawData) && importedRawData.length > 0 && typeof importedRawData[0] === 'object') {
                showFieldMapping(Object.keys(importedRawData[0]));
            } else {
                alert('Invalid JSON format. Expected an array of objects.');
            }
        } catch (e) {
            alert('Error parsing JSON: ' + e.message);
        }
    }

    function processPastedData(pastedText) {
        // Try to detect format: JSON first, then CSV
        try {
            const jsonAttempt = JSON.parse(pastedText);
            if (Array.isArray(jsonAttempt) && jsonAttempt.length > 0 && typeof jsonAttempt[0] === 'object') {
                importedRawData = jsonAttempt;
                currentFileFormat = 'json';
                showFieldMapping(Object.keys(importedRawData[0]));
                return;
            }
        } catch (e) {
            // Not JSON, try CSV
        }

        PapaParse.parse(pastedText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                importedRawData = results.data;
                if (importedRawData.length > 0) {
                    currentFileFormat = 'csv';
                    showFieldMapping(Object.keys(importedRawData[0]));
                } else {
                    alert('No data found in pasted data. Please ensure it is valid CSV or JSON.');
                }
            },
            error: function(err) {
                alert('Error parsing pasted data as CSV: ' + err.message);
            }
        });
    }

    // --- Field Mapping ---
    function showFieldMapping(headers) {
        $mappingTable.empty();
        const systemFields = ['name', 'role', 'employee_id', 'phone', 'email', 'availability', 'off_days', 'preferred_shifts', 'salary', 'notes']; // Extend as needed
        
        headers.forEach(header => {
            const suggestedField = systemFields.find(field => field.toLowerCase() === header.toLowerCase()) || '';
            const row = `
                <tr>
                    <td>${header}</td>
                    <td>
                        <select class="system-field-select" data-original-header="${header}">
                            <option value="">-- Select Field --</option>
                            ${systemFields.map(field => `<option value="${field}" ${suggestedField === field ? 'selected' : ''}>${field}</option>`).join('')}
                        </select>
                    </td>
                </tr>
            `;
            $mappingTable.append(row);
        });
        $fieldMappingSection.show();
        $previewValidationSection.hide();
    }

    function confirmMapping() {
        mappedData = [];
        const mapping = {};
        $('.system-field-select').each(function() {
            const originalHeader = $(this).data('original-header');
            const systemField = $(this).val();
            if (systemField) {
                mapping[originalHeader] = systemField;
            }
        });

        importedRawData.forEach((row, index) => {
            const newEntry = {};
            let hasRequiredMissing = false;
            let missingFields = new Set();

            // Map fields
            for (const originalHeader in row) {
                if (mapping[originalHeader]) {
                    newEntry[mapping[originalHeader]] = row[originalHeader];
                }
            }

            // Assign temporary ID if not provided
            if (!newEntry.employee_id) {
                newEntry.employee_id = `temp_emp_${Date.now()}_${index}`;
            }

            // Validate and track missing required fields
            requiredFields.forEach(field => {
                if (!newEntry[field] || String(newEntry[field]).trim() === '') {
                    hasRequiredMissing = true;
                    missingFields.add(field);
                }
            });

            mappedData.push({
                data: newEntry,
                isValid: !hasRequiredMissing,
                missingFields: Array.from(missingFields)
            });
        });

        showPreviewAndValidation();
    }

    // --- Preview & Validation ---
    function showPreviewAndValidation() {
        $previewTableHead.empty();
        $previewTableBody.empty();
        $importSummary.empty();

        const allFields = new Set();
        mappedData.forEach(entry => {
            Object.keys(entry.data).forEach(field => allFields.add(field));
        });

        const headers = Array.from(allFields);
        $previewTableHead.append(`<tr>${headers.map(h => `<th>${h}</th>`).join('')}<th>Status</th></tr>`);

        let importedCount = 0;
        let errorCount = 0;
        let missingFieldsOverall = new Set();

        mappedData.forEach(entry => {
            const rowClass = entry.isValid ? '' : 'error-row';
            const status = entry.isValid ? 'Valid' : `Missing: ${entry.missingFields.join(', ')}`;
            if (!entry.isValid) errorCount++; else importedCount++;

            entry.missingFields.forEach(mf => missingFieldsOverall.add(mf));

            const rowHtml = `
                <tr class="${rowClass}">
                    ${headers.map(h => `<td>${entry.data[h] !== undefined ? entry.data[h] : ''}</td>`).join('')}
                    <td>${status}</td>
                </tr>
            `;
            $previewTableBody.append(rowHtml);
        });

        $importSummary.append(`
            <p><strong>Import Summary:</strong></p>
            <p>Total Records: ${mappedData.length}</p>
            <p>Valid Records: ${importedCount}</p>
            <p>Records with Missing Required Fields: ${errorCount}</p>
            ${missingFieldsOverall.size > 0 ? `<p>Overall Missing Required Fields: ${Array.from(missingFieldsOverall).join(', ')}</p>` : ''}
            ${errorCount > 0 ? `<p class="warning-message">Records with missing required fields will be imported but may not be fully functional until updated.</p>` : ''}
        `);

        $fieldMappingSection.hide();
        $previewValidationSection.show();
    }

    // --- Save Imported Data ---
    function saveImportedData() {
        const employeesToSave = mappedData.map(entry => entry.data);
        
        // Get existing employees from DataManager
        const existingEmployees = DataManager.getEmployees();
        
        // Merge new employees, handling deduplication by employee_id
        const updatedEmployees = [...existingEmployees];
        const existingEmployeeIds = new Set(existingEmployees.map(emp => emp.employee_id));

        let addedCount = 0;
        let updatedCount = 0;

        employeesToSave.forEach(newEmp => {
            const existingIndex = updatedEmployees.findIndex(emp => emp.employee_id === newEmp.employee_id);
            if (existingIndex !== -1) {
                // Update existing employee
                updatedEmployees[existingIndex] = { ...updatedEmployees[existingIndex], ...newEmp };
                updatedCount++;
            } else {
                // Add new employee
                updatedEmployees.push(newEmp);
                addedCount++;
            }
        });

        // Update settings in DataManager
        DataManager.settings.employees = updatedEmployees;
        DataManager.saveSettings(); // This will save to localStorage

        alert(`Import complete!\nAdded: ${addedCount} employees\nUpdated: ${updatedCount} employees`);
        
        // Optionally redirect or clear form
        window.location.href = 'settings.html'; // Go back to settings page
    }
});