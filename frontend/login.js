// frontend/login.js
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const submitButton = loginForm.querySelector('button[type="submit"]');

loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    loginError.textContent = '';
    loginError.style.display = 'none';
    submitButton.disabled = true;
    submitButton.textContent = 'Вхід...';

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://127.0.0.1:5000/api/login', { // URL логіну
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username, password: password }) // 'username' може бути і email
        });

        const data = await response.json(); // Отримуємо відповідь

        if (!response.ok) {
            throw new Error(data.message || `Помилка HTTP: ${response.status}`);
        }

        // --- Успішний вхід ---
        console.log('Login successful:', data);

        // --- ЗБЕРІГАЄМО ДАНІ КОРИСТУВАЧА ТА ТОКЕН ---
        if (data.user && data.token) {
            localStorage.setItem('userData', JSON.stringify(data.user)); // Зберігаємо дані користувача
            localStorage.setItem('authToken', data.token);          // Зберігаємо JWT токен
            console.log('Token saved:', data.token); // Для дебагу
        } else {
             // Якщо відповідь успішна, але немає user або token - це помилка сервера
             throw new Error("Не отримано дані користувача або токен авторизації після входу.");
        }
        // --------------------------------------------

        // Перенаправляємо на головну сторінку
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = error.message;
        loginError.style.display = 'block';
        submitButton.disabled = false;
        submitButton.textContent = 'Увійти';
    }
});