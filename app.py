# backend/app.py
from flask import Flask, jsonify, request # type: ignore
from flask_cors import CORS # type: ignore
import pyodbc # type: ignore
from werkzeug.security import generate_password_hash, check_password_hash # Додаємо функції хешування
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager
import os
from functools import wraps 
import datetime



app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

# --- НАЛАШТУВАННЯ ПІДКЛЮЧЕННЯ ДО БАЗИ ДАНИХ ---
DB_SERVER = 'DESKTOP-35BIRI1'
DB_DATABASE = 'HospitalServ' 

connection_string = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};" # Драйвер може відрізнятися (напр. {SQL Server})
    f"SERVER={DB_SERVER};"
    f"DATABASE={DB_DATABASE};"
    f"Trusted_Connection=yes;" # Вказує на використання Windows Authentication
)

app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'your-super-secret-key-change-me')
jwt = JWTManager(app)

def is_valid_date(date_string):
    if not date_string:
        return False
    try:
        datetime.datetime.strptime(date_string, '%Y-%m-%d')
        return True
    except ValueError:
        return False

# Функція для отримання підключення до БД
def get_db_connection():
    try:
        conn = pyodbc.connect(connection_string)
        return conn
    except pyodbc.Error as ex:
        sqlstate = ex.args[0]
        print(f"ПОМИЛКА ПІДКЛЮЧЕННЯ ДО БД: {sqlstate}")
        print(ex)
        return None
    
def check_role(*required_roles): # Приймає довільну кількість потрібних ролей
    """
    Декоратор для перевірки ролі користувача.
    Дозволяє доступ, якщо роль користувача є однією з `required_roles`
    АБО якщо роль користувача - 'Admin'.
    """
    # Перетворюємо кортеж required_roles на множину для ефективного пошуку
    # Це ролі, які явно вказані в декораторі (@check_role('Role1', 'Role2'))
    allowed_roles_explicit = set(required_roles)

    def decorator(fn):
        @wraps(fn)
        @jwt_required() # Спочатку перевіряємо JWT
        def wrapper(*args, **kwargs):
            current_user_identity_str = get_jwt_identity()
            print(f"Перевірка ролі: отримано identity '{current_user_identity_str}' типу {type(current_user_identity_str)}")

            try:
                current_user_id_int = int(current_user_identity_str)
            except (ValueError, TypeError):
                print(f"Помилка конвертації identity '{current_user_identity_str}' в integer.")
                return jsonify({"message": "Невалідний формат ідентифікатора користувача в токені"}), 422

            conn = get_db_connection()
            user_role = None
            cursor = None
            if conn:
                try:
                    cursor = conn.cursor()
                    cursor.execute("SELECT Role FROM dbo.Employees WHERE EmployeeID = ? AND Status = 'Active'", (current_user_id_int,))
                    result = cursor.fetchone()
                    if result:
                        user_role = result[0]
                    print(f"Роль користувача ID {current_user_id_int} з БД: {user_role}")
                except pyodbc.Error as ex:
                    print(f"ПОМИЛКА ПЕРЕВІРКИ РОЛІ В БД: {ex}")
                    # Не повертаємо помилку 500 одразу
                finally:
                    if cursor:
                        try: cursor.close()
                        except Exception as e_cur: print(f"Помилка закриття курсора: {e_cur}")
                    if conn:
                        try: conn.close()
                        except Exception as e_con: print(f"Помилка закриття з'єднання: {e_con}")
            else:
                return jsonify({"message": "Помилка підключення до БД при перевірці ролі"}), 500

            if not user_role:
                print(f"Не вдалося отримати роль для користувача ID {current_user_id_int}.")
                return jsonify({"message": "Не вдалося визначити права доступу користувача."}), 403

            # --- Ключова Перевірка ---
            # Доступ дозволено, якщо:
            # 1. Роль користувача є серед явно вказаних required_roles
            # АБО
            # 2. Роль користувача - 'Admin'
            if user_role in allowed_roles_explicit or user_role == 'Admin':
                print(f"Доступ дозволено для ролі '{user_role}'. (Перевірка на: {allowed_roles_explicit} або 'Admin')")
                return fn(*args, **kwargs) # Викликаємо захищену функцію
            else:
                # Формуємо повідомлення про необхідні ролі (без 'Admin', бо він перевіряється окремо)
                needed_roles_msg = ', '.join(required_roles) if required_roles else "спеціальні права"
                print(f"Відмова в доступі для ролі '{user_role}'. Потрібна одна з ролей: {needed_roles_msg} або 'Admin'.")
                return jsonify({"message": f"Недостатньо прав доступу. Потрібна роль: {needed_roles_msg} або Admin"}), 403 # Forbidden
        # --- Кінець Перевірки ---

        wrapper.__name__ = fn.__name__
        return wrapper
    return decorator

def admin_required(func):
    def wrapper(*args, **kwargs):
        # ЗАГЛУШКА: Тут має бути реальна перевірка ролі 'Admin'
        print("!!! ПОПЕРЕДЖЕННЯ: Перевірка ролі адміністратора не реалізована для цього ендпоінту!")
        # if not current_user_is_admin():
        #     return jsonify({"message": "Потрібні права адміністратора"}), 403
        return func(*args, **kwargs)
    # Зберігаємо ім'я оригінальної функції для Flask
    wrapper.__name__ = func.__name__
    return wrapper

@app.route('/api/pending_registrations', methods=['GET'])
@check_role('Admin') # Перевірка, чи користувач з токена має роль 'Admin'
def get_pending_registrations():
    # ... (код функції без змін, але тепер вона захищена) ...
    pending_users = []
    conn = get_db_connection()
    if not conn:
        return jsonify({"message": "Помилка підключення до бази даних"}), 500
    cursor = conn.cursor()
    try:
        sql = """
            SELECT EmployeeID, FullName, Username, Email, Role
            FROM dbo.Employees
            WHERE Status = 'PendingApproval' ORDER BY EmployeeID DESC
        """
        cursor.execute(sql)
        rows = cursor.fetchall()
        for row in rows:
            pending_users.append({
                "employeeId": row.EmployeeID, "fullName": row.FullName,
                "username": row.Username, "email": row.Email, "role": row.Role
            })
        cursor.close()
        conn.close()
        return jsonify(pending_users)
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ PENDING USERS: {ex}")
        if cursor: cursor.close()
        if conn: conn.close()
        return jsonify({"message": "Помилка отримання запитів на реєстрацію"}), 500


@app.route('/api/approve_registration/<int:employee_id>', methods=['PUT'])
@jwt_required()
@check_role('Admin')
def approve_registration_endpoint(employee_id):
    data = request.get_json() # Отримуємо дані з тіла
    if not data or 'role' not in data:
        return jsonify({"message": "Необхідно вказати роль для користувача в тілі запиту."}), 400

    new_role = data.get('role') # Беремо роль з запиту

    allowed_roles = ['Doctor', 'Registrar', 'Nurse', 'Admin'] # Допустимі ролі
    if new_role not in allowed_roles:
         return jsonify({"message": f"Недійсна роль '{new_role}'. Дозволені: {', '.join(allowed_roles)}"}), 400

    conn = get_db_connection()
    # ... (решта коду перевірки статусу та UPDATE з використанням new_role) ...
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    cursor = conn.cursor()
    try:
        # Перевіряємо поточний статус
        cursor.execute("SELECT Status FROM dbo.Employees WHERE EmployeeID = ?", (employee_id,))
        user_status_row = cursor.fetchone()
        if not user_status_row:
            # ... (обробка помилки 404) ...
             cursor.close(); conn.close(); return jsonify({"message": "Користувача не знайдено"}), 404
        if user_status_row[0] != 'PendingApproval':
             # ... (обробка помилки 400) ...
             cursor.close(); conn.close(); return jsonify({"message": f"Користувач не в стані очікування (статус: {user_status_row[0]})"}), 400

        # Оновлюємо статус та РОЛЬ
        sql = "UPDATE dbo.Employees SET Status = 'Active', Role = ? WHERE EmployeeID = ? AND Status = 'PendingApproval'"
        cursor.execute(sql, (new_role, employee_id)) # Використовуємо new_role
        conn.commit()

        if cursor.rowcount == 0:
             # ... (обробка помилки 500) ...
             cursor.close(); conn.close(); return jsonify({"message": "Не вдалося оновити статус користувача."}), 500

        print(f"Адміністратор схвалив реєстрацію для EmployeeID {employee_id}, призначено роль: {new_role}")
        cursor.close()
        conn.close()
        return jsonify({"message": f"Реєстрацію користувача схвалено. Призначено роль: {new_role}"}), 200

    except pyodbc.Error as ex:
        # ... (обробка помилки 500) ...
         print(f"ПОМИЛКА СХВАЛЕННЯ РЕЄСТРАЦІЇ (ID: {employee_id}): {ex}")
         try: conn.rollback()
         except: pass
         if cursor: cursor.close()
         if conn: conn.close()
         return jsonify({"message": "Помилка сервера під час схвалення реєстрації"}), 500



# --- НОВИЙ ЕНДПОІНТ: Відхилення реєстрації ---
@app.route('/api/reject_registration/<int:employee_id>', methods=['PUT'])
# @jwt_required()
@check_role('Admin')
def reject_registration_endpoint(employee_id):
    # ... (код функції без змін, але тепер вона захищена) ...
    conn = get_db_connection()
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT Status FROM dbo.Employees WHERE EmployeeID = ?", (employee_id,))
        user_status = cursor.fetchone()
        if not user_status:
            cursor.close(); conn.close()
            return jsonify({"message": "Користувача не знайдено"}), 404
        if user_status[0] != 'PendingApproval':
            cursor.close(); conn.close()
            return jsonify({"message": f"Користувач не знаходиться в стані очікування (поточний статус: {user_status[0]})"}), 400

        sql = "UPDATE dbo.Employees SET Status = 'Rejected' WHERE EmployeeID = ?"
        cursor.execute(sql, (employee_id,))
        conn.commit()
        print(f"Адміністратор відхилив реєстрацію для EmployeeID {employee_id}")
        cursor.close()
        conn.close()
        return jsonify({"message": "Реєстрацію користувача відхилено"}), 200
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ВІДХИЛЕННЯ РЕЄСТРАЦІЇ (ID: {employee_id}): {ex}")
        try: conn.rollback()
        except: pass
        if cursor: cursor.close()
        if conn: conn.close()
        return jsonify({"message": "Помилка сервера під час відхилення реєстрації"}), 500


# Також оновимо ендпоінт дашборду, щоб він повертав кількість запитів
@app.route('/api/dashboard_data', methods=['GET'])
@jwt_required()
def get_dashboard_data():
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id_int = int(current_user_id_str)
    except (ValueError, TypeError):
         return jsonify({"message": "Невалідний формат ID користувача в токені"}), 422

    conn = get_db_connection()
    user_role = 'Unknown'
    user_full_name = 'User'
    doctor_id_for_user = None 
    cursor = None
    if conn:
        try:
            cursor = conn.cursor()
            # Отримуємо Роль, Ім'я та DoctorID (якщо є) одним запитом
            sql_user_info = """
                SELECT e.Role, e.FullName, d.DoctorID
                FROM dbo.Employees e
                LEFT JOIN dbo.Doctors d ON e.EmployeeID = d.EmployeeID
                WHERE e.EmployeeID = ? AND e.Status = 'Active'
            """
            cursor.execute(sql_user_info, (current_user_id_int,))
            result = cursor.fetchone()
            if result:
                user_role = result.Role
                user_full_name = result.FullName
                doctor_id_for_user = result.DoctorID # Буде NULL, якщо це не лікар
            else:
                 if cursor: cursor.close()
                 if conn: conn.close()
                 print(f"Невдала спроба отримання даних користувача ID {current_user_id_int} (неактивний або не існує).")
                 return jsonify({"message": "Не вдалося отримати дані користувача."}), 403

        except pyodbc.Error as ex:
            print(f"ПОМИЛКА ОТРИМАННЯ РОЛІ/ІМЕНІ/DoctorID ДЛЯ ДАШБОРДУ: {ex}")
            # Не перериваємо, але роль/ім'я будуть Unknown/User
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
    else:
         # Якщо немає з'єднання з БД на самому початку
         return jsonify({"message": "Помилка підключення до БД при отриманні даних користувача"}), 500


    print(f"Запит даних дашборду від ID: {current_user_id_int}, Роль: {user_role}, DoctorID: {doctor_id_for_user}")
    data = { "userName": user_full_name }

    # --- Завантажуємо дані в залежності від реальної ролі ---
    conn = get_db_connection()
    if not conn:
        return jsonify({**data, "db_error": "Connection error for dashboard data"}), 200

    cursor = conn.cursor()
    try:
        if user_role == 'Admin':
             cursor.execute("SELECT COUNT(*) FROM dbo.Employees WHERE Status = 'Active'")
             data['totalUsers'] = cursor.fetchone()[0]
             cursor.execute("SELECT COUNT(*) FROM dbo.Employees WHERE Status = 'PendingApproval'")
             data['pendingRegistrations'] = cursor.fetchone()[0]
             cursor.execute("SELECT COUNT(*) FROM dbo.Patients")
             data['totalPatients'] = cursor.fetchone()[0]
             cursor.execute("SELECT COUNT(*) FROM dbo.Appointments WHERE CAST(AppointmentDateTime AS DATE) = CAST(GETDATE() AS DATE)")
             data['appointmentsToday'] = cursor.fetchone()[0]

        # --- ЗМІНЕНО БЛОК ЛІКАРЯ ---
        elif user_role == 'Doctor':
            data['upcomingAppointments'] = [] # Ініціалізуємо як порожній список
            data['quickPatientLinks'] = []   # Ініціалізуємо як порожній список (реалізація пізніше)

            if doctor_id_for_user is not None: # Переконуємось, що ми знайшли DoctorID
                # Запит на отримання найближчих 5 запланованих прийомів для цього лікаря
                sql_upcoming = """
                    SELECT TOP 5
                        a.AppointmentDateTime, a.ReasonForVisit,
                        p.FullName as PatientName, p.PatientID
                    FROM dbo.Appointments a
                    JOIN dbo.Patients p ON a.PatientID = p.PatientID
                    WHERE a.DoctorID = ?
                      AND a.Status = 'Scheduled'
                      AND a.AppointmentDateTime >= GETDATE() -- Тільки майбутні або поточні
                    ORDER BY a.AppointmentDateTime ASC
                """
                cursor.execute(sql_upcoming, (doctor_id_for_user,))
                upcoming_rows = cursor.fetchall()
                for row in upcoming_rows:
                    data['upcomingAppointments'].append({
                        "patient": row.PatientName,
                        "patientId": row.PatientID, # Додаємо ID пацієнта
                        "time": row.AppointmentDateTime.strftime('%H:%M %d-%m-%Y'), # Форматуємо час і дату
                        "reason": row.ReasonForVisit or "N/A" # Причина візиту
                    })

                sql_doctor_patients = """
                    SELECT DISTINCT TOP 10
                        p.PatientID, p.FullName, p.DateOfBirth
                    FROM dbo.Appointments a
                    JOIN dbo.Patients p ON a.PatientID = p.PatientID
                    WHERE a.DoctorID = ? AND p.Status = 'Active' -- Тільки активні пацієнти
                    ORDER BY p.FullName -- Сортуємо за іменем
                """
                cursor.execute(sql_doctor_patients, (doctor_id_for_user,))
                patient_rows = cursor.fetchall()
                for row in patient_rows:
                    # Розраховуємо вік (можна робити і на фронтенді)
                    age = None
                    if row.DateOfBirth:
                        today = datetime.date.today()
                        born = row.DateOfBirth
                        age = today.year - born.year - ((today.month, today.day) < (born.month, born.day))

                    data['quickPatientLinks'].append({
                        "id": row.PatientID,
                        "name": row.FullName,
                        "age": age # Додаємо вік
                    })
                print(f"Знайдено {len(data['quickPatientLinks'])} пацієнтів для DoctorID {doctor_id_for_user}")
                
            else:
                print(f"Не вдалося знайти DoctorID для EmployeeID {current_user_id_int}. Дані дашборду лікаря будуть порожні.")
        # --- КІНЕЦЬ БЛОКУ ЛІКАРЯ ---

        elif user_role == 'Registrar':
            # ... (код для реєстратора без змін) ...
             cursor.execute("SELECT COUNT(*) FROM dbo.Appointments WHERE CAST(AppointmentDateTime AS DATE) = CAST(GETDATE() AS DATE)")
             total_appts = cursor.fetchone()[0]
             cursor.execute("SELECT COUNT(*) FROM dbo.Appointments WHERE CAST(AppointmentDateTime AS DATE) = CAST(GETDATE() AS DATE) AND Status = 'Completed'")
             checked_in_appts = cursor.fetchone()[0]
             data['scheduleSummary'] = f"{total_appts} appointments today"
             data['totalAppointmentsToday'] = total_appts
             data['checkedInAppointments'] = checked_in_appts

    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ DASHBOARD DATA (DB Query): {ex}")
        data["db_error"] = "Error fetching dashboard details"
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

    return jsonify(data)

@app.route('/api/patients', methods=['GET'])
@jwt_required()
def get_patients():
    # --- Обробка Сортування (код без змін) ---
    sort_by_param = request.args.get('sort_by', 'fullName')
    sort_order_param = request.args.get('sort_order', 'ASC').upper()
    allowed_sort_columns = {
        "patientId": "PatientID", "fullName": "FullName", "dateOfBirth": "DateOfBirth",
        "phoneNumber": "PhoneNumber", "medicalCardNumber": "MedicalCardNumber"
    }
    db_column = allowed_sort_columns.get(sort_by_param, "FullName")
    if sort_order_param not in ['ASC', 'DESC']: sort_order_param = 'ASC'
    # --- Кінець Сортування ---

    # --- Обробка Фільтрації ---
    search_term = request.args.get('search', None)
    dob_from = request.args.get('dob_from', None)
    dob_to = request.args.get('dob_to', None)
    # --- Кінець Фільтрації ---

    patients = []
    conn = get_db_connection()
    cursor = None
    params = [] # Список для параметрів

    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    # Починаємо будувати SQL запит
    sql = """
        SELECT PatientID, FullName, DateOfBirth, PhoneNumber, MedicalCardNumber, Status
        FROM dbo.Patients
        WHERE Status = 'Active'
    """

    # Додаємо умови для фільтрації
    if search_term:
        sql += " AND (FullName LIKE ? OR CAST(PatientID AS VARCHAR(20)) LIKE ? OR MedicalCardNumber LIKE ? OR PhoneNumber LIKE ?) "
        like_pattern = f"%{search_term}%"
        params.extend([like_pattern, like_pattern, like_pattern, like_pattern])

    # Додаємо умови для дати народження
    valid_dob_from = is_valid_date(dob_from)
    if valid_dob_from:
        sql += " AND DateOfBirth >= ? "
        params.append(dob_from) # Додаємо дату до параметрів
        print(f"Застосовано фільтр DateOfBirth >= {dob_from}")

    valid_dob_to = is_valid_date(dob_to)
    if valid_dob_to:
        # Для фільтра "до" включаємо саму дату, тому порівнюємо з початком наступного дня
        # Або просто <=, якщо влаштовує включення самої дати
        sql += " AND DateOfBirth <= ? "
        params.append(dob_to) # Додаємо дату до параметрів
        print(f"Застосовано фільтр DateOfBirth <= {dob_to}")
    # ==== Кінець додавання умов фільтрації ====

    # Додаємо частину ORDER BY
    sql += f" ORDER BY [{db_column}] {sort_order_param}"

    try:
        cursor = conn.cursor()
        print(f"Виконується SQL: {sql}")
        print(f"З параметрами: {params}")
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        # ... (код формування списку patients - без змін) ...
        for row in rows:
            patients.append({
                "patientId": row.PatientID,
                "fullName": row.FullName,
                "dateOfBirth": row.DateOfBirth.strftime('%Y-%m-%d') if row.DateOfBirth else None,
                "phoneNumber": row.PhoneNumber,
                "medicalCardNumber": row.MedicalCardNumber,
                "status": row.Status
            })
        return jsonify(patients)

    except pyodbc.Error as ex:
        # ... (код обробки помилок - без змін) ...
         sqlstate = ex.args[0]
         error_message = str(ex)
         print(f"ПОМИЛКА ОТРИМАННЯ PATIENTS (SQLSTATE: {sqlstate}): {error_message}")
         print(f"SQL Запит: {sql}")
         print(f"Параметри: {params}")
         return jsonify({"message": "Помилка сервера при отриманні списку пацієнтів"}), 500
    except Exception as e:
        print(f"НЕОЧІКУВАНА ПОМИЛКА в get_patients: {e}")
        return jsonify({"message": "Неочікувана помилка сервера"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()      

# НОВИЙ: GET /api/patients/<id> - отримання одного пацієнта
@app.route('/api/patients/<int:patient_id>', methods=['GET'])
@jwt_required() # Доступно всім залогіненим
def get_patient(patient_id):
    conn = get_db_connection(); cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    try:
        cursor = conn.cursor()
        sql = """
            SELECT PatientID, FullName, DateOfBirth, Gender, Address, PhoneNumber, MedicalCardNumber, Status
            FROM dbo.Patients
            WHERE PatientID = ?
        """ # Вибираємо більше полів для редагування
        cursor.execute(sql, (patient_id,))
        patient_record = cursor.fetchone()
        if patient_record:
            patient_data = {
                "patientId": patient_record.PatientID, "fullName": patient_record.FullName,
                "dateOfBirth": patient_record.DateOfBirth.strftime('%Y-%m-%d') if patient_record.DateOfBirth else None,
                "gender": patient_record.Gender, "address": patient_record.Address,
                "phoneNumber": patient_record.PhoneNumber, "medicalCardNumber": patient_record.MedicalCardNumber,
                "status": patient_record.Status
            }
            return jsonify(patient_data)
        else:
            return jsonify({"message": "Пацієнта не знайдено"}), 404
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ PATIENT ID {patient_id}: {ex}")
        return jsonify({"message": "Помилка отримання даних пацієнта"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# НОВИЙ: POST /api/patients - створення пацієнта (Реєстратор, Адмін)
@app.route('/api/patients', methods=['POST'])
@jwt_required()
@check_role('Registrar') # Дозволяємо Реєстратору (і Адміну через логіку декоратора)
def create_patient():
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних"}), 400
    # Перевірка обов'язкових полів (приклад)
    required = ['fullName', 'dateOfBirth']
    if not all(field in data and data[field] for field in required):
        return jsonify({"message": "Відсутні обов'язкові поля: Повне Ім'я, Дата народження"}), 400

    # TODO: Додати валідацію даних (формат дати, тощо)

    conn = get_db_connection(); cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    try:
        cursor = conn.cursor()
        # Перевірка на дублікат за номером карти, якщо він унікальний
        if data.get('medicalCardNumber'):
             cursor.execute("SELECT PatientID FROM dbo.Patients WHERE MedicalCardNumber = ?", (data['medicalCardNumber'],))
             if cursor.fetchone():
                 return jsonify({"message": "Пацієнт з таким номером медичної карти вже існує"}), 409

        sql = """
            INSERT INTO dbo.Patients
            (FullName, DateOfBirth, Gender, Address, PhoneNumber, MedicalCardNumber, Status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        params = (
            data.get('fullName'), data.get('dateOfBirth'), data.get('gender'),
            data.get('address'), data.get('phoneNumber'), data.get('medicalCardNumber'),
            'Active' # Нові пацієнти завжди активні
        )
        cursor.execute(sql, params)
        conn.commit()
        # Можна повернути ID створеного пацієнта
        # cursor.execute("SELECT @@IDENTITY")
        # new_id = cursor.fetchone()[0]
        return jsonify({"message": "Пацієнта успішно створено"}), 201 # Created
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА СТВОРЕННЯ PATIENT: {ex}")
        try: conn.rollback()
        except: pass
        return jsonify({"message": "Помилка сервера при створенні пацієнта"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# НОВИЙ: PUT /api/patients/<id> - оновлення пацієнта (Реєстратор, Адмін)
@app.route('/api/patients/<int:patient_id>', methods=['PUT'])
@jwt_required()
@check_role('Registrar') # Дозволяємо Реєстратору (і Адміну)
def update_patient(patient_id):
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних для оновлення"}), 400

    # TODO: Валідація даних

    conn = get_db_connection(); cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    try:
        cursor = conn.cursor()
        # Перевірка існування пацієнта
        cursor.execute("SELECT PatientID FROM dbo.Patients WHERE PatientID = ?", (patient_id,))
        if not cursor.fetchone():
            return jsonify({"message": "Пацієнта не знайдено"}), 404

        # Перевірка на дублікат номера карти, якщо він змінюється
        if 'medicalCardNumber' in data and data['medicalCardNumber']:
             cursor.execute("SELECT PatientID FROM dbo.Patients WHERE MedicalCardNumber = ? AND PatientID != ?",
                            (data['medicalCardNumber'], patient_id))
             if cursor.fetchone():
                 return jsonify({"message": "Інший пацієнт з таким номером медичної карти вже існує"}), 409

        # Формуємо запит на оновлення тільки переданих полів
        update_fields = []
        update_values = []
        allowed_fields = ['fullName', 'dateOfBirth', 'gender', 'address', 'phoneNumber', 'medicalCardNumber', 'status'] # Додаємо статус
        for field in allowed_fields:
            if field in data:
                # Особлива обробка для статусу - дозволяємо тільки Active/Inactive
                if field == 'status' and data[field] not in ['Active', 'Inactive']:
                    print(f"Спроба встановити невалідний статус '{data[field]}' для пацієнта {patient_id}")
                    continue # Пропускаємо невалідний статус
                update_fields.append(f"{field.capitalize()} = ?") # Використовуємо назви стовпців з БД
                update_values.append(data[field])

        if not update_fields: return jsonify({"message": "Немає полів для оновлення"}), 400

        update_values.append(patient_id) # Додаємо ID для WHERE
        sql = f"UPDATE dbo.Patients SET {', '.join(update_fields)} WHERE PatientID = ?"
        cursor.execute(sql, update_values)
        conn.commit()

        return jsonify({"message": "Дані пацієнта оновлено"}), 200
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОНОВЛЕННЯ PATIENT ID {patient_id}: {ex}")
        try: conn.rollback()
        except: pass
        return jsonify({"message": "Помилка сервера при оновленні пацієнта"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# НОВИЙ: DELETE /api/patients/<id> - "видалення" пацієнта (зміна статусу на Inactive) (Адмін)
@app.route('/api/patients/<int:patient_id>', methods=['DELETE'])
@jwt_required()
@check_role('Admin') # Тільки Адмін може "видаляти"
def deactivate_patient(patient_id):
    conn = get_db_connection(); cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    try:
        cursor = conn.cursor()
        # Перевірка існування пацієнта
        cursor.execute("SELECT Status FROM dbo.Patients WHERE PatientID = ?", (patient_id,))
        result = cursor.fetchone()
        if not result:
            return jsonify({"message": "Пацієнта не знайдено"}), 404
        if result[0] == 'Inactive':
             return jsonify({"message": "Пацієнт вже неактивний"}), 400

        # Змінюємо статус на Inactive
        sql = "UPDATE dbo.Patients SET Status = 'Inactive' WHERE PatientID = ?"
        cursor.execute(sql, (patient_id,))
        conn.commit()

        return jsonify({"message": "Пацієнта деактивовано (встановлено статус Inactive)"}), 200
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ДЕАКТИВАЦІЇ PATIENT ID {patient_id}: {ex}")
        try: conn.rollback()
        except: pass
        return jsonify({"message": "Помилка сервера при деактивації пацієнта"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# ОНОВЛЕНИЙ ЕНДПОІНТ РЕЄСТРАЦІЇ
@app.route('/api/register', methods=['POST'])
def handle_registration_request():
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних"}), 400

    required_fields = ['fullName', 'username', 'email', 'password']
    if not all(field in data and data[field] for field in required_fields): # Перевірка, що поля не порожні
        return jsonify({"message": "Відсутні або порожні обов'язкові поля"}), 400

    full_name = data['fullName']
    username = data['username']
    email = data['email']
    password = data['password']

    # --- Збереження в БД ---
    conn = get_db_connection()
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    cursor = conn.cursor()
    try:
        # 1. Перевірка, чи існує користувач з таким username або email
        cursor.execute("SELECT EmployeeID FROM dbo.Employees WHERE Username = ? OR Email = ?", (username, email))
        existing_user = cursor.fetchone()
        if existing_user:
            cursor.close()
            conn.close()
            return jsonify({"message": "Користувач з таким логіном або email вже існує"}), 409 # 409 Conflict

        # 2. Хешування пароля
        password_hash = generate_password_hash(password)

        # 3. Вставка нового запису зі статусом 'PendingApproval' та роллю 'Pending'
        # За замовчуванням Position може бути 'Unknown' або щось подібне
        sql = """
            INSERT INTO dbo.Employees
            (FullName, Position, PhoneNumber, Email, HireDate, Role, Status, PasswordHash, Username)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        # Встановлюємо 'Unknown' для посади, NULL для телефону/дати найму, роль 'Pending'
        cursor.execute(sql, (
        full_name, 'Unknown', None, email, None, 'Pending', 'PendingApproval', password_hash, username
        ))
        conn.commit() # Підтверджуємо зміни

        print(f"Запит на реєстрацію для {username} збережено в БД.")

        cursor.close()
        conn.close()
        return jsonify({
            "message": "Запит на реєстрацію отримано. Будь ласка, зачекайте на підтвердження адміністратором."
        }), 201

    except pyodbc.Error as ex:
        print(f"ПОМИЛКА РЕЄСТРАЦІЇ В БД: {ex}")
        # Відкат змін у разі помилки
        try: conn.rollback()
        except: pass
        if cursor: cursor.close()
        if conn: conn.close()
        return jsonify({"message": "Помилка сервера під час реєстрації"}), 500


# НОВИЙ ЕНДПОІНТ ЛОГІНУ
@app.route('/api/login', methods=['POST'])
def handle_login():
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних"}), 400

    username_or_email = data.get('username', '').strip() # Додаємо strip про всяк випадок
    password = data.get('password', '').strip()

    if not username_or_email or not password:
        return jsonify({"message": "Потрібно вказати логін/email та пароль"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    cursor = conn.cursor()
    user_data = None
    access_token = None
    try:
        sql = """
            SELECT EmployeeID, FullName, Username, Email, Role, Status, PasswordHash
            FROM dbo.Employees
            WHERE (Username = ? OR Email = ?) AND Status = 'Active'
        """
        cursor.execute(sql, (username_or_email, username_or_email))
        user_record = cursor.fetchone()

        if user_record:
            stored_hash = user_record.PasswordHash
            if stored_hash and check_password_hash(stored_hash, password):
                # Пароль вірний! Формуємо дані користувача
                user_data = {
                    "employeeId": user_record.EmployeeID,
                    "fullName": user_record.FullName,
                    "username": user_record.Username,
                    "email": user_record.Email,
                    "role": user_record.Role
                }
                # --- СТВОРЮЄМО JWT ТОКЕН ---
                # ВАЖЛИВО: Перетворюємо EmployeeID на рядок перед передачею в identity!
                identity_str = str(user_record.EmployeeID)
                access_token = create_access_token(identity=identity_str)
                # --------------------------
                print(f"Успішний вхід для користувача: {user_record.Username}, Роль: {user_record.Role}")
            else:
                 print(f"Невдала спроба входу (невірний пароль) для: {username_or_email}")
        else:
             print(f"Невдала спроба входу (користувача не знайдено або неактивний): {username_or_email}")

        cursor.close()
        conn.close()

        if user_data and access_token:
            # Повертаємо дані користувача ТА згенерований токен
            return jsonify({
                "message": "Вхід успішний",
                "user": user_data,
                "token": access_token # Додано токен у відповідь
            }), 200
        else:
            return jsonify({"message": "Невірне ім'я користувача/email або пароль"}), 401 # Unauthorized

    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ЛОГІНУ В БД: {ex}")
        if cursor: cursor.close()
        if conn: conn.close()
        return jsonify({"message": "Помилка сервера під час входу"}), 500


@app.route('/api/users', methods=['GET'])
@jwt_required()
@check_role('Admin') 
def get_users():

    search_term = request.args.get('search', None)
    roles_filter = request.args.getlist('role') # Отримуємо список ролей з параметрів URL

    users = []
    conn = get_db_connection()
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    cursor = conn.cursor()
    params = []

    # Базовий SQL
    sql = """
        SELECT EmployeeID, FullName, Username, Email, Role, Status
        FROM dbo.Employees
        WHERE 1=1
    """

    # Додаємо фільтр пошуку
    if search_term:
        sql += " AND (FullName LIKE ? OR Username LIKE ? OR Email LIKE ?)"
        like_pattern = f"%{search_term}%"
        params.extend([like_pattern, like_pattern, like_pattern])

    # Додаємо фільтр за ролями, якщо він є
    if roles_filter:
        # Перевіряємо, чи ролі валідні (опціонально, але бажано)
        allowed_roles = ['Doctor', 'Registrar', 'Nurse', 'Admin', 'Pending'] # Додайте всі можливі
        valid_roles = [role for role in roles_filter if role in allowed_roles]
        if valid_roles:
            # Створюємо плейсхолдери для кожної ролі (?, ?, ...)
            role_placeholders = ', '.join(['?'] * len(valid_roles))
            sql += f" AND Role IN ({role_placeholders})"
            params.extend(valid_roles) # Додаємо ролі до параметрів

    sql += " ORDER BY FullName"


    try:
        
        print(f"Executing SQL (get_users): {sql}")
        print(f"With params: {params}")
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        for row in rows:
            users.append({
                "employeeId": row.EmployeeID,
                "fullName": row.FullName,
                "username": row.Username,
                "email": row.Email,
                "role": row.Role,
                "status": row.Status
            })
        cursor.close()
        conn.close()
        return jsonify(users)
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ USERS: {ex}")
        if cursor: cursor.close()
        if conn: conn.close()
        return jsonify({"message": "Помилка отримання списку користувачів"}), 500

@app.route('/api/users/<int:employee_id>', methods=['GET'])
# @jwt_required()
@check_role('Admin')
def get_user(employee_id):
    # ... (код функції без змін) ...
     conn = get_db_connection()
     if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
     cursor = conn.cursor()
     try:
         sql = "SELECT EmployeeID, FullName, Username, Email, Role, Status FROM dbo.Employees WHERE EmployeeID = ?"
         cursor.execute(sql, (employee_id,))
         user_record = cursor.fetchone()
         cursor.close()
         conn.close()
         if user_record:
             user_data = {
                 "employeeId": user_record.EmployeeID, "fullName": user_record.FullName,
                 "username": user_record.Username, "email": user_record.Email,
                 "role": user_record.Role, "status": user_record.Status
             }
             return jsonify(user_data)
         else:
             return jsonify({"message": "Користувача не знайдено"}), 404
     except pyodbc.Error as ex:
         print(f"ПОМИЛКА ОТРИМАННЯ USER ID {employee_id}: {ex}")
         if cursor: cursor.close()
         if conn: conn.close()
         return jsonify({"message": "Помилка отримання даних користувача"}), 500

@app.route('/api/users', methods=['POST'])
# @jwt_required()
@check_role('Admin')
def create_user():
    # ... (код функції без змін) ...
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних"}), 400
    required_fields = ['fullName', 'username', 'email', 'password', 'role', 'status']
    if not all(field in data and data[field] for field in required_fields):
        return jsonify({"message": "Відсутні або порожні обов'язкові поля"}), 400
    full_name = data['fullName']
    username = data['username']
    email = data['email']
    password = data['password']
    role = data['role']
    status = data['status']
    conn = get_db_connection()
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT EmployeeID FROM dbo.Employees WHERE Username = ? OR Email = ?", (username, email))
        if cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({"message": "Користувач з таким логіном або email вже існує"}), 409
        password_hash = generate_password_hash(password)
        sql = """
            INSERT INTO dbo.Employees (FullName, Username, Email, PasswordHash, Role, Status, Position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        cursor.execute(sql, (full_name, username, email, password_hash, role, status, 'Unknown'))
        conn.commit()
        print(f"Створено нового користувача: {username}, Роль: {role}, Статус: {status}")
        cursor.close()
        conn.close()
        return jsonify({"message": "Користувача успішно створено"}), 201
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА СТВОРЕННЯ USER: {ex}")
        try: conn.rollback()
        except: pass
        if cursor: cursor.close()
        if conn: conn.close()
        return jsonify({"message": "Помилка сервера під час створення користувача"}), 500


@app.route('/api/users/<int:employee_id>', methods=['PUT'])
# @jwt_required()
@check_role('Admin')
def update_user(employee_id):
    # ... (код функції без змін) ...
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних для оновлення"}), 400
    conn = get_db_connection()
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT EmployeeID FROM dbo.Employees WHERE EmployeeID = ?", (employee_id,))
        if not cursor.fetchone():
            cursor.close(); conn.close()
            return jsonify({"message": "Користувача не знайдено"}), 404
        if 'username' in data or 'email' in data:
             check_username = data.get('username')
             check_email = data.get('email')
             cursor.execute("SELECT EmployeeID FROM dbo.Employees WHERE (Username = ? OR Email = ?) AND EmployeeID != ?",
                            (check_username, check_email, employee_id))
             if cursor.fetchone():
                 cursor.close(); conn.close()
                 return jsonify({"message": "Новий логін або email вже використовується іншим користувачем"}), 409

        update_fields = []
        update_values = []
        if 'fullName' in data: update_fields.append("FullName = ?"); update_values.append(data['fullName'])
        if 'username' in data: update_fields.append("Username = ?"); update_values.append(data['username'])
        if 'email' in data: update_fields.append("Email = ?"); update_values.append(data['email'])
        if 'role' in data: update_fields.append("Role = ?"); update_values.append(data['role'])
        if 'status' in data: update_fields.append("Status = ?"); update_values.append(data['status'])
        if 'password' in data and data['password']:
            password_hash = generate_password_hash(data['password'])
            update_fields.append("PasswordHash = ?"); update_values.append(password_hash)

        if not update_fields:
            cursor.close(); conn.close()
            return jsonify({"message": "Немає полів для оновлення"}), 400
        update_values.append(employee_id)
        sql = f"UPDATE dbo.Employees SET {', '.join(update_fields)} WHERE EmployeeID = ?"
        cursor.execute(sql, update_values)
        conn.commit()
        print(f"Оновлено дані для EmployeeID {employee_id}")
        cursor.close()
        conn.close()
        return jsonify({"message": "Дані користувача успішно оновлено"}), 200
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОНОВЛЕННЯ USER ID {employee_id}: {ex}")
        try: conn.rollback()
        except: pass
        if cursor: cursor.close()
        if conn: conn.close()
        return jsonify({"message": "Помилка сервера під час оновлення користувача"}), 500


# --- API ДЛЯ ПРЕПАРАТІВ (MEDICATIONS) ---
@app.route('/api/medications', methods=['GET'])
@jwt_required() # Захищаємо ендпоінт, доступно для всіх залогінених користувачів
def get_medications():
    """
    Отримує список препаратів з можливістю пошуку.
    Параметр запиту: ?search=...
    """
    search_term = request.args.get('search', None)
    medications = []
    conn = get_db_connection()
    cursor = None
    params = []

    if not conn:
        return jsonify({"message": "Помилка підключення до бази даних"}), 500

    # Базовий SQL запит
    sql = """
        SELECT MedicationID, MedicationName, ActiveSubstance, DosageForm, Manufacturer
        FROM dbo.Medications
    """

    # Додаємо умову пошуку, якщо є параметр 'search'
    if search_term:
        sql += " WHERE MedicationName LIKE ? OR ActiveSubstance LIKE ? OR Manufacturer LIKE ?"
        like_pattern = f"%{search_term}%"
        params.extend([like_pattern, like_pattern, like_pattern])
        print(f"Searching medications with term: {search_term}")

    # Додаємо сортування за назвою препарату
    sql += " ORDER BY MedicationName"

    try:
        cursor = conn.cursor()
        print(f"Executing SQL: {sql}")
        print(f"With params: {params}")
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # Формуємо список препаратів
        for row in rows:
            medications.append({
                "medicationId": row.MedicationID,
                "medicationName": row.MedicationName,
                "activeSubstance": row.ActiveSubstance,
                "dosageForm": row.DosageForm,
                "manufacturer": row.Manufacturer
                # Можна додати 'Instruction', якщо потрібно, але воно може бути великим
            })

        print(f"Found {len(medications)} medications.")
        return jsonify(medications)

    except pyodbc.Error as ex:
        sqlstate = ex.args[0]
        print(f"ПОМИЛКА ОТРИМАННЯ MEDICATIONS (SQLSTATE: {sqlstate}): {ex}")
        print(f"SQL Query: {sql}")
        print(f"Params: {params}")
        return jsonify({"message": "Помилка сервера при отриманні списку препаратів"}), 500
    except Exception as e:
        print(f"НЕОЧІКУВАНА ПОМИЛКА в get_medications: {e}")
        return jsonify({"message": "Неочікувана помилка сервера"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# --- API ДЛЯ ДОВІДНИКА ПРОЦЕДУР (MedicalProcedures) ---
@app.route('/api/procedures', methods=['GET'])
@jwt_required() # Доступно всім авторизованим (лікарі, медсестри для вибору)
def get_procedure_directory():
    """Отримує список всіх доступних медичних процедур."""
    procedures = []
    conn = get_db_connection()
    cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    sql = "SELECT ProcedureID, ProcedureName, Description, EstimatedDurationMinutes, Cost FROM dbo.MedicalProcedures ORDER BY ProcedureName"
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        for row in rows:
            procedures.append({
                "procedureId": row.ProcedureID,
                "procedureName": row.ProcedureName,
                "description": row.Description,
                "estimatedDurationMinutes": row.EstimatedDurationMinutes,
                "cost": float(row.Cost) if row.Cost is not None else None # Конвертуємо Decimal у float
            })
        return jsonify(procedures)
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ PROCEDURE DIRECTORY: {ex}")
        return jsonify({"message": "Помилка сервера при отриманні довідника процедур"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# --- API ДЛЯ ПРИЗНАЧЕНИХ ПРОЦЕДУР (AssignedProcedures) ---

@app.route('/api/assigned_procedures', methods=['GET'])
@jwt_required() # Доступно лікарям, медсестрам, можливо реєстраторам
def get_assigned_procedures():
    """
    Отримує список призначених процедур з фільтрами.
    Параметри: ?patient_id=<id>&status=<status>&procedure_id=<id>&executor_id=<id>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    assigned_procedures = []
    conn = get_db_connection()
    cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    # Отримуємо параметри фільтрації
    patient_id = request.args.get('patient_id', type=int)
    status = request.args.get('status')
    procedure_id = request.args.get('procedure_id', type=int)
    executor_id = request.args.get('executor_id', type=int)
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')

    # Базовий SQL запит з JOIN для отримання імен
    sql = """
        SELECT
            ap.AssignmentID, ap.PatientID, p.FullName as PatientName,
            ap.ProcedureID, mp.ProcedureName,
            ap.ExecutorID, e.FullName as ExecutorName,
            ap.AppointmentID,
            ap.AssignmentDateTime, ap.ExecutionDateTime, ap.ExecutionStatus, ap.Result
        FROM dbo.AssignedProcedures ap
        JOIN dbo.Patients p ON ap.PatientID = p.PatientID
        JOIN dbo.MedicalProcedures mp ON ap.ProcedureID = mp.ProcedureID
        LEFT JOIN dbo.Employees e ON ap.ExecutorID = e.EmployeeID
        WHERE 1=1
    """
    params = []

    # Додаємо фільтри до запиту
    if patient_id is not None:
        sql += " AND ap.PatientID = ?"
        params.append(patient_id)
    if status:
        # Перевірка на валідність статусу (можна взяти з CHECK constraint)
        valid_statuses = ['Assigned', 'Completed', 'Cancelled', 'In Progress']
        if status in valid_statuses:
            sql += " AND ap.ExecutionStatus = ?"
            params.append(status)
        else:
             return jsonify({"message": f"Невалідний статус '{status}'. Допустимі: {', '.join(valid_statuses)}"}), 400
    if procedure_id is not None:
        sql += " AND ap.ProcedureID = ?"
        params.append(procedure_id)
    if executor_id is not None:
        sql += " AND ap.ExecutorID = ?"
        params.append(executor_id)
    if is_valid_date(date_from_str):
        sql += " AND CAST(ap.AssignmentDateTime AS DATE) >= ?"
        params.append(date_from_str)
    if is_valid_date(date_to_str):
        sql += " AND CAST(ap.AssignmentDateTime AS DATE) <= ?"
        params.append(date_to_str)

    sql += " ORDER BY ap.AssignmentDateTime DESC" # Сортування за замовчуванням

    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        for row in rows:
            assigned_procedures.append({
                "assignmentId": row.AssignmentID,
                "patientId": row.PatientID,
                "patientName": row.PatientName,
                "procedureId": row.ProcedureID,
                "procedureName": row.ProcedureName,
                "executorId": row.ExecutorID,
                "executorName": row.ExecutorName,
                "appointmentId": row.AppointmentID,
                "assignmentDateTime": row.AssignmentDateTime.strftime('%Y-%m-%dT%H:%M:%S') if row.AssignmentDateTime else None,
                "executionDateTime": row.ExecutionDateTime.strftime('%Y-%m-%dT%H:%M:%S') if row.ExecutionDateTime else None,
                "executionStatus": row.ExecutionStatus,
                "result": row.Result
            })
        return jsonify(assigned_procedures)
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ ASSIGNED PROCEDURES: {ex}")
        return jsonify({"message": "Помилка сервера при отриманні призначених процедур"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/assigned_procedures', methods=['POST'])
@jwt_required()
@check_role('Doctor') # Тільки лікар (або Адмін) може призначати процедури
def assign_procedure():
    """Призначає процедуру пацієнту."""
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних"}), 400

    # Перевірка обов'язкових полів
    required_fields = ['patientId', 'procedureId', 'appointmentId'] # Можливо, appointmentId не завжди обов'язковий?
    if not all(field in data for field in required_fields):
        return jsonify({"message": f"Відсутні обов'язкові поля: {', '.join(required_fields)}"}), 400

    patient_id = data.get('patientId')
    procedure_id = data.get('procedureId')
    appointment_id = data.get('appointmentId')
    executor_id = data.get('executorId') # Необов'язково

    conn = get_db_connection()
    cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    # Додаткові перевірки (існування пацієнта, процедури, прийому, виконавця) можна додати тут

    sql = """
        INSERT INTO dbo.AssignedProcedures
        (PatientID, ProcedureID, AppointmentID, ExecutorID, AssignmentDateTime, ExecutionStatus)
        VALUES (?, ?, ?, ?, ?, ?)
    """
    # Використовуємо поточний час для AssignmentDateTime та статус 'Assigned'
    assignment_time = datetime.datetime.now()
    initial_status = 'Assigned'
    params = (patient_id, procedure_id, appointment_id, executor_id, assignment_time, initial_status)

    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        conn.commit()
        # Можна повернути ID створеного запису
        # cursor.execute("SELECT @@IDENTITY")
        # new_id = cursor.fetchone()[0]
        return jsonify({"message": "Процедуру успішно призначено"}), 201 # Created
    except pyodbc.IntegrityError as ie:
        # Можлива помилка зовнішнього ключа (якщо patientId, procedureId і т.д. не існують)
        print(f"ПОМИЛКА ЦІЛІСНОСТІ ПРИ ПРИЗНАЧЕННІ ПРОЦЕДУРИ: {ie}")
        try: conn.rollback()
        except: pass
        return jsonify({"message": "Помилка даних: Можливо, вказаний невірний ID пацієнта, процедури або прийому."}), 400
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ПРИЗНАЧЕННЯ ПРОЦЕДУРИ В БД: {ex}")
        try: conn.rollback()
        except: pass
        return jsonify({"message": "Помилка сервера під час призначення процедури"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/assigned_procedures/<int:assignment_id>', methods=['PUT'])
@jwt_required()
@check_role('Nurse') # Медсестра або Лікар можуть оновлювати статус/результат
def update_assigned_procedure(assignment_id):
    """Оновлює статус або результат виконання призначеної процедури."""
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних для оновлення"}), 400

    # Отримуємо поточного користувача (можливо, для запису виконавця)
    current_user_id_str = get_jwt_identity()
    try:
        current_user_id_int = int(current_user_id_str)
    except (ValueError, TypeError):
         return jsonify({"message": "Невалідний формат ID користувача в токені"}), 422

    new_status = data.get('executionStatus')
    result = data.get('result') # Результат/опис виконання

    if not new_status and result is None: # Має бути хоча б щось для оновлення
         return jsonify({"message": "Необхідно передати новий статус ('executionStatus') або результат ('result')"}), 400

    conn = get_db_connection()
    cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    update_fields = []
    update_values = []

    # Додаємо поля для оновлення
    if new_status:
         # Перевірка на валідність статусу
        valid_statuses = ['Assigned', 'Completed', 'Cancelled', 'In Progress']
        if new_status not in valid_statuses:
             return jsonify({"message": f"Невалідний статус '{new_status}'. Допустимі: {', '.join(valid_statuses)}"}), 400
        update_fields.append("ExecutionStatus = ?")
        update_values.append(new_status)
        # Якщо статус змінюється на 'Completed' або 'In Progress', записуємо виконавця та час
        if new_status in ['Completed', 'In Progress']:
             update_fields.append("ExecutionDateTime = ?")
             update_values.append(datetime.datetime.now())
             # Записуємо поточного користувача як виконавця, якщо він ще не вказаний
             update_fields.append("ExecutorID = ISNULL(ExecutorID, ?)") # Оновлюємо ExecutorID, тільки якщо він NULL
             update_values.append(current_user_id_int)


    if result is not None: # Дозволяємо передавати порожній рядок для очищення результату
        update_fields.append("Result = ?")
        update_values.append(result)

    if not update_fields: # Малоймовірно після попередньої перевірки, але про всяк випадок
         return jsonify({"message": "Немає даних для оновлення"}), 400

    update_values.append(assignment_id) # Додаємо ID для WHERE умови

    sql = f"UPDATE dbo.AssignedProcedures SET {', '.join(update_fields)} WHERE AssignmentID = ?"

    try:
        cursor = conn.cursor()
        cursor.execute("SELECT AssignmentID FROM dbo.AssignedProcedures WHERE AssignmentID = ?", (assignment_id,))
        if not cursor.fetchone():
             return jsonify({"message": "Призначення процедури не знайдено"}), 404

        print(f"Updating AssignedProcedure ID {assignment_id}. SQL: {sql}")
        print(f"Params: {update_values}")
        cursor.execute(sql, update_values)
        conn.commit()

        if cursor.rowcount == 0:
             # Можливо, запис був змінений або видалений іншим процесом
             return jsonify({"message": "Не вдалося оновити запис. Можливо, його було змінено."}), 409 # Conflict
        return jsonify({"message": "Статус/результат процедури оновлено"}), 200
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОНОВЛЕННЯ ASSIGNED PROCEDURE ID {assignment_id}: {ex}")
        try: conn.rollback()
        except: pass
        return jsonify({"message": "Помилка сервера під час оновлення процедури"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# --- API ДЛЯ ПРИЙОМІВ (Appointments) ---

@app.route('/api/appointments', methods=['GET'])
@jwt_required()
def get_appointments():
    """
    Отримує список прийомів з фільтрами.
    Параметри: ?patient_id=<id>&doctor_id=<id>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD&status=<status>
    """
    appointments = []
    conn = get_db_connection()
    cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    # Отримуємо параметри фільтрації
    patient_id = request.args.get('patient_id', type=int)
    doctor_id = request.args.get('doctor_id', type=int) # Важливо: це DoctorID з таблиці Doctors, не EmployeeID
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')
    status = request.args.get('status')

    # Базовий SQL запит з JOIN для отримання імен
    sql = """
        SELECT
            a.AppointmentID, a.AppointmentDateTime, a.DurationMinutes, a.Status,
            a.ReasonForVisit, a.DoctorConclusions,
            a.PatientID, p.FullName as PatientName,
            a.DoctorID, d_emp.FullName as DoctorName, d.Specialty as DoctorSpecialty
        FROM dbo.Appointments a
        JOIN dbo.Patients p ON a.PatientID = p.PatientID
        JOIN dbo.Doctors d ON a.DoctorID = d.DoctorID
        JOIN dbo.Employees d_emp ON d.EmployeeID = d_emp.EmployeeID
        WHERE 1=1
    """
    params = []

    # Додаємо фільтри
    if patient_id is not None:
        sql += " AND a.PatientID = ?"
        params.append(patient_id)
    if doctor_id is not None:
        sql += " AND a.DoctorID = ?" # Фільтр по DoctorID з таблиці Doctors
        params.append(doctor_id)
    if is_valid_date(date_from_str):
        sql += " AND CAST(a.AppointmentDateTime AS DATE) >= ?"
        params.append(date_from_str)
    if is_valid_date(date_to_str):
        sql += " AND CAST(a.AppointmentDateTime AS DATE) <= ?"
        params.append(date_to_str)
    if status:
        valid_statuses = ['Scheduled', 'Completed', 'Cancelled by Patient', 'Cancelled by Doctor', 'No Show']
        if status in valid_statuses:
            sql += " AND a.Status = ?"
            params.append(status)
        else:
             return jsonify({"message": f"Невалідний статус '{status}'. Допустимі: {', '.join(valid_statuses)}"}), 400

    sql += " ORDER BY a.AppointmentDateTime ASC" # Сортування за датою/часом

    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        for row in rows:
            appointments.append({
                "appointmentId": row.AppointmentID,
                "appointmentDateTime": row.AppointmentDateTime.strftime('%Y-%m-%dT%H:%M:%S') if row.AppointmentDateTime else None,
                "durationMinutes": row.DurationMinutes,
                "status": row.Status,
                "reasonForVisit": row.ReasonForVisit,
                "doctorConclusions": row.DoctorConclusions,
                "patientId": row.PatientID,
                "patientName": row.PatientName,
                "doctorId": row.DoctorID, # DoctorID з таблиці Doctors
                "doctorName": row.DoctorName,
                "doctorSpecialty": row.DoctorSpecialty
            })
        return jsonify(appointments)
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ APPOINTMENTS: {ex}")
        return jsonify({"message": "Помилка сервера при отриманні списку прийомів"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/appointments/<int:appointment_id>', methods=['GET'])
@jwt_required()
# @check_role('Doctor', 'Registrar', 'Admin', 'Nurse') # Доступ до деталей
def get_appointment_details(appointment_id):
    """Отримує деталі одного прийому."""
    conn = get_db_connection(); cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    sql = """
        SELECT
            a.AppointmentID, a.AppointmentDateTime, a.DurationMinutes, a.Status,
            a.ReasonForVisit, a.DoctorConclusions,
            a.PatientID, p.FullName as PatientName, p.DateOfBirth as PatientDOB, p.PhoneNumber as PatientPhone,
            a.DoctorID, d_emp.FullName as DoctorName, d.Specialty as DoctorSpecialty, d.OfficeNumber as DoctorOffice
        FROM dbo.Appointments a
        JOIN dbo.Patients p ON a.PatientID = p.PatientID
        JOIN dbo.Doctors d ON a.DoctorID = d.DoctorID
        JOIN dbo.Employees d_emp ON d.EmployeeID = d_emp.EmployeeID
        WHERE a.AppointmentID = ?
    """
    try:
        cursor = conn.cursor()
        cursor.execute(sql, (appointment_id,))
        row = cursor.fetchone()
        if row:
            appointment_details = {
                "appointmentId": row.AppointmentID,
                "appointmentDateTime": row.AppointmentDateTime.strftime('%Y-%m-%dT%H:%M:%S') if row.AppointmentDateTime else None,
                "durationMinutes": row.DurationMinutes,
                "status": row.Status,
                "reasonForVisit": row.ReasonForVisit,
                "doctorConclusions": row.DoctorConclusions,
                "patientId": row.PatientID,
                "patientName": row.PatientName,
                "patientDOB": row.PatientDOB.strftime('%Y-%m-%d') if row.PatientDOB else None,
                "patientPhone": row.PatientPhone,
                "doctorId": row.DoctorID,
                "doctorName": row.DoctorName,
                "doctorSpecialty": row.DoctorSpecialty,
                "doctorOffice": row.DoctorOffice
            }
            return jsonify(appointment_details)
        else:
            return jsonify({"message": "Прийом не знайдено"}), 404
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ APPOINTMENT DETAILS ID {appointment_id}: {ex}")
        return jsonify({"message": "Помилка сервера при отриманні деталей прийому"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/appointments', methods=['POST'])
@jwt_required()
@check_role('Registrar') # Хто може створювати прийоми
def create_appointment():
    """Створює новий запис на прийом."""
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних"}), 400

    required_fields = ['patientId', 'doctorId', 'appointmentDateTime']
    if not all(field in data for field in required_fields):
        return jsonify({"message": f"Відсутні обов'язкові поля: {', '.join(required_fields)}"}), 400

    patient_id = data.get('patientId')
    doctor_id = data.get('doctorId') # Має бути DoctorID з таблиці Doctors
    datetime_str = data.get('appointmentDateTime')
    duration = data.get('durationMinutes', 30) # Тривалість за замовчуванням 30 хв
    reason = data.get('reasonForVisit')
    initial_status = 'Scheduled'

    # Валідація дати/часу
    try:
        appointment_dt = datetime.datetime.fromisoformat(datetime_str)
        if appointment_dt <= datetime.datetime.now():
             return jsonify({"message": "Неможливо створити прийом на минулий час."}), 400
    except ValueError:
        return jsonify({"message": "Невірний формат дати/часу. Очікується ISO формат (YYYY-MM-DDTHH:MM:SS)."}), 400

    # TODO: Додати перевірку на перетин прийомів для лікаря/пацієнта
    # TODO: Перевірити існування пацієнта та лікаря (DoctorID)

    conn = get_db_connection(); cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    sql = """
        INSERT INTO dbo.Appointments
        (PatientID, DoctorID, AppointmentDateTime, DurationMinutes, Status, ReasonForVisit)
        VALUES (?, ?, ?, ?, ?, ?)
    """
    params = (patient_id, doctor_id, appointment_dt, duration, initial_status, reason)

    try:
        cursor = conn.cursor()
        # Перевірка існування пацієнта
        cursor.execute("SELECT PatientID FROM dbo.Patients WHERE PatientID = ?", (patient_id,))
        if not cursor.fetchone():
             return jsonify({"message": f"Пацієнт з ID {patient_id} не знайдений."}), 404
        # Перевірка існування лікаря
        cursor.execute("SELECT DoctorID FROM dbo.Doctors WHERE DoctorID = ?", (doctor_id,))
        if not cursor.fetchone():
             return jsonify({"message": f"Лікар з ID {doctor_id} не знайдений."}), 404

        # --- Додаткова перевірка на перетин ---
        # Розраховуємо час закінчення прийому
        end_dt = appointment_dt + datetime.timedelta(minutes=duration)
        # Шукаємо інші прийоми для цього лікаря, що перетинаються в часі
        check_overlap_sql = """
            SELECT AppointmentID FROM dbo.Appointments
            WHERE DoctorID = ? AND Status NOT IN ('Cancelled by Patient', 'Cancelled by Doctor', 'No Show')
            AND (
                -- Новий прийом починається під час існуючого
                (? >= AppointmentDateTime AND ? < DATEADD(minute, ISNULL(DurationMinutes, 30), AppointmentDateTime))
                OR
                -- Новий прийом закінчується під час існуючого
                (DATEADD(minute, ?, AppointmentDateTime) > ? AND DATEADD(minute, ?, AppointmentDateTime) <= DATEADD(minute, ISNULL(DurationMinutes, 30), AppointmentDateTime))
                OR
                -- Новий прийом повністю охоплює існуючий
                (? <= AppointmentDateTime AND DATEADD(minute, ?, AppointmentDateTime) >= DATEADD(minute, ISNULL(DurationMinutes, 30), AppointmentDateTime))
            )
        """
        cursor.execute(check_overlap_sql, (doctor_id, appointment_dt, appointment_dt, duration, appointment_dt, duration, appointment_dt, duration))
        overlapping_appointment = cursor.fetchone()
        if overlapping_appointment:
             return jsonify({"message": f"Час з {appointment_dt.strftime('%H:%M')} до {end_dt.strftime('%H:%M')} вже зайнятий для цього лікаря."}), 409 # Conflict


        # Якщо перевірки пройдені, вставляємо запис
        cursor.execute(sql, params)
        conn.commit()
        # cursor.execute("SELECT @@IDENTITY") # Отримати ID створеного запису
        # new_id = cursor.fetchone()[0]
        return jsonify({"message": "Прийом успішно створено"}), 201

    except pyodbc.Error as ex:
        print(f"ПОМИЛКА СТВОРЕННЯ APPOINTMENT: {ex}")
        try: conn.rollback()
        except: pass
        return jsonify({"message": "Помилка сервера під час створення прийому"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
@jwt_required()
@check_role('Registrar', 'Doctor', 'Admin')
def update_appointment(appointment_id):
    """Оновлює існуючий прийом (статус, висновки, час тощо)."""
    data = request.get_json()
    if not data: return jsonify({"message": "Немає даних для оновлення"}), 400

    conn = get_db_connection(); cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    # Отримуємо поточного користувача та його роль для перевірки прав
    current_user_id_str = get_jwt_identity()
    current_user_role = 'Unknown'
    cursor = conn.cursor() # Потрібен курсор для отримання ролі
    try:
        user_id_int = int(current_user_id_str)
        cursor.execute("SELECT Role FROM dbo.Employees WHERE EmployeeID = ?", (user_id_int,))
        role_result = cursor.fetchone()
        if role_result: current_user_role = role_result[0]
    except (ValueError, TypeError, pyodbc.Error) as e:
         print(f"Помилка отримання ролі користувача: {e}")
         # Не перериваємо, але роль буде 'Unknown'
    finally:
        if cursor: cursor.close() # Закриваємо цей курсор


    # Перевіряємо існування прийому
    conn = get_db_connection(); cursor = None # Перевідкриваємо з'єднання/курсор
    if not conn: return jsonify({"message": "Помилка підключення до БД для оновлення"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT Status, DoctorID FROM dbo.Appointments WHERE AppointmentID = ?", (appointment_id,))
        appointment_record = cursor.fetchone()
        if not appointment_record:
             return jsonify({"message": "Прийом не знайдено"}), 404
        current_status = appointment_record.Status
        appointment_doctor_id = appointment_record.DoctorID

        update_fields = []
        update_values = []

        # --- Оновлення полів з перевіркою прав ---

        # Статус (може міняти Реєстратор, Адмін, Лікар)
        if 'status' in data:
            new_status = data['status']
            valid_statuses = ['Scheduled', 'Completed', 'Cancelled by Patient', 'Cancelled by Doctor', 'No Show']
            if new_status not in valid_statuses:
                 return jsonify({"message": f"Невалідний статус '{new_status}'"}), 400
             # Лікар може перевести тільки в 'Completed' або 'No Show' (з Scheduled/Confirmed)?? Або скасувати свій?
             # Реєстратор/Адмін може скасовувати ('Cancelled by...')
             # Поки що дозволяємо всім ролям з декоратора міняти на будь-який валідний статус
            update_fields.append("Status = ?")
            update_values.append(new_status)

        # Висновки лікаря (тільки Лікар, і тільки для свого прийому)
        if 'doctorConclusions' in data:
            if current_user_role != 'Doctor' and current_user_role != 'Admin': # Адмін теж може
                return jsonify({"message": "Тільки лікар або адміністратор може додавати висновки."}), 403
            # TODO: Перевірити, чи ID лікаря з токена співпадає з DoctorID прийому (потрібно отримати DoctorID з EmployeeID)
            update_fields.append("DoctorConclusions = ?")
            update_values.append(data['doctorConclusions'])

        # Дата/час (Реєстратор, Адмін) - перенесення прийому
        if 'appointmentDateTime' in data:
            if current_user_role not in ['Registrar', 'Admin']:
                return jsonify({"message": "Тільки реєстратор або адміністратор може переносити прийом."}), 403
            try:
                new_datetime = datetime.datetime.fromisoformat(data['appointmentDateTime'])
                if new_datetime <= datetime.datetime.now():
                     return jsonify({"message": "Неможливо перенести прийом на минулий час."}), 400
                 # TODO: Перевірка на перетин часу при перенесенні
                update_fields.append("AppointmentDateTime = ?")
                update_values.append(new_datetime)
            except ValueError:
                return jsonify({"message": "Невірний формат дати/часу для перенесення."}), 400

        # Тривалість (Реєстратор, Адмін)
        if 'durationMinutes' in data:
            if current_user_role not in ['Registrar', 'Admin']:
                 return jsonify({"message": "Тільки реєстратор або адміністратор може змінювати тривалість."}), 403
            try:
                 duration = int(data['durationMinutes'])
                 if duration <= 0: return jsonify({"message": "Тривалість має бути позитивним числом."}), 400
                 update_fields.append("DurationMinutes = ?")
                 update_values.append(duration)
                 # TODO: Перевірка на перетин часу при зміні тривалості
            except (ValueError, TypeError):
                 return jsonify({"message": "Невірний формат тривалості."}), 400

        # --- Кінець оновлення полів ---

        if not update_fields:
            return jsonify({"message": "Немає дозволених полів для оновлення у вашому запиті."}), 400

        update_values.append(appointment_id) # ID для WHERE
        sql = f"UPDATE dbo.Appointments SET {', '.join(update_fields)} WHERE AppointmentID = ?"

        print(f"Updating Appointment ID {appointment_id}. SQL: {sql}")
        print(f"Params: {update_values}")
        cursor.execute(sql, update_values)
        conn.commit()

        return jsonify({"message": "Прийом успішно оновлено"}), 200

    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОНОВЛЕННЯ APPOINTMENT ID {appointment_id}: {ex}")
        try: conn.rollback()
        except: pass
        return jsonify({"message": "Помилка сервера під час оновлення прийому"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()



@app.route('/api/appointments/check_availability', methods=['GET'])
@jwt_required() # Доступно тим, хто створює прийоми
@check_role('Registrar', 'Admin')
def check_appointment_availability():
    """
    Перевіряє, чи вільний певний час для запису до лікаря.
    Параметри: ?doctor_id=<id>&datetime=<iso_datetime_str>&duration=<minutes>[&ignore_appointment_id=<id>]
    """
    doctor_id = request.args.get('doctor_id', type=int)
    datetime_str = request.args.get('datetime')
    duration_str = request.args.get('duration')
    ignore_appointment_id = request.args.get('ignore_appointment_id', type=int) # Для режиму редагування

    # Валідація вхідних даних
    if not all([doctor_id, datetime_str, duration_str]):
        return jsonify({"message": "Необхідні параметри: doctor_id, datetime, duration"}), 400

    try:
        start_dt = datetime.datetime.fromisoformat(datetime_str)
        duration = int(duration_str)
        if duration <= 0: raise ValueError("Duration must be positive")
    except (ValueError, TypeError):
        return jsonify({"message": "Невірний формат дати/часу або тривалості"}), 400

    conn = get_db_connection(); cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    try:
        cursor = conn.cursor()
        end_dt = start_dt + datetime.timedelta(minutes=duration)

        # Використовуємо той самий запит для перевірки перетину, що й у create_appointment
        # Додаємо умову, щоб ігнорувати поточний редагований прийом
        check_overlap_sql = """
            SELECT AppointmentID FROM dbo.Appointments
            WHERE DoctorID = ? AND Status NOT IN ('Cancelled by Patient', 'Cancelled by Doctor', 'No Show')
            AND (? IS NULL OR AppointmentID != ?) -- Ігноруємо поточний прийом при редагуванні
            AND (
                (? >= AppointmentDateTime AND ? < DATEADD(minute, ISNULL(DurationMinutes, 30), AppointmentDateTime)) OR
                (DATEADD(minute, ?, AppointmentDateTime) > ? AND DATEADD(minute, ?, AppointmentDateTime) <= DATEADD(minute, ISNULL(DurationMinutes, 30), AppointmentDateTime)) OR
                (? <= AppointmentDateTime AND DATEADD(minute, ?, AppointmentDateTime) >= DATEADD(minute, ISNULL(DurationMinutes, 30), AppointmentDateTime))
            )
        """
        params = (
            doctor_id,
            ignore_appointment_id, ignore_appointment_id, # Передаємо двічі для SQL Server
            start_dt, start_dt,
            duration, start_dt, duration,
            start_dt, duration
        )
        cursor.execute(check_overlap_sql, params)
        overlapping_appointment = cursor.fetchone()

        if overlapping_appointment:
            # Час зайнятий
            return jsonify({"available": False, "message": f"Час з {start_dt.strftime('%H:%M')} до {end_dt.strftime('%H:%M')} вже зайнятий для цього лікаря."}), 200 # OK, але зайнято
        else:
            return jsonify({"available": True, "message": "Час доступний."}), 200 # OK, вільно

    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ПЕРЕВІРКИ ДОСТУПНОСТІ: {ex}")
        return jsonify({"message": "Помилка сервера під час перевірки доступності"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/doctors_list', methods=['GET'])
@jwt_required() # Доступний всім, хто може створювати/фільтрувати прийоми
def get_doctors_list():
    """Повертає список лікарів для випадаючих списків."""
    doctors = []
    conn = get_db_connection()
    cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    # Вибираємо активних лікарів
    sql = """
        SELECT d.DoctorID, e.FullName, d.Specialty
        FROM dbo.Doctors d
        JOIN dbo.Employees e ON d.EmployeeID = e.EmployeeID
        WHERE e.Status = 'Active' AND e.Role = 'Doctor'
        ORDER BY e.FullName
    """
    try:
        cursor = conn.cursor()
        cursor.execute(sql)
        rows = cursor.fetchall()
        for row in rows:
            doctors.append({
                "doctorId": row.DoctorID, # ID з таблиці Doctors
                "fullName": row.FullName,
                "specialty": row.Specialty
            })
        return jsonify(doctors)
    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ОТРИМАННЯ DOCTORS LIST: {ex}")
        return jsonify({"message": "Помилка сервера при отриманні списку лікарів"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# --- API ДЛЯ ЗВІТІВ ---
@app.route('/api/reports/appointments_by_doctor', methods=['GET'])
@jwt_required() # Захищаємо ендпоінт
def get_appointment_stats_by_doctor():
    """
    Повертає статистику кількості прийомів по лікарях за період.
    Параметри: ?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
    """
    date_from_str = request.args.get('date_from')
    date_to_str = request.args.get('date_to')

    # Валідація дат
    if not is_valid_date(date_from_str) or not is_valid_date(date_to_str):
        return jsonify({"message": "Необхідно вказати коректний діапазон дат (date_from, date_to) у форматі YYYY-MM-DD."}), 400

    report_data = []
    conn = get_db_connection()
    cursor = None
    if not conn: return jsonify({"message": "Помилка підключення до БД"}), 500

    # SQL запит для агрегації
    sql = """
        SELECT
            d_emp.FullName AS DoctorName,
            d.Specialty AS DoctorSpecialty,
            COUNT(a.AppointmentID) AS AppointmentCount
        FROM dbo.Appointments a
        JOIN dbo.Doctors d ON a.DoctorID = d.DoctorID
        JOIN dbo.Employees d_emp ON d.EmployeeID = d_emp.EmployeeID
        WHERE CAST(a.AppointmentDateTime AS DATE) BETWEEN ? AND ?
          AND a.Status NOT IN ('Cancelled by Patient', 'Cancelled by Doctor') -- Рахуємо тільки ті, що відбулись або заплановані/пропущені
        GROUP BY d_emp.FullName, d.Specialty
        ORDER BY AppointmentCount DESC, DoctorName ASC;
    """
    params = (date_from_str, date_to_str)

    try:
        cursor = conn.cursor()
        print(f"Executing Report SQL: {sql}")
        print(f"With params: {params}")
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        for row in rows:
            report_data.append({
                "doctorName": row.DoctorName,
                "doctorSpecialty": row.DoctorSpecialty,
                "appointmentCount": row.AppointmentCount
            })

        return jsonify(report_data)

    except pyodbc.Error as ex:
        print(f"ПОМИЛКА ГЕНЕРАЦІЇ ЗВІТУ: {ex}")
        return jsonify({"message": "Помилка сервера під час генерації звіту"}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# Головний блок для запуску сервера
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)