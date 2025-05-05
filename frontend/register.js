const registerForm = document.getElementById('registerForm');
const registerMessage = document.getElementById('registerMessage'); // Для повідомлень
const submitButton = registerForm.querySelector('button[type="submit"]'); // Знаходимо кнопку

registerForm.addEventListener('submit', async (event) => {
    event.preventDefault(); // Забороняємо стандартну відправку форми

    // Блокуємо кнопку на час обробки
    submitButton.disabled = true;
    submitButton.textContent = 'Обробка...'; // Змінюємо текст кнопки

    const fullName = document.getElementById('fullName').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    registerMessage.style.display = 'none'; // Ховаємо попередні повідомлення
    registerMessage.classList.remove('error-message', 'message'); // Скидаємо класи

    // --- Проста валідація на клієнті ---
    if (password !== confirmPassword) {
        registerMessage.textContent = 'Паролі не співпадають!';
        registerMessage.classList.add('error-message');
        registerMessage.style.display = 'block';
        // Розблоковуємо кнопку
        submitButton.disabled = false;
        submitButton.textContent = 'Зареєструватися';
        return;
    }

    if (password.length < 6) {
        registerMessage.textContent = 'Пароль має бути не менше 6 символів!';
        registerMessage.classList.add('error-message');
        registerMessage.style.display = 'block';
         // Розблоковуємо кнопку
        submitButton.disabled = false;
        submitButton.textContent = 'Зареєструватися';
        return;
    }
    // --------------------------------------

    const registrationData = { fullName, username, email, password };
    console.log('Sending registration request:', registrationData);

    // --- Відправка даних на бекенд ---
    try {
        const response = await fetch('http://127.0.0.1:5000/api/register', { // Вказуємо правильний URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Вказуємо тип контенту
            },
            body: JSON.stringify(registrationData) // Перетворюємо дані в JSON рядок
        });

         const responseData = await response.json(); // Читаємо відповідь сервера

        if (!response.ok) {
             // Якщо сервер повернув помилку (статус не 2xx)
            throw new Error(responseData.message || `Помилка HTTP: ${response.status}`);
        }

        // Якщо відповідь успішна (статус 2xx)
        registerMessage.textContent = responseData.message; // Відображаємо повідомлення від сервера
        registerMessage.classList.add('message'); // Стиль для успішного повідомлення
        registerMessage.style.display = 'block';
        registerForm.reset(); // Очищуємо форму після успішної відправки запиту

        // Кнопка залишається неактивною, оскільки запит відправлено
        submitButton.textContent = 'Запит відправлено';


    } catch (error) {
        console.error('Registration request error:', error);
        registerMessage.textContent = error.message || 'Не вдалося відправити запит. Спробуйте пізніше.';
        registerMessage.classList.add('error-message'); // Стиль для помилки
        registerMessage.style.display = 'block';
         // Розблоковуємо кнопку у разі помилки
        submitButton.disabled = false;
        submitButton.textContent = 'Зареєструватися';
    }
});