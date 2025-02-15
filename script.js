let subjects = [];

async function fetchSubjects() {
    const response = await fetch('subjects.csv');
    const text = await response.text();
    subjects = text.split('\n').map(s => s.trim()).filter(s => s);
}

function filterSubjects(query) {
    return subjects.filter(subject => subject.toLowerCase().includes(query.toLowerCase()) ||
        subject.toLowerCase().startsWith(query.toLowerCase()));
}

document.getElementById('search').addEventListener('input', function() {
    const query = this.value;
    const results = filterSubjects(query);
    const resultsList = document.getElementById('results');
    resultsList.innerHTML = '';
    results.forEach(subject => {
        const li = document.createElement('li');
        li.textContent = subject;
        li.onclick = () => loadSchedule(subject);
        resultsList.appendChild(li);
    });
});

async function loadSchedule(subject) {
    const files = ['A1.csv', 'A2.csv', 'A3.csv'];
    let allSchedules = [];
    let header = [];

    for (let file of files) {
        const response = await fetch(file);
        const text = await response.text();
        const rows = text.split('\n').map(row => row.split(','));
        if (rows.length > 0 && header.length === 0) header = rows[0];

        const filteredRows = rows.filter(row => row.some(cell => cell && cell.includes(subject)));
        allSchedules = allSchedules.concat(filteredRows);
    }

    const scheduleDiv = document.getElementById('schedule');
    scheduleDiv.innerHTML = `<h3>Exam Schedule for ${subject}</h3>`;

    if (allSchedules.length > 0) {
        let table = '<table><tr>';
        header.forEach(col => table += `<th>${col}</th>`);
        table += '</tr>';
        allSchedules.forEach(row => {
            table += '<tr>';
            row.forEach(cell => table += `<td>${cell}</td>`);
            table += '</tr>';
        });
        table += '</table>';
        scheduleDiv.innerHTML += table;
    } else {
        scheduleDiv.innerHTML += '<p>No schedule found.</p>';
    }
}

fetchSubjects();
