require('dotenv').config(); // Для загрузки переменных окружения
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();

// Конфигурация CORS для продакшена
const corsOptions = {
  origin: 'https://recepti2.onrender.com',
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Безопасность: секретный ключ из переменных окружения
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key-here';

// Временная "база данных" (в реальном проекте замените на MongoDB/PostgreSQL)
let db = {
  users: [],
  favorites: {}
};

// Маршрут для главной страницы
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Валидация
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }

    if (db.users.some(u => u.email === email)) {
      return res.status(400).json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: Date.now().toString(),
      name,
      email,
      password: hashedPassword
    };

    db.users.push(newUser);

    const token = jwt.sign({ userId: newUser.id }, SECRET_KEY, { expiresIn: '1h' });

    res.status(201).json({ 
      token, 
      user: { 
        id: newUser.id, 
        name: newUser.name, 
        email: newUser.email 
      } 
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера при регистрации' });
  }
});

// Аутентификация пользователя
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ userId: user.id }, SECRET_KEY, { expiresIn: '1h' });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера при входе' });
  }
});

// Проверка токена (новый эндпоинт)
app.get('/api/verify', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  
  res.json({ 
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email 
    } 
  });
});

// Работа с избранным
app.post('/api/favorites', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipeId } = req.body;

    if (!recipeId) {
      return res.status(400).json({ error: 'ID рецепта обязательно' });
    }

    if (!db.favorites[userId]) {
      db.favorites[userId] = [];
    }

    if (!db.favorites[userId].includes(recipeId)) {
      db.favorites[userId].push(recipeId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка добавления в избранное:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/favorites/:recipeId', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const recipeId = req.params.recipeId;

    if (db.favorites[userId]) {
      db.favorites[userId] = db.favorites[userId].filter(id => id !== recipeId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления из избранного:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/favorites', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    res.json({ favorites: db.favorites[userId] || [] });
  } catch (error) {
    console.error('Ошибка получения избранного:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.error('Ошибка верификации токена:', err);
      return res.status(403).json({ error: 'Недействительный токен' });
    }
    req.user = user;
    next();
  });
}

// Обработка 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Ошибка сервера:', err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
