function loadEvents() {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const eventList = document.getElementById('event-list');
    const completedEventList = document.getElementById('completed-event-list');
    
    if (eventList && completedEventList) {
        eventList.innerHTML = '';
        completedEventList.innerHTML = '';
        
        const currentDate = new Date();
        
        events.forEach(event => {
            const eventDate = new Date(event.date + 'T' + event.time);
            const isCompleted = eventDate < currentDate;
            const targetList = isCompleted ? completedEventList : eventList;
            
            const eventCard = `
                <div class="col-md-4 mb-4">
                    <div class="event-card card ${isCompleted ? 'completed' : ''}">
                        <img src="${event.image}" class="card-img-top" alt="${event.name}">
                        <div class="card-body">
                            <h5 class="card-title">${event.name}</h5>
                            <p class="card-text">${event.description}</p>
                            <div class="event-details">
                                <div class="detail">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${event.venue}</span>
                                </div>
                                <div class="detail">
                                    <i class="far fa-calendar-alt"></i>
                                    <span>${formatDate(event.date)}</span>
                                </div>
                                <div class="detail">
                                    <i class="far fa-clock"></i>
                                    <span>${formatTime(event.time)}</span>
                                </div>
                            </div>
                            ${isCompleted ? 
                                '<div class="completed-badge">Event Completed</div>' :
                                `<button class="btn btn-primary btn-block mt-3" onclick="registerForEvent('${event.id}')">
                                    Register Now
                                </button>`
                            }
                            <div class="registration-count" data-event-id="${event.id}">0</div>
                        </div>
                    </div>
                </div>
            `;
            targetList.innerHTML += eventCard;
        });
    }
}


function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}

function formatTime(timeStr) {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit'
    });
}

function registerForEvent(eventId) {
    const form = document.getElementById('registrationForm');
    if (form) {
        form.reset();
        document.getElementById('selectedEventId').value = eventId;
        
        $('#registrationModal').modal('show');
    } else {
        console.error('Registration form not found');
    }
}

async function submitRegistration(event) {
    event.preventDefault();
    
    const form = event.target;
    const errorDisplay = document.getElementById('registrationError');
    
    try {
        errorDisplay.classList.add('d-none');
        errorDisplay.textContent = '';
        
        const eventId = document.getElementById('selectedEventId').value;
        const studentName = form.studentName.value.trim();
        const email = form.email.value.trim().toLowerCase();
        const mobile = form.mobile.value.trim();
        const course = form.course.value.trim();
        const branch = form.branch.value.trim();
        
        if (!/^\d{10}$/.test(mobile)) {
            throw new Error('Please enter a valid 10-digit mobile number.');
        }
        
        await canRegisterForEvent(eventId, email, mobile);
        
        const ticketId = generateTicketId();
        const verificationCode = generateVerificationCode();
        
        const registration = {
            eventId,
            studentName,
            email,
            mobile,
            course,
            branch,
            ticketId,
            verificationCode,
            registrationDate: new Date().toISOString()
        };
        
        const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
        registrations.push(registration);
        localStorage.setItem('registrations', JSON.stringify(registrations));
        
        updateRegistrationCount(eventId);
        
        await generateTicket(registration, eventId);
        
        $('#registrationModal').modal('hide');
        document.getElementById('registration-success').style.display = 'block';
        
        await sendConfirmationEmail(registration, eventId);
        
    } catch (error) {
        errorDisplay.textContent = error.message;
        errorDisplay.classList.remove('d-none');
    }
}

async function canRegisterForEvent(eventId, email, mobile) {
    const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
    
    const existingRegistration = registrations.find(r => 
        r.eventId === eventId && 
        (r.email.toLowerCase() === email.toLowerCase() || r.mobile === mobile)
    );
    
    if (existingRegistration) {
        if (existingRegistration.email.toLowerCase() === email.toLowerCase() && 
            existingRegistration.mobile !== mobile) {
            throw new Error('A registration with this email already exists but with a different mobile number.');
        } else if (existingRegistration.mobile === mobile && 
                   existingRegistration.email.toLowerCase() !== email.toLowerCase()) {
            throw new Error('A registration with this mobile number already exists but with a different email.');
        } else {
            throw new Error('You are already registered for this event.');
        }
    }
    
    return true;
}

function generateTicketId() {
    const alphanumeric = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ticketId = '';
    for (let i = 0; i < 12; i++) {
        ticketId += alphanumeric.charAt(Math.floor(Math.random() * alphanumeric.length));
    }
    return ticketId;
}

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function sendConfirmationEmail(registration, eventId) {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const event = events.find(e => e.id === eventId);
    
    if (event) {
        const templateParams = {
            to_name: registration.studentName,
            to_email: registration.email,
            event_name: event.name,
            event_date: formatDate(event.date),
            event_time: formatTime(event.time),
            event_venue: event.venue,
            ticket_id: registration.ticketId,
            verification_code: registration.verificationCode
        };
        
        emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', templateParams)
            .then(function(response) {
                console.log('Email sent successfully:', response);
            }, function(error) {
                console.error('Email sending failed:', error);
            });
    }
}

function updateRegistrationCount(eventId) {
    const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
    const eventRegistrations = registrations.filter(r => r.eventId === eventId);
    const countElement = document.querySelector(`[data-event-id="${eventId}"] .registration-count`);
    
    if (countElement) {
        countElement.textContent = eventRegistrations.length;
        
        countElement.classList.add('count-updated');
        setTimeout(() => countElement.classList.remove('count-updated'), 1000);
    }
}

function verifyTicket(ticketId, verificationCode) {
    const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
    for (const registration of registrations) {
        if (registration.ticketId === ticketId && registration.verificationCode === verificationCode) {
            registration.registrationStatus = 'verified';
            localStorage.setItem('registrations', JSON.stringify(registrations));
            return {
                valid: true,
                message: 'Ticket verified successfully',
                registration: registration
            };
        }
    }
    
    return {
        valid: false,
        message: 'Invalid ticket or verification code'
    };
}

function generateTicket(registration, eventId) {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const event = events.find(e => e.id === eventId);
    
    if (event) {
        const ticketHtml = `
            <div class="ticket">
                <div class="ticket-content">
                    <div class="ticket-left">
                        <div class="logo">
                            <h4>College<span>Events</span></h4>
                        </div>
                        
                        <div class="event-name">
                            <h5>${event.name}</h5>
                        </div>
                        
                        <div class="details">
                            <div class="details-section">
                                <p><strong>Event Details</strong></p>
                                <p><i class="far fa-calendar-alt"></i> ${formatDate(event.date)}</p>
                                <p><i class="far fa-clock"></i> ${formatTime(event.time)}</p>
                                <p><i class="fas fa-map-marker-alt"></i> ${event.venue}</p>
                            </div>
                            
                            <div class="details-section">
                                <p><strong>Attendee Details</strong></p>
                                <p><i class="far fa-user"></i> ${registration.studentName}</p>
                                <p><i class="fas fa-graduation-cap"></i> ${registration.course}</p>
                                <p><i class="fas fa-code-branch"></i> ${registration.branch}</p>
                                <p><i class="fas fa-phone-alt"></i> ${registration.mobile}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="ticket-right">
                        <div class="qr-code" id="qrcode"></div>
                        <div class="ticket-id">
                            <strong>Ticket ID</strong>
                            ${registration.ticketId}
                        </div>
                    </div>
                </div>
                
                <div class="corner-circle-top corner-circles"></div>
                <div class="corner-circle-bottom corner-circles"></div>
            </div>
        `;
        
        document.getElementById('ticketPreview').innerHTML = ticketHtml;
        
        const qrcode = new QRCode(document.getElementById("qrcode"), {
            text: registration.ticketId,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
        
        $('#ticketModal').modal('show');
    }
}

function downloadTicket() {
    const ticketElement = document.getElementById('ticketPreview');
    
    setTimeout(() => {
        html2canvas(ticketElement, {
            scale: 2,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'event-ticket.png';
            link.href = image;
            link.click();
        });
    }, 100); 
}

// Initialize default events if none exist
function initializeDefaultEvents() {
    const events = JSON.parse(localStorage.getItem('events')) || [];
    
    if (events.length === 0) {
        const defaultEvents = [
            {
                id: 'evt1',
                name: 'Annual Tech Symposium',
                description: 'A day-long technical symposium featuring workshops, coding competitions, and tech talks.',
                date: '2025-01-15',
                time: '09:00',
                venue: 'Main Auditorium',
                image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800',
                capacity: 200
            },
            {
                id: 'evt2',
                name: 'Cultural Fest 2025',
                description: 'Annual cultural festival with music, dance, and theatrical performances.',
                date: '2025-02-20',
                time: '10:00',
                venue: 'College Ground',
                image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800',
                capacity: 500
            },
            {
                id: 'evt3',
                name: 'Winter Sports Meet',
                description: 'Inter-college sports competition featuring various indoor and outdoor games.',
                date: '2025-10-05',
                time: '08:00',
                venue: 'Sports Complex',
                image: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800',
                capacity: 300
            },
            {
                id: 'evt4',
                name: 'Career Fair 2025',
                description: 'Connect with top companies and explore career opportunities.',
                date: '2025-03-10',
                time: '11:00',
                venue: 'Conference Center',
                image: 'https://images.unsplash.com/photo-1560523159-4a9692d222ef?auto=format&fit=crop&w=800',
                capacity: 400
            },
            {
                id: 'evt5',
                name: 'New Year Celebration',
                description: 'Welcome 2025 with music, food, and festivities.',
                date: '2025-01-01',
                time: '20:00',
                venue: 'College Ground',
                image: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?auto=format&fit=crop&w=800',
                capacity: 1000
            },
            {
                id: 'evt6',
                name: 'AI & Machine Learning Workshop',
                description: 'Hands-on workshop on artificial intelligence and machine learning fundamentals.',
                date: '2025-02-28',
                time: '14:00',
                venue: 'Computer Lab Complex',
                image: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800',
                capacity: 100
            },
            {
                id: 'evt7',
                name: 'Alumni Meet 2025',
                description: 'Annual gathering of college alumni sharing experiences and networking.',
                date: '2025-01-25',
                time: '16:00',
                venue: 'College Banquet Hall',
                image: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800',
                capacity: 250
            },
            {
                id: 'evt8',
                name: 'Environmental Awareness Drive',
                description: 'Campus-wide initiative for environmental conservation and sustainability.',
                date: '2025-03-22',
                time: '09:30',
                venue: 'Botanical Garden',
                image: 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=800',
                capacity: 150
            },
            {
                id: 'evt9',
                name: 'Entrepreneurship Summit',
                description: 'Meet successful entrepreneurs and learn about startup opportunities.',
                date: '2025-04-05',
                time: '10:00',
                venue: 'Business School Auditorium',
                image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800',
                capacity: 300
            },
            {
                id: 'evt10',
                name: 'Spring Music Festival',
                description: 'A day of live music performances featuring college bands and professional artists.',
                date: '2025-03-15',
                time: '17:00',
                venue: 'Open Air Theater',
                image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=800',
                capacity: 600
            }
        ];
        
        localStorage.setItem('events', JSON.stringify(defaultEvents));
    }
}

// Call initializeDefaultEvents when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeDefaultEvents();
    loadEvents();
});
