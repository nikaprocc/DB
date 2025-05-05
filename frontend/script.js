// frontend/script.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Елементи DOM ---
    let reportChart = null; // Змінна для зберігання інстансу Chart.js
    let currentReportData = []; // <--- ДОДАНО: Зберігатимемо дані поточного звіту тут


    const sidebarNavItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const contentArea = document.getElementById('contentArea');
    const pageTitle = document.getElementById('pageTitle');
    const userIconWrapper = document.getElementById('userIconWrapper');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const logoutButton = document.getElementById('logoutButton');
    const userNameDisplay = document.getElementById('userName');
    const userRoleDisplay = document.getElementById('userRole');
    const userModal = document.getElementById('userModal');
    const userForm = document.getElementById('userForm');
    const addUserBtn = document.getElementById('addUserBtn');
    const modalTitle = document.getElementById('modalTitle');
    const userIdInput = document.getElementById('userId');
    const userFormError = document.getElementById('userFormError');
    const addPatientBtn = document.getElementById('addPatientBtn');
    console.log('Add Patient Button Element:', addPatientBtn); 
    const patientModal = document.getElementById('patientModal');
    if (addPatientBtn) {
        addPatientBtn.addEventListener('click', () => {
            // Викликаємо функцію відкриття модального вікна для створення нового пацієнта
            // Передаємо заголовок і порожній об'єкт даних
            openPatientModal('Add New Patient', {});
        });
    }
    const patientForm = document.getElementById('patientForm');
    const patientModalTitle = document.getElementById('patientModalTitle');
    const patientIdInput = document.getElementById('patientId');
    const patientFormError = document.getElementById('patientFormError');
    const patientStatusGroup = document.getElementById('patientStatusGroup');

    // --- DOM Елементи Фільтрів Пацієнтів ---
    const patientSearchInput = document.getElementById('patientSearchInput');
    const dobFromInput = document.getElementById('dobFromInput'); // <-- Елемент для дати "від"
    const dobToInput = document.getElementById('dobToInput');     // <-- Елемент для дати "до"
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');


    const medicationSearchInput = document.getElementById('medicationSearchInput');
    const clearMedicationSearchBtn = document.getElementById('clearMedicationSearchBtn');
    const medicationListContainer = document.getElementById('medicationListContainer');
// --- Стан для Препаратів ---
let medicationSearchTerm = ''; // Зберігає поточний пошуковий запит для препаратів

    // --- Стан Сортування та Фільтрації Пацієнтів ---
    let patientSortColumn = 'fullName';
    let patientSortOrder = 'ASC';
    let patientSearchTerm = '';
    let patientDobFrom = ''; // <-- Змінна стану для дати "від"
    let patientDobTo = '';   // <-- Змінна стану для дати "до"

    // --- Стан для Адмін Частини ---
    let currentUserData = null;
    let currentUserRole = null;
    const token = localStorage.getItem('authToken');
    const storedUserData = localStorage.getItem('userData');
    let userIdToApprove = null;

    const proceduresContentBlock = document.getElementById('procedures-content'); // Головний блок процедур
    const assignedProceduresView = document.getElementById('assigned-procedures-view');
    const procedureDirectoryView = document.getElementById('procedure-directory-view');
    const assignedProceduresContainer = document.getElementById('assignedProceduresContainer');
    const procedureDirectoryContainer = document.getElementById('procedureDirectoryContainer');
    const viewToggleButtons = proceduresContentBlock?.querySelectorAll('.view-toggle .btn-toggle');

    // Фільтри для призначених процедур
    const assignedProcPatientFilter = document.getElementById('assignedProcPatientFilter');
    const assignedProcPatientId = document.getElementById('assignedProcPatientId');
    const assignedProcStatusFilter = document.getElementById('assignedProcStatusFilter');
    const assignedProcDateFromFilter = document.getElementById('assignedProcDateFromFilter');
    const assignedProcDateToFilter = document.getElementById('assignedProcDateToFilter');
    const applyAssignedProcFilterBtn = document.getElementById('applyAssignedProcFilterBtn');
    const clearAssignedProcFilterBtn = document.getElementById('clearAssignedProcFilterBtn');

    // Кнопка призначення нової
    const assignNewProcedureBtn = document.getElementById('assignNewProcedureBtn');

    // Елементи модального вікна Призначення
    const assignProcedureModal = document.getElementById('assignProcedureModal');
    const assignProcedureForm = document.getElementById('assignProcedureForm');
    const modalAssignPatientSearch = document.getElementById('modalAssignPatientSearch');
    const modalAssignPatientId = document.getElementById('modalAssignPatientId');
    const modalAssignPatientResults = document.getElementById('modalAssignPatientResults');
    const modalAssignProcedure = document.getElementById('modalAssignProcedure');
    const modalAssignAppointment = document.getElementById('modalAssignAppointment');
    const modalAssignExecutorSearch = document.getElementById('modalAssignExecutorSearch');
    const modalAssignExecutorId = document.getElementById('modalAssignExecutorId');
    const modalAssignExecutorResults = document.getElementById('modalAssignExecutorResults');
    const assignProcedureFormError = document.getElementById('assignProcedureFormError');

    // Елементи модального вікна Оновлення статусу
    const updateProcedureStatusModal = document.getElementById('updateProcedureStatusModal');
    const updateProcedureStatusForm = document.getElementById('updateProcedureStatusForm');
    const updateAssignmentId = document.getElementById('updateAssignmentId');
    const modalUpdatePatientInfo = document.getElementById('modalUpdatePatientInfo');
    const modalUpdateProcedureInfo = document.getElementById('modalUpdateProcedureInfo');
    const modalUpdateStatus = document.getElementById('modalUpdateStatus');
    const modalUpdateResult = document.getElementById('modalUpdateResult');
    const updateProcedureStatusFormError = document.getElementById('updateProcedureStatusFormError');


    // --- Стан для Процедур ---
    let currentProcedureView = 'assigned'; // 'assigned' або 'directory'
    let assignedProceduresFilters = { // Зберігає поточні стани фільтрів
        patientId: null,
        status: '',
        dateFrom: '',
        dateTo: ''
    };
    let procedureDirectoryCache = []; // Кеш для довідника процедур


    const scheduleContentBlock = document.getElementById('schedule-content');
    const scheduleTableContainer = document.getElementById('scheduleTableContainer');
    const addAppointmentBtn = document.getElementById('addAppointmentBtn');

    // Фільтри розкладу
    const scheduleDateFromFilter = document.getElementById('scheduleDateFromFilter');
    const scheduleDateToFilter = document.getElementById('scheduleDateToFilter');
    const scheduleDoctorFilter = document.getElementById('scheduleDoctorFilter');
    const schedulePatientFilterSearch = document.getElementById('schedulePatientFilterSearch');
    const schedulePatientFilterId = document.getElementById('schedulePatientFilterId');
    const schedulePatientFilterResults = document.getElementById('schedulePatientFilterResults');
    const scheduleStatusFilter = document.getElementById('scheduleStatusFilter');
    const applyScheduleFilterBtn = document.getElementById('applyScheduleFilterBtn');
    const clearScheduleFilterBtn = document.getElementById('clearScheduleFilterBtn');

    // Елементи модального вікна Прийому
    const appointmentModal = document.getElementById('appointmentModal');
    const appointmentForm = document.getElementById('appointmentForm');
    const appointmentModalTitle = document.getElementById('appointmentModalTitle');
    const modalAppointmentId = document.getElementById('modalAppointmentId');
    const modalAppointmentPatientSearch = document.getElementById('modalAppointmentPatientSearch');
    const modalAppointmentPatientId = document.getElementById('modalAppointmentPatientId');
    const modalAppointmentPatientResults = document.getElementById('modalAppointmentPatientResults');
    const modalAppointmentDoctor = document.getElementById('modalAppointmentDoctor');
    const modalAppointmentDateTime = document.getElementById('modalAppointmentDateTime');
    const modalAppointmentDuration = document.getElementById('modalAppointmentDuration');
    const modalAppointmentReason = document.getElementById('modalAppointmentReason');
    const editAppointmentFields = document.getElementById('editAppointmentFields');
    const modalAppointmentStatus = document.getElementById('modalAppointmentStatus');
    const modalAppointmentConclusions = document.getElementById('modalAppointmentConclusions');
    const appointmentFormError = document.getElementById('appointmentFormError');


    // --- Стан для Розкладу ---
    let scheduleFilters = { // Поточні фільтри розкладу
        dateFrom: '',
        dateTo: '',
        doctorId: '',
        patientId: null,
        status: ''
    };
    let doctorsListCache = []; // Кеш для списку лікарів (для селектів)

    const appointmentTimeStatusDiv = document.getElementById('appointmentTimeStatus'); // Новий елемент
    let availabilityCheckTimeout; 

    // --- Функції ---

    function handleLogout() {
        console.log('Logging out...');
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        if (window.location.pathname !== '/login.html') {
            window.location.href = 'login.html';
        }
    }

    // Перевірка токена та даних користувача
    if (token && storedUserData) {
        try {
            currentUserData = JSON.parse(storedUserData);
            currentUserRole = currentUserData.role;
            console.log('Token found. User data loaded:', currentUserData);
            if (!currentUserRole) {
                console.error("User role missing in stored user data. Logging out.");
                handleLogout();
            }
        } catch (e) {
            console.error('Error parsing user data:', e);
            handleLogout();
        }
    } else {
        console.log('Token or user data not found. Redirecting to login.');
        if (window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
            handleLogout();
        }
    }
    if (!currentUserRole && window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
        console.error("currentUserRole is not defined, stopping script execution.");
        return;
    }

    async function fetchProtected(url, options = {}) {
        const currentToken = localStorage.getItem('authToken');
        if (!currentToken) {
            console.error("Auth token is missing. Cannot make protected request:", url);
            alert("Сесія закінчилась або ви не авторизовані. Будь ласка, увійдіть знову.");
            handleLogout();
            throw new Error("Not authenticated: No token found.");
        }
        const headers = {
            'Authorization': `Bearer ${currentToken}`,
            ...options.headers
        };
        if (options.body && !headers['Content-Type']) {
             headers['Content-Type'] = 'application/json';
        }
        options.headers = headers;
        // console.log(`WorkspaceProtected: Calling ${url} with method ${options.method || 'GET'}.`); // Менш детальний лог

        try {
            const response = await fetch(url, options);
            if (response.status === 401) {
                console.error(`Authorization error: 401 Unauthorized from ${url}.`);
                alert("Сесія недійсна або закінчився термін дії (401). Будь ласка, увійдіть знову.");
                handleLogout();
                throw new Error("Unauthorized (401)");
            }
            if (response.status === 403) {
                console.error(`Authorization error: 403 Forbidden from ${url}.`);
                let errorMsg = "Недостатньо прав доступу (403).";
                 try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch(e) {}
                 alert(errorMsg);
                throw new Error("Forbidden (403)");
            }
            if (response.status === 422) {
                console.error(`Unprocessable Entity error: 422 from ${url}.`);
                let errorMsg = "Не вдалося обробити запит (422).";
                try { const errorData = await response.json(); errorMsg = errorData.message || errorData.msg || errorMsg;} catch(e) {}
                alert(`Помилка обробки запиту: ${errorMsg}`);
                throw new Error(`Unprocessable Entity (422): ${errorMsg}`);
            }
            if (!response.ok) {
                let errorMsg = `HTTP error! Status: ${response.status}`;
                try { const errorData = await response.json(); errorMsg = errorData.message || errorMsg; } catch(e) {}
                console.error(`HTTP Error ${response.status} for ${url}: ${errorMsg}`);
                throw new Error(errorMsg);
           }
            if (response.status === 204) {
                 console.log(`WorkspaceProtected: Received 204 No Content for ${url}`);
                 return null;
             }
            return response;
        } catch (error) {
            console.error("Fetch error caught in fetchProtected:", error);
            if (!error.message.includes('(401)') && !error.message.includes('(403)') && !error.message.includes('(422)')) {
                throw error;
            }
            return null;
        }
    }

    function updateUserAccess() {
        console.log('Running updateUserAccess...'); // <--- Додано лог
        if (!currentUserRole) {
            console.log('updateUserAccess: currentUserRole is not set yet.'); // <--- Додано лог
            return;
        }
        console.log('updateUserAccess: currentUserRole is', currentUserRole); // <--- Додано лог

        const usersNavItem = document.getElementById('nav-users');
        const pendingNavItem = document.getElementById('nav-pending');

        if (userRoleDisplay) userRoleDisplay.textContent = currentUserRole;
        if (userNameDisplay && currentUserData) userNameDisplay.textContent = currentUserData.fullName || "User";

        const configureNavItem = (item, isAdminOnly) => {
             if (!item) return;
             const lockIcon = item.querySelector('.lock-icon');
             const canAccess = currentUserRole === 'Admin' || !isAdminOnly;
             // console.log(`Configuring nav item ${item.id || 'unknown'}: Can access = ${canAccess}`); // Додатковий лог, якщо потрібно
             item.classList.toggle('inaccessible', !canAccess);
             item.classList.toggle('accessible', canAccess);
             if (lockIcon) lockIcon.style.display = canAccess ? 'none' : 'inline-block';
             item.style.pointerEvents = canAccess ? 'auto' : 'none';
        };

        configureNavItem(usersNavItem, true);
        configureNavItem(pendingNavItem, true);

        // === Кінець перевірки ===

        if (patientStatusGroup) {
             patientStatusGroup.style.display = currentUserRole === 'Admin' ? 'block' : 'none';
         }
    }

    async function fetchAndDisplayDashboardData() {
        const doctorDashboardContainer = document.getElementById('dashboard-content-doctor');
        const registrarDashboardContainer = document.getElementById('dashboard-content-registrar');
        const adminDashboardContainer = document.getElementById('dashboard-content-admin');
        const apiUrl = `http://127.0.0.1:5000/api/dashboard_data`;
        let activeDashboardContainer = null;
        if (doctorDashboardContainer?.style.display === 'block') activeDashboardContainer = doctorDashboardContainer;
        else if (registrarDashboardContainer?.style.display === 'block') activeDashboardContainer = registrarDashboardContainer;
        else if (adminDashboardContainer?.style.display === 'block') activeDashboardContainer = adminDashboardContainer;
        if (!activeDashboardContainer) return;
        activeDashboardContainer.innerHTML = '<h2>Loading Dashboard...</h2>';
        try {
            const response = await fetchProtected(apiUrl); if (!response) return;
            const data = await response.json();
            activeDashboardContainer.innerHTML = ''; // Clear before adding
            // Populate Doctor Dashboard
            if (currentUserRole === 'Doctor' && activeDashboardContainer.id === 'dashboard-content-doctor') {
                // Вставляємо структуру HTML для дашборду лікаря
                activeDashboardContainer.insertAdjacentHTML('beforeend', `
                   <div class="block-section appointments-section">
                       <h2 class="block-title">Upcoming Appointments</h2>
                       <div class="block-body" id="doctor-upcoming-appointments">
                           </div>
                   </div>
                   <div class="block-section patients-section">
                       <h2 class="block-title">My Patients</h2>
                       <div class="block-body patients-slider">
                           <button class="arrow arrow-prev"><i class="fas fa-chevron-left"></i></button>
                           <div class="patients-card-container" id="doctor-quick-patients">
                               </div>
                           <button class="arrow arrow-next"><i class="fas fa-chevron-right"></i></button>
                       </div>
                   </div>`);

               const appointmentsDiv = document.getElementById('doctor-upcoming-appointments');
               const patientsDiv = document.getElementById('doctor-quick-patients'); // Поки не використовуємо

               // Заповнюємо список майбутніх прийомів
               if (appointmentsDiv) {
                   if (Array.isArray(data.upcomingAppointments) && data.upcomingAppointments.length > 0) {
                       let appointmentsHTML = '<ul>';
                       data.upcomingAppointments.forEach(app => {
                           // Робимо ім'я пацієнта посиланням (наприклад, для перегляду деталей)
                           appointmentsHTML += `
                               <li>
                                   ${app.time} -
                                   <a href="#" onclick="event.preventDefault(); viewPatientDetails(${app.patientId});">
                                       <strong>${app.patient}</strong>
                                   </a>
                                   (${app.reason})
                               </li>`;
                       });
                       appointmentsHTML += '</ul>';
                       appointmentsDiv.innerHTML = appointmentsHTML;
                   } else {
                       appointmentsDiv.innerHTML = '<p>No upcoming scheduled appointments found.</p>';
                   }
               }

               if (patientsDiv) {
                if (Array.isArray(data.quickPatientLinks) && data.quickPatientLinks.length > 0) {
                    let patientsHTML = '';
                    data.quickPatientLinks.forEach(p => {
                        const ageString = p.age !== null ? `${p.age} years old` : 'Age unknown';
                        patientsHTML += `
                            <div class="patient-card" data-patient-id="${p.id}" onclick="viewPatientDetails(${p.id})"> <div class="patient-image">
                                    </div>
                                <div class="patient-info">
                                    <p class="patient-name">${p.name}</p>
                                    <p class="patient-age">${ageString}</p>
                                </div>
                            </div>`;
                    });
                    patientsDiv.innerHTML = patientsHTML;
                    // TODO: Додати логіку для стрілок слайдера, якщо пацієнтів більше, ніж вміщується
                } else {
                    patientsDiv.innerHTML = '<p>No patients found for this doctor.</p>';
                }
            }

           }

            // Populate Registrar Dashboard
            else if (currentUserRole === 'Registrar' && activeDashboardContainer.id === 'dashboard-content-registrar') {
                // ВИПРАВЛЕНО: Вставляємо HTML з ПРАВИЛЬНОЮ кнопкою (з ID, без onclick)
                activeDashboardContainer.insertAdjacentHTML('beforeend', `
                   <h2 class="dashboard-title-registrar">Registrar Dashboard</h2>
                   <div class="registrar-widgets">
                       <div class="widget"><h3>Today's Schedule Overview</h3><div id="registrar-schedule-summary"></div><button onclick="forceSwitchContent('schedule')">View Full Schedule</button></div>
                       <div class="widget">
                           <h3>Patient Actions</h3>
                           <input type="search" id="registrar-patient-search" placeholder="Search Patients...">
                           <button id="registrarAddPatientBtn">Add New Patient</button> <div id="registrar-search-results"></div>
                       </div>
                       <div class="widget"><h3>Appointments Today</h3><p>Total: <span id="registrar-total-appts"></span></p><p>Checked-in: <span id="registrar-checkedin-appts"></span></p></div>
                   </div>`);

                // Заповнюємо дані віджетів (без змін)
                document.getElementById('registrar-schedule-summary').textContent = data.scheduleSummary || "N/A";
                document.getElementById('registrar-total-appts').textContent = data.totalAppointmentsToday ?? "...";
                document.getElementById('registrar-checkedin-appts').textContent = data.checkedInAppointments ?? "...";

                // --- Додаємо обробники ПІСЛЯ вставки HTML ---

                // Обробник для кнопки "Add New Patient"
                const registrarAddBtn = document.getElementById('registrarAddPatientBtn');
                if (registrarAddBtn) {
                    registrarAddBtn.addEventListener('click', () => {
                        openPatientModal('Add New Patient', {}, false);
                    });
                } // ВИПРАВЛЕНО: Дужка закриває ТІЛЬКИ цей if

                // Обробник для поля пошуку
                const registrarSearchInput = document.getElementById('registrar-patient-search');
                if (registrarSearchInput) {
                    registrarSearchInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const searchTerm = e.target.value.trim();
                            console.log(`Registrar dashboard search initiated for: "${searchTerm}"`);

                            // Оновлюємо глобальний стан пошуку
                            patientSearchTerm = searchTerm;

                            // Опціонально: скинути інші фільтри
                            // patientDobFrom = ''; patientDobTo = '';
                            // if(dobFromInput) dobFromInput.value = '';
                            // if(dobToInput) dobToInput.value = '';

                            // Перемикаємо на сторінку Patients
                            forceSwitchContent('patients');
                        }
                    });
                }
           }
            // Populate Admin Dashboard
            else if (currentUserRole === 'Admin' && activeDashboardContainer.id === 'dashboard-content-admin') {
                 activeDashboardContainer.insertAdjacentHTML('beforeend', `
                    <h2 class="dashboard-title-admin">Administrator Dashboard</h2><div class="admin-stats-container"><div class="stat-card"><i class="fas fa-users stat-icon"></i><div class="stat-value" id="admin-stat-total-users"></div><div class="stat-label">Total Users</div></div><div class="stat-card"><i class="fas fa-user-clock stat-icon"></i><div class="stat-value" id="admin-stat-pending-reg"></div><div class="stat-label">Pending Registrations</div><a href="#" onclick="forceSwitchContent('pending-registrations')" class="stat-link">View</a></div><div class="stat-card"><i class="fas fa-hospital-user stat-icon"></i><div class="stat-value" id="admin-stat-total-patients"></div><div class="stat-label">Total Patients</div><a href="#" onclick="forceSwitchContent('patients')" class="stat-link">View</a></div><div class="stat-card"><i class="fas fa-calendar-check stat-icon"></i><div class="stat-value" id="admin-stat-appts-today"></div><div class="stat-label">Appointments Today</div><a href="#" onclick="forceSwitchContent('schedule')" class="stat-link">View</a></div></div><div class="admin-quick-actions"><h3>Quick Actions</h3><button onclick="forceSwitchContent('users')">Manage Users</button></div>`);
                 document.getElementById('admin-stat-total-users').textContent = data.totalUsers ?? "...";
                 document.getElementById('admin-stat-pending-reg').textContent = data.pendingRegistrations ?? "...";
                 document.getElementById('admin-stat-total-patients').textContent = data.totalPatients ?? "...";
                 document.getElementById('admin-stat-appts-today').textContent = data.appointmentsToday ?? "...";
            } else {
                 console.warn(`Mismatch between role (${currentUserRole}) and active dashboard container (${activeDashboardContainer.id})`);
                 activeDashboardContainer.innerHTML = `<p>Could not load dashboard for role ${currentUserRole}.</p>`;
            }
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            if (activeDashboardContainer) activeDashboardContainer.innerHTML = `<p style="color: red;">Помилка завантаження даних дашборду: ${error.message}</p>`;
        }
    }

    // ===== PATIENTS SECTION =====

    async function fetchAndDisplayPatients() {
        // Формуємо URL з усіма параметрами: сортування, пошук, дати
        let apiUrl = `http://127.0.0.1:5000/api/patients?sort_by=${patientSortColumn}&sort_order=${patientSortOrder}`;
        if (patientSearchTerm) {
            apiUrl += `&search=${encodeURIComponent(patientSearchTerm)}`;
        }
        // Додаємо параметри дат, якщо вони встановлені
        if (patientDobFrom) {
            apiUrl += `&dob_from=${patientDobFrom}`; // Дати не потребують encodeURIComponent, якщо формат YYYY-MM-DD
        }
        if (patientDobTo) {
            apiUrl += `&dob_to=${patientDobTo}`;
        }

        console.log("Fetching patients with URL:", apiUrl); // Логування URL для дебагу

        const container = document.getElementById('patientTableContainer');
        if (!container) { console.error("Patient table container not found!"); return; }
        container.innerHTML = '<p>Loading patients...</p>';

        const canEdit = currentUserRole === 'Admin' || currentUserRole === 'Registrar';
        const canDelete = currentUserRole === 'Admin';

        try {
            const response = await fetchProtected(apiUrl);
            if (!response) return;

            const patients = await response.json();
            if (!Array.isArray(patients)) throw new Error("Invalid data format received for patients");

            // Генерація HTML таблиці
            let tableHTML = `
            <table class="patients-table sortable">
                <thead>
                    <tr>
                        <th class="sortable-header" data-sort-key="patientId">ID</th>
                        <th class="sortable-header" data-sort-key="fullName">Повне Ім'я</th>
                        <th class="sortable-header" data-sort-key="dateOfBirth">Дата народження</th>
                        <th class="sortable-header" data-sort-key="phoneNumber">Телефон</th>
                        <th class="sortable-header" data-sort-key="medicalCardNumber">Номер карти</th>
                        <th>Дії</th>
                    </tr>
                </thead>
                <tbody>`;

             if (patients.length === 0) {
                tableHTML += `<tr><td colspan="6">Пацієнтів не знайдено (за вашим запитом).</td></tr>`;
            } else {
                patients.forEach(patient => {
                    const dobFormatted = patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('uk-UA') : 'N/A';
                    tableHTML += `
                        <tr id="patient-row-${patient.patientId}">
                            <td>${patient.patientId ?? 'N/A'}</td>
                            <td>${patient.fullName ?? 'N/A'}</td>
                            <td>${dobFormatted}</td>
                            <td>${patient.phoneNumber || 'N/A'}</td>
                            <td>${patient.medicalCardNumber || 'N/A'}</td>
                            <td>
                                <button class="btn-view" onclick="viewPatientDetails(${patient.patientId})">Details</button>
                                ${canEdit ? `<button class="btn-edit" onclick="openEditPatientModal(${patient.patientId})">Edit</button>` : ''}
                                ${canDelete ? `<button class="btn-delete" onclick="deletePatient(${patient.patientId})">Deactivate</button>` : ''}
                            </td>
                        </tr>`;
                });
            }
            tableHTML += `</tbody></table>`;
            container.innerHTML = tableHTML;

            // Встановлення обробників сортування
            const headers = container.querySelectorAll('.sortable-header');
            headers.forEach(header => {
                const sortKey = header.getAttribute('data-sort-key');
                // Очищення старих індикаторів
                header.classList.remove('sort-asc', 'sort-desc');
                const existingIcon = header.querySelector('i.fas');
                if (existingIcon) header.removeChild(existingIcon);
                // Додавання індикатора до активної колонки
                if (sortKey === patientSortColumn) {
                    header.classList.add(patientSortOrder === 'ASC' ? 'sort-asc' : 'sort-desc');
                    const icon = document.createElement('i');
                    icon.classList.add('fas', patientSortOrder === 'ASC' ? 'fa-arrow-up' : 'fa-arrow-down');
                    header.appendChild(icon);
                }
                // Додавання обробника кліку (з перевіркою)
                if (!header.dataset.listenerAdded) {
                     header.addEventListener('click', () => {
                         if (sortKey === patientSortColumn) {
                             patientSortOrder = patientSortOrder === 'ASC' ? 'DESC' : 'ASC';
                         } else {
                             patientSortColumn = sortKey;
                             patientSortOrder = 'ASC';
                         }
                         fetchAndDisplayPatients();
                     });
                     header.dataset.listenerAdded = 'true';
                }
           });

        } catch (error) {
           console.error('Failed to load patients:', error);
           container.innerHTML = `<p style="color: red;">Помилка завантаження списку пацієнтів: ${error.message}</p>`;
       }
    }

// Знайдіть цю функцію (приблизно рядок 331)
function openPatientModal(title, patientData = {}, readOnly = false) { // Додаємо параметр readOnly
    if (!patientModal || !patientForm) return;
    patientModalTitle.textContent = title;
    patientForm.reset();
    patientFormError.textContent = '';
    patientFormError.style.display = 'none';

    // Заповнюємо поля (код без змін)
    patientIdInput.value = patientData.patientId || '';
    document.getElementById('modalPatientFullName').value = patientData.fullName || '';
    document.getElementById('modalPatientDOB').value = patientData.dateOfBirth || '';
    document.getElementById('modalPatientGender').value = patientData.gender || '';
    document.getElementById('modalPatientAddress').value = patientData.address || '';
    document.getElementById('modalPatientPhone').value = patientData.phoneNumber || '';
    document.getElementById('modalPatientCard').value = patientData.medicalCardNumber || '';

    // Обробка поля статусу (код без змін)
    if (patientStatusGroup) {
        // Показуємо статус, якщо Адмін АБО якщо пацієнт неактивний (щоб бачити статус)
        const isAdmin = currentUserRole === 'Admin';
         const showStatus = isAdmin || (patientData && patientData.status === 'Inactive');
         patientStatusGroup.style.display = showStatus ? 'block' : 'none';
         document.getElementById('modalPatientStatus').value = patientData.status || 'Active';
    }

    // === ПОЧАТОК НОВОГО КОДУ ===
    // Отримуємо елементи форми та кнопки
    const formElements = patientForm.querySelectorAll('input, select');
    const saveButton = document.getElementById('savePatientBtn');
    const cancelButton = patientForm.querySelector('.btn-cancel'); // Знаходимо кнопку Cancel

    // Вмикаємо/вимикаємо поля залежно від readOnly
    formElements.forEach(el => {
        el.disabled = readOnly;
    });

    // Показуємо/ховаємо кнопку Save та змінюємо текст Cancel
    if (saveButton) {
        saveButton.style.display = readOnly ? 'none' : 'inline-block';
    }
    if (cancelButton) {
        cancelButton.textContent = readOnly ? 'Close' : 'Cancel';
    }
    // === КІНЕЦЬ НОВОГО КОДУ ===

    patientModal.style.display = 'block';
}

    window.openEditPatientModal = async function(patientId) {
        console.log(`Edit patient ID: ${patientId}`);
        const apiUrl = `http://127.0.0.1:5000/api/patients/${patientId}`;
        try {
             const response = await fetchProtected(apiUrl); if (!response) return;
             const patientData = await response.json();
             openPatientModal(`Edit Patient (ID: ${patientId})`, patientData);
        } catch(error) {
             console.error(`Failed to fetch patient data for ID ${patientId}:`, error);
             alert(`Error loading patient data: ${error.message}`);
        }
    }

    if (patientForm) {
        patientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveButton = patientForm.querySelector('#savePatientBtn');
            saveButton.disabled = true; saveButton.textContent = 'Saving...';
            patientFormError.textContent = ''; patientFormError.style.display = 'none';
            const patientId = patientIdInput.value;
            const isEditMode = !!patientId;
            const url = `http://127.0.0.1:5000/api/patients${isEditMode ? `/${patientId}` : ''}`;
            const method = isEditMode ? 'PUT' : 'POST';
            const formData = {
                fullName: document.getElementById('modalPatientFullName').value,
                dateOfBirth: document.getElementById('modalPatientDOB').value,
                gender: document.getElementById('modalPatientGender').value,
                address: document.getElementById('modalPatientAddress').value,
                phoneNumber: document.getElementById('modalPatientPhone').value,
                medicalCardNumber: document.getElementById('modalPatientCard').value,
            };
            if (patientStatusGroup?.style.display === 'block') {
                 formData.status = document.getElementById('modalPatientStatus').value;
             }
            console.log('Saving patient:', method, url, formData);
            try {
                const response = await fetchProtected(url, { method: method, body: JSON.stringify(formData) });
                if (!response) return;
                let data = { message: 'Patient data saved successfully!' };
                if (response.status !== 204) { data = await response.json(); }
                alert(data.message);
                closeModal('patientModal');
                fetchAndDisplayPatients();
            } catch (error) {
                console.error('Save patient error:', error);
                patientFormError.textContent = error.message;
                patientFormError.style.display = 'block';
            } finally {
                 saveButton.disabled = false; saveButton.textContent = 'Save Patient';
            }
        });
    }

    window.deletePatient = async function(patientId) {
        console.log(`Deactivate patient ID: ${patientId}`);
        if (!confirm(`Are you sure you want to deactivate patient ID ${patientId}?`)) return;
        const apiUrl = `http://127.0.0.1:5000/api/patients/${patientId}`;
        const deleteButton = document.querySelector(`#patient-row-${patientId} .btn-delete`);
        if(deleteButton) deleteButton.disabled = true;
        try {
            const response = await fetchProtected(apiUrl, { method: 'DELETE' }); if (!response) return;
            let data = { message: 'Patient deactivated successfully!' };
            if (response.status !== 204) { data = await response.json(); }
            alert(data.message);
            fetchAndDisplayPatients();
        } catch (error) {
            console.error('Deactivate patient error:', error);
            alert(`Failed to deactivate patient: ${error.message}`);
        } finally {
             if(deleteButton) deleteButton.disabled = false;
        }
    }

// Знайдіть цю функцію (приблизно рядок 404) і замініть її на:
window.viewPatientDetails = async function(patientId) { // Робимо функцію асинхронною
    console.log(`View details for patient ID: ${patientId}`);
    const apiUrl = `http://127.0.0.1:5000/api/patients/${patientId}`;
    try {
        // Використовуємо fetchProtected для отримання даних
        const response = await fetchProtected(apiUrl);
        if (!response) return; // Помилка авторизації або запиту оброблена fetchProtected

        const patientData = await response.json();
        // Викликаємо openPatientModal з третім параметром true (readOnly)
        openPatientModal(`Patient Details (ID: ${patientId})`, patientData, true);

    } catch(error) {
        console.error(`Failed to fetch patient data for ID ${patientId}:`, error);
        alert(`Error loading patient details: ${error.message}`);
    }
}

    // --- Обробники подій для Фільтрів Пацієнтів ---
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', () => {
            // Оновлюємо всі стани фільтрів
            patientSearchTerm = patientSearchInput?.value.trim() ?? '';
            patientDobFrom = dobFromInput?.value ?? ''; // <-- Зчитуємо дату "від"
            patientDobTo = dobToInput?.value ?? '';     // <-- Зчитуємо дату "до"
            console.log("Applying filters:", { search: patientSearchTerm, dobFrom: patientDobFrom, dobTo: patientDobTo });
            fetchAndDisplayPatients(); // Перезавантажуємо дані
        });
    }

    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', () => {
            // Очищуємо поля вводу
            if(patientSearchInput) patientSearchInput.value = '';
            if(dobFromInput) dobFromInput.value = ''; // <-- Очищуємо дату "від"
            if(dobToInput) dobToInput.value = '';     // <-- Очищуємо дату "до"
            // Скидаємо стани фільтрів
            patientSearchTerm = '';
            patientDobFrom = ''; // <-- Скидаємо стан
            patientDobTo = '';   // <-- Скидаємо стан
            console.log("Clearing filters");
            fetchAndDisplayPatients(); // Перезавантажуємо дані
        });
    }

    if (patientSearchInput) {
        patientSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                 applyFilterBtn.click(); // Застосовуємо всі фільтри при Enter у пошуку
            }
        });
    }

    // Встановлення початкових значень фільтрів у полях вводу
    function initializeFilterInputs() {
         if(patientSearchInput) patientSearchInput.value = patientSearchTerm;
         if(dobFromInput) dobFromInput.value = patientDobFrom; // <-- Встановлюємо дату "від"
         if(dobToInput) dobToInput.value = patientDobTo;       // <-- Встановлюємо дату "до"
    }
    // Викликаємо один раз при завантаженні скрипта, щоб відновити значення після оновлення сторінки
    // initializeFilterInputs(); // Краще викликати при перемиканні на вкладку

    // ===== КІНЕЦЬ PATIENTS SECTION =====

    // ===== USERS SECTION (код без змін) =====
    async function fetchAndDisplayUsers() {
         if (currentUserRole !== 'Admin') return;
         const apiUrl = 'http://127.0.0.1:5000/api/users';
         const container = document.getElementById('userTableContainer');
         if (!container) { console.error("User table container not found!"); return; }
         container.innerHTML = '<p>Loading users...</p>';

                 try {
            const response = await fetchProtected(apiUrl); // Використовуємо fetchProtected
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }
            const users = await response.json();

            if (!Array.isArray(users)) throw new Error("Invalid data format received");

            if (users.length === 0) {
                container.innerHTML = '<p>No users found.</p>';
                return;
            }

            // Генеруємо таблицю
            let tableHTML = `
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Full Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>`;
            users.forEach(user => {
                const statusClass = `status-${(user.status || '').toLowerCase()}`;
                const isActive = user.status === 'Active';
                tableHTML += `
                    <tr id="user-row-${user.employeeId}">
                        <td>${user.employeeId ?? 'N/A'}</td>
                        <td>${user.fullName ?? 'N/A'}</td>
                        <td>${user.username ?? 'N/A'}</td>
                        <td>${user.email ?? 'N/A'}</td>
                        <td>${user.role ?? 'N/A'}</td>
                        <td><span class="${statusClass}">${user.status ?? 'N/A'}</span></td>
                        <td>
                            <button class="btn-edit" onclick="openEditUserModal(${user.employeeId})">Edit</button>
                            ${user.status !== 'PendingApproval' ?
                                `<button class="btn-status" onclick="changeUserStatus(${user.employeeId}, '${user.status}')">
                                    ${isActive ? 'Deactivate' : 'Activate'}
                                 </button>` : ''
                            }
                        </td>
                    </tr>`;
            });
            tableHTML += `</tbody></table>`;
            container.innerHTML = tableHTML;

        } catch (error) {
            console.error('Failed to load users:', error);
            container.innerHTML = `<p style="color: red;">Помилка завантаження користувачів: ${error.message}</p>`;
        }
    }

    async function fetchAndDisplayPendingRegistrations() {
        if (currentUserRole !== 'Admin') return;
        const apiUrl = 'http://127.0.0.1:5000/api/pending_registrations';
        const container = document.getElementById('pendingUsersContainer');
        if (!container) { console.error("Pending users container not found!"); return; }
        container.innerHTML = '<p>Loading pending requests...</p>';

        try {
            const response = await fetchProtected(apiUrl);
            if (!response) return;

            const pendingUsers = await response.json();
            if (!Array.isArray(pendingUsers)) throw new Error("Invalid data format received for pending users");

            if (pendingUsers.length === 0) {
                container.innerHTML = '<p>No pending registration requests.</p>';
                return;
            }

            let listHTML = '';
            pendingUsers.forEach(user => {
                listHTML += `
                   <div class="pending-user" id="pending-${user.employeeId}">
                        <div class="user-details-pending">
                            <strong>${user.fullName ?? 'N/A'}</strong> (${user.username ?? 'N/A'})<br>
                            <em>${user.email ?? 'N/A'}</em>
                        </div>
                        <div class="user-actions">
                            <button class="btn-approve" onclick="openRoleSelectionModal(${user.employeeId})">Approve</button>
                            <button class="btn-reject" onclick="rejectRegistration(${user.employeeId})">Reject</button>
                        </div>
                    </div>`;
            });
            container.innerHTML = listHTML;

        } catch (error) {
             console.error('Failed to load pending registrations:', error);
             container.innerHTML = `<p style="color: red;">Помилка завантаження запитів: ${error.message}</p>`;
        }
    }

    // Завантажує та відображає список препаратів
    async function fetchAndDisplayMedications() {
        if (!medicationListContainer) {
            console.error("Medication list container not found!");
            return;
        }
        medicationListContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading medications...</p>'; // Індикатор завантаження

        let apiUrl = `http://127.0.0.1:5000/api/medications`;

        // Додаємо параметр пошуку до URL, якщо він є
        if (medicationSearchTerm) {
            apiUrl += `?search=${encodeURIComponent(medicationSearchTerm)}`;
        }

        console.log("Fetching medications with URL:", apiUrl);

        try {
            const response = await fetchProtected(apiUrl); // Використовуємо вашу функцію fetchProtected
            if (!response) return; // fetchProtected обробить помилки авторизації/мережі

            const medications = await response.json();
            if (!Array.isArray(medications)) throw new Error("Invalid data format received for medications");

            // Генерація HTML таблиці для препаратів
            let tableHTML = `
            <table class="medications-table"> <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Active Substance</th>
                        <th>Dosage Form</th>
                        <th>Manufacturer</th>
                        </tr>
                </thead>
                <tbody>`;

             if (medications.length === 0) {
                tableHTML += `<tr><td colspan="5">No medications found${medicationSearchTerm ? ' matching your search' : ''}.</td></tr>`;
            } else {
                medications.forEach(med => {
                    tableHTML += `
                        <tr>
                            <td>${med.medicationId ?? 'N/A'}</td>
                            <td>${med.medicationName ?? 'N/A'}</td>
                            <td>${med.activeSubstance || 'N/A'}</td>
                            <td>${med.dosageForm || 'N/A'}</td>
                            <td>${med.manufacturer || 'N/A'}</td>
                            </tr>`;
                });
            }
            tableHTML += `</tbody></table>`;
            medicationListContainer.innerHTML = tableHTML;

            // Додайте тут обробники для кнопок дій (якщо вони потрібні), наприклад, для перегляду інструкції

        } catch (error) {
           console.error('Failed to load medications:', error);
           // Перевіряємо, чи контейнер все ще існує перед оновленням
           if (medicationListContainer) {
               medicationListContainer.innerHTML = `<p style="color: red;">Error loading medications list: ${error.message}</p>`;
           }
       }
    }


// Функція відкриває модальне вікно вибору ролі
window.openRoleSelectionModal = function(userId) {
    console.log(`Opening role selection for user ID: ${userId}`);
    userIdToApprove = userId; // Зберігаємо ID
    const roleModal = document.getElementById('roleSelectionModal');
    const roleSelect = document.getElementById('modalSelectedRole');
    const errorMsg = document.getElementById('roleSelectError');

    if (roleModal && roleSelect && errorMsg) {
        // Встановлюємо роль за замовчуванням (напр., Doctor)
        roleSelect.value = 'Doctor';
        errorMsg.textContent = ''; // Очищаємо попередні помилки
        errorMsg.style.display = 'none';
        roleModal.style.display = 'block'; // Показуємо вікно
    } else {
        console.error("Role selection modal elements not found!");
        alert("Error opening role selection form.");
    }
}
        // Функція для відправки запиту на підтвердження (викликається з модалки)
        async function sendApprovalRequest(userId, selectedRole) {
            console.log(`Sending approval request for user ID: ${userId} with role: ${selectedRole}`);
            const approveButtonInList = document.querySelector(`#pending-${userId} .btn-approve`); // Кнопка у списку
            const confirmButtonInModal = document.getElementById('confirmRoleBtn'); // Кнопка в модалці
            const errorMsgElement = document.getElementById('roleSelectError'); // Елемент для помилок у модалці
        
            // Блокуємо кнопки
            if(approveButtonInList) approveButtonInList.disabled = true;
            if(confirmButtonInModal) confirmButtonInModal.disabled = true;
            if(errorMsgElement) errorMsgElement.style.display = 'none';
    
            const apiUrl = `http://127.0.0.1:5000/api/approve_registration/${userId}`;
            const payload = { role: selectedRole };
    
            try {
                 const response = await fetchProtected(apiUrl, {
                     method: 'PUT',
                     body: JSON.stringify(payload)
                 });
                 if (!response) return; // Помилка авторизації оброблена
    
                 let data = { message: 'User approved successfully!' };
                 if (response.status !== 204) {
                      data = await response.json();
                 }
    
                 alert(data.message);
                 closeModal('roleSelectionModal'); // Закриваємо модальне вікно
                 fetchAndDisplayPendingRegistrations(); // Оновлюємо список запитів
                  if(document.getElementById('dashboard-content-admin')?.style.display === 'block') {
                      fetchAndDisplayDashboardData(); // Оновлюємо лічильник
                  }
            } catch (error) {
                console.error('Approve registration error:', error);
                // Показуємо помилку в модальному вікні
                const errorMsgElement = document.getElementById('roleSelectError');
                if (errorMsgElement) {
                     errorMsgElement.textContent = `Failed to approve: ${error.message}`;
                     errorMsgElement.style.display = 'block';
                } else {
                     alert(`Failed to approve registration: ${error.message}`);
                }
            } finally {
                 // Завжди розблоковуємо кнопки
                 if(approveButtonInList) approveButtonInList.disabled = false;
                 if(confirmButtonInModal) confirmButtonInModal.disabled = false;
            }
        }
    


    // --- Функції для Модального Вікна та Дій Адміна ---

    function openModal(title, userData = {}) {
        if (!userModal || !userForm) return;
        modalTitle.textContent = title;
        userForm.reset(); // Скидаємо форму
        userFormError.style.display = 'none'; // Ховаємо помилки
        userIdInput.value = userData.employeeId || ''; // ID для режиму редагування

        // Заповнюємо форму даними користувача (якщо вони є)
        document.getElementById('modalFullName').value = userData.fullName || '';
        document.getElementById('modalUsername').value = userData.username || '';
        document.getElementById('modalEmail').value = userData.email || '';
        document.getElementById('modalPassword').value = ''; // Пароль завжди очищаємо
        document.getElementById('modalRole').value = userData.role || 'Doctor';
        document.getElementById('modalStatus').value = userData.status || 'Active';

        userModal.style.display = 'block'; // Показуємо вікно
    }

    // Закриває модальне вікно (робимо глобальною для onclick)
    window.closeModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = 'none';
    }

    window.openEditUserModal = async function(userId) {
        console.log(`Edit user ID: ${userId}`);
        const apiUrl = `http://127.0.0.1:5000/api/users/${userId}`;
        try {
             const response = await fetchProtected(apiUrl); // ВИКОРИСТОВУЄМО fetchProtected
             if (!response) return;
             const userData = await response.json();
             openModal(`Edit User (ID: ${userId})`, userData);
        } catch(error) {
             console.error(`Failed to fetch user data for ID ${userId}:`, error);
             alert(`Error loading user data: ${error.message}`);
        }
    }

    window.changeUserStatus = async function(userId, currentStatus) {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        if (!confirm(`Are you sure you want to set status to '${newStatus}' for user ID ${userId}?`)) return;

        const apiUrl = `http://127.0.0.1:5000/api/users/${userId}`;
        const payload = { status: newStatus };
        const statusButton = document.querySelector(`#user-row-${userId} .btn-status`);
        if(statusButton) statusButton.disabled = true;

        try {
            const response = await fetchProtected(apiUrl, { // ВИКОРИСТОВУЄМО fetchProtected
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (!response) return; // Помилка авторизації/обробки вже оброблена

            // Перевіряємо, чи відповідь має тіло (не 204) перед викликом .json()
            let data = { message: 'User status updated successfully!' }; // Повідомлення за замовчуванням
            if (response.status !== 204) {
                data = await response.json();
            }

            alert(data.message);
            fetchAndDisplayUsers(); // Оновлюємо таблицю
        } catch (error) {
            console.error('Change user status error:', error);
            alert(`Failed to update status: ${error.message}`);
        } finally {
             if(statusButton) statusButton.disabled = false;
        }
    }

    window.approveRegistration = async function(userId) {
        console.log(`Approve registration for user ID: ${userId}`);
        const approveButton = document.querySelector(`#pending-${userId} .btn-approve`);
        const roleSelect = document.getElementById(`role-select-${userId}`); // Знаходимо select ролі
    
        if (!roleSelect) {
            alert("Error: Role selection element not found.");
            if (approveButton) approveButton.disabled = false; // Розблоковуємо кнопку
            return;
        }
        const selectedRole = roleSelect.value; // Отримуємо вибране значення
    
        if (!selectedRole) {
            alert("Please select a role for the user before approving.");
            if (approveButton) approveButton.disabled = false; // Розблоковуємо кнопку
            return;
        }
    
        if(approveButton) approveButton.disabled = true; // Блокуємо кнопку
        const apiUrl = `http://127.0.0.1:5000/api/approve_registration/${userId}`;
        const payload = { role: selectedRole }; // Формуємо тіло запиту з вибраною роллю
    
        try {
             const response = await fetchProtected(apiUrl, { // ВИКОРИСТОВУЄМО fetchProtected
                 method: 'PUT',
                 body: JSON.stringify(payload) // Передаємо вибрану роль
             });
             if (!response) { // fetchProtected поверне null при 401/403/422
                 if(approveButton) approveButton.disabled = false; // Розблокувати, якщо була помилка обробки токена
                 return;
             }
    
             // Перевіряємо відповідь, навіть якщо 204
             let data = { message: 'User approved successfully!' };
             if (response.status !== 204) {
                  data = await response.json();
             }
    
             alert(data.message || 'User approved successfully!');
             fetchAndDisplayPendingRegistrations(); // Оновлюємо список запитів
              // Оновлюємо лічильник на дашборді, якщо він видимий
              if(document.getElementById('dashboard-content-admin')?.style.display === 'block') {
                  fetchAndDisplayDashboardData();
              }
        } catch (error) {
            console.error('Approve registration error:', error);
            alert(`Failed to approve registration: ${error.message}`);
        } finally {
             // Завжди розблоковуємо кнопку, якщо вона існує
             if(approveButton) approveButton.disabled = false;
        }
    }

    window.rejectRegistration = async function(userId) {
         console.log(`Reject registration for user ID: ${userId}`);
         if (!confirm(`Are you sure you want to reject registration for user ID ${userId}?`)) return;

         const rejectButton = document.querySelector(`#pending-${userId} .btn-reject`);
          if(rejectButton) rejectButton.disabled = true;
         const apiUrl = `http://127.0.0.1:5000/api/reject_registration/${userId}`;

         try {
              const response = await fetchProtected(apiUrl, { // ВИКОРИСТОВУЄМО fetchProtected
                  method: 'PUT'
              });
              if (!response) return;

              // Перевіряємо, чи відповідь має тіло (не 204)
              let data = { message: 'Registration rejected successfully!' };
              if (response.status !== 204) {
                   data = await response.json();
              }
              alert(data.message);
              fetchAndDisplayPendingRegistrations();
               if(document.getElementById('dashboard-content-admin')?.style.display === 'block') {
                   fetchAndDisplayDashboardData();
               }
         } catch (error) {
             console.error('Reject registration error:', error);
              alert(`Failed to reject registration: ${error.message}`);
         } finally {
              if(rejectButton) rejectButton.disabled = false;
         }
    }

    window.forceSwitchContent = function(targetId) {
         const targetNavItem = document.querySelector(`.nav-item[data-target="${targetId}"]`);
         if(targetNavItem && !targetNavItem.classList.contains('inaccessible')) {
             sidebarNavItems.forEach(i => i.classList.remove('active'));
             targetNavItem.classList.add('active');
             switchContent(targetId);
         } else {
             alert(`Access to section "${targetId}" is restricted or section not found.`);
         }
    }

    async function checkSelectedTimeAvailability() {
        if (!appointmentModal || appointmentModal.style.display !== 'block') return; // Не перевіряти, якщо модалка закрита

        const doctorId = modalAppointmentDoctor?.value;
        const dateTimeStr = modalAppointmentDateTime?.value;
        const duration = modalAppointmentDuration?.value;
        const currentAppointmentId = modalAppointmentId?.value || null; // ID прийому, що редагується (якщо є)

        // Скидаємо статус, якщо не всі дані вибрані
        if (!doctorId || !dateTimeStr || !duration) {
            if (appointmentTimeStatusDiv) appointmentTimeStatusDiv.textContent = '';
            return;
        }

        // Очищаємо попередній таймер (debounce)
        clearTimeout(availabilityCheckTimeout);

        // Встановлюємо невелику затримку перед відправкою запиту
        availabilityCheckTimeout = setTimeout(async () => {
            if (appointmentTimeStatusDiv) {
                appointmentTimeStatusDiv.textContent = 'Checking availability...';
                appointmentTimeStatusDiv.style.color = '#777';
            }

            const params = new URLSearchParams({
                doctor_id: doctorId,
                datetime: dateTimeStr, // Надсилаємо в ISO форматі як є
                duration: duration
            });
            if (currentAppointmentId) { // Додаємо ID прийому, що редагується, для ігнорування
                 params.append('ignore_appointment_id', currentAppointmentId);
            }

            const apiUrl = `http://127.0.0.1:5000/api/appointments/check_availability?${params.toString()}`;
            console.log("Checking availability:", apiUrl);

            try {
                const response = await fetchProtected(apiUrl);
                if (!response) {
                    if (appointmentTimeStatusDiv) appointmentTimeStatusDiv.textContent = ''; // Сховати, якщо помилка fetchProtected
                    return;
                }

                const data = await response.json();
                if (appointmentTimeStatusDiv) {
                    appointmentTimeStatusDiv.textContent = data.message || 'Status unknown';
                    appointmentTimeStatusDiv.style.color = data.available ? 'green' : 'red';
                }
            } catch (error) {
                console.error("Availability check failed:", error);
                if (appointmentTimeStatusDiv) {
                    appointmentTimeStatusDiv.textContent = 'Error checking availability.';
                    appointmentTimeStatusDiv.style.color = 'red';
                }
            }
        }, 500); // Затримка 500 мс
    }

    // --- Додаємо Обробники Подій для Перевірки ---
    // Додаємо до полів у модальному вікні appointmentModal
    if (modalAppointmentDoctor) {
        modalAppointmentDoctor.addEventListener('change', checkSelectedTimeAvailability);
    }
    if (modalAppointmentDateTime) {
        modalAppointmentDateTime.addEventListener('change', checkSelectedTimeAvailability);
    }
    if (modalAppointmentDuration) {
        // Перевіряємо при зміні та після завершення вводу (blur)
        modalAppointmentDuration.addEventListener('change', checkSelectedTimeAvailability);
        modalAppointmentDuration.addEventListener('blur', checkSelectedTimeAvailability);
    }


    if (addUserBtn) { addUserBtn.style.display = currentUserRole === 'Admin' ? 'inline-block' : 'none'; }
    if (addUserBtn && currentUserRole === 'Admin') { addUserBtn.addEventListener('click', () => { openModal('Add New User'); }); }
    if (userForm && currentUserRole === 'Admin') {
        userForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveButton = userForm.querySelector('#saveUserBtn');
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
            userFormError.textContent = '';
            userFormError.style.display = 'none';

            const userId = userIdInput.value;
            const isEditMode = !!userId;
            const url = `http://127.0.0.1:5000/api/users${isEditMode ? `/${userId}` : ''}`;
            const method = isEditMode ? 'PUT' : 'POST';

            const formData = {
                fullName: document.getElementById('modalFullName').value,
                username: document.getElementById('modalUsername').value,
                email: document.getElementById('modalEmail').value,
                role: document.getElementById('modalRole').value,
                status: document.getElementById('modalStatus').value,
            };
            const password = document.getElementById('modalPassword').value;
            if (password || !isEditMode) {
                 if (!password && !isEditMode) {
                     userFormError.textContent = 'Password is required for new users.';
                     userFormError.style.display = 'block';
                     saveButton.disabled = false; saveButton.textContent = 'Save User'; return;
                 }
                 if (password) formData.password = password;
            }

            console.log('Saving user:', method, url, formData);

            try {
                const response = await fetchProtected(url, { // ВИКОРИСТОВУЄМО fetchProtected
                    method: method,
                    body: JSON.stringify(formData)
                });
                if (!response) return; // Помилка авторизації оброблена

                 let data = { message: 'User saved successfully!' };
                 if (response.status !== 204) {
                     data = await response.json();
                 }
                 alert(data.message);
                 closeModal('userModal');
                 fetchAndDisplayUsers(); // Оновлюємо таблицю
            } catch (error) {
                console.error('Save user error:', error);
                userFormError.textContent = error.message;
                userFormError.style.display = 'block';
            } finally {
                 saveButton.disabled = false;
                 saveButton.textContent = 'Save User';
            }
        });
    }
        const confirmRoleButton = document.getElementById('confirmRoleBtn');
    if (confirmRoleButton) {
        confirmRoleButton.addEventListener('click', () => {
            const roleSelect = document.getElementById('modalSelectedRole');
            const selectedRole = roleSelect ? roleSelect.value : null;
            const errorMsgElement = document.getElementById('roleSelectError');
    
            if (userIdToApprove && selectedRole) { // Перевіряємо, чи є ID і вибрана роль
                 if (errorMsgElement) errorMsgElement.style.display = 'none';
                 // Викликаємо функцію відправки запиту
                 sendApprovalRequest(userIdToApprove, selectedRole);
            } else {
                 console.error("User ID to approve or selected role is missing.");
                 if (errorMsgElement) {
                     errorMsgElement.textContent = "Please select a role.";
                     errorMsgElement.style.display = 'block';
                 } else {
                      alert("Please select a role.");
                 }
            }
        });
    } else {
         console.error("Confirm role button not found!");
    }    // ===== КІНЕЦЬ USERS SECTION =====


    // --- Навігація та Ініціалізація ---
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.classList.contains('inaccessible')) return;
            sidebarNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-target');
            switchContent(target);
        });
    });

    if (userIconWrapper && dropdownMenu) {
        userIconWrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = dropdownMenu.style.display === 'block' ? 'none' : 'block';
        });
    }
    document.addEventListener('click', (e) => {
        if (dropdownMenu?.style.display === 'block') {
            if (!userIconWrapper || !userIconWrapper.contains(e.target)) {
                 dropdownMenu.style.display = 'none';
            }
        }
        // Закриття модальних вікон при кліку поза ними
        [userModal, patientModal, document.getElementById('roleSelectionModal')].forEach(modal => {
             if (modal && modal.style.display === 'block' && e.target === modal) {
                 closeModal(modal.id);
             }
         });
    });

    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => { e.preventDefault(); handleLogout(); });
    }

    // Обробник для поля пошуку препаратів (спрацьовує при вводі)
    if (medicationSearchInput) {
        let searchTimeout; // Змінна для debounce
        medicationSearchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout); // Скасовуємо попередній таймер
            medicationSearchTerm = medicationSearchInput.value.trim();
             // Встановлюємо невелику затримку перед виконанням пошуку (debounce)
            searchTimeout = setTimeout(() => {
                console.log(`Searching medications for: "${medicationSearchTerm}"`);
                fetchAndDisplayMedications(); // Перезавантажуємо дані з новим пошуковим запитом
            }, 300); // Затримка 300 мс
        });
    }

    // Обробник для кнопки очищення пошуку препаратів
    if (clearMedicationSearchBtn) {
        clearMedicationSearchBtn.addEventListener('click', () => {
            if(medicationSearchInput) medicationSearchInput.value = ''; // Очищуємо поле
            medicationSearchTerm = ''; // Скидаємо стан
            console.log("Clearing medication search");
            fetchAndDisplayMedications(); // Перезавантажуємо повний список
        });
    }


     // Завантажує довідник процедур (і кешує його)
     async function loadProcedureDirectory() {
        // Якщо кеш не порожній, повертаємо його
        if (procedureDirectoryCache.length > 0) {
            return procedureDirectoryCache;
        }

        const apiUrl = 'http://127.0.0.1:5000/api/procedures';
        console.log("Loading procedure directory...");
        try {
            const response = await fetchProtected(apiUrl);
            if (!response) return []; // Повертаємо порожній масив у разі помилки

            const procedures = await response.json();
            if (!Array.isArray(procedures)) throw new Error("Invalid data format");

            procedureDirectoryCache = procedures; // Зберігаємо в кеш
            console.log("Procedure directory loaded and cached:", procedureDirectoryCache.length, "items");
            return procedureDirectoryCache;
        } catch (error) {
            console.error("Failed to load procedure directory:", error);
            // Повідомлення про помилку можна вивести десь в UI
            return []; // Повертаємо порожній масив
        }
    }

    // Відображає довідник процедур
    async function displayProcedureDirectory() {
         if (!procedureDirectoryContainer) return;
         procedureDirectoryContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading directory...</p>';
         const procedures = await loadProcedureDirectory(); // Отримуємо дані (можливо з кешу)

         let tableHTML = `
            <table class="procedure-directory-table"> <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Duration (min)</th>
                        <th>Cost</th>
                    </tr>
                </thead>
                <tbody>`;

         if (procedures.length === 0) {
             tableHTML += `<tr><td colspan="5">Procedure directory is empty or failed to load.</td></tr>`;
         } else {
             procedures.forEach(proc => {
                 tableHTML += `
                    <tr>
                        <td>${proc.procedureId}</td>
                        <td>${proc.procedureName}</td>
                        <td>${proc.description || 'N/A'}</td>
                        <td>${proc.estimatedDurationMinutes || 'N/A'}</td>
                        <td>${proc.cost !== null ? `$${proc.cost.toFixed(2)}` : 'N/A'}</td>
                    </tr>`;
             });
         }
         tableHTML += `</tbody></table>`;
         procedureDirectoryContainer.innerHTML = tableHTML;
    }


    // Завантажує та відображає список ПРИЗНАЧЕНИХ процедур
    async function fetchAndDisplayAssignedProcedures() {
        if (!assignedProceduresContainer) {
            console.error("Assigned procedures container not found!");
            return;
        }
        assignedProceduresContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading assigned procedures...</p>';

        // Будуємо URL з поточними фільтрами
        const params = new URLSearchParams();
        if (assignedProceduresFilters.patientId) {
            params.append('patient_id', assignedProceduresFilters.patientId);
        }
        if (assignedProceduresFilters.status) {
            params.append('status', assignedProceduresFilters.status);
        }
        if (assignedProceduresFilters.dateFrom) {
            params.append('date_from', assignedProceduresFilters.dateFrom);
        }
        if (assignedProceduresFilters.dateTo) {
            params.append('date_to', assignedProceduresFilters.dateTo);
        }
        // Можна додати інші фільтри (procedure_id, executor_id), якщо потрібно

        const apiUrl = `http://127.0.0.1:5000/api/assigned_procedures?${params.toString()}`;
        console.log("Fetching assigned procedures with URL:", apiUrl);

        try {
            const response = await fetchProtected(apiUrl);
            if (!response) return;

            const assignedProcedures = await response.json();
            if (!Array.isArray(assignedProcedures)) throw new Error("Invalid data format received for assigned procedures");

            // Генерація HTML таблиці
            let tableHTML = `
            <table class="assigned-procedures-table"> <thead>
                    <tr>
                        <th>ID</th>
                        <th>Patient</th>
                        <th>Procedure</th>
                        <th>Assigned</th>
                        <th>Executor</th>
                        <th>Executed</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>`;

            if (assignedProcedures.length === 0) {
                tableHTML += `<tr><td colspan="8">No assigned procedures found matching your criteria.</td></tr>`;
            } else {
                assignedProcedures.forEach(ap => {
                     // Форматуємо дати (якщо вони є)
                     const assignedDate = ap.assignmentDateTime ? new Date(ap.assignmentDateTime).toLocaleString('uk-UA') : 'N/A';
                     const executedDate = ap.executionDateTime ? new Date(ap.executionDateTime).toLocaleString('uk-UA') : 'N/A';
                     const canUpdate = currentUserRole === 'Admin' || currentUserRole === 'Nurse' || currentUserRole === 'Doctor'; // Визначте, хто може оновлювати

                    tableHTML += `
                        <tr id="assigned-proc-row-${ap.assignmentId}">
                            <td>${ap.assignmentId}</td>
                            <td>${ap.patientName} (ID: ${ap.patientId})</td>
                            <td>${ap.procedureName}</td>
                            <td>${assignedDate}</td>
                            <td>${ap.executorName || 'N/A'} ${ap.executorId ? `(ID: ${ap.executorId})` : ''}</td>
                            <td>${executedDate}</td>
                            <td><span class="status-${ap.executionStatus?.toLowerCase().replace(' ', '-')}">${ap.executionStatus}</span></td>
                            <td>
                    ${canUpdate ? `
                        <button class="btn-edit"
                                data-assignment-id="${ap.assignmentId}"
                                data-patient-name="${ap.patientName?.replace(/"/g, '&quot;')}"
                                data-procedure-name="${ap.procedureName?.replace(/"/g, '&quot;')}"
                                data-current-status="${ap.executionStatus}"
                                data-current-result="${(ap.result || '').replace(/"/g, '&quot;')}"
                                onclick="handleUpdateProcedureClick(this)">
                            Update
                        </button>
                    ` : ''}                                </td>
                        </tr>`;
                        // Примітка: Використання `` для result дозволяє передати багаторядковий текст
                });
            }
            tableHTML += `</tbody></table>`;
            assignedProceduresContainer.innerHTML = tableHTML;

        } catch (error) {
            console.error('Failed to load assigned procedures:', error);
            if (assignedProceduresContainer) {
                assignedProceduresContainer.innerHTML = `<p style="color: red;">Error loading assigned procedures: ${error.message}</p>`;
            }
        }
    }

    // Функція для заповнення селекту процедур в модалці
    async function populateProcedureSelect(selectElementId) {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) return;

        selectElement.innerHTML = '<option value="">Loading procedures...</option>';
        const procedures = await loadProcedureDirectory(); // Використовуємо кеш

        if (procedures.length > 0) {
            selectElement.innerHTML = '<option value="">-- Select Procedure --</option>'; // Скидання
            procedures.forEach(proc => {
                const option = document.createElement('option');
                option.value = proc.procedureId;
                option.textContent = `${proc.procedureName} ${proc.cost !== null ? '($'+proc.cost.toFixed(2)+')' : ''}`;
                selectElement.appendChild(option);
            });
        } else {
            selectElement.innerHTML = '<option value="">Failed to load procedures</option>';
        }
    }


    // Відкриває модальне вікно Призначення Процедури
    function openAssignProcedureModal() {
        if (!assignProcedureModal || !assignProcedureForm) return;
        assignProcedureForm.reset(); // Скидаємо форму
        if(assignProcedureFormError) assignProcedureFormError.style.display = 'none';
        if(modalAssignPatientResults) modalAssignPatientResults.innerHTML = ''; // Очищаємо результати пошуку
        if(modalAssignExecutorResults) modalAssignExecutorResults.innerHTML = '';

        // Завантажуємо/оновлюємо список процедур у селекті
        populateProcedureSelect('modalAssignProcedure');

        assignProcedureModal.style.display = 'block';

        // Тут потрібно додати логіку для пошуку пацієнта та виконавця
        // (наприклад, при вводі в modalAssignPatientSearch викликати API пошуку пацієнтів)
        // Поки що це не реалізовано.
        console.warn("Patient and Executor search in assign procedure modal is not implemented.");

    }

    window.handleUpdateProcedureClick = function(buttonElement) {
        const assignmentId = buttonElement.getAttribute('data-assignment-id');
        const patientName = buttonElement.getAttribute('data-patient-name');
        const procedureName = buttonElement.getAttribute('data-procedure-name');
        const currentStatus = buttonElement.getAttribute('data-current-status');
        const currentResult = buttonElement.getAttribute('data-current-result');

        // Перевіряємо, чи отримали ID
        if (assignmentId) {
            openUpdateProcedureStatusModal(
                parseInt(assignmentId), // Перетворюємо ID на число
                patientName,
                procedureName,
                currentStatus,
                currentResult
            );
        } else {
            console.error("Could not get assignment ID from button data attributes.");
            alert("Error: Could not get procedure details to update.");
        }
    }
     // Відкриває модальне вікно Оновлення Статусу
     window.openUpdateProcedureStatusModal = function(assignmentId, patientName, procedureName, currentStatus, currentResult) {
        if (!updateProcedureStatusModal || !updateProcedureStatusForm) return;

        updateProcedureStatusForm.reset();
        if(updateProcedureStatusFormError) updateProcedureStatusFormError.style.display = 'none';

        // Заповнюємо форму поточними даними
        if(updateAssignmentId) updateAssignmentId.value = assignmentId;
        if(modalUpdatePatientInfo) modalUpdatePatientInfo.textContent = `${patientName}`;
        if(modalUpdateProcedureInfo) modalUpdateProcedureInfo.textContent = `${procedureName}`;
        if(modalUpdateStatus) modalUpdateStatus.value = currentStatus || 'Assigned'; // Поточний статус
        if(modalUpdateResult) modalUpdateResult.value = currentResult || ''; // Поточний результат

        if(updateProcedureStatusModal) updateProcedureStatusModal.style.display = 'block';
    }

    // --- Обробники подій (додайте/змініть) ---

     // Перемикання між довідником та призначеними процедурами
     if (viewToggleButtons) {
        viewToggleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.getAttribute('data-view');
                if (view === currentProcedureView) return; // Не перемикати, якщо вже активний

                currentProcedureView = view;

                // Оновлюємо активний клас кнопок
                viewToggleButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Показуємо/ховаємо відповідні блоки
                if (assignedProceduresView) assignedProceduresView.style.display = (view === 'assigned') ? 'block' : 'none';
                if (procedureDirectoryView) procedureDirectoryView.style.display = (view === 'directory') ? 'block' : 'none';

                // Завантажуємо дані для активного виду
                if (view === 'assigned') {
                    fetchAndDisplayAssignedProcedures();
                } else if (view === 'directory') {
                    displayProcedureDirectory(); // Використовує кешовані дані, якщо є
                }
            });
        });
    }

    // Застосування фільтрів для призначених процедур
    if (applyAssignedProcFilterBtn) {
        applyAssignedProcFilterBtn.addEventListener('click', () => {
            // Оновлюємо об'єкт фільтрів з полів вводу
            // !! Пошук пацієнта за іменем потребує окремої логіки для отримання ID !!
            // Поки що будемо вважати, що в assignedProcPatientFilter вводиться ID
            assignedProceduresFilters.patientId = assignedProcPatientFilter?.value.trim() || null; // Тимчасово очікуємо ID
            assignedProceduresFilters.status = assignedProcStatusFilter?.value || '';
            assignedProceduresFilters.dateFrom = assignedProcDateFromFilter?.value || '';
            assignedProceduresFilters.dateTo = assignedProcDateToFilter?.value || '';

            console.log("Applying assigned procedures filters:", assignedProceduresFilters);
            fetchAndDisplayAssignedProcedures(); // Перезавантажуємо дані
        });
    }

    // Очищення фільтрів для призначених процедур
    if (clearAssignedProcFilterBtn) {
        clearAssignedProcFilterBtn.addEventListener('click', () => {
            // Очищаємо поля
            if(assignedProcPatientFilter) assignedProcPatientFilter.value = '';
            if(assignedProcPatientId) assignedProcPatientId.value = ''; // Очищаємо приховане поле ID
            if(assignedProcStatusFilter) assignedProcStatusFilter.value = '';
            if(assignedProcDateFromFilter) assignedProcDateFromFilter.value = '';
            if(assignedProcDateToFilter) assignedProcDateToFilter.value = '';

            // Скидаємо об'єкт фільтрів
            assignedProceduresFilters = { patientId: null, status: '', dateFrom: '', dateTo: '' };

            console.log("Clearing assigned procedures filters");
            fetchAndDisplayAssignedProcedures(); // Перезавантажуємо дані
        });
    }

    // Кнопка Призначити Нову Процедуру
    if (assignNewProcedureBtn && (currentUserRole === 'Admin' || currentUserRole === 'Doctor')) {
         // Показуємо кнопку тільки тим, хто може призначати
         assignNewProcedureBtn.style.display = 'inline-block';
         assignNewProcedureBtn.addEventListener('click', openAssignProcedureModal);
     } else if (assignNewProcedureBtn) {
         assignNewProcedureBtn.style.display = 'none'; // Ховаємо для інших ролей
     }

    // Відправка форми Призначення Процедури
    if (assignProcedureForm) {
        assignProcedureForm.addEventListener('submit', async (e) => {
             e.preventDefault();
             const saveButton = assignProcedureForm.querySelector('#saveAssignProcedureBtn');
             if(saveButton) saveButton.disabled = true; saveButton.textContent = 'Assigning...';
             if(assignProcedureFormError) assignProcedureFormError.style.display = 'none';

             const patientId = modalAssignPatientId?.value;
             const procedureId = modalAssignProcedure?.value;
             const appointmentId = modalAssignAppointment?.value;
             const executorId = modalAssignExecutorId?.value || null; // Optional

             // --- Потрібна додаткова валідація тут ---
             if (!patientId || !procedureId || !appointmentId) {
                 if(assignProcedureFormError) {
                     assignProcedureFormError.textContent = 'Patient, Procedure, and Appointment ID are required.';
                     assignProcedureFormError.style.display = 'block';
                 }
                 if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Assign';
                 return;
             }
             // ------------------------------------------

             const payload = {
                 patientId: parseInt(patientId),
                 procedureId: parseInt(procedureId),
                 appointmentId: parseInt(appointmentId),
                 executorId: executorId ? parseInt(executorId) : null
             };

             console.log('Assigning procedure with data:', payload);
             const apiUrl = 'http://127.0.0.1:5000/api/assigned_procedures';

             try {
                 const response = await fetchProtected(apiUrl, {
                     method: 'POST',
                     body: JSON.stringify(payload)
                 });
                 if (!response) return; // Помилка оброблена в fetchProtected

                 const data = await response.json(); // Очікуємо відповідь (навіть при 201)
                 alert(data.message || "Procedure assigned successfully!");
                 closeModal('assignProcedureModal');
                 // Оновлюємо список призначених, якщо він видимий
                 if (currentProcedureView === 'assigned') {
                     fetchAndDisplayAssignedProcedures();
                 }

             } catch (error) {
                 console.error('Assign procedure error:', error);
                 if(assignProcedureFormError) {
                     assignProcedureFormError.textContent = `Error: ${error.message}`;
                     assignProcedureFormError.style.display = 'block';
                 } else {
                     alert(`Failed to assign procedure: ${error.message}`);
                 }
             } finally {
                  if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Assign';
             }
        });
    }

     // Відправка форми Оновлення Статусу Процедури
     if (updateProcedureStatusForm) {
        updateProcedureStatusForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveButton = updateProcedureStatusForm.querySelector('#saveUpdateProcedureStatusBtn');
            if(saveButton) saveButton.disabled = true; saveButton.textContent = 'Updating...';
            if(updateProcedureStatusFormError) updateProcedureStatusFormError.style.display = 'none';

            const assignmentId = updateAssignmentId?.value;
            const newStatus = modalUpdateStatus?.value;
            const newResult = modalUpdateResult?.value;

            if (!assignmentId || !newStatus) {
                 if(updateProcedureStatusFormError) {
                     updateProcedureStatusFormError.textContent = 'Assignment ID and New Status are required.';
                     updateProcedureStatusFormError.style.display = 'block';
                 }
                 if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Update Status';
                 return;
            }

            const payload = {
                 executionStatus: newStatus,
                 result: newResult // Надсилаємо навіть якщо порожнє, для можливості очищення
            };

            console.log(`Updating assigned procedure ID ${assignmentId} with data:`, payload);
            const apiUrl = `http://127.0.0.1:5000/api/assigned_procedures/${assignmentId}`;

            try {
                 const response = await fetchProtected(apiUrl, {
                     method: 'PUT',
                     body: JSON.stringify(payload)
                 });
                 if (!response) return;

                 const data = await response.json();
                 alert(data.message || "Procedure status updated successfully!");
                 closeModal('updateProcedureStatusModal');
                 fetchAndDisplayAssignedProcedures(); // Оновлюємо список

            } catch (error) {
                 console.error('Update procedure status error:', error);
                 if(updateProcedureStatusFormError) {
                     updateProcedureStatusFormError.textContent = `Error: ${error.message}`;
                     updateProcedureStatusFormError.style.display = 'block';
                 } else {
                     alert(`Failed to update procedure status: ${error.message}`);
                 }
            } finally {
                 if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Update Status';
            }
        });
    }

    
    // Завантажує список лікарів для селектів
    async function loadDoctorsList() {
        if (doctorsListCache.length > 0) return doctorsListCache;

        // Використовуємо існуючий API /api/users, фільтруючи за роллю Doctor
        // ВАЖЛИВО: Цей API має повертати DoctorID з таблиці Doctors, а не тільки EmployeeID
        // Потрібно буде або модифікувати /api/users, або створити новий /api/doctors_list
        // Поки що зробимо припущення, що /api/users повертає потрібне
        // Або створимо новий ендпоінт /api/doctors_list
        // *** Створимо новий простий ендпоінт ***
        const apiUrl = 'http://127.0.0.1:5000/api/doctors_list'; // <--- ПОТРІБНО СТВОРИТИ НА БЕКЕНДІ
        console.log("Loading doctors list...");
        try {
            const response = await fetchProtected(apiUrl);
            if (!response) return [];
            const doctors = await response.json();
            if (!Array.isArray(doctors)) throw new Error("Invalid data format for doctors list");
            doctorsListCache = doctors;
            console.log("Doctors list loaded and cached:", doctorsListCache.length, "items");
            return doctorsListCache;
        } catch (error) {
            console.error("Failed to load doctors list:", error);
            return [];
        }
    }

    // Заповнює селект лікарями
    async function populateDoctorSelect(selectElementId) {
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) return;
        selectElement.innerHTML = '<option value="">Loading doctors...</option>';
        const doctors = await loadDoctorsList();
        const currentValue = selectElement.value; // Зберігаємо поточне значення

        if (doctors.length > 0) {
            // Перший опція - 'All' або '-- Select --'
             const firstOptionText = selectElementId === 'scheduleDoctorFilter' ? 'All Doctors' : '-- Select Doctor --';
             selectElement.innerHTML = `<option value="">${firstOptionText}</option>`;
            doctors.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.doctorId; // Використовуємо DoctorID
                option.textContent = `${doc.fullName} (${doc.specialty || 'Doctor'})`;
                selectElement.appendChild(option);
            });
             selectElement.value = currentValue; // Відновлюємо значення, якщо воно було
        } else {
            selectElement.innerHTML = '<option value="">Failed to load doctors</option>';
        }
    }


    // Завантажує та відображає розклад (прийоми)
    async function fetchAndDisplayAppointments() {
        if (!scheduleTableContainer) return;
        scheduleTableContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Loading schedule...</p>';

        // Будуємо URL з поточними фільтрами
        const params = new URLSearchParams();
        if (scheduleFilters.dateFrom) params.append('date_from', scheduleFilters.dateFrom);
        if (scheduleFilters.dateTo) params.append('date_to', scheduleFilters.dateTo);
        if (scheduleFilters.doctorId) params.append('doctor_id', scheduleFilters.doctorId);
        if (scheduleFilters.patientId) params.append('patient_id', scheduleFilters.patientId);
        if (scheduleFilters.status) params.append('status', scheduleFilters.status);

        const apiUrl = `http://127.0.0.1:5000/api/appointments?${params.toString()}`;
        console.log("Fetching appointments with URL:", apiUrl);

        try {
            const response = await fetchProtected(apiUrl);
            if (!response) return;

            const appointments = await response.json();
            if (!Array.isArray(appointments)) throw new Error("Invalid data format for appointments");

            // Генерація HTML таблиці
            let tableHTML = `
            <table class="schedule-table"> <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Patient</th>
                        <th>Doctor</th>
                        <th>Reason</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>`;

            if (appointments.length === 0) {
                tableHTML += `<tr><td colspan="7">No appointments found matching your criteria.</td></tr>`;
            } else {
                appointments.forEach(app => {
                    const appDateTime = app.appointmentDateTime ? new Date(app.appointmentDateTime) : null;
                    const formattedDateTime = appDateTime ? appDateTime.toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : 'N/A';
                    const canEdit = currentUserRole === 'Admin' || currentUserRole === 'Registrar' || (currentUserRole === 'Doctor' /*&& app.doctorId === currentUserDoctorId*/); // Додати перевірку для лікаря
                    const canAddConclusions = currentUserRole === 'Doctor' /*&& app.doctorId === currentUserDoctorId*/;

                    tableHTML += `
                        <tr id="appointment-row-${app.appointmentId}">
                            <td>${formattedDateTime}</td>
                            <td>${app.patientName} (ID: ${app.patientId})</td>
                            <td>${app.doctorName} (${app.doctorSpecialty || 'Doctor'})</td>
                            <td>${app.reasonForVisit || ''}</td>
                            <td>${app.durationMinutes || 'N/A'} min</td>
                            <td><span class="status-${app.status?.toLowerCase().replace(/ /g, '-')}">${app.status}</span></td>
                            <td>
                                ${canEdit ? `<button class="btn-edit" onclick="openEditAppointmentModal(${app.appointmentId})">Edit</button>` : ''}
                                </td>
                        </tr>`;
                         // Рядок з висновками лікаря (якщо є)
                        if (app.doctorConclusions) {
                            tableHTML += `
                            <tr class="conclusions-row">
                                <td colspan="7"><strong>Conclusions:</strong> ${app.doctorConclusions}</td>
                            </tr>`;
                        }
                });
            }
            tableHTML += `</tbody></table>`;
            scheduleTableContainer.innerHTML = tableHTML;

        } catch (error) {
            console.error('Failed to load appointments:', error);
            if (scheduleTableContainer) {
                scheduleTableContainer.innerHTML = `<p style="color: red;">Error loading schedule: ${error.message}</p>`;
            }
        }
    }

    // Відкриває модальне вікно для Створення/Редагування Прийому
    async function openAppointmentModal(title, appointmentData = null) {
        if (!appointmentModal || !appointmentForm) return;
        appointmentModalTitle.textContent = title;
        appointmentForm.reset();
        if(appointmentFormError) appointmentFormError.style.display = 'none';
        if(modalAppointmentPatientResults) modalAppointmentPatientResults.innerHTML = ''; // Очищаємо пошук
        modalAppointmentId.value = appointmentData?.appointmentId || ''; // Встановлюємо ID для редагування

        if (appointmentTimeStatusDiv) appointmentTimeStatusDiv.textContent = ''; 

        // Завантажуємо/оновлюємо список лікарів
        await populateDoctorSelect('modalAppointmentDoctor');

        const isEditMode = !!appointmentData;
        if(editAppointmentFields) editAppointmentFields.style.display = isEditMode ? 'block' : 'none';
        if(modalAppointmentConclusions) modalAppointmentConclusions.readOnly = (currentUserRole !== 'Doctor' && currentUserRole !== 'Admin');


        if (isEditMode) {
            // Заповнюємо поля для редагування
            if(modalAppointmentPatientSearch) modalAppointmentPatientSearch.value = appointmentData.patientName || '';
            if(modalAppointmentPatientId) modalAppointmentPatientId.value = appointmentData.patientId || ''; // Встановлюємо ID пацієнта
            if(modalAppointmentDoctor) modalAppointmentDoctor.value = appointmentData.doctorId || '';
            if(modalAppointmentDateTime) {
                 // Форматуємо дату для datetime-local (YYYY-MM-DDTHH:MM)
                if (appointmentData.appointmentDateTime) {
                     try {
                         const dt = new Date(appointmentData.appointmentDateTime);
                         // Коригуємо часову зону, якщо потрібно (datetime-local використовує локальну)
                         // Найпростіше - відформатувати без зони
                         const year = dt.getFullYear();
                         const month = (dt.getMonth() + 1).toString().padStart(2, '0');
                         const day = dt.getDate().toString().padStart(2, '0');
                         const hours = dt.getHours().toString().padStart(2, '0');
                         const minutes = dt.getMinutes().toString().padStart(2, '0');
                         modalAppointmentDateTime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
                     } catch (e) { console.error("Error formatting date for input:", e); }
                } else {
                     modalAppointmentDateTime.value = '';
                }
            }
            if(modalAppointmentDuration) modalAppointmentDuration.value = appointmentData.durationMinutes || '30';
            if(modalAppointmentReason) modalAppointmentReason.value = appointmentData.reasonForVisit || '';
            if(modalAppointmentStatus) modalAppointmentStatus.value = appointmentData.status || 'Scheduled';
            if(modalAppointmentConclusions) modalAppointmentConclusions.value = appointmentData.doctorConclusions || '';
            // Блокуємо поле пошуку пацієнта в режимі редагування (зазвичай пацієнта не змінюють)
            if(modalAppointmentPatientSearch) modalAppointmentPatientSearch.disabled = true;

        } else {
            // Скидання для нового прийому
            if(modalAppointmentPatientSearch) modalAppointmentPatientSearch.disabled = false;
             // Можна встановити поточну дату/час за замовчуванням
            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
             if(modalAppointmentDateTime) modalAppointmentDateTime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
             if(modalAppointmentDuration) modalAppointmentDuration.value = '30';
        }

        appointmentModal.style.display = 'block';
        if (isEditMode && appointmentData?.doctorId && appointmentData?.appointmentDateTime && appointmentData?.durationMinutes) {
            checkSelectedTimeAvailability();
        }
    }

    // Відкриває модалку для РЕДАГУВАННЯ (викликається з кнопки в таблиці)
    window.openEditAppointmentModal = async function(appointmentId) {
        console.log(`Editing appointment ID: ${appointmentId}`);
        const apiUrl = `http://127.0.0.1:5000/api/appointments/${appointmentId}`;
        try {
            const response = await fetchProtected(apiUrl);
            if (!response) return;
            const appointmentData = await response.json();
            openAppointmentModal(`Edit Appointment (ID: ${appointmentId})`, appointmentData);
        } catch (error) {
            console.error("Failed to load appointment details for editing:", error);
            alert(`Error loading appointment data: ${error.message}`);
        }
    }


    // --- Обробники подій ---

    // Кнопка Додати Новий Прийом
    if (addAppointmentBtn && (currentUserRole === 'Admin' || currentUserRole === 'Registrar')) {
         addAppointmentBtn.style.display = 'inline-block'; // Показуємо кнопку
         addAppointmentBtn.addEventListener('click', () => {
             openAppointmentModal('Add New Appointment');
         });
     }

    // Застосування фільтрів розкладу
    if (applyScheduleFilterBtn) {
        applyScheduleFilterBtn.addEventListener('click', () => {
            scheduleFilters.dateFrom = scheduleDateFromFilter?.value || '';
            scheduleFilters.dateTo = scheduleDateToFilter?.value || '';
            scheduleFilters.doctorId = scheduleDoctorFilter?.value || '';
            scheduleFilters.patientId = schedulePatientFilterId?.value || null; // Беремо ID з прихованого поля
            scheduleFilters.status = scheduleStatusFilter?.value || '';
            console.log("Applying schedule filters:", scheduleFilters);
            fetchAndDisplayAppointments();
        });
    }

    // Очищення фільтрів розкладу
    if (clearScheduleFilterBtn) {
        clearScheduleFilterBtn.addEventListener('click', () => {
            if(scheduleDateFromFilter) scheduleDateFromFilter.value = '';
            if(scheduleDateToFilter) scheduleDateToFilter.value = '';
            if(scheduleDoctorFilter) scheduleDoctorFilter.value = '';
            if(schedulePatientFilterSearch) schedulePatientFilterSearch.value = ''; // Очищуємо видиме поле пошуку
            if(schedulePatientFilterId) schedulePatientFilterId.value = '';       // Очищуємо приховане поле ID
            if(scheduleStatusFilter) scheduleStatusFilter.value = '';

            scheduleFilters = { dateFrom: '', dateTo: '', doctorId: '', patientId: null, status: '' };
            console.log("Clearing schedule filters");
            fetchAndDisplayAppointments();
        });
    }

     // Налаштування автозаповнення для пошуку пацієнта у ФІЛЬТРІ розкладу
     if (schedulePatientFilterSearch && schedulePatientFilterResults && schedulePatientFilterId) {
        setupAutocomplete(
            schedulePatientFilterSearch,
            schedulePatientFilterResults, // Контейнер для результатів фільтра
            schedulePatientFilterId,      // Приховане поле для ID у фільтрі
            'http://127.0.0.1:5000/api/patients?search=',
            formatPatientResult,
            (selectedPatient) => { // Колбек після вибору пацієнта у фільтрі
                // Можна одразу застосувати фільтр або просто оновити стан
                scheduleFilters.patientId = selectedPatient.patientId;
                console.log("Patient selected in filter, ID:", scheduleFilters.patientId);
                // Не викликаємо fetchAndDisplayAppointments тут, чекаємо натискання "Apply"
            }
        );
         // Додатковий обробник для очищення ID, якщо текстове поле очищено
         schedulePatientFilterSearch.addEventListener('input', function() {
             if (!this.value.trim()) {
                 schedulePatientFilterId.value = '';
                 scheduleFilters.patientId = null;
             }
         });
    }

    // Налаштування автозаповнення для пошуку пацієнта у МОДАЛЬНОМУ вікні
    if (modalAppointmentPatientSearch && modalAppointmentPatientResults && modalAppointmentPatientId) {
        setupAutocomplete(
            modalAppointmentPatientSearch,
            modalAppointmentPatientResults,
            modalAppointmentPatientId,
            'http://127.0.0.1:5000/api/patients?search=',
            formatPatientResult
        );
    }


    // Відправка форми Створення/Редагування Прийому
    if (appointmentForm) {
        appointmentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveButton = appointmentForm.querySelector('#saveAppointmentBtn');
            if(saveButton) saveButton.disabled = true; saveButton.textContent = 'Saving...';
            if(appointmentFormError) appointmentFormError.style.display = 'none';
            if (appointmentTimeStatusDiv) appointmentTimeStatusDiv.textContent = ''; // <-- ДОДАНО


            const appointmentId = modalAppointmentId?.value;
            const isEditMode = !!appointmentId;
            const url = `http://127.0.0.1:5000/api/appointments${isEditMode ? `/${appointmentId}` : ''}`;
            const method = isEditMode ? 'PUT' : 'POST';

            // Збираємо дані з форми
            const patientId = modalAppointmentPatientId?.value;
            const doctorId = modalAppointmentDoctor?.value;
            const appointmentDateTimeRaw = modalAppointmentDateTime?.value;
            const durationMinutes = modalAppointmentDuration?.value;
            const reasonForVisit = modalAppointmentReason?.value;

            // Перевіряємо обов'язкові поля для створення
            if (!isEditMode && (!patientId || !doctorId || !appointmentDateTimeRaw)) {
                if(appointmentFormError){
                    appointmentFormError.textContent = 'Patient, Doctor, Date/Time are required.';
                    appointmentFormError.style.display = 'block';
                }
                if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Save Appointment';
                return;
            }

            // Формуємо тіло запиту
            const payload = {};
            if (!isEditMode) { // Поля для створення
                 payload.patientId = parseInt(patientId);
                 payload.doctorId = parseInt(doctorId);
                 payload.appointmentDateTime = appointmentDateTimeRaw; // Надсилаємо як є, бекенд розпарсить ISO
                 if (durationMinutes) payload.durationMinutes = parseInt(durationMinutes);
                 if (reasonForVisit) payload.reasonForVisit = reasonForVisit;
            } else { // Поля для оновлення
                 // Дозволяємо змінювати статус, висновки, дату/час, тривалість
                 const status = modalAppointmentStatus?.value;
                 const conclusions = modalAppointmentConclusions?.value;
                 if(status) payload.status = status;
                 // Висновки може редагувати тільки лікар/адмін
                 if (modalAppointmentConclusions && !modalAppointmentConclusions.readOnly) {
                     payload.doctorConclusions = conclusions;
                 }
                 if(appointmentDateTimeRaw) payload.appointmentDateTime = appointmentDateTimeRaw;
                 if(durationMinutes) payload.durationMinutes = parseInt(durationMinutes);
                 // Поля patientId та doctorId зазвичай не змінюються при редагуванні
            }


            console.log(`Sending ${method} request to ${url} with payload:`, payload);

            try {
                const response = await fetchProtected(url, {
                    method: method,
                    body: JSON.stringify(payload)
                });
                if (!response) return;

                 // Навіть якщо 201 Created, відповідь може містити повідомлення
                 const data = await response.json();

                 if (response.status === 409) {
                    if(appointmentFormError){
                         appointmentFormError.textContent = data.message || 'Selected time is already booked.'; // Виводимо повідомлення з бекенду
                         appointmentFormError.style.display = 'block';
                     }
                    // Не закриваємо модалку, не оновлюємо таблицю
                    return; // Зупиняємо обробку
                }

                alert(data.message || `Appointment ${isEditMode ? 'updated' : 'created'} successfully!`);
                closeModal('appointmentModal');
                fetchAndDisplayAppointments(); // Оновлюємо розклад

            } catch (error) {
                console.error('Save appointment error:', error);
                 if(appointmentFormError) {
                     appointmentFormError.textContent = `Error: ${error.message}`;
                     appointmentFormError.style.display = 'block';
                 } else {
                     alert(`Failed to save appointment: ${error.message}`);
                 }
            } finally {
                 if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Save Appointment';
            }
        });
    }

// Завантажує та відображає звіти
async function fetchAndDisplayReports() {
    const reportType = document.getElementById('reportType')?.value;
    const dateFrom = document.getElementById('reportDateFrom')?.value; // <-- Отримуємо значення з поля вводу
    const dateTo = document.getElementById('reportDateTo')?.value;     // <-- Отримуємо значення з поля вводу
    const resultsContainer = document.getElementById('reportResultsContainer');
    const chartContainer = document.getElementById('reportChartContainer');
    const chartCanvas = document.getElementById('reportChartCanvas');
    const exportButton = document.getElementById('exportReportBtn');

    // Перевірка наявності елементів
    if (!resultsContainer || !chartContainer || !chartCanvas || !exportButton) {
        console.error("Report elements not found!");
        alert("Error: Required report elements are missing on the page.");
        return;
    }

    // Скидаємо попередні результати та стан кнопки/даних
    resultsContainer.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Generating report...</p>';
    chartContainer.style.display = 'none';
    exportButton.disabled = true; // Вимикаємо кнопку під час завантаження
    exportButton.textContent = 'Export Data'; // Скидаємо текст кнопки
    currentReportData = []; // Очищуємо дані попереднього звіту

    // Знищуємо попередній графік, якщо він існує
    if (reportChart instanceof Chart) { // Перевіряємо, чи це дійсно інстанс Chart
        try {
           reportChart.destroy();
           console.log("Previous chart destroyed.");
        } catch (e) {
           console.error("Error destroying previous chart:", e);
        }
        reportChart = null;
    } else if (reportChart) {
        console.warn("reportChart variable existed but was not a Chart instance.");
        reportChart = null;
    }


    // --- Перевірка дат ---
    if (!dateFrom || !dateTo) {
        resultsContainer.innerHTML = '<p style="color: red;">Please select both start and end dates.</p>';
        return;
    }
    if (new Date(dateFrom) > new Date(dateTo)) {
         resultsContainer.innerHTML = '<p style="color: red;">Start date cannot be after end date.</p>';
         return;
    }

    // --- Формування URL ---
    let apiUrl = '';
    if (reportType === 'appointmentsByDoctor') {
        apiUrl = `http://127.0.0.1:5000/api/reports/appointments_by_doctor?date_from=${dateFrom}&date_to=${dateTo}`;
    } else {
        resultsContainer.innerHTML = '<p style="color: red;">Selected report type is not implemented yet.</p>';
        return;
    }

    console.log("Fetching report data from:", apiUrl);

    // --- Запит та обробка даних ---
    try {
        const response = await fetchProtected(apiUrl);
        if (!response) {
            resultsContainer.innerHTML = '<p style="color: red;">Failed to fetch report data (check authorization or network).</p>';
            exportButton.textContent = 'Export Data (Error)';
            return; // Виходимо, якщо fetchProtected повернув null
        }

        const reportData = await response.json();
        currentReportData = reportData; // Зберігаємо дані для експорту

        if (!Array.isArray(reportData)) {
            throw new Error("Invalid report data format received from server.");
        }

        // --- Відображення Таблиці ---
        let tableHTML = '<p>No data found for the selected period.</p>';
        if (reportData.length > 0) {
            tableHTML = `<table class="report-table"><thead><tr>`;
            const headers = Object.keys(reportData[0]);
            headers.forEach(header => {
                const title = header.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                tableHTML += `<th>${title}</th>`;
            });
            tableHTML += `</tr></thead><tbody>`;
            reportData.forEach(row => {
                tableHTML += `<tr>`;
                headers.forEach(header => {
                    tableHTML += `<td>${row[header] ?? 'N/A'}</td>`;
                });
                tableHTML += `</tr>`;
            });
            tableHTML += `</tbody></table>`;
            exportButton.disabled = false; // Вмикаємо експорт, якщо є дані
            exportButton.textContent = 'Export Data';
        } else {
             exportButton.disabled = true;
             exportButton.textContent = 'Export Data (No Data)';
        }
        resultsContainer.innerHTML = tableHTML;

        // --- Відображення Графіка (Chart.js) ---
        if (reportData.length > 0 && reportType === 'appointmentsByDoctor') {
            chartContainer.style.display = 'block';
            const ctx = chartCanvas.getContext('2d');

            const labels = reportData.map(item => `${item.doctorName} (${item.doctorSpecialty || 'N/A'})`);
            const dataValues = reportData.map(item => item.appointmentCount);

            reportChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Number of Appointments',
                        data: dataValues,
                        backgroundColor: 'rgba(12, 130, 142, 0.6)',
                        borderColor: 'rgba(12, 130, 142, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Дозволяє краще керувати висотою
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                 stepSize: 1,
                                 precision: 0 // Тільки цілі числа на осі Y
                             }
                        },
                        x: {
                            ticks: {
                                autoSkip: false,
                                maxRotation: 70, // Максимальний кут повороту
                                minRotation: 45,  // Мінімальний кут повороту
                                padding: 5       // Відступ від осі до тексту
                            }
                        }
                    },
                    layout: {
                        padding: {
                            bottom: 50 // Збільшуємо відступ знизу для повернутих міток
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        title: {
                             display: true,
                             text: `Appointments per Doctor (${dateFrom} to ${dateTo})`
                         },
                         tooltip: { // Налаштування підказок при наведенні
                            callbacks: {
                                 title: function(tooltipItems) {
                                     // Повертаємо повний підпис осі X як заголовок підказки
                                     return tooltipItems[0]?.label || '';
                                 },
                                 label: function(context) {
                                      let label = context.dataset.label || '';
                                      if (label) {
                                          label += ': ';
                                      }
                                      if (context.parsed.y !== null) {
                                          label += context.parsed.y;
                                      }
                                      return label;
                                 }
                             }
                         }
                    }
                }
            });
        } else {
             chartContainer.style.display = 'none'; // Ховаємо графік, якщо даних немає
        }

    } catch (error) {
        console.error('Failed to generate or display report:', error);
        // Показуємо помилку користувачу
        resultsContainer.innerHTML = `<p style="color: red;">Error generating report: ${error.message}</p>`;
        // Скидаємо стан
        chartContainer.style.display = 'none';
        exportButton.disabled = true;
        exportButton.textContent = 'Export Data (Error)';
        currentReportData = [];
        if (reportChart) { reportChart.destroy(); reportChart = null; } // Знищуємо графік при помилці
    }
} // --- Кінець функції fetchAndDisplayReports ---


            const generateReportBtn = document.getElementById('generateReportBtn');
            if (generateReportBtn) {
                generateReportBtn.addEventListener('click', fetchAndDisplayReports);
            } else {
                console.error("Generate Report button not found!");
            }

// Функція для конвертації даних у CSV та завантаження
function exportReportDataToCSV(data, filename = 'report.csv') {
    if (!data || data.length === 0) {
        alert('No data available to export.');
        return;
    }

    // Визначаємо заголовки з ключів першого об'єкта
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(';')]; // Перший рядок - заголовки

    // Функція для екранування даних у CSV
    const escapeCSV = (field) => {
        if (field === null || field === undefined) return '';
        let fieldStr = String(field);
        // Якщо поле містить кому, перенос рядка або лапки, беремо його в подвійні лапки
        if (fieldStr.includes(',') || fieldStr.includes('\\n') || fieldStr.includes('"')) {
            // Подвоюємо існуючі подвійні лапки
            fieldStr = fieldStr.replace(/"/g, '""');
            return `"${fieldStr}"`;
        }
        return fieldStr;
    };

    // Конвертуємо кожен об'єкт даних у рядок CSV
    data.forEach(row => {
        const values = headers.map(header => escapeCSV(row[header]));
        csvRows.push(values.join(';'));
    });

    // Створюємо Blob та посилання для завантаження
    const csvString = csvRows.join('\r\n');
    // ДОДАЄМО BOM для кращої сумісності з Excel
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) { // Перевірка підтримки атрибута download
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Очищаємо URL через невеликий проміжок часу
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
         alert('Your browser does not support automatic file downloading. Please use a different browser or copy the data manually.');
    }
}

// Обробник для кнопки експорту
const exportButton = document.getElementById('exportReportBtn');
if (exportButton) {
    exportButton.addEventListener('click', () => {
        const reportType = document.getElementById('reportType')?.value || 'unknown_report';
        const dateFrom = document.getElementById('reportDateFrom')?.value || 'nodate';
        const dateTo = document.getElementById('reportDateTo')?.value || 'nodate';
        const filename = `${reportType}_${dateFrom}_to_${dateTo}.csv`; // Формуємо ім'я файлу

        exportReportDataToCSV(currentReportData, filename); // Викликаємо функцію експорту
    });
} else {
    console.error("Export Report button not found!");
}

    function switchContent(targetId) {
        const contentBlocks = contentArea.querySelectorAll('.content-block');
        const dashboardBlocks = contentArea.querySelectorAll('.dashboard-view');
        contentBlocks.forEach(block => block.style.display = 'none');
        dashboardBlocks.forEach(block => block.style.display = 'none');
        const navLink = document.querySelector(`.nav-item[data-target="${targetId}"] span`);
        pageTitle.textContent = navLink ? navLink.textContent : (targetId === 'dashboard' ? 'Dashboard' : 'Page');
        let blockToShow = null;

        if (targetId === 'dashboard') {
            const roleDashboardId = `dashboard-content-${currentUserRole?.toLowerCase()}`;
            blockToShow = document.getElementById(roleDashboardId);
            if (!blockToShow) blockToShow = document.querySelector('.dashboard-view'); // Fallback
            if(blockToShow) { blockToShow.style.display = 'block'; fetchAndDisplayDashboardData(); }
        } else {
            blockToShow = document.getElementById(`${targetId}-content`);
        }

        if (blockToShow) {
            if (targetId !== 'dashboard') blockToShow.style.display = 'block';
            // Завантаження даних для відповідної секції
            switch(targetId) {
                case 'patients':
                    fetchAndDisplayPatients();
                    initializeFilterInputs(); // <-- Ініціалізуємо фільтри при переході
                    break;
                case 'users': if (currentUserRole === 'Admin') fetchAndDisplayUsers(); break;
                case 'pending-registrations': if (currentUserRole === 'Admin') fetchAndDisplayPendingRegistrations(); break;

                case 'medications':
                    // Встановлюємо початкове значення пошуку з поля (якщо воно було збережене)
                    if (medicationSearchInput) medicationSearchTerm = medicationSearchInput.value.trim();
                    fetchAndDisplayMedications();
                    break;

                    case 'procedures':
                        // Встановлюємо початковий вигляд та завантажуємо дані
                        // (наприклад, завжди показувати призначені спочатку)
                        currentProcedureView = 'assigned'; // або 'directory' за замовчуванням
                        viewToggleButtons?.forEach(btn => {
                            btn.classList.toggle('active', btn.getAttribute('data-view') === currentProcedureView);
                        });
                        if(assignedProceduresView) assignedProceduresView.style.display = (currentProcedureView === 'assigned') ? 'block' : 'none';
                        if(procedureDirectoryView) procedureDirectoryView.style.display = (currentProcedureView === 'directory') ? 'block' : 'none';
   
                        if (currentProcedureView === 'assigned') {
                            // Ініціалізуємо фільтри при переході
                            if(assignedProcPatientFilter) assignedProcPatientFilter.value = assignedProceduresFilters.patientId || ''; // Відновити значення фільтрів?
                            if(assignedProcStatusFilter) assignedProcStatusFilter.value = assignedProceduresFilters.status || '';
                            if(assignedProcDateFromFilter) assignedProcDateFromFilter.value = assignedProceduresFilters.dateFrom || '';
                            if(assignedProcDateToFilter) assignedProcDateToFilter.value = assignedProceduresFilters.dateTo || '';
                            fetchAndDisplayAssignedProcedures();
                        } else {
                            displayProcedureDirectory();
                        }
                        break;
                        case 'schedule':
                            // Ініціалізуємо фільтри та завантажуємо дані
                            populateDoctorSelect('scheduleDoctorFilter'); // Заповнюємо селект лікарів у фільтрі
                            // Встановлюємо початкові значення фільтрів (напр., сьогоднішній день)
                             const today = new Date().toISOString().split('T')[0];
                             if(scheduleDateFromFilter && !scheduleFilters.dateFrom) scheduleDateFromFilter.value = today;
                             if(scheduleDateToFilter && !scheduleFilters.dateTo) scheduleDateToFilter.value = today;
                             scheduleFilters.dateFrom = scheduleDateFromFilter?.value || today;
                             scheduleFilters.dateTo = scheduleDateToFilter?.value || today;
                            // Відновлюємо інші фільтри, якщо потрібно
                            if(scheduleDoctorFilter) scheduleDoctorFilter.value = scheduleFilters.doctorId || '';
                            if(schedulePatientFilterSearch) schedulePatientFilterSearch.value = ''; // Очищуємо пошук пацієнта при переході
                            if(schedulePatientFilterId) schedulePatientFilterId.value = ''; scheduleFilters.patientId = null;
                            if(scheduleStatusFilter) scheduleStatusFilter.value = scheduleFilters.status || '';
       
                            fetchAndDisplayAppointments();
                            break;
                            case 'reports': // <--- ДОДАНО ЦЕЙ CASE
                            document.getElementById('reportResultsContainer').innerHTML = '<p>Please select filters and generate a report.</p>';
                             if (reportChart) { reportChart.destroy(); reportChart = null; } // Очищаємо старий графік
                             document.getElementById('reportChartContainer').style.display = 'none';
                             document.getElementById('exportReportBtn').disabled = true;
                            break;

                default:
                    if (targetId !== 'dashboard') {
                        console.log(`Switched to ${targetId}, data loading function may be needed.`);
                        if (blockToShow.children.length <= 1 && !blockToShow.querySelector('h2')) {
                            blockToShow.innerHTML = `<h2>${pageTitle.textContent}</h2><p>Content not implemented yet.</p>`;
                        }
                    }
                    break;
            }
        } else if (targetId !== 'dashboard') { // Handle missing content block
             console.warn(`Content block for '${targetId}' not found.`);
             // Optionally show a default message in contentArea
        } else { 
            console.error(`Dashboard for role ${currentUserRole} or default dashboard not found.`);
            pageTitle.textContent = 'Error';
            // Optionally show error in contentArea
        }
    }
    
        // === Перевірка видимості кнопки Add Patient ===
        if (addPatientBtn) {
            console.log('updateUserAccess: Checking visibility for addPatientBtn.'); // <--- Додано лог
            const shouldBeVisible = (currentUserRole === 'Admin' || currentUserRole === 'Registrar');
            addPatientBtn.style.display = shouldBeVisible ? 'inline-block' : 'none';
            console.log('updateUserAccess: addPatientBtn display set to:', addPatientBtn.style.display); // <--- Додано лог
        } else {
            // Цей лог спрацює, якщо посилання на кнопку addPatientBtn втрачено
            console.error('updateUserAccess: addPatientBtn element not found!'); // <--- Додано лог
        }

        function setupAutocomplete(inputElement, resultsContainer, idElement, apiUrlTemplate, displayFormatter, onSelectCallback) {
            let searchTimeout;
            let currentFocus = -1; // Для навігації клавіатурою
    
            inputElement.addEventListener('input', function() {
                const searchTerm = this.value.trim();
                idElement.value = ''; // Очищуємо ID при зміні тексту
                currentFocus = -1; // Скидаємо фокус клавіатури
    
                if (!searchTerm || searchTerm.length < 2) { // Починаємо пошук після 2 символів
                    resultsContainer.innerHTML = '';
                    resultsContainer.style.display = 'none';
                    return;
                }
    
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(async () => {
                    const apiUrl = `${apiUrlTemplate}${encodeURIComponent(searchTerm)}`;
                    console.log(`Autocomplete fetching: ${apiUrl}`);
                    try {
                        const response = await fetchProtected(apiUrl); // Використовуємо fetchProtected
                        if (!response) {
                            resultsContainer.innerHTML = '<div class="autocomplete-error">Error loading suggestions</div>';
                            resultsContainer.style.display = 'block';
                            return;
                        }
                        const data = await response.json();
    
                        resultsContainer.innerHTML = ''; // Очищуємо попередні результати
                        if (Array.isArray(data) && data.length > 0) {
                            data.forEach((item, index) => {
                                const itemDiv = document.createElement('div');
                                itemDiv.innerHTML = displayFormatter(item); // Форматуємо вивід
                                itemDiv.classList.add('autocomplete-item');
                                itemDiv.dataset.id = item.patientId || item.employeeId; // Зберігаємо ID
                                itemDiv.dataset.name = item.fullName; // Зберігаємо ім'я
                                itemDiv.addEventListener('click', function() {
                                    inputElement.value = this.dataset.name; // Вставляємо ім'я в поле
                                    idElement.value = this.dataset.id;   // Вставляємо ID в приховане поле
                                    resultsContainer.innerHTML = '';      // Очищуємо результати
                                    resultsContainer.style.display = 'none';
                                    if (onSelectCallback) {
                                        onSelectCallback(item); // Викликаємо колбек, якщо він є
                                    }
                                });
                                resultsContainer.appendChild(itemDiv);
                            });
                            resultsContainer.style.display = 'block'; // Показуємо результати
                        } else {
                            resultsContainer.innerHTML = '<div class="autocomplete-no-results">No results found</div>';
                            resultsContainer.style.display = 'block';
                        }
                    } catch (error) {
                        console.error('Autocomplete fetch error:', error);
                        resultsContainer.innerHTML = '<div class="autocomplete-error">Failed to fetch suggestions</div>';
                        resultsContainer.style.display = 'block';
                    }
                }, 350); // Затримка debounce
            });
    
            // Обробка навігації клавіатурою (стрілки вниз/вгору, Enter)
            inputElement.addEventListener('keydown', function(e) {
                const items = resultsContainer.getElementsByClassName('autocomplete-item');
                if (!items.length) return;
    
                if (e.key === 'ArrowDown') {
                    currentFocus++;
                    addActive(items);
                    e.preventDefault(); // Запобігаємо прокрутці сторінки
                } else if (e.key === 'ArrowUp') {
                    currentFocus--;
                    addActive(items);
                    e.preventDefault();
                } else if (e.key === 'Enter') {
                    e.preventDefault(); // Запобігаємо відправці форми
                    if (currentFocus > -1) {
                        items[currentFocus]?.click(); // Імітуємо клік на активному елементі
                    }
                } else if (e.key === 'Escape') {
                     resultsContainer.innerHTML = '';
                     resultsContainer.style.display = 'none';
                }
            });
    
            function addActive(items) {
                if (!items) return false;
                removeActive(items);
                if (currentFocus >= items.length) currentFocus = 0;
                if (currentFocus < 0) currentFocus = (items.length - 1);
                items[currentFocus]?.classList.add('autocomplete-active');
            }
    
            function removeActive(items) {
                for (let i = 0; i < items.length; i++) {
                    items[i].classList.remove('autocomplete-active');
                }
            }
    
            // Закриваємо список при кліку поза полем та списком
            document.addEventListener('click', function (e) {
                if (e.target !== inputElement && e.target !== resultsContainer && !resultsContainer.contains(e.target)) {
                    resultsContainer.innerHTML = '';
                    resultsContainer.style.display = 'none';
                }
            });
        }
    
    
        // --- Ініціалізація Автозаповнення в Модалці Призначення ---
    
        // Форматер для пацієнтів
        function formatPatientResult(patient) {
            const dob = patient.dateOfBirth ? ` (DOB: ${new Date(patient.dateOfBirth).toLocaleDateString('uk-UA')})` : '';
            return `<strong>${patient.fullName}</strong>${dob} - ID: ${patient.patientId}`;
        }
    
        // Форматер для співробітників (виконавців)
        function formatExecutorResult(employee) {
            return `<strong>${employee.fullName}</strong> (${employee.role || 'N/A'}) - ID: ${employee.employeeId}`;
        }
    
        // Налаштовуємо автозаповнення для пацієнта
        if (modalAssignPatientSearch && modalAssignPatientResults && modalAssignPatientId) {
            setupAutocomplete(
                modalAssignPatientSearch,
                modalAssignPatientResults,
                modalAssignPatientId,
                'http://127.0.0.1:5000/api/patients?search=', // API для пошуку пацієнтів
                formatPatientResult
                // Можна додати onSelectCallback, якщо щось треба зробити після вибору пацієнта
            );
        }
    
        // Налаштовуємо автозаповнення для виконавця
        if (modalAssignExecutorSearch && modalAssignExecutorResults && modalAssignExecutorId) {
            setupAutocomplete(
                modalAssignExecutorSearch,
                modalAssignExecutorResults,
                modalAssignExecutorId,
                'http://127.0.0.1:5000/api/users?search=&role=Doctor&role=Nurse', // API для пошуку лікарів та медсестер
                formatExecutorResult
            );
        }
    
    
        // --- Оновлення Обробника Відправки Форми Призначення ---
        if (assignProcedureForm) {
            assignProcedureForm.addEventListener('submit', async (e) => {
                 e.preventDefault();
                 const saveButton = assignProcedureForm.querySelector('#saveAssignProcedureBtn');
                 if(saveButton) saveButton.disabled = true; saveButton.textContent = 'Assigning...';
                 if(assignProcedureFormError) assignProcedureFormError.style.display = 'none';
    
                 // ---> Тепер беремо ID з прихованих полів <---
                 const patientId = modalAssignPatientId?.value;
                 const procedureId = modalAssignProcedure?.value;
                 const appointmentId = modalAssignAppointment?.value;
                 const executorId = modalAssignExecutorId?.value || null; // Optional
    
                 // Перевірка заповнення ID
                 if (!patientId || !procedureId || !appointmentId) { // Перевіряємо саме ID
                     if(assignProcedureFormError) {
                         assignProcedureFormError.textContent = 'Patient (selected via search), Procedure, and Appointment ID are required.';
                         assignProcedureFormError.style.display = 'block';
                     }
                     if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Assign';
                     return;
                 }
                 // ------------------------------------------
    
                 const payload = {
                     patientId: parseInt(patientId),
                     procedureId: parseInt(procedureId),
                     appointmentId: parseInt(appointmentId),
                     executorId: executorId ? parseInt(executorId) : null
                 };
    
                 // ... (решта коду відправки форми без змін) ...
                 console.log('Assigning procedure with data:', payload);
                 const apiUrl = 'http://127.0.0.1:5000/api/assigned_procedures';
    
                 try {
                     const response = await fetchProtected(apiUrl, { /* ... */ });
                     if (!response) {
                          if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Assign'; // Розблокувати кнопку якщо fetchProtected повернув null
                          return;
                     }
    
                     const data = await response.json();
                     alert(data.message || "Procedure assigned successfully!");
                     closeModal('assignProcedureModal');
                     if (currentProcedureView === 'assigned') {
                         fetchAndDisplayAssignedProcedures();
                     }
    
                 } catch (error) {
                     console.error('Assign procedure error:', error);
                      if(assignProcedureFormError) { /* ... */ } else { /* ... */ }
                 } finally {
                      if(saveButton) saveButton.disabled = false; saveButton.textContent = 'Assign';
                 }
            });
        }
    



        document.addEventListener('click', (e) => {
            if (dropdownMenu?.style.display === 'block') { /* ... */ }
            // Додаємо нові модалки до списку
            [userModal, patientModal, document.getElementById('roleSelectionModal'), assignProcedureModal, updateProcedureStatusModal, appointmentModal].forEach(modal => {
                 if (modal && modal.style.display === 'block' && e.target === modal) {
                     closeModal(modal.id);
                 }
             });


        });

    // Ініціалізація сторінки
    if (currentUserRole) {
        updateUserAccess();
        const initialActiveItem = document.querySelector('.sidebar-nav .nav-item.active:not(.inaccessible)')
                               || document.querySelector('.sidebar-nav .nav-item:not(.inaccessible)');
        let initialTarget = initialActiveItem?.getAttribute('data-target') || 'dashboard';

        // Перевірка, чи початкова ціль доступна
        const itemToActivate = document.querySelector(`.nav-item[data-target="${initialTarget}"]`);
        if (!itemToActivate || itemToActivate.classList.contains('inaccessible')) {
            initialTarget = 'dashboard'; // Якщо недоступна, переходимо на дашборд
        }

        // Встановлення активного класу
        sidebarNavItems.forEach(i => i.classList.remove('active'));
        const finalItemToActivate = document.querySelector(`.nav-item[data-target="${initialTarget}"]`);
         if(finalItemToActivate && !finalItemToActivate.classList.contains('inaccessible')) {
            finalItemToActivate.classList.add('active');
         } else {
             // Якщо і дашборд недоступний, це проблема
             console.error("Default dashboard view is inaccessible or not found!");
             pageTitle.textContent = "Error";
             contentArea.innerHTML = `<p style="color:red;">No accessible sections found.</p>`;
             return; // Зупиняємо подальше виконання
         }
        // Початкове завантаження контенту
        switchContent(initialTarget);
        loadDoctorsList();

    }

}); // --- КІНЕЦЬ DOMContentLoaded ---

