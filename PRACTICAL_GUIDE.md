# AgriSwarm: Практическое Руководство

> ** От установки до работающей системы автоматизации за 30 минут**

---

## Что Вы Получите

По завершении этого руководства у вас будет:
- Работающая mesh-сеть из 2+ ESP32 устройств
- Автоматический полив по датчику влажности почвы
- Мониторинг температуры и влажности воздуха
- Система автоматизации с правилами "если-то"
- Полное понимание возможностей системы

---

## Что Понадобится

### Список Покупок (~$30-40)

| Компонент | Цена | Количество | Назначение |
|-------------|---------|--------------|-------------|
| **ESP32 плата** | $6-8 | 2 шт | Основные контроллеры |
| **DHT22 датчик** | $3-5 | 1 шт | Температура/влажность |
| **Датчик влажности почвы** | $2-3 | 1 шт | Мониторинг полива |
| **Модуль реле** | $1-2 | 1 шт | Управление насосом |
| **Водяной насос 3-5V** | $8-10 | 1 шт | Система полива |
| **Соединительные провода** | $2-3 | 1 набор | Подключения |
| **Breadboard** | $2-3 | 1 шт | Монтаж без пайки |

### Программное Обеспечение

- **PlatformIO IDE** (бесплатно) - для загрузки прошивки
- **Serial Monitor** - для управления системой
- **AgriSwarm прошивка** - готовая к загрузке

---

## Быстрый Старт (15 минут)

### Шаг 1: Базовая Настройка

1⃣ **Загрузите прошивку на обе ESP32:**
```bash
# В PlatformIO терминале
pio run -t upload --upload-port COM3 # Первая плата
pio run -t upload --upload-port COM4 # Вторая плата
```

2⃣ **Подключитесь к Serial Monitor:**
```bash
# Скорость: 115200 baud
# Вы увидите приветствие AgriSwarm
```

### Шаг 2: Создание Mesh-Сети

3⃣ **На первой плате (главный узел):**
```bash
> node_name main_controller
 Имя узла установлено: main_controller

> node_role gateway 
 Роль узла: gateway

> mesh_status
 Mesh сеть: готова к подключениям
```

4⃣ **На второй плате (датчики):**
```bash
> node_name sensor_node
 Имя узла установлено: sensor_node

> node_role sensor
 Роль узла: sensor

> auto_connect
 Поиск AgriSwarm сетей...
 Подключено к mesh-сети!
```

### Шаг 3: Проверка Связи

5⃣ **Проверьте соединение:**
```bash
> node_list

 Node ID Name Role Status 

 2461619845 main_ctrl gateway online 
 1847562391 sensor_node sensor online 

 Mesh-сеть из 2 узлов готова!
```

---

## Подключение Датчиков

### DHT22 (Температура + Влажность)

**Схема подключения:**
```
DHT22 → ESP32
VCC → 3.3V
GND → GND 
DATA → GPIO 4
```

**Настройка через терминал:**
```bash
> pin_setup climate DHT22 4
 Создано 2 виртуальных пина:
 climate (температура)
 climate_humidity (влажность)

> pin_test climate
 climate: 24.3°C Работает!

> pin_test climate_humidity 
 climate_humidity: 62.1% Работает!
```

### Датчик Влажности Почвы

**Схема подключения:**
```
Soil Sensor → ESP32
VCC → 3.3V
GND → GND
A0 → GPIO 34 (аналоговый)
```

**Настройка:**
```bash
> pin_setup soil_moisture ANALOG 34
 Аналоговый датчик настроен на GPIO 34

> pin_config soil_moisture thresholdLow 1500 # Влажно
> pin_config soil_moisture thresholdHigh 3000 # Сухо

> pin_test soil_moisture
 soil_moisture: 2456 (норма) Работает!
```

---

## Подключение Актуаторов

### Модуль Реле + Насос

**Схема подключения:**
```
Relay Module → ESP32 Насос
VCC → 5V 
GND → GND 
IN → GPIO 26 
NO → VCC насоса 
COM → +питания 
```

**Настройка:**
```bash
> pin_setup water_pump RELAY 26
 Реле настроено на GPIO 26

> pin_config water_pump initialState 0 # По умолчанию выключено

> pin_state water_pump 1 # Тест: включить насос
 Слышите работу насоса? 

> pin_state water_pump 0 # Выключить
 Насос выключен
```

---

## Создание Правил Автоматизации

### Автоматический Полив

```bash
# Правило: если почва сухая, включить полив на 10 секунд
> rule_add auto_water "IF soil_moisture > 2800 THEN water_pump 1"
 Правило создано: auto_water

# Правило: выключить полив через 10 секунд
> task_add stop_water "pin_state water_pump 0" 10000
 Задача отложенного выключения создана
```

### Контроль Температуры

```bash
# Правило: если жарко, включить вентилятор
> rule_add cooling "IF climate > 28 THEN fan_relay 1"

# Правило: если прохладно, выключить вентилятор 
> rule_add stop_cooling "IF climate < 25 THEN fan_relay 0"
```

### Уведомления

```bash
# Правило: логировать критическую температуру
> rule_add temp_alert "IF climate > 35 THEN LOG 'КРИТИЧЕСКАЯ ТЕМПЕРАТУРА!'"

# Правило: уведомление о низкой влажности
> rule_add humidity_alert "IF climate_humidity < 30 THEN LOG 'ВОЗДУХ СЛИШКОМ СУХОЙ'"
```

---

## Мониторинг и Управление

### Статус Системы

```bash
> status

 Mesh-сеть 2 узла, стабильно 
 Память 52KB/512KB (10%) 
 ⏱ Uptime 2ч 15мин 
 Правила 3 активных 
 Последняя температура 24.7°C 
 Влажность почвы 2156 (влажно) 

```

### Реальный Мониторинг

```bash
> pin_monitor soil_moisture
[14:23:15] soil_moisture: 2456 (норма)
[14:23:20] soil_moisture: 2489 (норма) 
[14:23:25] soil_moisture: 2891 (сухо) 
[14:23:25] Правило auto_water сработало!
[14:23:25] Включен полив
```

### Статистика Правил

```bash
> rule_list

 ID Условие Действие Срабатывания

 auto_water soil > 2800 pump ON 15 раз 
 cooling temp > 28 fan ON 3 раза 
 temp_alert temp > 35 LOG 0 раз 

```

---

## Продвинутые Функции

### Оптимизация Mesh-Сети

```bash
> mesh_optimize auto
 Автоматическая оптимизация...
 Анализ качества связи...
 Оптимизация маршрутов...
 Сеть оптимизирована для текущих условий

> ping_summary

 Node Avg Ping Min/Max Success 

 sensor_node 23мс 15/45мс 98.5% 

 Отличное качество связи!
```

### Сложные Алгоритмы

```bash
# Создание многошагового алгоритма
> algorithm_add smart_irrigation
> algorithm_step "IF soil_moisture > 2800 AND climate < 30"
> algorithm_step "THEN water_pump 1"
> algorithm_step "DELAY 5000" # 5 секунд полива
> algorithm_step "THEN water_pump 0"
> algorithm_step "DELAY 300000" # 5 минут паузы
> algorithm_save smart_irrigation
 Умный алгоритм полива создан!
```

### Резервное Копирование

```bash
> config_backup
 Резервная копия сохранена в /config_backup.json

> pin_save_all
 Все настройки пинов сохранены

> rule_export all
 Все правила экспортированы в /rules_backup.json
```

---

## Решение Проблем

### Типичные Проблемы и Решения

** Узлы не видят друг друга:**
```bash
> wifi_scan
# Проверьте, видны ли AgriSwarm сети

> mesh_status
# Проверьте статус mesh

> auto_connect
# Попробуйте переподключиться
```

** Датчик не работает:**
```bash
> pin_test sensor_name
# Проверьте конкретный датчик

> sysinfo 
# Проверьте общее состояние системы

> health_check
# Комплексная диагностика
```

** Правила не срабатывают:**
```bash
> rule_list
# Проверьте состояние правил

> rule_logging_on
# Включите подробное логирование

> rule_states
# Посмотрите текущие состояния правил
```

---

## Масштабирование Системы

### Добавление Новых Узлов

1⃣ **Загрузите прошивку на новую ESP32**
2⃣ **Настройте узел:**
```bash
> node_name greenhouse_monitor
> node_role hybrid # Может быть и датчиком, и актуатором
> auto_connect
```

3⃣ **Добавьте устройства:**
```bash
> pin_setup greenhouse_temp DHT22 4
> pin_setup greenhouse_fan RELAY 26
> pin_setup greenhouse_light RELAY 27
```

4⃣ **Создайте правила:**
```bash
> rule_add greenhouse_cooling "IF greenhouse_temp > 30 THEN greenhouse_fan 1"
> rule_add greenhouse_lighting "IF time > 18:00 THEN greenhouse_light 1"
```

### Мониторинг Большой Сети

```bash
> mesh_stats full
 Полная статистика mesh-сети:
 Всего узлов: 8
 Активных соединений: 7
 Средняя задержка: 28мс
 Качество сети: 94.2%
 Статус: отличный 

> topics_tree
 Карта всех датчиков и актуаторов в сети:
 main_controller
 climate (24.5°C)
 water_pump (OFF)
 sensor_node 
 soil_moisture (2456)
 greenhouse_monitor
 greenhouse_temp (28.1°C)
 greenhouse_fan (ON)
 greenhouse_light (OFF)
```

---

## Обучающие Сценарии

### Сценарий 1: Умная Теплица

**Задача:** Полная автоматизация микроклимата
**Датчики:** Температура, влажность, освещенность, CO2
**Актуаторы:** Вентиляторы, обогреватели, лампы, полив

```bash
# Многоуровневая система правил
> rule_add optimal_temp "IF temp BETWEEN 20 25 THEN status_led 1"
> rule_add heating "IF temp < 18 THEN heater_relay 1" 
> rule_add cooling "IF temp > 30 THEN fan_relay 1"
> rule_add lighting "IF light_sensor < 200 THEN grow_lights 1"
```

### Сценарий 2: Мониторинг Склада

**Задача:** Контроль условий хранения
**Датчики:** Температура, влажность, движение
**Актуаторы:** Сигнализация, уведомления

```bash
# Система оповещений
> rule_add cold_storage "IF temp < 2 THEN LOG 'КРИТИЧЕСКИ НИЗКАЯ ТЕМПЕРАТУРА'"
> rule_add intrusion "IF motion_sensor = 1 THEN alarm_relay 1"
> rule_add humidity_control "IF humidity > 80 THEN dehumidifier 1"
```

---

## Результаты

По завершении этого руководства вы:

 **Создали работающую IoT-систему** без облачных сервисов
 **Освоили mesh-технологии** на практике 
 **Научились автоматизации** через правила и алгоритмы
 **Получили масштабируемое решение** для любых задач
 **Сэкономили 90% стоимости** по сравнению с готовыми решениями

** Время реализации:** 30-60 минут (в зависимости от сложности)
** Стоимость:** $30-40 за базовую систему
** Возможности расширения:** до 32 узлов без изменения архитектуры

---

## Дальнейшие Шаги

### Для Экспериментов
- Попробуйте разные типы датчиков
- Создайте сложные многошаговые алгоритмы
- Изучите продвинутые команды CLI

### Для Изучения
- Изучите [Технический Обзор](TECHNICAL_OVERVIEW.md) для понимания архитектуры
- Прочитайте [Анализ Кода](CODE_ANALYSIS.md) для изучения алгоритмов

### Для Бизнеса
- Масштабируйте систему до ваших потребностей
- Адаптируйте под специфику вашей отрасли
- Рассмотрите коммерческое использование

** AgriSwarm: ваш путь в мир профессиональной IoT-автоматизации!**