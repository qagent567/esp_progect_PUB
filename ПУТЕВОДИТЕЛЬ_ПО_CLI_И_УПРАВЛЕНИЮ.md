# 💻 Полный Путеводитель по CLI и Управлению AgriSwarm

*Единый документ с полным описанием всех команд, настроек и управления системой*

---

## 🎯 **ОБЗОР УПРАВЛЕНИЯ СИСТЕМОЙ**

### **📊 Способы Управления**
- **💬 CLI (Command Line Interface)** - основной способ
- **📡 Serial Monitor** - через UART (115200 baud)
- **🌐 Web Interface** - планируется в будущих версиях
- **📱 Mobile App** - не реализовано

### **⚠️ Важные Замечания**
- **CommandExecutor:** 6286 строки кода (23% проекта)
- **70% кода:** обработка ошибок и валидация
- **Время отклика:** 50-200мс на команду
- **Автодополнение:** Tab для завершения команд

---

## 📋 **ПОЛНЫЙ СПИСОК КОМАНД**

### **🔧 СИСТЕМНЫЕ КОМАНДЫ (13 команд)**

| Команда | Описание | Пример | Категория |
|---------|----------|--------|-----------|
| `help` | Справка по командам | `help system` | Помощь |
| `status` | Статус системы | `status detailed` | Инфо |
| `memory` | Управление памятью | `memory stats` | Система |
| `reboot` | Перезагрузка | `reboot clean` | Система |
| `reset` | Сброс настроек | `reset config` | Система |
| `info` | Информация о системе | `info version` | Инфо |
| `uptime` | Время работы | `uptime detailed` | Инфо |
| `log` | Управление логированием | `log level debug` | Система |
| `config` | Управление конфигурацией | `config set wifi_ssid "MyWiFi"` | Конфиг |
| `backup` | Резервное копирование | `backup create` | Система |
| `test` | Тестирование | `test all` | Диагностика |
| `dev` | Режим разработчика | `dev on` | Разработка |

### **🌐 СЕТЕВЫЕ КОМАНДЫ (8 команд)**

| Команда | Описание | Пример | Категория |
|---------|----------|--------|-----------|
| `wifi` | Управление WiFi | `wifi scan` | Сеть |
| `mesh` | Управление mesh-сетью | `mesh status` | Сеть |
| `ping` | Проверка связи | `ping 466811893` | Диагностика |
| `node` | Управление узлами | `node list` | Сеть |
| `security` | Безопасность сети | `security password "pass"` | Безопасность |
| `mqtt` | MQTT клиент | `mqtt config "broker.com"` | Сеть |

### **🔌 GPIO И ДАТЧИКИ (15 команд)**

| Команда | Описание | Пример | Категория |
|---------|----------|--------|-----------|
| `pin` | Управление пинами | `pin list` | GPIO |
| `sensor` | Управление датчиками | `sensor read temp1` | Датчики |
| `relay` | Управление реле | `relay on 1` | Актуаторы |
| `led` | Управление LED | `led on` | GPIO |
| `button` | Управление кнопками | `button setup 5` | GPIO |
| `analog` | Аналоговые входы | `analog read 34` | Датчики |
| `digital` | Цифровые входы/выходы | `digital read 5` | GPIO |

### **⚡ АВТОМАТИЗАЦИЯ (10 команд)**

| Команда | Описание | Пример | Категория |
|---------|----------|--------|-----------|
| `rule` | Управление правилами | `rule add temp1 > 25 fan1 on` | Автоматизация |
| `task` | Управление задачами | `task add 3600000 "ping all"` | Автоматизация |
| `schedule` | Расписание | `schedule daily 08:00 "diag system"` | Автоматизация |
| `automation` | Статус автоматизации | `automation status` | Автоматизация |
| `condition` | Условия правил | `condition list` | Автоматизация |

### **🤖 АЛГОРИТМЫ (6 команд)**

| Команда | Описание | Пример | Категория |
|---------|----------|--------|-----------|
| `algo` | Управление алгоритмами | `algo list` | Алгоритмы |
| `algorithm` | Расширенные алгоритмы | `algorithm create temp_control` | Алгоритмы |
| `ml` | Машинное обучение | `ml enable` | Алгоритмы |
| `ai` | ИИ функции | `ai analyze` | Алгоритмы |

### **📊 МОНИТОРИНГ И ДИАГНОСТИКА (18 команд)**

| Команда | Описание | Пример | Категория |
|---------|----------|--------|-----------|
| `monitor` | Мониторинг системы | `monitor memory` | Мониторинг |
| `diag` | Диагностика | `diag system` | Диагностика |
| `debug` | Режим отладки | `debug on` | Разработка |
| `trace` | Трассировка | `trace enable` | Диагностика |
| `profile` | Профилирование | `profile command "sensor read"` | Производительность |
| `benchmark` | Бенчмаркинг | `benchmark all` | Производительность |
| `history` | История событий | `history events` | Мониторинг |
| `metrics` | Метрики системы | `metrics list` | Мониторинг |

---

## 🎯 **РАСПРОСТРАНЕННЫЕ СЦЕНАРИИ УПРАВЛЕНИЯ**

### **🏠 Сценарий 1: Настройка Новой Системы**
```bash
# 1. Проверка статуса
status

# 2. Сканирование WiFi
wifi scan

# 3. Подключение к сети
wifi connect "HomeWiFi" "password123"

# 4. Настройка пинов
pin setup dht22 4 temp_living_room
pin setup relay 5 living_room_light

# 5. Создание правила
rule add temp_living_room > 25 living_room_light on

# 6. Проверка работы
sensor read temp_living_room
relay status living_room_light
```

### **🌱 Сценарий 2: Мониторинг Теплицы**
```bash
# 1. Просмотр всех датчиков
sensor list

# 2. Чтение значений
sensor read temp_greenhouse
sensor read soil_moisture
sensor read light_level

# 3. Проверка автоматизации
rule list
task list

# 4. Мониторинг сети
mesh status
ping summary

# 5. Диагностика
diag sensors
diag network
```

### **🔧 Сценарий 3: Диагностика Проблем**
```bash
# 1. Проверка памяти
memory stats

# 2. Диагностика сети
diag network

# 3. Проверка логов
log show
log filter error

# 4. Тестирование компонентов
test sensors
test network
test rules

# 5. Мониторинг в реальном времени
monitor
monitor detailed
```

---

## ⚙️ **КОНФИГУРАЦИЯ СИСТЕМЫ**

### **📁 Основные Файлы Конфигурации**

| Файл | Описание | Расположение |
|------|----------|--------------|
| **config.json** | Основная конфигурация | `/config.json` |
| **pins** | Настройки GPIO | `/pins` |
| **rules.json** | Правила автоматизации | `/rules.json` |
| **tasks.json** | Запланированные задачи | `/tasks.json` |
| **wifi_config.json** | Настройки WiFi | `/wifi_config.json` |

### **⚙️ Управление Конфигурацией**
```bash
# 1. Просмотр настроек
config list

# 2. Получение значения
config get wifi_ssid

# 3. Установка значения
config set wifi_ssid "MyNetwork"

# 4. Сохранение
config save

# 5. Загрузка
config load

# 6. Сброс
config reset
```

---

## 📊 **МОНИТОРИНГ И ДИАГНОСТИКА**

### **🔍 Мониторинг в Реальном Времени**
```bash
# 1. Общий мониторинг
monitor

# 2. Мониторинг памяти
monitor memory

# 3. Мониторинг сети
monitor network

# 4. Мониторинг датчиков
monitor sensors

# 5. Детальный мониторинг
monitor detailed
```

### **📋 Диагностика Компонентов**
```bash
# 1. Полная диагностика
diag system

# 2. Диагностика памяти
diag memory

# 3. Диагностика сети
diag network

# 4. Диагностика датчиков
diag sensors

# 5. Диагностика автоматизации
diag automation
```

---

## 🛠️ **ОТЛАДКА И РЕШЕНИЕ ПРОБЛЕМ**

### **🚨 Типичные Проблемы и Решения**

#### **❌ Проблема: ESP32 не отвечает**
```bash
# Решение:
diag hardware
reboot force
```

#### **❌ Проблема: Датчики не читаются**
```bash
# Решение:
pin info sensor_pin
sensor calibrate sensor_name
test sensors
```

#### **❌ Проблема: Правила не работают**
```bash
# Решение:
rule list
sensor read sensor_name
diag automation
```

#### **❌ Проблема: Сеть нестабильна**
```bash
# Решение:
mesh status
ping summary
mesh advanced limits 5 2
```

### **🔧 Инструменты Отладки**
```bash
# 1. Включить отладку
debug on
log level debug

# 2. Трассировка
trace enable

# 3. Профилирование
profile enable

# 4. Бенчмаркинг
benchmark all
```

---

## 📈 **ПРОИЗВОДИТЕЛЬНОСТЬ И ОПТИМИЗАЦИЯ**

### **⚡ Мониторинг Производительности**
```bash
# 1. Системная производительность
diag system

# 2. Использование памяти
memory stats

# 3. Загрузка CPU
diag performance

# 4. Сетевая производительность
ping summary
```

### **🚀 Оптимизация Системы**

#### **💾 Оптимизация Памяти**
```bash
# 1. Освободить память
memory free

# 2. Проверить фрагментацию
memory fragmentation

# 3. Оптимизировать интервалы
pin setup dht22 4 temp1 --interval 10000
```

#### **🌐 Оптимизация Сети**
```bash
# 1. Настроить лимиты
mesh advanced limits 8 3

# 2. Изменить канал
mesh advanced channel 11

# 3. Оптимизировать пинг
ping preset slow
```

---

## 🔒 **БЕЗОПАСНОСТЬ И АВТОРИЗАЦИЯ**

### **🔐 Аутентификация**
```bash
# 1. Установка пароля
security password "secure_password_2024"

# 2. Вход в систему
auth login "admin" "password"

# 3. Проверка статуса
auth status
```

### **🛡️ Защита Сети**
```bash
# 1. Включить шифрование
security encryption enable "key_1234567890123456"

# 2. Настроить whitelist
security whitelist enable
security whitelist add "AA:BB:CC:DD:EE:FF"

# 3. Мониторинг безопасности
security audit enable
```

---

## 📚 **РАСШИРЕНИЕ И РАЗРАБОТКА**

### **🔧 Добавление Новых Команд**

#### **📝 Шаблон Команды**
```cpp
// В CommandExecutor.cpp
Command newCommand = {
    "new_command",                    // Имя команды
    "Описание новой команды",         // Описание
    "custom",                        // Категория
    [](const StringVector& args) -> bool {
        // Логика команды
        Logger::getInstance().info("CMD", "Команда выполнена");
        return true;
    }
};

// Регистрация
commands.push_back(newCommand);
```

### **⚙️ Конфигурация Разработки**
```bash
# 1. Включить режим разработчика
dev on

# 2. Перезагрузка модулей
dev reload

# 3. Отладка команд
debug command "new_command"

# 4. Профилирование
profile command "new_command"
```

---

## 🎯 **ПРАКТИЧЕСКИЕ ПРИМЕРЫ**

### **🏠 Пример: Умный Дом**
```bash
# 1. Настройка устройств
pin setup dht22 4 living_room_temp
pin setup relay 5 living_room_light
pin setup analog 34 motion_sensor

# 2. Автоматизация
rule add living_room_temp > 25 living_room_light on
rule add motion_sensor > 1000 living_room_light on 300000

# 3. Расписание
task add 25200000 "living_room_light off"  # 7:00 выключить

# 4. Мониторинг
monitor
task add 300000 "diag system"  # проверка каждые 5 мин
```

### **🌱 Пример: Автоматизированная Теплица**
```bash
# 1. Датчики
pin setup dht22 4 greenhouse_temp
pin setup analog 34 soil_moisture
pin setup relay 12 ventilation_fan
pin setup relay 13 water_pump

# 2. Автоматизация
rule add greenhouse_temp > 28 ventilation_fan on
rule add soil_moisture < 300 water_pump on 10000

# 3. Мониторинг
task add 600000 "diag system"  # ежечасно
task add 86400000 "backup create"  # ежедневно
```

---

## 📊 **СТАТИСТИКА И АНАЛИТИКА**

### **📈 Системная Статистика**
```bash
# 1. Общая статистика
status detailed

# 2. Статистика памяти
memory stats

# 3. Статистика сети
mesh advanced status

# 4. Статистика автоматизации
rule stats
task stats
```

### **📊 Анализ Производительности**
```bash
# 1. Бенчмаркинг
benchmark all

# 2. Профилирование
profile enable
profile report

# 3. Тренды
memory trend 3600000  # за последний час
network trend 86400000  # за 24 часа
```

---

## 🆘 **ПОМОЩЬ И ПОДДЕРЖКА**

### **🔍 Получение Помощи**
```bash
# 1. Справка по командам
help
help system
help network

# 2. Поиск в документации
# Используйте Ctrl+F в браузере

# 3. Диагностическая информация
support info

# 4. Создание отчета
support report
```

### **📧 Контакты**
- **Документация:** этот файл и связанные руководства
- **GitHub Issues:** технические вопросы и баги
- **Исходный код:** для глубокого изучения

---

**🏆 Этот путеводитель содержит ВСЁ необходимое для эффективного управления AgriSwarm. Изучайте, применяйте, автоматизируйте!** 🚀💻
