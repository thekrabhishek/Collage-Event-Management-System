function checkAuth() {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (!isLoggedIn) {
        window.location.href = 'admin-login.html';
    }
}

checkAuth();

let events = JSON.parse(localStorage.getItem('events')) || [];
let registrations = JSON.parse(localStorage.getItem('registrations')) || [];

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(`${sectionName}-section`).style.display = 'block';
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');
}

function loadEvents() {
    const tableBody = document.getElementById('events-table-body');
    tableBody.innerHTML = '';
    
    events.forEach(event => {
        const registrationCount = registrations.filter(r => r.eventId === event.id).length;
        const row = `
            <tr>
                <td>${event.name}</td>
                <td>${event.date}</td>
                <td>${event.time}</td>
                <td>${event.venue}</td>
                <td>${registrationCount}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="editEvent('${event.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEvent('${event.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

function loadRegistrations() {
    const tableBody = document.getElementById('registrations-table-body');
    tableBody.innerHTML = '';
    
    registrations.forEach(registration => {
        const event = events.find(e => e.id === registration.eventId);
        if (event) {
            const row = `
                <tr>
                    <td>${event.name}</td>
                    <td>${registration.studentName}</td>
                    <td>${registration.email}</td>
                    <td>${registration.date}</td>
                    <td>${registration.ticketId}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        }
    });
}

function showEventModal(eventId = null) {
    const modal = $('#eventModal');
    const modalTitle = document.getElementById('eventModalLabel');
    const form = document.getElementById('eventForm');
    
    if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
            modalTitle.textContent = 'Edit Event';
            document.getElementById('eventId').value = event.id;
            document.getElementById('eventName').value = event.name;
            document.getElementById('eventDescription').value = event.description;
            document.getElementById('eventDate').value = event.date;
            document.getElementById('eventTime').value = event.time;
            document.getElementById('eventVenue').value = event.venue;
            document.getElementById('eventImage').value = event.image;
        }
    } else {
        modalTitle.textContent = 'Add New Event';
        form.reset();
        document.getElementById('eventId').value = '';
    }
    
    modal.modal('show');
}

function saveEvent() {
    const form = document.getElementById('eventForm');
    if (form.checkValidity()) {
        const eventId = document.getElementById('eventId').value;
        const eventData = {
            id: eventId || Date.now().toString(),
            name: document.getElementById('eventName').value,
            description: document.getElementById('eventDescription').value,
            date: document.getElementById('eventDate').value,
            time: document.getElementById('eventTime').value,
            venue: document.getElementById('eventVenue').value,
            image: document.getElementById('eventImage').value
        };
        
        if (eventId) {
            const index = events.findIndex(e => e.id === eventId);
            if (index !== -1) {
                events[index] = eventData;
            }
        } else {
            events.push(eventData);
        }
        
        localStorage.setItem('events', JSON.stringify(events));
        $('#eventModal').modal('hide');
        loadEvents();
    } else {
        form.reportValidity();
    }
}

function deleteEvent(eventId) {
    if (confirm('Are you sure you want to delete this event?')) {
        events = events.filter(e => e.id !== eventId);
        localStorage.setItem('events', JSON.stringify(events));
        loadEvents();
    }
}

function editEvent(eventId) {
    showEventModal(eventId);
}

function logout() {
    localStorage.removeItem('adminLoggedIn');
    window.location.href = 'admin-login.html';
}

let html5QrcodeScanner = null;

document.getElementById('startScanner').addEventListener('click', function() {
    const html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .then(() => {
            document.getElementById('startScanner').classList.add('d-none');
            document.getElementById('stopScanner').classList.remove('d-none');
            html5QrcodeScanner = html5QrCode;
        })
        .catch(err => {
            alert('Error starting scanner: ' + err);
        });
});

document.getElementById('stopScanner').addEventListener('click', function() {
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop()
            .then(() => {
                document.getElementById('startScanner').classList.remove('d-none');
                document.getElementById('stopScanner').classList.add('d-none');
                document.getElementById('scanResult').classList.add('d-none');
                html5QrcodeScanner = null;
            })
            .catch(err => {
                alert('Error stopping scanner: ' + err);
            });
    }
});

function onScanSuccess(ticketId) {
    const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
    const registration = registrations.find(r => r.ticketId === ticketId);
    
    const resultDiv = document.getElementById('scanResult');
    const resultDetails = document.getElementById('resultDetails');
    resultDiv.classList.remove('d-none');
    
    if (registration) {
        const events = JSON.parse(localStorage.getItem('events')) || [];
        const event = events.find(e => e.id === registration.eventId);
        
        resultDiv.querySelector('.alert').className = 'alert alert-success';
        resultDetails.innerHTML = `
            <p class="mb-1"><strong>Status:</strong> <span class="badge badge-success">Valid Ticket</span></p>
            <p class="mb-1"><strong>Event:</strong> ${event ? event.name : 'N/A'}</p>
            <p class="mb-1"><strong>Attendee:</strong> ${registration.studentName}</p>
            <p class="mb-1"><strong>Course:</strong> ${registration.course}</p>
            <p class="mb-1"><strong>Branch:</strong> ${registration.branch}</p>
            <p class="mb-1"><strong>Mobile:</strong> ${registration.mobile}</p>
            <p class="mb-0"><strong>Ticket ID:</strong> ${registration.ticketId}</p>
        `;
    } else {
        resultDiv.querySelector('.alert').className = 'alert alert-danger';
        resultDetails.innerHTML = `
            <p class="mb-1"><strong>Status:</strong> <span class="badge badge-danger">Invalid Ticket</span></p>
            <p class="mb-0">This ticket ID (${ticketId}) is not found in the system.</p>
        `;
    }
    
    if (html5QrcodeScanner) {
        html5QrcodeScanner.stop()
            .then(() => {
                document.getElementById('startScanner').classList.remove('d-none');
                document.getElementById('stopScanner').classList.add('d-none');
                html5QrcodeScanner = null;
            });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    
    loadEvents();
    loadRegistrations();
    
    const scannerTab = document.getElementById('scanner-tab');
    if (scannerTab) {
        scannerTab.addEventListener('click', function() {
            if (html5QrcodeScanner) {
                html5QrcodeScanner.stop().then(() => {
                    document.getElementById('startScanner').classList.remove('d-none');
                    document.getElementById('stopScanner').classList.add('d-none');
                    document.getElementById('scanResult').classList.add('d-none');
                    html5QrcodeScanner = null;
                });
            }
        });
    }
});
