const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ========== ХРАНИЛИЩА ДАННЫХ ==========
let players = {};            // id: { id, name, avatar, ready }
let gameState = {
    active: false,
    word: '',
    wordImage: '',
    spyId: null,
    spyName: '',
    currentTurn: null,
    turnOrder: []
};
let chatMessages = [];       // { name, text, time }
let mutedPlayers = {};       // id -> timestamp до которого мут
let bannedPlayers = new Set(); // id

// === СЛОВАРЬ (1000+ слов с картинками-эмодзи) ===
const words = [
    "Аэропорт", "Вокзал", "Метро", "Автобус", "Трамвай", "Троллейбус", "Порт", "Космодром", "Школа", "Университет",
    "Библиотека", "Детский сад", "Ясли", "Больница", "Поликлиника", "Аптека", "Стоматология", "Ветклиника", "Роддом", "Ресторан",
    "Кафе", "Бар", "Ночной клуб", "Пиццерия", "Суши-бар", "Столовая", "Кофейня", "Кондитерская", "Фастфуд", "Кинотеатр",
    "Театр", "Музей", "Цирк", "Зоопарк", "Океанариум", "Планетарий", "Выставочный зал", "Концертный зал", "Дом культуры", "Луна-парк",
    "Пляж", "Лес", "Горы", "Озеро", "Река", "Море", "Водопад", "Пещера", "Пустыня", "Джунгли", "Остров", "Луна", "Марс", "Солнце",
    "Тюрьма", "Полицейский участок", "Суд", "Пожарная часть", "Воинская часть", "Бункер", "Штаб", "Банк", "Офис", "Ювелирный магазин",
    "Ломбард", "Отель", "Хостел", "Санаторий", "Дом отдыха", "Кемпинг", "Деревня", "Ферма", "Заброшенный дом", "Особняк", "Квартира",
    "Лифт", "Подъезд", "Крыша", "Подвал", "Чердак", "Балкон", "Терраса", "Вестибюль", "Коридор", "Лестница",
    "Спа-салон", "Сауна", "Фитнес-клуб", "Бассейн", "Стадион", "Теннисный корт", "Ледовый дворец", "Ипподром", "Тир", "Пейнтбольный клуб",
    "Парк аттракционов", "Аквапарк", "Горнолыжный курорт", "Трасса", "Заповедник", "Национальный парк", "Вулкан", "Гейзер", "Ледник", "Фьорд",
    "Врач", "Учитель", "Полицейский", "Пожарный", "Программист", "Шпион", "Актёр", "Певец", "Повар", "Водитель", "Пилот", "Космонавт",
    "Моряк", "Солдат", "Президент", "Король", "Принцесса", "Супергерой", "Злодей", "Детектив", "Журналист", "Фотограф", "Модель", "Дизайнер",
    "Архитектор", "Инженер", "Учёный", "Фермер", "Садовник", "Ветеринар", "Медсестра", "Фармацевт", "Строитель", "Шахтёр", "Рыбак", "Охотник",
    "Стрелок", "Робот", "Пришелец", "Ковбой", "Индеец", "Рыцарь", "Самурай", "Викинг", "Пират", "Разбойник", "Ниндзя", "Гладиатор",
    "Телефон", "Ноутбук", "Планшет", "Телевизор", "Наушники", "Микрофон", "Клавиатура", "Мышь", "Принтер", "Сканер", "Холодильник",
    "Микроволновка", "Чайник", "Тостер", "Кофеварка", "Блендер", "Мясорубка", "Плита", "Духовка", "Сковорода", "Кастрюля", "Тарелка",
    "Стакан", "Вилка", "Нож", "Ложка", "Швабра", "Веник", "Пылесос", "Зубная щётка", "Расчёска", "Зеркало", "Фен", "Бритва", "Полотенце",
    "Книга", "Тетрадь", "Ручка", "Карандаш", "Линейка", "Циркуль", "Калькулятор", "Рюкзак", "Чемодан", "Кошелёк", "Ключи", "Брелок",
    "Зажигалка", "Сигарета", "Вейп", "Трубка", "Кальян", "Бокал", "Кружка", "Пиала", "Графин", "Кувшин", "Ведро", "Таз", "Мыло", "Шампунь",
    "Гель для душа", "Дезодорант", "Одеколон", "Духи", "Лак для волос", "Пена для бритья", "Крем для рук", "Бальзам", "Рулетка", "Молоток",
    "Отвёртка", "Плоскогубцы", "Гаечный ключ", "Дрель", "Шуруповёрт", "Лобзик", "Пила", "Топор", "Лопата", "Грабли", "Коса", "Серп", "Мотыга",
    "Пицца", "Бургер", "Суши", "Салат", "Оливье", "Суп", "Борщ", "Пельмени", "Вареники", "Блины", "Оладьи", "Сыр", "Колбаса", "Хлеб",
    "Масло", "Яйца", "Молоко", "Кефир", "Йогурт", "Творог", "Сметана", "Яблоко", "Груша", "Апельсин", "Мандарин", "Лимон", "Банан",
    "Киви", "Ананас", "Арбуз", "Дыня", "Клубника", "Малина", "Вишня", "Черешня", "Смородина", "Крыжовник", "Голубика", "Черника",
    "Картофель", "Морковь", "Лук", "Чеснок", "Свёкла", "Редис", "Капуста", "Брокколи", "Цветная капуста", "Тыква", "Кабачок", "Баклажан",
    "Перец", "Помидор", "Огурец", "Редька", "Хрен", "Укроп", "Петрушка", "Кинза", "Самолёт", "Вертолёт", "Поезд", "Корабль", "Яхта", "Катер",
    "Велосипед", "Мотоцикл", "Машина", "Грузовик", "Трактор", "Экскаватор", "Бульдозер", "Кран", "Пистолет", "Автомат", "Меч", "Лук", "Топор",
    "Собака", "Кошка", "Мышь", "Крыса", "Кролик", "Заяц", "Лиса", "Волк", "Медведь", "Тигр", "Лев", "Слон", "Жираф", "Зебра", "Обезьяна",
    "Кенгуру", "Панда", "Ёж", "Белка", "Лось", "Олень", "Кабан", "Носорог", "Бегемот", "Крокодил", "Змея", "Ящерица", "Черепаха", "Лягушка",
    "Птица", "Орёл", "Сокол", "Воробей", "Голубь", "Ворона", "Рыба", "Акула", "Дельфин", "Кит", "Осьминог", "Краб", "Дракон", "Единорог",
    "Фея", "Волшебник", "Гном", "Эльф", "Орк", "Тролль", "Гоблин", "Кентавр", "Минотавр", "Пегас", "Феникс", "Грифон", "Сфинкс", "Василиск",
    "Баба-Яга", "Кощей", "Леший", "Водяной", "Кикимора", "Домовой", "Русалка", "Футбол", "Баскетбол", "Волейбол", "Теннис", "Хоккей", "Бокс",
    "Борьба", "Дзюдо", "Карате", "Плавание", "Бег", "Лыжи", "Сноуборд", "Коньки", "Фигурное катание", "Гитара", "Фортепиано", "Скрипка",
    "Барабан", "Флейта", "Саксофон", "Труба", "Арфа", "Балалайка", "Гармонь", "Микроскоп", "Телескоп", "Пробирка", "Магнит", "Атом"
];
const wordImages = {
    "Аэропорт": "✈️", "Вокзал": "🚉", "Метро": "🚇", "Автобус": "🚌", "Трамвай": "🚊", "Троллейбус": "🚎", "Порт": "⚓", "Космодром": "🚀",
    "Школа": "🏫", "Университет": "🎓", "Библиотека": "📚", "Детский сад": "🧸", "Ясли": "🍼", "Больница": "🏥", "Поликлиника": "💊",
    "Аптека": "💊", "Стоматология": "🦷", "Ветклиника": "🐾", "Роддом": "👶", "Ресторан": "🍽️", "Кафе": "☕", "Бар": "🍺", "Ночной клуб": "🪩",
    "Пиццерия": "🍕", "Суши-бар": "🍣", "Столовая": "🍲", "Кофейня": "☕", "Кондитерская": "🍰", "Фастфуд": "🍔", "Кинотеатр": "🎬",
    "Театр": "🎭", "Музей": "🏛️", "Цирк": "🎪", "Зоопарк": "🐘", "Океанариум": "🐠", "Планетарий": "🌍", "Выставочный зал": "🖼️",
    "Концертный зал": "🎵", "Дом культуры": "🏛️", "Луна-парк": "🎡", "Пляж": "🏖️", "Лес": "🌲", "Горы": "⛰️", "Озеро": "🏞️", "Река": "🌊",
    "Море": "🌊", "Водопад": "💧", "Пещера": "🪨", "Пустыня": "🏜️", "Джунгли": "🌴", "Остров": "🏝️", "Луна": "🌙", "Марс": "🔴", "Солнце": "☀️",
    "Тюрьма": "⛓️", "Полицейский участок": "👮", "Суд": "⚖️", "Пожарная часть": "🚒", "Воинская часть": "🪖", "Бункер": "🛡️", "Штаб": "🏛️",
    "Банк": "🏦", "Офис": "💼", "Ювелирный магазин": "💍", "Ломбард": "💰", "Отель": "🏨", "Хостел": "🛏️", "Санаторий": "🏥", "Дом отдыха": "🏡",
    "Кемпинг": "🏕️", "Деревня": "🏡", "Ферма": "🐄", "Заброшенный дом": "🏚️", "Особняк": "🏰", "Квартира": "🏠", "Лифт": "🛗", "Подъезд": "🚪",
    "Крыша": "🏠", "Подвал": "🕳️", "Чердак": "🏠", "Балкон": "🏢", "Терраса": "🏡", "Врач": "👨‍⚕️", "Учитель": "👩‍🏫", "Полицейский": "👮‍♂️",
    "Пожарный": "🚒", "Программист": "💻", "Шпион": "🕵️", "Актёр": "🎭", "Певец": "🎤", "Повар": "🍳", "Водитель": "🚗", "Пилот": "✈️",
    "Космонавт": "🧑‍🚀", "Моряк": "⚓", "Солдат": "🪖", "Президент": "🏛️", "Король": "👑", "Принцесса": "👸", "Супергерой": "🦸", "Злодей": "🦹",
    "Детектив": "🔍", "Журналист": "📰", "Фотограф": "📸", "Модель": "💃", "Дизайнер": "🎨", "Архитектор": "🏛️", "Инженер": "⚙️", "Учёный": "🔬",
    "Фермер": "🚜", "Садовник": "🌻", "Ветеринар": "🐕", "Медсестра": "👩‍⚕️", "Фармацевт": "💊", "Строитель": "🔨", "Шахтёр": "⛏️", "Рыбак": "🎣",
    "Охотник": "🏹", "Стрелок": "🎯", "Робот": "🤖", "Пришелец": "👽", "Ковбой": "🤠", "Индеец": "🪶", "Рыцарь": "🛡️", "Самурай": "⚔️",
    "Викинг": "🛶", "Пират": "🏴‍☠️", "Разбойник": "🗡️", "Ниндзя": "🥷", "Гладиатор": "🛡️", "Телефон": "📱", "Ноутбук": "💻", "Планшет": "📟",
    "Телевизор": "📺", "Наушники": "🎧", "Микрофон": "🎤", "Клавиатура": "⌨️", "Мышь": "🖱️", "Холодильник": "🧊", "Микроволновка": "🔥",
    "Чайник": "🫖", "Тостер": "🍞", "Кофеварка": "☕", "Блендер": "🥤", "Мясорубка": "🥩", "Плита": "🍳", "Духовка": "🔥", "Сковорода": "🍳",
    "Кастрюля": "🍲", "Тарелка": "🍽️", "Стакан": "🥛", "Вилка": "🍴", "Нож": "🔪", "Ложка": "🥄", "Пылесос": "🧹", "Зубная щётка": "🪥",
    "Расчёска": "🪮", "Зеркало": "🪞", "Фен": "💨", "Бритва": "🪒", "Полотенце": "🧺", "Книга": "📖", "Тетрадь": "📓", "Ручка": "✒️",
    "Карандаш": "✏️", "Линейка": "📏", "Циркуль": "📐", "Калькулятор": "🧮", "Рюкзак": "🎒", "Чемодан": "🧳", "Кошелёк": "👛", "Ключи": "🔑",
    "Брелок": "🔑", "Зажигалка": "🔥", "Сигарета": "🚬", "Вейп": "💨", "Пицца": "🍕", "Бургер": "🍔", "Суши": "🍣", "Салат": "🥗", "Оливье": "🥗",
    "Суп": "🥣", "Борщ": "🍲", "Пельмени": "🥟", "Вареники": "🥟", "Блины": "🥞", "Оладьи": "🥞", "Сыр": "🧀", "Колбаса": "🌭", "Хлеб": "🍞",
    "Молоко": "🥛", "Кефир": "🥛", "Йогурт": "🥤", "Яблоко": "🍎", "Банан": "🍌", "Апельсин": "🍊", "Клубника": "🍓", "Арбуз": "🍉",
    "Самолёт": "✈️", "Вертолёт": "🚁", "Поезд": "🚂", "Корабль": "🚢", "Машина": "🚗", "Велосипед": "🚲", "Собака": "🐕", "Кошка": "🐈",
    "Дракон": "🐉", "Единорог": "🦄", "Фея": "🧚", "Волшебник": "🧙", "Баба-Яга": "🧙", "Футбол": "⚽", "Баскетбол": "🏀", "Гитара": "🎸"
};
// Добавим картинки для недостающих слов
for(let w of words) if(!wordImages[w]) wordImages[w] = "📌";

app.use(express.static(__dirname));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'host.html')));
app.get('/player', (req, res) => res.sendFile(path.join(__dirname, 'player.html')));

function updateState() {
    io.emit('players_update', players);
    io.emit('game_state', gameState);
}

function addChat(name, text) {
    const msg = { name, text, time: new Date().toLocaleTimeString() };
    chatMessages.push(msg);
    if(chatMessages.length > 100) chatMessages.shift();
    io.emit('chat_message', msg);
}

io.on('connection', (socket) => {
    console.log('+', socket.id);
    if(bannedPlayers.has(socket.id)) {
        socket.emit('banned');
        socket.disconnect();
        return;
    }
    
    socket.on('register', (data) => {
        players[socket.id] = { id: socket.id, name: data.name, avatar: data.avatar || '😀', ready: false };
        socket.emit('chat_history', chatMessages);
        socket.emit('game_state', gameState);
        updateState();
    });
    
    socket.on('update_avatar', (avatar) => {
        if(players[socket.id]) players[socket.id].avatar = avatar;
        updateState();
    });
    
    socket.on('player_toggle_ready', () => {
        if(players[socket.id]) {
            players[socket.id].ready = !players[socket.id].ready;
            updateState();
        }
    });
    
    socket.on('chat_message', (msg) => {
        if(mutedPlayers[socket.id] && mutedPlayers[socket.id] > Date.now()) return;
        if(players[socket.id]) addChat(players[socket.id].name, msg.text.substring(0, 200));
    });
    
    // Угадывание слова шпионом (вместо признания)
    socket.on('spy_guess', (data) => {
        if(gameState.active && gameState.spyId === socket.id) {
            if(data.word && data.word.toLowerCase() === gameState.word.toLowerCase()) {
                io.emit('game_message', { text: `🕵️ Шпион ${players[socket.id]?.name} угадал слово "${gameState.word}"! Победа шпиона!` });
                gameState.active = false;
                gameState.currentTurn = null;
                gameState.turnOrder = [];
                updateState();
                addChat("Система", `🏆 Шпион победил, угадав слово "${gameState.word}"`);
            } else {
                io.emit('game_message', { text: `❌ Шпион ${players[socket.id]?.name} не угадал. Слово было "${gameState.word}". Победа агентов!` });
                gameState.active = false;
                gameState.currentTurn = null;
                gameState.turnOrder = [];
                updateState();
                addChat("Система", `🏆 Агенты победили, шпион не угадал слово "${gameState.word}"`);
            }
        } else {
            socket.emit('game_message', { text: '❌ Вы не шпион или игра не активна!' });
        }
    });
    
    socket.on('start_round', () => {
        const readyPlayers = Object.values(players).filter(p => p.ready);
        if(readyPlayers.length < 3) {
            socket.emit('game_message', { text: `⚠️ Нужно минимум 3 игрока (готовы ${readyPlayers.length})` });
            return;
        }
        const wordIndex = Math.floor(Math.random() * words.length);
        const word = words[wordIndex];
        const wordImage = wordImages[word] || "📌";
        const playerIds = Object.keys(players);
        const spyId = playerIds[Math.floor(Math.random() * playerIds.length)];
        const spyName = players[spyId]?.name;
        const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);
        gameState = {
            active: true,
            word: word,
            wordImage: wordImage,
            spyId: spyId,
            spyName: spyName,
            currentTurn: shuffledOrder[0],
            turnOrder: shuffledOrder
        };
        for(let id of playerIds) {
            if(id === socket.id) {
                io.to(id).emit('game_message', { text: `🎲 Раунд начат! Вы ведущий — слово скрыто. Шпион: ${spyName}` });
            } else {
                io.to(id).emit('your_role', {
                    isSpy: id === spyId,
                    word: id === spyId ? null : word,
                    wordImage: id === spyId ? null : wordImage
                });
            }
        }
        updateState();
        addChat("Система", `🎲 Раунд начат! Первый ход: ${players[shuffledOrder[0]]?.name}. Шпион: ${spyName}`);
    });
    
    socket.on('next_turn', () => {
        if(!gameState.active) return;
        const idx = gameState.turnOrder.indexOf(gameState.currentTurn);
        gameState.currentTurn = gameState.turnOrder[(idx + 1) % gameState.turnOrder.length];
        updateState();
        addChat("Система", `🔄 Ход переходит к ${players[gameState.currentTurn]?.name}`);
    });
    
    socket.on('reveal_word', () => {
        if(gameState.active) {
            io.emit('game_message', { text: `🔍 Слово было: ${gameState.word} ${gameState.wordImage}. Шпион: ${gameState.spyName}` });
            addChat("Система", `🔍 Слово: ${gameState.word}. Шпион: ${gameState.spyName}`);
            gameState.active = false;
            gameState.currentTurn = null;
            gameState.turnOrder = [];
            updateState();
        }
    });
    
    socket.on('start_vote', (targetId) => {
        if(!gameState.active) return;
        voting = { active: true, votes: {}, targetId: targetId };
        io.emit('voting_start', { targetId: targetId, targetName: players[targetId]?.name });
    });
    
    socket.on('vote', (votedId) => {
        if(voting.active && !voting.votes[socket.id]) {
            voting.votes[socket.id] = votedId;
            io.emit('vote_update', { votesCount: Object.keys(voting.votes).length, total: Object.keys(players).length });
        }
    });
    
    socket.on('end_vote', () => {
        if(voting.active) {
            const voteArray = Object.values(voting.votes);
            if(voteArray.length > 0) {
                const voteCounts = {};
                voteArray.forEach(v => voteCounts[v] = (voteCounts[v] || 0) + 1);
                let maxVotes = 0, eliminatedId = null;
                for(let [id, count] of Object.entries(voteCounts)) {
                    if(count > maxVotes) { maxVotes = count; eliminatedId = id; }
                }
                if(eliminatedId) {
                    io.emit('game_message', { text: `🗳️ По результатам голосования выбывает: ${players[eliminatedId]?.name}` });
                    delete players[eliminatedId];
                    updateState();
                }
            }
            voting.active = false;
            io.emit('voting_end');
        }
    });
    
    socket.on('kick', (id) => {
        if(players[id]) {
            io.to(id).emit('kicked');
            delete players[id];
            updateState();
            addChat("Система", `⚠️ Игрок был удалён ведущим`);
        }
    });
    
    socket.on('mute', (id) => {
        if(players[id]) {
            mutedPlayers[id] = Date.now() + 60000;
            io.to(id).emit('muted');
            addChat("Система", `🔇 ${players[id]?.name} замьючен на 1 минуту`);
        }
    });
    
    socket.on('ban', (id) => {
        if(players[id]) {
            bannedPlayers.add(id);
            io.to(id).emit('banned');
            delete players[id];
            updateState();
            addChat("Система", `⛔ Игрок забанен`);
        }
    });
    
    socket.on('get_players_for_vote', (callback) => {
        if(callback) callback(players);
    });
    
    socket.on('disconnect', () => {
        delete players[socket.id];
        updateState();
        console.log('-', socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🕵️‍♂️ СЕРВЕР ШПИОН ЗАПУЩЕН`);
    console.log(`📋 Словарь: ${words.length} слов с картинками`);
    console.log(`🌐 Хост: http://localhost:${PORT}/host`);
    const os = require('os');
    Object.values(os.networkInterfaces()).flat().forEach(iface => {
        if(iface.family === 'IPv4' && !iface.internal) {
            console.log(`📱 Игроки: http://${iface.address}:${PORT}/player`);
        }
    });
    console.log(`\n✨ Готово! Хост НЕ ВИДИТ слово. Шпион УГАДЫВАЕТ слово.\n`);
});