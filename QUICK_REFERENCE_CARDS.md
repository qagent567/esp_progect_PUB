<div align="center">

[![🏠 Вернуться к README.md](https://img.shields.io/badge/🏠_Вернуться-README.md-blue?style=for-the-badge&logo=home)](README.md)
[![🗂️ Главная Навигация](https://img.shields.io/badge/🗂️_Главная_Навигация-INDEX.md-green?style=for-the-badge&logo=list)](INDEX.md)
[![📊 Визуальные Схемы](https://img.shields.io/badge/📊_Визуальные_Диаграммы-VISUAL_OVERVIEW.md-orange?style=for-the-badge&logo=chart)](VISUAL_OVERVIEW.md)

</div>

---

# 📄 AgriSwarm: Полные Справочные Карточки
## 🚀 Краткие справочники для ежедневного использования

<div align="center">

![Команды](https://img.shields.io/badge/💻_Команд-60+_доступно-blue?style=for-the-badge)
![Схемы](https://img.shields.io/badge/🔌_Схемы-8_типов_датчиков-green?style=for-the-badge)
![Правила](https://img.shields.io/badge/🤖_Правила-Неограниченно-orange?style=for-the-badge)
![Помощь](https://img.shields.io/badge/🎆_Помощь-24/7_справка-purple?style=for-the-badge)

**Все, что нужно знать для работы с AgriSwarm**

</div>

---

## 📊 ОСНОВНЫЕ КОМАНДЫ (ТОП-20 чаще всего используемых)

### 📈 Мониторинг и Диагностика

| Команда | Описание | Пример вывода |
|---------|------------|----------------|
| `status` | Общий статус системы | `System: Running, Mesh: 3 nodes, Memory: 45%` |
| `health_check` | Комплексная диагностика | `All systems: OK, Warnings: 1 (battery low)` |
| `mesh_status` | Статус mesh-сети | `Connected: 4/5 nodes, Signal: Good` |
| `node_list` | Список всех узлов | `Node 1: main_ctrl, Node 2: greenhouse` |
| `pin_list` | Список всех датчиков/реле | `DHT22: GPIO4, Relay: GPIO26, Soil: GPIO34` |
| `memory` | Состояние памяти | `Free: 45KB, Used: 75KB, Heap: OK` |

### ⚙️ Настройка Оборудования

| Команда | Описание | Пример использования |
|---------|------------|--------------------|
| `pin_setup <name> <type> <gpio>` | Настройка пина | `pin_setup temp_sensor DHT22 4` |
| `pin_config <name> <param> <value>` | Конфигурация параметров | `pin_config soil_sensor thresholdHigh 3000` |
| `pin_state <name> <value>` | Ручное управление | `pin_state water_pump 1` (включить) |
| `pin_monitor <name>` | Мониторинг пина | `pin_monitor temp_sensor` |
| `pin_reset <name>` | Сброс настроек пина | `pin_reset broken_sensor` |

### 🤖 Автоматизация (самое важное!)

| Команда | Описание | Пример |
|---------|------------|--------|
| `rule_add <name> "<условие>"` | Создать правило | `rule_add auto_water "IF soil_sensor > 3000 THEN water_pump 1"` |
| `rule_list` | Список всех правил | Показывает все активные правила |
| `rule_enable <name> <true/false>` | Включить/отключить | `rule_enable auto_water false` |
| `rule_delete <name>` | Удалить правило | `rule_delete old_irrigation` |
| `rule_stats` | Статистика срабатываний | Показывает частоту срабатывания |

### 🌐 Сеть

| Команда | Описание | Когда использовать |
|---------|------------|-------------------|
| `auto_connect` | Автоподключение к сети | При первом запуске или сбоях |
| `ping <nodeId>` | Проверка связи | `ping 2461619845` |
| `mesh_send <nodeId> "<message>"` | Отправка сообщения | `mesh_send 2461619845 "test_command"` |
| `mesh_broadcast "<message>"` | Широковещание | `mesh_broadcast "system_reboot"` |

---

## Схемы Подключения Датчиков

### DHT22 (Температура/Влажность)
```
ESP32 DHT22
GPIO 4 --> Data (желтый)
3.3V --> VCC (красный) 
GND --> GND (черный)

Обязательно: резистор 10kΩ между Data и VCC
```

### Датчик Влажности Почвы (Аналоговый)
```
ESP32 Soil Sensor
GPIO 34 --> A0 (аналог)
3.3V --> VCC
GND --> GND

Калибровка: в воде ~1200, в сухой земле ~3500
```

### Реле 1-канальное
```
ESP32 Relay Module
GPIO 26 --> IN (управление)
5V --> VCC (питание реле)
GND --> GND

 ВНИМАНИЕ: Реле 5V, ESP32 выход 3.3V
Используйте модули с оптопарой!
```

### Кнопка с Подтяжкой
```
ESP32 Button
GPIO 23 --> Контакт 1
GND --> Контакт 2

Настройка: pin_config button_name debounceMs 50
```

---

## Коды Ошибок и Быстрые Решения

### Ошибки Датчиков
| Код | Описание | Быстрое Решение |
|-----|----------|-----------------|
| `DHT_ERROR_TIMEOUT` | DHT22 не отвечает | Проверить подключение, добавить резистор |
| `ADC_OUT_OF_RANGE` | Аналоговый вне диапазона | Проверить напряжение питания датчика |
| `PIN_NOT_CONFIGURED` | Пин не настроен | Выполнить `pin_setup` |
| `SENSOR_BACKOFF_ACTIVE` | Активен backoff | Выполнить `pin_reset` |

### Ошибки Сети
| Код | Описание | Быстрое Решение |
|-----|----------|-----------------|
| `MESH_NOT_CONNECTED` | Не подключен к mesh | Выполнить `auto_connect` |
| `NODE_TIMEOUT` | Узел не отвечает | Проверить питание удаленного узла |
| `MESSAGE_SEND_FAILED` | Ошибка отправки | Проверить `mesh_status` |
| `NO_ROUTE_TO_NODE` | Нет маршрута | Перезапустить mesh-сеть |

### Ошибки Правил
| Код | Описание | Быстрое Решение |
|-----|----------|-----------------|
| `RULE_SYNTAX_ERROR` | Синтаксическая ошибка | Проверить формат "IF condition THEN action" |
| `UNKNOWN_SENSOR` | Неизвестный датчик | Убедиться что датчик настроен через `pin_setup` |
| `RULE_COOLDOWN` | Правило в режиме ожидания | Подождать или изменить `cooldown` |

---

## Типичные Значения Датчиков

### Датчик Влажности Почвы (аналоговый)
```
0-1500 = Очень влажно (в воде)
1500-2500 = Влажная почва 
2500-3500 = Нормальная влажность
3500-4095 = Сухая почва
```

### DHT22 (нормальные диапазоны)
```
Температура: -40°C до +80°C
Влажность: 0% до 100%
Точность: ±0.5°C, ±2-5%RH
```

### Освещенность (фоторезистор)
```
0-200 = Темно (ночь)
200-800 = Сумерки
800-2000 = Комнатное освещение
2000+ = Яркий свет
```

---

## Формулы Автоматизации

### Полив по Влажности
```bash
# Базовое правило
rule_add "water_on" "IF soil_moisture > 3000 THEN pump_relay 1"
rule_add "water_off" "IF soil_moisture < 2000 THEN pump_relay 0"

# С временными ограничениями 
rule_add "smart_water" "IF soil_moisture > 3000 AND hour BETWEEN 6 18 THEN pump_relay 1"
```

### Климат-контроль
```bash
# Вентиляция по температуре
rule_add "fan_hot" "IF temperature > 26 THEN fan_relay 1"
rule_add "fan_cool" "IF temperature < 22 THEN fan_relay 0"

# Комбинированное условие
rule_add "climate" "IF temperature > 25 AND humidity > 70 THEN ventilation_relay 1"
```

### Освещение
```bash
# Автоматическое освещение
rule_add "light_on" "IF light_sensor < 300 AND motion_sensor == 1 THEN light_relay 1"
rule_add "light_off" "IF motion_sensor == 0 DELAY 300 THEN light_relay 0"
```

---

## Экстренное Восстановление

### Если Система Не Отвечает
```bash
1. Физическая перезагрузка: отключить питание на 10 сек
2. Подключиться через Serial (115200 baud)
3. Выполнить: config_reset
4. Восстановить настройки: config_load
```

### Если Mesh-сеть Не Работает
```bash
1. mesh_stop
2. mesh_start 
3. auto_connect
4. Проверить: mesh_status
```

### Если Датчики Глючат
```bash
1. pin_reset_all
2. Выполнить: health_check
3. Перенастроить проблемные датчики
```

---

## Контакты для Поддержки

**Документация:** [README.md](README.md)   
**Техническая помощь:** [USER_GUIDE.md](03_USER_GUIDE.md)   
**Для разработчиков:** [TECHNICAL_ARCHITECTURE.md](04_TECHNICAL_ARCHITECTURE.md)   

**Диагностика:** Всегда начинайте с команды `health_check`

---

<div align="center">

## 🧭 ПРОДОЛЖИТЬ ИЗУЧЕНИЕ

[![💻 Полный CLI Справочник](https://img.shields.io/badge/💻_Полный_CLI-06_CLI_REFERENCE.md-primary?style=for-the-badge)](06_CLI_REFERENCE.md)
[![📖 Руководство Пользователя](https://img.shields.io/badge/📖_Руководство-03_USER_GUIDE.md-info?style=for-the-badge)](03_USER_GUIDE.md)
[![🛠️ Практические Примеры](https://img.shields.io/badge/🛠️_Практические_Примеры-PRACTICAL_GUIDE.md-success?style=for-the-badge)](PRACTICAL_GUIDE.md)

---

### 🔄 НАВИГАЦИЯ

[![🏠 Главная](https://img.shields.io/badge/🏠_Вернуться-README.md-blue?style=flat-square)](README.md)
[![🗂️ Все Документы](https://img.shields.io/badge/🗂️_Все_Документы-INDEX.md-green?style=flat-square)](INDEX.md)
[![📊 Визуальные Схемы](https://img.shields.io/badge/📊_Визуальные_Схемы-VISUAL_OVERVIEW.md-orange?style=flat-square)](VISUAL_OVERVIEW.md)
[![📝 Простой Обзор](https://img.shields.io/badge/📝_Простой_Обзор-SIMPLE_CODE_ANALYSIS.md-purple?style=flat-square)](SIMPLE_CODE_ANALYSIS.md)

**💡 Этот документ - ваш мгновенный справочник по AgriSwarm**

</div>