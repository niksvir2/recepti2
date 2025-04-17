const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET_KEY = 'your_secret_key';

// Простая "база данных"
let db = {
    users: [],
    favorites: {}
};

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (db.users.some(u => u.email === email)) {
            return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: Date.now(),
            name,
            email,
            password: hashedPassword
        };
        
        db.users.push(newUser);
        
        // Создаем токен
        const token = jwt.sign({ userId: newUser.id }, SECRET_KEY, { expiresIn: '1h' });
        
        res.status(201).json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = db.users.find(u => u.email === email);
        
        if (!user) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Неверный email или пароль' });
        }
        
        // Создаем токен
        const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });
        
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление в избранное
app.post('/api/favorites', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { recipeId } = req.body;
    
    if (!db.favorites[userId]) {
        db.favorites[userId] = [];
    }
    
    if (!db.favorites[userId].includes(recipeId)) {
        db.favorites[userId].push(recipeId);
    }
    
    res.json({ success: true });
});

// Удаление из избранного
app.delete('/api/favorites/:recipeId', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const recipeId = req.params.recipeId; // Уже строка
    
    if (db.favorites[userId]) {
        db.favorites[userId] = db.favorites[userId].filter(id => id !== recipeId);
    }
    
    res.json({ success: true });
});

// Получение избранного
app.get('/api/favorites', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    res.json({ favorites: db.favorites[userId] || [] });
});

// Middleware для проверки токена
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Необходима авторизация' });
    }
    
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Недействительный токен' });
        }
        req.user = user;
        next();
    });
}

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});