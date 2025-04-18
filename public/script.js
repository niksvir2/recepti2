const API_URL = 'https://recepti2.onrender.com/api'; // Ваш актуальный URL API

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
        
        // Добавляем обработчик клика на всю карточку
        const img = card.querySelector('.dish-img');
        const clickHandler = () => {
            const title = card.querySelector('.dish-title').textContent;
            const imgSrc = img.src;
            const ingredients = card.querySelector('.dish-ingredients').textContent.replace('Ингредиенты:', '').trim().split(', ');
            const steps = card.querySelector('.dish-recipe').textContent.replace('Кратко:', '').trim().split('. ').filter(step => step);
            
            showRecipeModal(title, imgSrc, ingredients, steps);
        };
        
        // Удаляем старый обработчик с изображения
        img.onclick = null;
        
        // Добавляем обработчик на всю карточку
        card.onclick = (e) => {
            // Проверяем, не кликнули ли мы на звездочку
            if (!e.target.classList.contains('favorite-star')) {
                clickHandler();
            }
        };
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
            console.error('Ошибка верификации токена:', error);
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include' // Для куков, если используются
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка входа');
            }
            
            const data = await response.json();
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('authToken', data.token);
            updateAuthState();
            closeAuthModal();
            showAlert('Вы успешно вошли в систему!');
        } catch (error) {
            console.error('Ошибка входа:', error);
            showAlert(error.message || 'Ошибка при входе', 'error');
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка регистрации');
            }
            
            const data = await response.json();
            currentUser = data.user;
            authToken = data.token;
            localStorage.setItem('authToken', data.token);
            updateAuthState();
            closeAuthModal();
            showAlert('Регистрация прошла успешно!');
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            showAlert(error.message || 'Ошибка при регистрации', 'error');
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
    try {
        const response = await fetch(`${API_URL}/verify`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Недействительный токен');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка верификации токена:', error);
        throw error;
    }
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
    if (!modal) return; // Проверяем, существует ли модальное окно
    
    // Устанавливаем заголовок и изображение
    const titleElement = document.getElementById('modalRecipeTitle');
    const imgElement = document.getElementById('modalRecipeImg');
    
    if (titleElement) titleElement.textContent = title;
    if (imgElement) {
        imgElement.src = image;
        imgElement.alt = title;
    }
    
    // Заполняем ингредиенты
    const ingredientsList = document.getElementById('modalRecipeIngredients');
    if (ingredientsList) {
        ingredientsList.innerHTML = '';
        ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient.trim();
            ingredientsList.appendChild(li);
        });
    }
    
    // Заполняем шаги приготовления
    const stepsList = document.getElementById('modalRecipeSteps');
    if (stepsList) {
        stepsList.innerHTML = '';
        steps.forEach(step => {
            if (step.trim()) { // Проверяем, не пустая ли строка
                const li = document.createElement('li');
                li.textContent = step.trim();
                stepsList.appendChild(li);
            }
        });
    }
    
    // Показываем модальное окно
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
        if (favoritesBtn) favoritesBtn.style.display = 'block';
        
        // Показываем звездочки для избранного
        document.querySelectorAll('.favorite-star').forEach(star => {
            star.style.display = 'block';
        });
        
        // Обновляем состояние звездочек
        updateFavoriteStars();
    } else {
        authBtn.textContent = 'Войти';
        if (favoritesBtn) favoritesBtn.style.display = 'none';
        if (document.querySelector('[data-category="soups"]')) {
            document.querySelector('[data-category="soups"]').click();
        }
        
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
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при удалении из избранного');
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
                    'Authorization': `Bearer ${authToken}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ recipeId: recipeId.toString() })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при добавлении в избранное');
            }
            
            star.classList.add('favorite');
            star.textContent = '★';
            showAlert('Рецепт добавлен в избранное');
        }
        
        // Обновляем отображение избранного
        updateFavoritesDisplay();
    } catch (error) {
        console.error('Ошибка при работе с избранным:', error);
        showAlert(error.message || 'Ошибка при работе с избранным', 'error');
    }
}

async function updateFavoriteStars() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_URL}/favorites`, {
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при загрузке избранного');
        }
        
        const data = await response.json();
        const favoriteRecipes = data.favorites || [];
        
        document.querySelectorAll('.dish-card').forEach(card => {
            const recipeId = card.getAttribute('data-recipe-id');
            const star = card.querySelector('.favorite-star');
            
            if (star && favoriteRecipes.includes(recipeId)) {
                star.classList.add('favorite');
                star.textContent = '★';
            } else if (star) {
                star.classList.remove('favorite');
                star.textContent = '☆';
            }
        });
    } catch (error) {
        console.error('Ошибка при обновлении звездочек:', error);
    }
}

async function updateFavoritesDisplay() {
    if (!favoritesSection) return;
    
    favoritesSection.innerHTML = '';
    
    if (!currentUser) {
        favoritesSection.innerHTML = '<p>Для просмотра избранного необходимо войти в систему</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/favorites`, {
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
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
        
        favoriteRecipes.forEach(recipeId => {
            const recipeCard = document.querySelector(`.dish-card[data-recipe-id="${recipeId}"]`);
            if (recipeCard) {
                const clone = recipeCard.cloneNode(true);
                favoritesSection.appendChild(clone);
            }
        });
    } catch (error) {
        console.error('Ошибка при загрузке избранного:', error);
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

// Обработчик для кнопки "Избранное"
if (favoritesBtn) {
    favoritesBtn.addEventListener('click', function() {
        updateFavoritesDisplay();
    });
}
