import pyodbc
from faker import Faker
import random
from datetime import datetime, timedelta
import os
import hashlib 

DB_SERVER = 'DESKTOP-35BIRI1'
DB_DATABASE = 'HospitalServ'

NUM_EMPLOYEES = 50
# Визначаємо бажану кількість для кожної ролі (сума = NUM_EMPLOYEES)
NUM_ADMINS = 2
NUM_REGISTRARS = 5
NUM_NURSES = 15
NUM_DOCTORS_TARGET = 20 
NUM_OTHER_STAFF = NUM_EMPLOYEES - NUM_ADMINS - NUM_REGISTRARS - NUM_NURSES - NUM_DOCTORS_TARGET 
# Переконуємося, що NUM_DOCTORS_TARGET не перевищує загальну кількість
if NUM_DOCTORS_TARGET > NUM_EMPLOYEES:
    NUM_DOCTORS_TARGET = NUM_EMPLOYEES // 2 

NUM_PATIENTS = 200
NUM_MEDICATIONS = 100
NUM_PROCEDURES = 50
NUM_APPOINTMENTS = 500
NUM_PRESCRIPTIONS_PER_APPOINTMENT = 0.7
NUM_PROCEDURES_PER_APPOINTMENT = 1.2
NUM_HISTORY_RECORDS_PER_PATIENT = 3

fake = Faker('uk_UA')

# --- Допустимі значення з CHECK constraints ---
EMPLOYEE_ROLES = ['Nurse', 'Registrar', 'Doctor', 'Admin', 'Pending']
EMPLOYEE_STATUSES = ['Active', 'Inactive', 'PendingApproval', 'Rejected']
PATIENT_STATUSES = ['Active', 'Inactive']
APPOINTMENT_STATUSES = ['Scheduled', 'Completed', 'Cancelled by Patient', 'Cancelled by Doctor', 'No Show']
ASSIGNED_PROCEDURE_STATUSES = ['Assigned', 'Completed', 'Cancelled', 'In Progress']
PRESCRIPTION_STATUSES = ['Valid', 'Expired', 'Dispensed', 'Cancelled']
GENDERS = ['Male', 'Female', 'Other']

# --- Функції для генерації даних ---

def generate_password_hash(password="password"):
    """ Генерує простий SHA256 хеш для пароля (для демонстрації) """
    return hashlib.sha256(password.encode()).hexdigest()

# Функція generate_employees (без змін з попередньої версії)
def generate_employees(cursor, num_total):
    employees = []
    fake.unique.clear() # Очищення для email та username

    employees_by_role = {'Admin': [], 'Registrar': [], 'Nurse': [], 'Doctor': [], 'Other': []}
    positions_map = {
        'Admin': ['Адміністратор системи', 'Головний адміністратор'],
        'Registrar': ['Реєстратор', 'Медичний реєстратор'],
        'Nurse': ['Медсестра', 'Старша медсестра', 'Медбрат'],
        'Doctor': ['Лікар-терапевт', 'Лікар-хірург', 'Лікар-спеціаліст'],
        'Other': ['Санітар', 'Технік', 'Лаборант', 'Водій']
    }
    other_roles_available = ['Nurse', 'Registrar', 'Pending']

    generated_count = 0
    attempts = 0
    max_attempts = num_total * 2

    while generated_count < num_total and attempts < max_attempts:
        attempts += 1
        full_name = fake.name()
        phone_number = fake.phone_number()

        try:
            email = fake.unique.email()
            username = fake.unique.user_name()
        except Exception:
             print(f"Попередження: Не вдалося згенерувати унікальний Email/Username на спробі {attempts}.")
             continue

        hire_date = fake.date_between(start_date='-5y', end_date='today')
        password_hash = generate_password_hash(username) if random.random() > 0.1 else None

        role = 'Pending'
        position = 'Не визначено'

        if len(employees_by_role['Admin']) < NUM_ADMINS:
            role = 'Admin'
            position = random.choice(positions_map[role])
            employees_by_role[role].append(generated_count)
        elif len(employees_by_role['Registrar']) < NUM_REGISTRARS:
            role = 'Registrar'
            position = random.choice(positions_map[role])
            employees_by_role[role].append(generated_count)
        elif len(employees_by_role['Nurse']) < NUM_NURSES:
            role = 'Nurse'
            position = random.choice(positions_map[role])
            employees_by_role[role].append(generated_count)
        elif len(employees_by_role['Doctor']) < NUM_DOCTORS_TARGET:
             role = 'Doctor'
             position = 'Лікар'
             employees_by_role[role].append(generated_count)
        else:
            role = random.choice(other_roles_available)
            temp_role_key = 'Other' if role not in positions_map else role
            if temp_role_key == 'Other':
                 position = random.choice(positions_map['Other'])
                 employees_by_role['Other'].append(generated_count)
            else:
                 position = random.choice(positions_map[temp_role_key])
                 if len(employees_by_role[temp_role_key]) < (NUM_NURSES if temp_role_key == 'Nurse' else NUM_REGISTRARS):
                      employees_by_role[temp_role_key].append(generated_count)
                 else:
                     employees_by_role['Other'].append(generated_count)

        status = random.choices(EMPLOYEE_STATUSES, weights=[0.85, 0.05, 0.08, 0.02], k=1)[0]

        employees.append((full_name, position, phone_number, email, hire_date, role, status, password_hash, username))
        generated_count += 1

    if generated_count < num_total:
        print(f"Попередження: Згенеровано тільки {generated_count} з {num_total} співробітників.")

    if not employees:
        print("Помилка: Не вдалося згенерувати дані співробітників.")
        return [], {}

    try:
        cursor.executemany("""
            INSERT INTO Employees (FullName, Position, PhoneNumber, Email, HireDate, Role, Status, PasswordHash, Username)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, employees)
        num_inserted = len(employees)
        all_inserted_ids = []
        if num_inserted > 0:
            cursor.execute(f"SELECT TOP ({num_inserted}) EmployeeID FROM Employees ORDER BY EmployeeID DESC")
            all_inserted_ids = [row.EmployeeID for row in cursor.fetchall()]
            all_inserted_ids.reverse()

        distributed_ids = {'Admin': [], 'Registrar': [], 'Nurse': [], 'Doctor': [], 'Other': []}
        current_index = 0
        for role, indices in employees_by_role.items():
             count = len(indices)
             if current_index + count <= len(all_inserted_ids):
                  distributed_ids[role] = all_inserted_ids[current_index : current_index + count]
             else:
                  print(f"Попередження: Не вдалося точно розподілити ID для ролі {role}")
                  distributed_ids[role] = all_inserted_ids[current_index:]
                  current_index = len(all_inserted_ids)
                  break
             current_index += count

        print(f"Розподілені ID за ролями: { {k: len(v) for k, v in distributed_ids.items()} }")
        return all_inserted_ids, distributed_ids

    except pyodbc.IntegrityError as e:
        print(f"Помилка цілісності при додаванні співробітників: {e}")
        conn.rollback()
        return [], {}
    except pyodbc.Error as e:
        print(f"Інша помилка бази даних при додаванні співробітників: {e}")
        conn.rollback()
        return [], {}


# Функція generate_doctors (без змін з попередньої версії)
def generate_doctors(cursor, employee_ids_by_role):
    doctor_candidate_ids = employee_ids_by_role.get('Doctor', [])
    if not doctor_candidate_ids:
        print("Попередження: Немає співробітників з роллю 'Doctor' для створення записів лікарів.")
        return []

    doctors = []
    specialties = ['Терапевт', 'Хірург', 'Кардіолог', 'Невролог', 'Педіатр', 'Офтальмолог', 'ЛОР', 'Гінеколог', 'Дерматолог', 'Рентгенолог', 'Психіатр']
    fake.unique.clear()
    used_office_numbers = set()

    for emp_id in doctor_candidate_ids:
        specialty = random.choice(specialties)
        office_number = str(random.randint(100, 599))
        while office_number in used_office_numbers:
             office_number = str(random.randint(100, 599))
        used_office_numbers.add(office_number)
        license_number = fake.unique.bothify(text='LIC-#######??') if random.random() > 0.1 else None

        try:
            cursor.execute("""
                UPDATE Employees
                SET Position = ?, Role = 'Doctor', Status = 'Active'
                WHERE EmployeeID = ? AND Role = 'Doctor'
            """, (f'Лікар-{specialty}', emp_id))
        except pyodbc.Error as e:
            print(f"Помилка при оновленні посади/статусу для EmployeeID {emp_id}: {e}")
            continue

        doctors.append((emp_id, specialty, office_number, license_number))

    if not doctors:
         print("Не вдалося підготувати дані для вставки лікарів.")
         return []

    try:
        cursor.executemany("""
            INSERT INTO Doctors (EmployeeID, Specialty, OfficeNumber, LicenseNumber)
            VALUES (?, ?, ?, ?)
        """, doctors)
        inserted_emp_ids = [d[0] for d in doctors]
        if inserted_emp_ids:
             placeholders = ','.join('?' * len(inserted_emp_ids))
             cursor.execute(f"SELECT DoctorID FROM Doctors WHERE EmployeeID IN ({placeholders})", inserted_emp_ids)
             return [row.DoctorID for row in cursor.fetchall()]
        else:
             return []
    except pyodbc.Error as e:
        print(f"Помилка при вставці лікарів: {e}")
        conn.rollback()
        return []

def generate_patients(cursor, num_records):
    patients = []
    fake.unique.clear() # Для MedicalCardNumber
    attempts = 0
    max_attempts = num_records * 2 # Обмеження спроб

    while len(patients) < num_records and attempts < max_attempts:
        attempts += 1
        full_name = fake.name()
        dob = fake.date_of_birth(minimum_age=0, maximum_age=95)
        gender = random.choice(GENDERS + [None])
        address = fake.address()
        phone_number = fake.phone_number()

        try:
            medical_card_number = fake.unique.bothify(text='MC-#########')
        except Exception: # Якщо унікальні номери закінчились
             print(f"Попередження: Не вдалося згенерувати унікальний MedicalCardNumber на спробі {attempts}.")
             medical_card_number = f"MC-FAIL-{random.randint(100000, 999999)}"


        reg_date = fake.date_time_between(start_date='-10y', end_date='now')
        status = random.choices(PATIENT_STATUSES, weights=[0.95, 0.05], k=1)[0]

        patients.append((full_name, dob, gender, address, phone_number, medical_card_number, reg_date, status))

    if len(patients) < num_records:
         print(f"Попередження: Згенеровано тільки {len(patients)} з {num_records} пацієнтів.")

    if not patients:
        print("Помилка: Не вдалося згенерувати дані пацієнтів.")
        return []

    try:
        cursor.executemany("""
            INSERT INTO Patients (FullName, DateOfBirth, Gender, Address, PhoneNumber, MedicalCardNumber, RegistrationDate, Status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, patients)
        num_inserted = len(patients)
        # Отримуємо ID надійним способом
        if num_inserted > 0:
            cursor.execute(f"SELECT TOP ({num_inserted}) PatientID FROM Patients ORDER BY PatientID DESC")
            all_inserted_ids = [row.PatientID for row in cursor.fetchall()]
            all_inserted_ids.reverse()
            return all_inserted_ids
        else:
            return [] # Повертаємо порожній список, якщо нічого не було вставлено
    except pyodbc.IntegrityError as e:
        print(f"Помилка цілісності при додаванні пацієнтів: {e}")
        conn.rollback()
        return []
    except pyodbc.Error as e:
        print(f"Інша помилка бази даних при додаванні пацієнтів: {e}")
        conn.rollback()
        return []

def generate_medications(cursor, num_records):
    medications = []
    substances = ['Парацетамол', 'Ібупрофен', 'Амоксицилін', 'Метформін', 'Аторвастатин', 'Лоратадин', 'Аспірин', 'Лізиноприл']
    forms = ['Таблетки', 'Капсули', 'Сироп', 'Мазь', 'Розчин для ін\'єкцій', 'Суспензія', 'Краплі']
    manufacturers = ['Фармак', 'Дарниця', 'Arterium', 'Bayer', 'Pfizer', 'Sanofi', 'KRKA', 'Teva']
    fake.unique.clear()
    for _ in range(num_records):
        try:
            base_name = random.choice(['ЛікиА', 'ПрепаратБ', 'ЗасібВ', 'МедикаментГ', 'ЗілляД', 'ТаблеткаЕ'])
            suffix = fake.unique.word().capitalize()
            name = f"{base_name}-{suffix} {random.choice(['Форте', 'Плюс', 'Екстра', ''])}".strip()
        except Exception:
             name = f"Медикамент-{random.randint(10000, 99999)}"

        substance = random.choice(substances)
        form = random.choice(forms)
        manufacturer = random.choice(manufacturers)
        instruction = fake.text(max_nb_chars=600)
        medications.append((name, substance, form, manufacturer, instruction))

    if not medications: return []
    try:
        cursor.executemany("""
            INSERT INTO Medications (MedicationName, ActiveSubstance, DosageForm, Manufacturer, Instruction)
            VALUES (?, ?, ?, ?, ?)
        """, medications)
        num_inserted = len(medications)
        all_inserted_ids = []
        if num_inserted > 0:
            cursor.execute(f"SELECT TOP ({num_inserted}) MedicationID FROM Medications ORDER BY MedicationID DESC")
            all_inserted_ids = [row.MedicationID for row in cursor.fetchall()]
            all_inserted_ids.reverse()
        return all_inserted_ids
    except pyodbc.IntegrityError as e:
        print(f"Помилка цілісності при додаванні медикаментів: {e}")
        conn.rollback()
        return []
    except pyodbc.Error as e:
        print(f"Інша помилка бази даних при додаванні медикаментів: {e}")
        conn.rollback()
        return []


def generate_procedures(cursor, num_records):
    procedures = []
    procedure_names_base = ['Загальний аналіз крові', 'УЗД черевної порожнини', 'Рентген грудної клітки', 'ЕКГ', 'Консультація спеціаліста', 'Фізіотерапія', 'Масаж', 'Біохімічний аналіз крові', 'МРТ голови', 'КТ легень']
    fake.unique.clear()
    for i in range(num_records):
        base_name = random.choice(procedure_names_base)
        try:
            suffix = fake.unique.word() if len(procedure_names_base) < num_records else str(i+1)
            name = f"{base_name} ({suffix})"
        except Exception:
             name = f"{base_name} ID-{random.randint(1000, 9999)}"

        description = fake.sentence(nb_words=15)
        duration = random.randint(15, 120) if random.random() > 0.1 else None
        cost = round(random.uniform(50.0, 2500.0), 2) if random.random() > 0.05 else None
        procedures.append((name, description, duration, cost))

    if not procedures: return []
    try:
        cursor.executemany("""
            INSERT INTO MedicalProcedures (ProcedureName, Description, EstimatedDurationMinutes, Cost)
            VALUES (?, ?, ?, ?)
        """, procedures)
        num_inserted = len(procedures)
        all_inserted_ids = []
        if num_inserted > 0:
            cursor.execute(f"SELECT TOP ({num_inserted}) ProcedureID FROM MedicalProcedures ORDER BY ProcedureID DESC")
            all_inserted_ids = [row.ProcedureID for row in cursor.fetchall()]
            all_inserted_ids.reverse()
        return all_inserted_ids
    except pyodbc.IntegrityError as e:
        print(f"Помилка цілісності при додаванні процедур: {e}")
        conn.rollback()
        return []
    except pyodbc.Error as e:
        print(f"Інша помилка бази даних при додаванні процедур: {e}")
        conn.rollback()
        return []


def generate_appointments(cursor, num_records, patient_ids, doctor_ids):
    if not patient_ids or not doctor_ids:
        print("Помилка: Немає пацієнтів або лікарів для створення записів.")
        return []

    appointments = []
    reasons = ['Плановий огляд', 'Погане самопочуття', 'Консультація', 'Біль у спині', 'Висока температура', 'Травма', 'Запаморочення', 'Нудота', 'Перевірка аналізів']

    for _ in range(num_records):
        patient_id = random.choice(patient_ids)
        doctor_id = random.choice(doctor_ids)
        appointment_dt = fake.date_time_between(start_date='-1y', end_date='+3m')
        duration = random.choice([15, 30, 45, 60]) if random.random() > 0.1 else None
        status = random.choices(APPOINTMENT_STATUSES, weights=[0.4, 0.4, 0.05, 0.05, 0.1], k=1)[0]
        reason = random.choice(reasons) if random.random() > 0.05 else None
        conclusions = fake.text(max_nb_chars=500) if status == 'Completed' else None

        appointments.append((patient_id, doctor_id, appointment_dt, duration, status, reason, conclusions))

    if not appointments: return []
    try:
        output_data = []
        insert_sql = """
            INSERT INTO Appointments (PatientID, DoctorID, AppointmentDateTime, DurationMinutes, Status, ReasonForVisit, DoctorConclusions)
            OUTPUT INSERTED.AppointmentID, INSERTED.PatientID, INSERTED.DoctorID, INSERTED.Status, INSERTED.AppointmentDateTime
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        for app_data in appointments:
            cursor.execute(insert_sql, app_data)
            output_data.append(cursor.fetchone())

        return output_data

    except pyodbc.Error as e:
        print(f"Помилка при вставці записів на прийом: {e}")
        conn.rollback()
        return []


def generate_prescriptions(cursor, appointment_data, medication_ids):
    if not medication_ids or not appointment_data:
        print("Попередження: Немає медикаментів або даних прийомів для створення рецептів.")
        return

    prescription_items = []
    completed_apps_filtered = [
        app for app in appointment_data
        if len(app) >= 5 and
           app[3] == 'Completed' and
           all(x is not None for x in [app[0], app[1], app[2], app[4]])
    ]

    if not completed_apps_filtered:
        print("Інформація: Немає 'Completed' прийомів з коректними даними для генерації рецептів.")
        return

    generated_prescription_count = 0
    fake.unique.clear()

    for app in completed_apps_filtered:
        app_id, patient_id, doctor_id, _, issue_date = app[:5]

        if random.random() < NUM_PRESCRIPTIONS_PER_APPOINTMENT:
            try:
                prescription_number = fake.unique.bothify(text='PRES-#########') if random.random() > 0.02 else None
            except Exception:
                 prescription_number = None

            expiry_date = issue_date.date() + timedelta(days=random.randint(30, 180)) if random.random() > 0.1 else None
            status = random.choices(PRESCRIPTION_STATUSES, weights=[0.7, 0.1, 0.15, 0.05], k=1)[0]

            try:
                cursor.execute("""
                    INSERT INTO Prescriptions (AppointmentID, PatientID, DoctorID, PrescriptionNumber, IssueDate, ExpiryDate, Status)
                    OUTPUT INSERTED.PrescriptionID
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (app_id, patient_id, doctor_id, prescription_number, issue_date, expiry_date, status))
                prescription_id = cursor.fetchone().PrescriptionID
                generated_prescription_count += 1

                num_items = random.randint(1, 4)
                k = min(num_items, len(medication_ids))
                if k > 0:
                     selected_med_ids = random.sample(medication_ids, k)
                     for med_id in selected_med_ids:
                        dosage = f"{random.randint(1, 3)} {random.choice(['табл.', 'капс.'])} {random.randint(1, 3)} р/д"
                        quantity = str(random.randint(1, 3)) + " " + random.choice(['уп.', 'фл.', 'бліст.']) if random.random() > 0.1 else None
                        duration = f"{random.randint(5, 30)} днів" if random.random() > 0.1 else None
                        prescription_items.append((prescription_id, med_id, dosage, quantity, duration))

            except pyodbc.IntegrityError as e:
                 print(f"Помилка цілісності (можливо, дублікат PrescriptionNumber '{prescription_number}') для AppointmentID {app_id}: {e}")
                 conn.rollback()
                 continue
            except pyodbc.Error as e:
                print(f"Помилка при вставці рецепту для AppointmentID {app_id}: {e}")
                conn.rollback()
                continue

    if prescription_items:
        try:
            cursor.executemany("""
                INSERT INTO PrescriptionItems (PrescriptionID, MedicationID, Dosage, Quantity, DurationOfUse)
                VALUES (?, ?, ?, ?, ?)
            """, prescription_items)
            print(f"Додано {len(prescription_items)} позицій до {generated_prescription_count} рецептів.")
        except pyodbc.Error as e:
            print(f"Помилка при вставці позицій рецептів: {e}")
            conn.rollback()
    elif generated_prescription_count > 0:
         print(f"Згенеровано {generated_prescription_count} рецептів, але не вдалося/не було чого додати до них позиції.")


def generate_assigned_procedures(cursor, appointment_data, procedure_ids, employee_ids):
    if not procedure_ids or not appointment_data or not employee_ids:
         print("Попередження: Недостатньо даних для призначення процедур.")
         return

    assigned_procedures = []
    relevant_apps_filtered = [
        app for app in appointment_data
        if len(app) >= 5 and
           app[3] in ('Scheduled', 'Completed') and
           all(x is not None for x in [app[0], app[1], app[4]])
    ]

    if not relevant_apps_filtered:
        print("Інформація: Немає релевантних прийомів з коректними даними для призначення процедур.")
        return

    generated_assigned_count = 0
    for app in relevant_apps_filtered:
        app_id, patient_id, _, _, assignment_dt = app[:5]

        if random.random() < NUM_PROCEDURES_PER_APPOINTMENT:
             num_procedures_to_assign = random.randint(1, 3)
             k = min(num_procedures_to_assign, len(procedure_ids))
             if k <= 0: continue

             selected_proc_ids = random.sample(procedure_ids, k)

             for proc_id in selected_proc_ids:
                 executor_id = random.choice(employee_ids) if random.random() > 0.15 else None
                 execution_dt = None
                 result = None
                 status = random.choices(ASSIGNED_PROCEDURE_STATUSES, weights=[0.5, 0.3, 0.1, 0.1], k=1)[0]

                 if status == 'Completed':
                    time_after_assignment = timedelta(days=random.randint(0, 7), hours=random.randint(1, 23))
                    execution_dt_candidate = assignment_dt + time_after_assignment
                    now = datetime.now()
                    execution_dt = execution_dt_candidate if execution_dt_candidate <= now else now
                    result = fake.text(max_nb_chars=400)
                 elif status == 'In Progress':
                    if random.random() > 0.5:
                        time_after_assignment = timedelta(hours=random.randint(-2, 2))
                        execution_dt_candidate = assignment_dt + time_after_assignment
                        now = datetime.now()
                        execution_dt = execution_dt_candidate if execution_dt_candidate <= now else now

                 assigned_procedures.append((app_id, proc_id, patient_id, executor_id, assignment_dt, execution_dt, status, result))
                 generated_assigned_count +=1

    if assigned_procedures:
        try:
            cursor.executemany("""
                INSERT INTO AssignedProcedures (AppointmentID, ProcedureID, PatientID, ExecutorID, AssignmentDateTime, ExecutionDateTime, ExecutionStatus, Result)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, assigned_procedures)
            print(f"Додано {len(assigned_procedures)} призначених процедур.")
        except pyodbc.Error as e:
            print(f"Помилка при вставці призначених процедур: {e}")
            conn.rollback()
    elif generated_assigned_count > 0:
         print("Були спроби згенерувати призначені процедури, але їх не вдалося вставити.")


def generate_medical_history(cursor, patient_ids, doctor_ids, appointment_data):
    if not patient_ids:
        print("Попередження: Немає пацієнтів для створення медичної історії.")
        return

    history_records = []
    record_types = ['Діагноз', 'Симптоми', 'Результат аналізу', 'Призначення', 'Алергія', 'Щеплення', 'Зауваження лікаря', 'Анамнез']
    completed_apps_filtered = [
        app for app in appointment_data
        if len(app) >= 5 and
           app[3] == 'Completed' and
           all(x is not None for x in [app[0], app[1], app[2], app[4]])
    ]
    valid_doctor_ids = set(doctor_ids)

    for app in completed_apps_filtered:
        app_id, patient_id, doctor_id, _, record_dt_base = app[:5]
        record_date = record_dt_base + timedelta(minutes=random.randint(5, 60))
        record_type = random.choice(['Діагноз', 'Призначення', 'Симптоми', 'Зауваження лікаря'])
        description = fake.text(max_nb_chars=450)
        if not description: description = "Немає опису."
        doc_id_to_insert = doctor_id if doctor_id in valid_doctor_ids else None
        history_records.append((patient_id, doc_id_to_insert, app_id, record_date, record_type, description))

    num_additional = int(len(patient_ids) * NUM_HISTORY_RECORDS_PER_PATIENT)
    for _ in range(num_additional):
        patient_id = random.choice(patient_ids)
        current_doctor_id = random.choice(doctor_ids) if doctor_ids and random.random() > 0.2 else None
        appointment_id = None
        record_date = fake.date_time_between(start_date='-5y', end_date='now')
        record_type = random.choice(record_types)
        description = fake.text(max_nb_chars=450)
        if not description: description = "Запис без деталей."

        history_records.append((patient_id, current_doctor_id, appointment_id, record_date, record_type, description))

    if history_records:
        try:
            cursor.executemany("""
                INSERT INTO MedicalHistory (PatientID, DoctorID, AppointmentID, RecordDate, RecordType, Description)
                VALUES (?, ?, ?, ?, ?, ?)
            """, history_records)
            print(f"Додано {len(history_records)} записів до медичної історії.")
        except pyodbc.Error as e:
             print(f"Помилка при вставці записів медичної історії: {e}")
             conn.rollback()


# --- Основна логіка ---
conn = None
all_successful = True

try:
    connection_string = (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_DATABASE};"
        f"Trusted_Connection=yes;"
    )
    print(f"Спроба підключення до: SERVER={DB_SERVER}, DATABASE={DB_DATABASE} з Trusted Connection...")
    conn = pyodbc.connect(connection_string, autocommit=False)
    cursor = conn.cursor()
    print("Підключення успішне.")

    # --- Виконання генерації ---
    print(f"\n--- Генерація {NUM_EMPLOYEES} співробітників ---")
    employee_ids, employee_ids_by_role = generate_employees(cursor, NUM_EMPLOYEES)
    if not employee_ids and NUM_EMPLOYEES > 0:
        all_successful = False
        raise Exception("Критична помилка: Не вдалося згенерувати співробітників.")
    print(f"Згенеровано {len(employee_ids)} співробітників.")

    print(f"\n--- Генерація лікарів (з {len(employee_ids_by_role.get('Doctor',[]))} кандидатів) ---")
    doctor_ids = generate_doctors(cursor, employee_ids_by_role)
    if not doctor_ids and len(employee_ids_by_role.get('Doctor',[])) > 0:
        print("Попередження: Не вдалося створити записи лікарів, хоча кандидати були.")
    print(f"Згенеровано {len(doctor_ids)} лікарів.")

    print(f"\n--- Генерація {NUM_PATIENTS} пацієнтів ---")
    patient_ids = generate_patients(cursor, NUM_PATIENTS) 
    if not patient_ids and NUM_PATIENTS > 0:
        all_successful = False
        raise Exception("Критична помилка: Не вдалося згенерувати пацієнтів.")
    print(f"Згенеровано {len(patient_ids)} пацієнтів.")

    print(f"\n--- Генерація {NUM_MEDICATIONS} медикаментів ---")
    medication_ids = generate_medications(cursor, NUM_MEDICATIONS)
    if not medication_ids and NUM_MEDICATIONS > 0:
        all_successful = False
        print("Попередження: Не вдалося згенерувати медикаменти.")
    print(f"Згенеровано {len(medication_ids)} медикаментів.")

    print(f"\n--- Генерація {NUM_PROCEDURES} медичних процедур ---")
    procedure_ids = generate_procedures(cursor, NUM_PROCEDURES)
    if not procedure_ids and NUM_PROCEDURES > 0:
        print("Попередження: Не вдалося згенерувати медичні процедури.")
    print(f"Згенеровано {len(procedure_ids)} процедур.")

    print(f"\n--- Генерація {NUM_APPOINTMENTS} записів на прийом ---")
    appointment_data = []
    if patient_ids and doctor_ids:
        appointment_data = generate_appointments(cursor, NUM_APPOINTMENTS, patient_ids, doctor_ids)
        if not appointment_data and NUM_APPOINTMENTS > 0:
            print("Попередження: Не вдалося згенерувати записи на прийом.")
        print(f"Згенеровано {len(appointment_data)} записів на прийом (з деталями).")
    else:
        print("Пропущено генерацію прийомів (немає пацієнтів та/або лікарів).")

    # Залежні таблиці
    if appointment_data:
        print("\n--- Генерація рецептів та їх позицій ---")
        if medication_ids:
            generate_prescriptions(cursor, appointment_data, medication_ids)
        else:
            print("Пропущено (немає медикаментів).")

        print("\n--- Генерація призначених процедур ---")
        if procedure_ids and employee_ids:
             generate_assigned_procedures(cursor, appointment_data, procedure_ids, employee_ids)
        else:
            print("Пропущено (немає процедур або співробітників).")

        print("\n--- Генерація медичної історії (на основі прийомів) ---")
        if doctor_ids:
            generate_medical_history(cursor, patient_ids, doctor_ids, appointment_data)
        else:
             print("Пропущено (немає лікарів для запису в історію).")

    else:
        print("\n--- Пропущено генерацію рецептів, призначених процедур та історії (немає даних про прийоми) ---")

    # Додаткова історія
    print("\n--- Генерація додаткової медичної історії ---")
    if patient_ids:
        generate_medical_history(cursor, patient_ids, doctor_ids, [])
    else:
        print("Пропущено (немає пацієнтів).")


    # --- Завершення ---
    if all_successful:
        print("\nВсі основні етапи генерації пройшли успішно. Фіксація транзакції...")
        conn.commit()
        print("\nДані успішно згенеровано та додано до бази даних!")
    else:
         print("\nПід час генерації виникли помилки або критичні попередження. Виконується відкат транзакції...")
         conn.rollback()
         print("Зміни не було збережено в базі даних.")


except pyodbc.Error as ex:
    sqlstate = ex.args[0]
    print(f"\n!!! Помилка бази даних (pyodbc): SQLSTATE={sqlstate} !!!")
    print(ex)
    if conn:
        print("Виконується відкат транзакції...")
        conn.rollback()
    all_successful = False
except Exception as e:
    print(f"\n!!! Сталася загальна помилка Python: {e} !!!")
    import traceback
    traceback.print_exc()
    if conn:
        print("Виконується відкат транзакції...")
        conn.rollback()
    all_successful = False
finally:
    if conn:
        conn.close()
        print("\nЗ'єднання з базою даних закрито.")