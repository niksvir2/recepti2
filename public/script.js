const API_URL = 'http://localhost:3001/api';

let currentUser = null;
let authToken = null;

// DOM элементы
const authBtn = document.getElementById('authBtn');
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginFormElement = document.getElementById('loginFormElement');
const registerFormElement = document.getElementById('registerFormElement');
const favoritesBtn = document.getElementById('favoritesBtn');
const favoritesSection = document.getElementById('favorites');

// Инициализация звездочек при загрузке
function initializeRecipeCards() {
    document.querySelectorAll('.dish-card').forEach(card => {
        if (!card.querySelector('.favorite-star')) {
            const recipeId = card.getAttribute('data-recipe-id');
            const star = document.createElement('div');
            star.className = 'favorite-star';
            star.innerHTML = '☆';
            star.onclick = (e) => toggleFavorite(e, recipeId);
            card.insertBefore(star, card.firstChild);
        }
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
	   initializeRecipeCards();
    // Проверяем сохраненный токен
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const user = await verifyToken(token);
            currentUser = user;
            authToken = token;
            updateAuthState();
        } catch (error) {
            localStorage.removeItem('authToken');
        }
    }

    // Обработчики для категорий
    const categoryBtns = document.querySelectorAll('.category-btn');
    const dishesSections = document.querySelectorAll('.dishes');

    categoryBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            categoryBtns.forEach(b => b.classList.remove('active'));
            dishesSections.forEach(section => section.classList.remove('active'));

            this.classList.add('active');
            const category = this.getAttribute('data-category');
            document.getElementById(category).classList.add('active');
        });
    });

    // Обработчики форм
    loginFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }
            
            const data = await response.json();
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('authToken', data.token);
            updateAuthState();
            closeAuthModal();
            showAlert('Вы успешно вошли в систему!');
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });

    registerFormElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        
        if (password !== confirmPassword) {
            showAlert('Пароли не совпадают', 'error');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }
            
            const data = await response.json();
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('authToken', data.token);
            updateAuthState();
            closeAuthModal();
            showAlert('Регистрация прошла успешно!');
        } catch (error) {
            showAlert(error.message, 'error');
        }
    });

    // Кнопка входа/выхода
    authBtn.addEventListener('click', function() {
        if (currentUser) {
            // Выход
            currentUser = null;
            authToken = null;
            localStorage.removeItem('authToken');
            updateAuthState();
            showAlert('Вы вышли из системы');
        } else {
            // Показать форму входа
            openAuthModal();
        }
    });

    // Инициализация избранного
    updateFavoritesDisplay();
});

// Проверка токена
async function verifyToken(token) {
    const response = await fetch(`${API_URL}/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
        throw new Error('Недействительный токен');
    }
    
    return response.json();
}

// Функции для работы с модальными окнами
function openAuthModal() {
    authModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    showLoginForm();
}

function closeAuthModal() {
    authModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function showLoginForm() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    document.getElementById('loginEmail').focus();
}

function showRegisterForm() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    document.getElementById('registerName').focus();
}

// Функции для работы с рецептами
function showRecipeModal(title, image, ingredients, steps) {
    const modal = document.getElementById('recipeModal');
    document.getElementById('modalRecipeTitle').textContent = title;
    document.getElementById('modalRecipeImg').src = image;
    document.getElementById('modalRecipeImg').alt = title;
    
    const ingredientsList = document.getElementById('modalRecipeIngredients');
    ingredientsList.innerHTML = '';
    ingredients.forEach(ingredient => {
        const li = document.createElement('li');
        li.textContent = ingredient;
        ingredientsList.appendChild(li);
    });
    
    const stepsList = document.getElementById('modalRecipeSteps');
    stepsList.innerHTML = '';
    steps.forEach(step => {
        const li = document.createElement('li');
        li.textContent = step;
        stepsList.appendChild(li);
    });
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('recipeModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Закрытие модальных окон при клике вне их
window.onclick = function(event) {
    if (event.target == authModal) {
        closeAuthModal();
    }
    if (event.target == document.getElementById('recipeModal')) {
        closeModal();
    }
}

// Обновление интерфейса при изменении состояния авторизации
function updateAuthState() {
    if (currentUser) {
        authBtn.textContent = 'Выйти';
        favoritesBtn.style.display = 'block';
        
        // Показываем звездочки для избранного
        document.querySelectorAll('.favorite-star').forEach(star => {
            star.style.display = 'block';
        });
        
        // Обновляем состояние звездочек
        updateFavoriteStars();
    } else {
        authBtn.textContent = 'Войти';
        favoritesBtn.style.display = 'none';
        document.querySelector('#favorites').classList.remove('active');
        document.querySelector('[data-category="soups"]').click();
        
        // Скрываем звездочки для избранного
        document.querySelectorAll('.favorite-star').forEach(star => {
            star.style.display = 'none';
        });
    }
}

// Работа с избранным
async function toggleFavorite(event, recipeId) {
    event.stopPropagation();
    
    if (!currentUser) {
        showAlert('Для добавления в избранное необходимо войти в систему', 'error');
        return;
    }
    
    const star = event.target;
    const isFavorite = star.classList.contains('favorite');
    
    try {
        if (isFavorite) {
            // Удаляем из избранного
            const response = await fetch(`${API_URL}/favorites/${recipeId}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при удалении из избранного');
            }
            
            star.classList.remove('favorite');
            star.textContent = '☆';
            showAlert('Рецепт удален из избранного');
        } else {
            // Добавляем в избранное
            const response = await fetch(`${API_URL}/favorites`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ recipeId: recipeId.toString() }) // Преобразуем в строку
            });
            
            if (!response.ok) {
                throw new Error('Ошибка при добавлении в избранное');
            }
            
            star.classList.add('favorite');
            star.textContent = '★';
            showAlert('Рецепт добавлен в избранное');
        }
        
        // Обновляем отображение избранного, если открыта соответствующая вкладка
        if (favoritesSection.classList.contains('active')) {
            updateFavoritesDisplay();
        }
    } catch (error) {
        showAlert(error.message, 'error');
    }
}

async function updateFavoriteStars() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/favorites`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при загрузке избранного');
        }
        
        const data = await response.json();
        const favoriteRecipes = data.favorites || [];
        
        document.querySelectorAll('.dish-card').forEach(card => {
            const recipeId = card.getAttribute('data-recipe-id'); // Получаем как строку
            const star = card.querySelector('.favorite-star');
            
            if (favoriteRecipes.includes(recipeId)) {
                star.classList.add('favorite');
                star.textContent = '★';
            } else {
                star.classList.remove('favorite');
                star.textContent = '☆';
            }
        });
    } catch (error) {
        console.error('Ошибка при обновлении звездочек:', error);
    }
}

async function updateFavoritesDisplay() {
    favoritesSection.innerHTML = '';
    
    if (!currentUser) {
        favoritesSection.innerHTML = '<p>Для просмотра избранного необходимо войти в систему</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/favorites`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при загрузке избранного');
        }
        
        const data = await response.json();
        const favoriteRecipes = data.favorites || [];
        
        if (favoriteRecipes.length === 0) {
            favoritesSection.innerHTML = '<p>У вас пока нет избранных рецептов</p>';
            return;
        }
        
        // Здесь должна быть логика для отображения избранных рецептов
        // В реальном приложении нужно будет получать полные данные рецептов по их ID
        favoriteRecipes.forEach(recipeId => {
            const recipeCard = document.querySelector(`.dish-card[data-recipe-id="${recipeId}"]`);
            if (recipeCard) {
                const clone = recipeCard.cloneNode(true);
                favoritesSection.appendChild(clone);
            }
        });
    } catch (error) {
        favoritesSection.innerHTML = `<p>Ошибка при загрузке избранного: ${error.message}</p>`;
    }
}

// Вспомогательные функции
function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.padding = '10px 20px';
    alert.style.backgroundColor = type === 'error' ? '#ff4444' : '#4CAF50';
    alert.style.color = 'white';
    alert.style.borderRadius = '4px';
    alert.style.zIndex = '2000';
    alert.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transition = 'opacity 0.5s';
        setTimeout(() => alert.remove(), 500);
    }, 3000);
}
// Для обратной совместимости со старым кодом
function showRecipe(title, image, ingredients, steps) {
    showRecipeModal(title, image, ingredients, steps);
}

// Обработчик для кнопки "Избранное"
favoritesBtn.addEventListener('click', function() {
    updateFavoritesDisplay();
});
