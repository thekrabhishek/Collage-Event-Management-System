
function loadRegistrations() {
    const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
    const events = JSON.parse(localStorage.getItem('events')) || [];
    const eventTabs = document.getElementById('eventTabs');
    const eventTabContent = document.getElementById('eventTabContent');
    
    eventTabs.innerHTML = '';
    eventTabContent.innerHTML = '';
    
    const groupedRegistrations = {};
    events.forEach(event => {
        groupedRegistrations[event.id] = registrations.filter(r => r.eventId === event.id);
    });
    
    Object.keys(groupedRegistrations).forEach((eventId, index) => {
        const event = events.find(e => e.id === eventId);
        if (!event) return;
        
        const eventRegistrations = groupedRegistrations[eventId];
        const isActive = index === 0;
        
        const tabItem = document.createElement('li');
        tabItem.className = 'nav-item';
        tabItem.innerHTML = `
            <a class="nav-link ${isActive ? 'active' : ''}" 
               id="event-${eventId}-tab" 
               data-toggle="tab" 
               href="#event-${eventId}" 
               role="tab"
               aria-controls="event-${eventId}"
               aria-selected="${isActive}">
                ${event.name} (${eventRegistrations.length})
            </a>
        `;
        eventTabs.appendChild(tabItem);
        
        const tabContent = document.createElement('div');
        tabContent.className = `tab-pane fade ${isActive ? 'show active' : ''}`;
        tabContent.id = `event-${eventId}`;
        tabContent.setAttribute('role', 'tabpanel');
        tabContent.setAttribute('aria-labelledby', `event-${eventId}-tab`);
        
        tabContent.innerHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Student Name</th>
                            <th>Email</th>
                            <th>Course</th>
                            <th>Branch</th>
                            <th>Mobile</th>
                            <th>Registration Date</th>
                            <th>Ticket ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${eventRegistrations.map(reg => `
                            <tr>
                                <td>${reg.studentName}</td>
                                <td>${reg.email}</td>
                                <td>${reg.course}</td>
                                <td>${reg.branch}</td>
                                <td>${reg.mobile}</td>
                                <td>${new Date(reg.registrationDate).toLocaleString()}</td>
                                <td>${reg.ticketId}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        eventTabContent.appendChild(tabContent);
    });
}

function exportToExcel() {
    const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
    const events = JSON.parse(localStorage.getItem('events')) || [];
    
    const groupedRegistrations = {};
    events.forEach(event => {
        const eventRegs = registrations.filter(r => r.eventId === event.id);
        if (eventRegs.length > 0) {
            groupedRegistrations[event.name] = eventRegs;
        }
    });
    
    const wb = XLSX.utils.book_new();
    
    Object.entries(groupedRegistrations).forEach(([eventName, eventRegistrations]) => {
        const wsData = eventRegistrations.map(reg => ({
            'Student Name': reg.studentName,
            'Email': reg.email,
            'Course': reg.course,
            'Branch': reg.branch,
            'Mobile': reg.mobile,
            'Registration Date': new Date(reg.registrationDate).toLocaleString(),
            'Ticket ID': reg.ticketId,
            'Status': reg.registrationStatus || 'Pending'
        }));
        
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, eventName);
    });
    
    XLSX.writeFile(wb, 'event_registrations.xlsx');
}

function exportToPDF() {
    try {
        const registrations = JSON.parse(localStorage.getItem('registrations')) || [];
        const events = JSON.parse(localStorage.getItem('events')) || [];
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        let yOffset = 20;
        
        doc.setFontSize(20);
        doc.setTextColor(0, 123, 255); 
        doc.text('Event Registrations Report', 15, yOffset);
        yOffset += 15;
        
        events.forEach((event, eventIndex) => {
            const eventRegs = registrations.filter(r => r.eventId === event.id);
            if (eventRegs.length === 0) return;
            
            if (yOffset > 250) {
                doc.addPage();
                yOffset = 20;
            }
            
            doc.setFontSize(14);
            doc.setTextColor(73, 80, 87); 
            doc.text(event.name, 15, yOffset);
            yOffset += 8;
            
            const columns = [
                { header: 'Name', dataKey: 'name' },
                { header: 'Email', dataKey: 'email' },
                { header: 'Course', dataKey: 'course' },
                { header: 'Branch', dataKey: 'branch' },
                { header: 'Mobile', dataKey: 'mobile' },
                { header: 'Date', dataKey: 'date' },
                { header: 'Ticket ID', dataKey: 'ticketId' }
            ];
            
            const data = eventRegs.map(reg => ({
                name: reg.studentName,
                email: reg.email,
                course: reg.course,
                branch: reg.branch,
                mobile: reg.mobile,
                date: new Date(reg.registrationDate).toLocaleDateString(),
                ticketId: reg.ticketId
            }));
            
            doc.autoTable({
                columns: columns,
                body: data,
                startY: yOffset,
                margin: { left: 15, right: 15 },
                headStyles: {
                    fillColor: [0, 123, 255],
                    textColor: [255, 255, 255],
                    fontSize: 10,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: {
                    fontSize: 9,
                    textColor: [73, 80, 87]
                },
                alternateRowStyles: {
                    fillColor: [249, 250, 251]
                },
                columnStyles: {
                    name: { cellWidth: 30 },
                    email: { cellWidth: 45 },
                    course: { cellWidth: 20 },
                    branch: { cellWidth: 25 },
                    mobile: { cellWidth: 25 },
                    date: { cellWidth: 25 },
                    ticketId: { cellWidth: 25 }
                },
                didDrawPage: function(data) {
                    doc.setFontSize(8);
                    doc.setTextColor(108, 117, 125);
                    doc.text(
                        `Generated on ${new Date().toLocaleString()}`,
                        15,
                        doc.internal.pageSize.height - 10
                    );
                }
            });
            
            yOffset = doc.lastAutoTable.finalY + 15;
        });
        
        doc.save('event_registrations.pdf');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('An error occurred while generating the PDF. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    showSection('events');
    
    document.querySelector('a[onclick="showSection(\'registrations\')"]').addEventListener('click', loadRegistrations);
});
