document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResults = document.getElementById('search-results');
    const moduleDetails = document.getElementById('module-details');
    const noSelection = document.getElementById('no-selection');
    const examInfo = document.getElementById('exam-info');
    const moduleName = document.getElementById('module-name');
    const moduleCode = document.getElementById('module-code');
    const examDetails = document.getElementById('exam-details');
    
    // Store the exam data
    let examData = [];
    // Store unique modules
    let modules = new Map();
    
    // Fetch the CSV data
    fetch('database.csv')
        .then(response => response.text())
        .then(data => {
            parseCSV(data);
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error fetching CSV data:', error);
            alert('Failed to load exam data. Please refresh the page and try again.');
        });
    
    // Parse CSV data
    function parseCSV(csvData) {
        const rows = csvData.split('\n');
        const headers = rows[0].split(',');
        
        // Make sure we know the index of the Time/Tyd column
        const timeIndex = headers.indexOf('Time/Tyd');
        console.log("Headers:", headers);
        console.log("Time/Tyd column index:", timeIndex);
        
        for (let i = 1; i < rows.length; i++) {
            if (rows[i].trim() === '') continue;
            
            // Handle cases where there might be commas inside quoted fields
            let row = [];
            let insideQuote = false;
            let field = '';
            
            for (let j = 0; j < rows[i].length; j++) {
                const char = rows[i][j];
                
                if (char === '"') {
                    insideQuote = !insideQuote;
                } else if (char === ',' && !insideQuote) {
                    row.push(field.trim());
                    field = '';
                } else {
                    field += char;
                }
            }
            
            row.push(field.trim());
            
            // Create an object with the headers as keys
            const examEntry = {};
            for (let j = 0; j < headers.length; j++) {
                examEntry[headers[j]] = row[j] || '';
            }
            
            examData.push(examEntry);
            
            // Store unique modules
            const moduleKey = examEntry['Module'];
            if (moduleKey && !modules.has(moduleKey)) {
                modules.set(moduleKey, {
                    name: examEntry['Name (in Eng)'],
                    code: examEntry['Code/Kode']
                });
            }
        }
        
        // After parsing all data, log a few samples to check time values
        console.log("First 3 exam entries:", examData.slice(0, 3));
        console.log("Time values in first 10 entries:", examData.slice(0, 10).map(exam => exam['Time/Tyd']));
        
        // Print the full database array
        console.log("FULL DATABASE ARRAY:", examData);
        
        // Log the total number of entries
        console.log(`Total number of exam entries: ${examData.length}`);
        
        // Log specific columns to check data structure
        console.log("All unique column values:");
        headers.forEach(header => {
            const uniqueValues = [...new Set(examData.map(exam => exam[header]))].filter(Boolean);
            console.log(`${header}: ${uniqueValues.slice(0, 5).join(', ')}${uniqueValues.length > 5 ? '...' : ''} (${uniqueValues.length} unique values)`);
        });
        
        // Process all time values after parsing
        processTimeValues();
    }
    
    // Process and standardize time values for all exams
    function processTimeValues() {
        examData.forEach(exam => {
            // Set default time based on exam type
            if (exam['Exam'] === 'A1' && (!exam['Time/Tyd'] || exam['Time/Tyd'].trim() === '')) {
                exam['Time/Tyd'] = '17:00'; // 5pm for A1 exams with no time
                exam['_defaultTimeApplied'] = true; // Mark that we applied a default time
            } else if (!exam['Time/Tyd'] || exam['Time/Tyd'].trim() === '') {
                exam['Time/Tyd'] = '09:00'; // Default to 9am for other exams
                exam['_defaultTimeApplied'] = true; // Mark that we applied a default time
            }
            
            // Make sure time is in the proper format (HH:MM)
            if (exam['Time/Tyd'] && !exam['Time/Tyd'].includes(':')) {
                // If it's just a number, assume it's hours
                if (!isNaN(exam['Time/Tyd'])) {
                    exam['Time/Tyd'] = `${exam['Time/Tyd'].padStart(2, '0')}:00`;
                }
            }
        });
        
        console.log("After time processing - First 5 exams:", examData.slice(0, 5));
    }
    
    // Get formatted time string with default handling
    function getExamTime(exam) {
        if (!exam['Time/Tyd'] || exam['Time/Tyd'].trim() === '') {
            return exam['Exam'] === 'A1' ? '17:00 (Default)' : 'Not specified';
        }
        
        // If we applied a default time, indicate that
        if (exam['_defaultTimeApplied']) {
            return `${exam['Time/Tyd']} (Default)`;
        }
        
        return exam['Time/Tyd'];
    }

    // Setup event listeners
    function setupEventListeners() {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
        searchButton.addEventListener('click', handleSearch);
        
        // Allow search by pressing Enter
        searchInput.addEventListener('keyup', function(event) {
            if (event.key === 'Enter') {
                handleSearch();
            }
        });
        
        // Add event listener for download button
        document.getElementById('download-calendar').addEventListener('click', downloadCalendar);
    }
    
    // Handle search
    function handleSearch() {
        const query = searchInput.value.trim().toLowerCase();
        
        if (query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            return;
        }
        
        const filteredModules = Array.from(modules.entries())
            .filter(([key, module]) => {
                return key.toLowerCase().includes(query) || 
                       module.name.toLowerCase().includes(query) || 
                       module.code.toLowerCase().includes(query);
            })
            .slice(0, 20); // Limit to 20 results for performance
        
        displaySearchResults(filteredModules);
    }
    
    // Track selected modules
    let selectedModules = new Set();
    
    // Display search results with checkboxes
    function displaySearchResults(filteredModules) {
        searchResults.innerHTML = '';
        
        if (filteredModules.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'search-result-item';
            noResults.textContent = 'No modules found matching your search';
            searchResults.appendChild(noResults);
        } else {
            filteredModules.forEach(([key, module]) => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                
                // Add checkbox for selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'module-checkbox';
                checkbox.checked = selectedModules.has(key);
                checkbox.addEventListener('change', (e) => {
                    e.stopPropagation(); // Prevent triggering the parent's click event
                    if (e.target.checked) {
                        selectedModules.add(key);
                    } else {
                        selectedModules.delete(key);
                    }
                    updateSelectedModulesDisplay();
                });
                
                const label = document.createElement('span');
                label.textContent = key;
                
                resultItem.appendChild(checkbox);
                resultItem.appendChild(label);
                
                resultItem.addEventListener('click', (e) => {
                    if (e.target !== checkbox) {
                        displayModuleExams(key, module);
                        searchResults.classList.remove('active');
                    }
                });
                
                searchResults.appendChild(resultItem);
            });
        }
        
        searchResults.classList.add('active');
    }
    
    // Update the display of selected modules
    function updateSelectedModulesDisplay() {
        const selectedModulesContainer = document.getElementById('selected-modules');
        selectedModulesContainer.innerHTML = '';
        
        if (selectedModules.size === 0) {
            selectedModulesContainer.style.display = 'none';
            document.getElementById('download-calendar').style.display = 'none';
            return;
        }
        
        selectedModulesContainer.style.display = 'block';
        document.getElementById('download-calendar').style.display = 'block';
        
        selectedModules.forEach(moduleKey => {
            const module = modules.get(moduleKey);
            const moduleItem = document.createElement('div');
            moduleItem.className = 'selected-module';
            
            const moduleName = document.createElement('span');
            moduleName.textContent = moduleKey;
            
            const removeButton = document.createElement('button');
            removeButton.className = 'remove-module';
            removeButton.textContent = 'X';
            removeButton.addEventListener('click', () => {
                selectedModules.delete(moduleKey);
                updateSelectedModulesDisplay();
            });
            
            moduleItem.appendChild(moduleName);
            moduleItem.appendChild(removeButton);
            selectedModulesContainer.appendChild(moduleItem);
        });
        
        // Generate and display timetable for selected modules
        updateExamTimetable();
    }
    
    // Detect exam clashes (exams occurring at the same date and time)
    function detectClashes(exams) {
        const clashMap = new Map();
        const dateTimeMap = new Map();
        
        exams.forEach(exam => {
            const dateStr = exam['Date/Datum'];
            const timeStr = exam['Time/Tyd'];
            const key = `${dateStr}-${timeStr}`;
            
            if (!dateTimeMap.has(key)) {
                dateTimeMap.set(key, []);
            }
            
            dateTimeMap.get(key).push(exam);
        });
        
        // Find clashes (entries with more than one exam at same date/time)
        dateTimeMap.forEach((examsAtDateTime, key) => {
            if (examsAtDateTime.length > 1) {
                examsAtDateTime.forEach(exam => {
                    clashMap.set(exam, examsAtDateTime.filter(e => e !== exam));
                });
            }
        });
        
        return clashMap;
    }
    
    // Update the exam timetable display logic to use the new time function
    function updateExamTimetable() {
        const timetableContainer = document.getElementById('exam-timetable');
        timetableContainer.innerHTML = '';
        
        if (selectedModules.size === 0) {
            timetableContainer.style.display = 'none';
            return;
        }
        
        timetableContainer.style.display = 'block';
        
        // Get all exams for selected modules
        let allSelectedExams = [];
        selectedModules.forEach(moduleKey => {
            const moduleExams = examData.filter(exam => exam['Module'] === moduleKey);
            allSelectedExams = [...allSelectedExams, ...moduleExams];
        });
        
        // Log selected exams and their time values
        console.log("All selected exams for timetable:", allSelectedExams);
        console.log("Time values in selected exams:", allSelectedExams.map(exam => ({
            module: exam['Module'],
            time: exam['Time/Tyd'],
            hasTimeProperty: exam.hasOwnProperty('Time/Tyd')
        })));
        
        // Get all clashes
        const clashes = detectClashes(allSelectedExams);
        
        // If clashes exist, show a warning
        if (clashes.size > 0) {
            const clashSummary = document.createElement('div');
            clashSummary.className = 'clash-summary';
            clashSummary.innerHTML = '<h3>⚠️ Exam Time Conflicts Detected</h3>' +
                                    '<p>Exams highlighted in red occur at the same date and time.</p>';
            timetableContainer.appendChild(clashSummary);
        }
        
        // Sort exams by date and time
        allSelectedExams.sort((a, b) => {
            // Compare dates first (DD/MM/YYYY)
            const [dayA, monthA, yearA] = a['Date/Datum'].split('/');
            const [dayB, monthB, yearB] = b['Date/Datum'].split('/');
            
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            
            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            
            // If dates are the same, compare times
            const timeA = a['Time/Tyd'] || '09:00';
            const timeB = b['Time/Tyd'] || '09:00';
            
            const [hoursA, minutesA] = timeA.split(':').map(num => parseInt(num, 10));
            const [hoursB, minutesB] = timeB.split(':').map(num => parseInt(num, 10));
            
            if (hoursA !== hoursB) {
                return hoursA - hoursB;
            }
            
            return minutesA - minutesB;
        });
        
        // Create timetable
        const table = document.createElement('table');
        table.className = 'timetable';
        
        // Add table header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        ['Date', 'Time', 'Module', 'Exam', 'Location', 'Code'].forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Add table body
        const tbody = document.createElement('tbody');
        
        let currentDate = null;
        
        allSelectedExams.forEach(exam => {
            const row = document.createElement('tr');
            
            // Check if this is a new date
            const examDate = exam['Date/Datum'];
            if (currentDate !== examDate) {
                currentDate = examDate;
                row.className = 'new-date';
            }
            
            // Check if this exam clashes with others
            if (clashes.has(exam)) {
                row.classList.add('clash');
                
                // Add title with clash details
                const clashingModules = clashes.get(exam).map(e => e['Module']).join(', ');
                row.title = `Time conflict with: ${clashingModules}`;
            }
            
            // Date
            const dateCell = document.createElement('td');
            dateCell.textContent = formatDate(exam['Date/Datum']);
            row.appendChild(dateCell);
            
            // Time
            const timeCell = document.createElement('td');
            timeCell.textContent = getExamTime(exam);
            row.appendChild(timeCell);
            
            // Module
            const moduleCell = document.createElement('td');
            moduleCell.textContent = exam['Module'];
            moduleCell.className = 'module-name';
            row.appendChild(moduleCell);
            
            // Exam
            const examCell = document.createElement('td');
            examCell.textContent = exam['Exam'];
            row.appendChild(examCell);
            
            // Location
            const locationCell = document.createElement('td');
            locationCell.textContent = `${exam['Fac/Fakt']} - ${exam['Dept']}`;
            row.appendChild(locationCell);
            
            // Code
            const codeCell = document.createElement('td');
            codeCell.textContent = exam['Code/Kode'];
            row.appendChild(codeCell);
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        timetableContainer.appendChild(table);
    }
    
    // Format date for display (DD/MM/YYYY to more readable format)
    function formatDate(dateStr) {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(year, month - 1, day);
        
        const options = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
    
    // Generate and download ICS file
    function downloadCalendar() {
        if (selectedModules.size === 0) {
            alert('Please select at least one module first.');
            return;
        }
        
        let calendarEvents = [];
        
        selectedModules.forEach(moduleKey => {
            const moduleExams = examData.filter(exam => exam['Module'] === moduleKey);
            
            moduleExams.forEach(exam => {
                // Parse date and time
                const dateStr = exam['Date/Datum'];
                // Use the actual time value that's been processed
                const timeStr = exam['Time/Tyd'];
                
                console.log("Processing exam for calendar:", {
                    module: moduleKey,
                    exam: exam['Exam'],
                    time: timeStr,
                    defaultApplied: exam['_defaultTimeApplied'] || false
                });
                
                // Format: DD/MM/YYYY
                const [day, month, year] = dateStr.split('/');
                
                // Extract hours and minutes
                let hours = 9, minutes = 0;
                if (timeStr && timeStr.includes(':')) {
                    [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
                }
                
                // Create start date (exams typically last 3 hours)
                const startDate = new Date(year, month - 1, day, hours, minutes);
                const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // Add 3 hours
                
                const examTitle = `${moduleKey} - ${exam['Exam']} Exam`;
                const examLocation = `Faculty: ${exam['Fac/Fakt']}, Department: ${exam['Dept']}`;
                let examDescription = `Code: ${exam['Code/Kode']}\nDate: ${dateStr}\n`;
                
                // Add time info to description
                if (exam['_defaultTimeApplied']) {
                    examDescription += `Time: ${timeStr} (Default time - may not be accurate)\n`;
                } else {
                    examDescription += `Time: ${timeStr || 'Not specified'}\n`;
                }
                
                calendarEvents.push({
                    title: examTitle,
                    start: startDate,
                    end: endDate,
                    location: examLocation,
                    description: examDescription
                });
            });
        });
        
        // Generate ICS content
        let icsContent = 'BEGIN:VCALENDAR\r\n';
        icsContent += 'VERSION:2.0\r\n';
        icsContent += 'PRODID:-//Exam Calendar//EN\r\n';
        icsContent += 'CALSCALE:GREGORIAN\r\n';
        icsContent += 'METHOD:PUBLISH\r\n';
        
        calendarEvents.forEach(event => {
            icsContent += 'BEGIN:VEVENT\r\n';
            icsContent += `UID:${Date.now()}-${Math.random().toString(36).substring(2)}\r\n`;
            icsContent += `DTSTAMP:${formatICSDate(new Date())}\r\n`;
            icsContent += `DTSTART:${formatICSDate(event.start)}\r\n`;
            icsContent += `DTEND:${formatICSDate(event.end)}\r\n`;
            icsContent += `SUMMARY:${event.title}\r\n`;
            icsContent += `LOCATION:${event.location}\r\n`;
            icsContent += `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}\r\n`;
            icsContent += 'END:VEVENT\r\n';
        });
        
        icsContent += 'END:VCALENDAR';
        
        // Create and download the file
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'exam_calendar.ics';
        link.click();
    }
    
    // Format date for ICS file
    function formatICSDate(date) {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }
    
    // Utility function for debouncing
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
    
    // Display module exams - completely rewrite this function
    function displayModuleExams(moduleKey, module) {
        const moduleExams = examData.filter(exam => exam['Module'] === moduleKey);
        
        if (moduleExams.length === 0) {
            noSelection.style.display = 'block';
            examInfo.style.display = 'none';
            return;
        }
        
        console.log("Selected module exams:", moduleExams);
        console.log("Time values for selected exams:", moduleExams.map(exam => ({ 
            module: exam['Module'], 
            time: exam['Time/Tyd'],
            hasTimeProperty: exam.hasOwnProperty('Time/Tyd')
        })));
        
        // Update module info
        moduleName.textContent = moduleKey;
        moduleCode.textContent = module.code;
        
        // Clear previous exam details
        examDetails.innerHTML = '';
        
        // Add new exam details
        moduleExams.forEach(exam => {
            const row = document.createElement('tr');
            
            const examCell = document.createElement('td');
            examCell.textContent = exam['Exam'];
            row.appendChild(examCell);
            
            const facultyCell = document.createElement('td');
            facultyCell.textContent = exam['Fac/Fakt'];
            row.appendChild(facultyCell);
            
            const deptCell = document.createElement('td');
            deptCell.textContent = exam['Dept'];
            row.appendChild(deptCell);
            
            const codeCell = document.createElement('td');
            codeCell.textContent = exam['Code/Kode'];
            row.appendChild(codeCell);
            
            const dayCell = document.createElement('td');
            dayCell.textContent = exam['Day/Dag'];
            row.appendChild(dayCell);
            
            const dateCell = document.createElement('td');
            dateCell.textContent = exam['Date/Datum'];
            row.appendChild(dateCell);
            
            const timeCell = document.createElement('td');
            timeCell.textContent = getExamTime(exam);
            row.appendChild(timeCell);
            
            examDetails.appendChild(row);
        });
        
        // Show exam info and hide no selection message
        noSelection.style.display = 'none';
        examInfo.style.display = 'block';
        
        // Clear search input and results
        searchInput.value = '';
        searchResults.innerHTML = '';
    }
});
