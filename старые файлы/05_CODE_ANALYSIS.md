# AgriSwarm: Научный Анализ Кодовой Базы

> **Глубокий технический анализ архитектуры, алгоритмов и качества кода**

---

## Метрики Проекта

### Количественные Характеристики Кодовой Базы

| Метрика | Значение | Детализация |
|------------|-------------|----------------|
| **Общий объем кода** | 6,390+ строк | Основная логика без комментариев |
| **Модули системы** | 34 компонента | Высокомодульная архитектура |
| **Заголовочные файлы** | 34 файла (.h) | Четкое разделение интерфейсов |
| **Файлы реализации** | 33 файла (.cpp) | Полная реализация функций |
| **CLI команды** | 60+ команд | Исчерпывающий интерфейс управления |
| **Типы датчиков** | 7 различных | DHT11/22, аналоговые, цифровые |
| **Сетевые протоколы** | 15+ типов сообщений | Богатый mesh-протокол |
| **Алгоритмов ИИ** | 3 основных | SmartMesh, EMA, Backoff |

### Сложность Проекта по Метрикам

**Цикломатическая сложность (приблизительная оценка):**
- Простые модули (Logger, ConfigManager): 1-5
- Средние модули (PinManager, RuleEngine): 10-20 
- Сложные модули (SmartMeshManager, NetworkManager): 25-40
- Критически сложные (CommandExecutor): 50+

**Связанность модулей:** Низкая (хорошо) - четкие интерфейсы
**Сцепленность модулей:** Высокая (хорошо) - модули решают одну задачу

---

## Алгоритмический Анализ Ключевых Компонентов

### SmartMeshManager - Интеллектуальная Маршрутизация

#### Математическая Модель Выбора Маршрута

**Функция оценки качества хоста:**
```cpp
uint8_t calculateHostPriority(const BackupHostInfo& info) const {
 uint8_t priority = 0;
 
 // Компонент скорости (40% веса)
 float speed_score = evaluateSpeedComponent(info.ping);
 
 // Компонент качества сигнала (30% веса) 
 float signal_score = evaluateSignalComponent(info.rssi);
 
 // Компонент нагрузки (30% веса)
 float load_score = evaluateLoadComponent(info.load);
 
 return static_cast<uint8_t>(
 0.4f * speed_score + 
 0.3f * signal_score + 
 0.3f * load_score
 );
}
```

**Научное обоснование весовых коэффициентов:**

1. **Скорость (40% веса)** - наивысший приоритет
 - Обоснование: задержка напрямую влияет на отзывчивость системы автоматизации
 - Критичная задержка для IoT: <100мс
 - Алгоритм: кусочно-линейная функция с насыщением

2. **Качество сигнала (30% веса)** - влияет на стабильность
 - Обоснование: RSSI коррелирует с вероятностью потери пакетов
 - Критичный порог: -70dBm (граница устойчивого соединения)
 - Алгоритм: экспоненциальная зависимость от расстояния

3. **Нагрузка (30% веса)** - обеспечивает балансировку
 - Обоснование: равномерное распределение нагрузки повышает общую производительность
 - Критичный порог: >6 одновременных подключений
 - Алгоритм: обратно пропорциональная зависимость

#### Алгоритм Поиска Оптимального Маршрута

```cpp
void SmartMeshManager::_performSearch() {
 // Этап 1: Сбор кандидатов O(n)
 std::vector<uint32_t> availableHosts = _getAvailableHosts();
 std::vector<BackupHostInfo> candidates;
 candidates.reserve(availableHosts.size());
 
 // Этап 2: Оценка качества O(n)
 for (uint32_t hostId : availableHosts) {
 BackupHostInfo info;
 info.nodeId = hostId;
 _evaluateHostQuality(hostId, info);
 
 if (_isHostSuitable(hostId, info.rssi, info.ping, info.load)) {
 candidates.push_back(info);
 }
 }
 
 // Этап 3: Сортировка по приоритету O(n log n)
 std::sort(candidates.begin(), candidates.end(), 
 [](const BackupHostInfo& a, const BackupHostInfo& b) {
 return a.priority > b.priority;
 });
 
 // Этап 4: Выбор топ-N кандидатов O(1)
 size_t maxBackups = std::min((size_t)_config.backupHostsCount, candidates.size());
 _backupHosts.assign(candidates.begin(), candidates.begin() + maxBackups);
}
```

**Временная сложность:** O(n log n), где n - количество доступных хостов
**Пространственная сложность:** O(n) для временных структур + O(k) для хранения backup-хостов

#### Структуры Данных и Memory Efficiency

```cpp
// Оптимизированная структура - 10 байт на backup host
struct BackupHostInfo {
 uint32_t nodeId; // 4 bytes - достаточно для 4 млрд уникальных узлов
 int16_t rssi; // 2 bytes - диапазон -127..0 dBm
 uint16_t ping; // 2 bytes - максимум 65535 мс (65 секунд)
 uint8_t load; // 1 byte - 0-255 подключений (на практике <32)
 uint8_t priority; // 1 byte - 0-100 баллов
};

// Конфигурация SmartMesh - 16 байт
struct SmartMeshConfig {
 uint8_t maxConnections; // 1 byte - максимум подключений
 uint8_t backupHostsCount; // 1 byte - количество backup хостов
 uint8_t backupMode; // 1 byte - режим работы
 int16_t rssiThreshold; // 2 bytes - порог RSSI
 uint8_t reconnectMode; // 1 byte - режим переподключения
 uint8_t fieldMode; // 1 byte - полевой режим
 uint8_t distanceMode; // 1 byte - режим дальности
 uint8_t weatherMode; // 1 byte - погодный режим
 uint32_t lastSearchTime; // 4 bytes - timestamp последнего поиска
 uint8_t searchTimeoutSingle;// 1 byte - таймаут для одного узла
 uint8_t searchTimeoutMulti; // 1 byte - таймаут для множества
 // Выравнивание: 1 байт padding до 16 байт
};
```

**Memory footprint анализ:**
- 5 backup хостов: 50 байт
- Конфигурация: 16 байт
- Временные переменные: ~32 байт
- **Общий overhead:** ~100 байт на весь SmartMeshManager

---

### RuleEngine - Система Обработки Правил

#### Теоретические Основы Event-Driven Architecture

AgriSwarm реализует реактивную модель программирования:

```
Поток обработки события:
Sensor → PinManager → SensorPublisher → RuleEngine → ActionExecutor → Actuator
 ↓ ↓ ↓ ↓ ↓ ↓
 Hardware GPIO Read Mesh Publish Rule Eval Hardware Write Physical
```

#### Алгоритм Обработки Правил

```cpp
void RuleEngine::processSensorData(const String& source, float value, SensorDataType type) {
 // Временная сложность: O(n), где n = количество правил
 // Пространственная сложность: O(1) - обработка в месте
 
 // Этап 1: Обновление истории значений O(1)
 float lastValue = _lastValues[source]; // hash table lookup
 _lastValues[source] = value;
 
 // Этап 2: Итерация по всем правилам O(n)
 for (auto& pair : _rules) {
 AutomationRule& rule = pair.second;
 
 // Фильтрация по источнику O(1)
 if (!rule.enabled || rule.condition.source != source) {
 continue;
 }
 
 // Проверка cooldown O(1)
 if (!_isCooldownExpired(rule)) {
 continue;
 }
 
 // Вычисление условия O(1)
 bool conditionMet = false;
 switch (rule.condition.type) {
 case CONDITION_GREATER_THAN:
 conditionMet = (value > rule.condition.value);
 break;
 case CONDITION_LESS_THAN:
 conditionMet = (value < rule.condition.value);
 break;
 case CONDITION_CHANGED:
 conditionMet = (lastValue != value);
 break;
 case CONDITION_BETWEEN:
 conditionMet = (value >= rule.condition.value && 
 value <= rule.condition.value2);
 break;
 }
 
 // Выполнение действия O(1)
 if (conditionMet) {
 _logRuleStateChange(rule.id, true, value);
 if (_executeAction(rule.action)) {
 rule.lastTriggered = millis();
 rule.triggerCount++;
 saveRules(); // O(k), где k = размер правила в байтах
 }
 }
 }
}
```

#### Система Cooldown - Предотвращение Флаппинга

**Математическая модель cooldown:**
```cpp
bool RuleEngine::_isCooldownExpired(const AutomationRule& rule) {
 unsigned long current_time = millis();
 unsigned long time_since_trigger = current_time - rule.lastTriggered;
 
 return time_since_trigger >= rule.cooldownPeriod;
}
```

**Научное обоснование cooldown периодов:**
- **Минимальный период**: 1000мс (предотвращает флаппинг от помех)
- **Оптимальный период**: 5000мс (баланс отзывчивости и стабильности)
- **Максимальный период**: 300000мс (5 минут для медленных процессов)

#### Умное Логирование - State Change Detection

```cpp
void RuleEngine::_logRuleStateChange(const String& ruleId, bool newState, float sensorValue) {
 // Получаем предыдущее состояние
 bool oldState = _ruleStates.find(ruleId) != _ruleStates.end() ? 
 _ruleStates[ruleId] : false;
 
 // Логируем только изменения состояния
 if (oldState != newState) {
 if (_smartLoggingEnabled) {
 Logger::getInstance().info("RuleEngine",
 " Правило %s: %s → %s (значение: %.2f)",
 ruleId.c_str(),
 oldState ? " ВЫПОЛНЕНО" : " НЕ ВЫПОЛНЕНО",
 newState ? " ВЫПОЛНЕНО" : " НЕ ВЫПОЛНЕНО",
 sensorValue);
 }
 _ruleStates[ruleId] = newState;
 }
}
```

**Преимущества умного логирования:**
- Снижение объема логов на 80-90%
- Фокус на важных событиях (изменения состояния)
- Предотвращение спама при флаппинге датчиков

---

### SensorPublisher - Надежная Доставка в Mesh-Сети

#### Протокол Надежной Доставки

AgriSwarm реализует собственный протокол поверх painlessMesh:

```cpp
// Структура надежного сообщения
struct ReliableMessage {
 uint32_t messageId; // Уникальный идентификатор
 uint32_t sequenceNumber; // Порядковый номер для защиты от дубликатов
 uint32_t sourceNodeId; // ID отправителя
 uint32_t destNodeId; // ID получателя (0 = broadcast)
 uint32_t timestamp; // Время создания сообщения
 uint8_t messageType; // Тип сообщения
 uint8_t priority; // Приоритет доставки
 uint16_t payloadSize; // Размер полезной нагрузки
 // Полезная нагрузка следует далее
};
```

#### Алгоритм Exponential Backoff

```cpp
void SensorPublisher::_processPendingMessages() {
 unsigned long now = millis();
 
 for (auto it = _pendingMessages.begin(); it != _pendingMessages.end();) {
 PendingMessage& msg = *it;
 
 // Проверка времени повторной отправки
 if (now >= msg.nextRetryTime) {
 if (msg.retryCount >= MAX_RETRY_COUNT) {
 // Превышен лимит попыток
 _updateNetworkStats(false, false);
 it = _pendingMessages.erase(it);
 continue;
 }
 
 // Exponential backoff: 1s, 2s, 4s, 8s, 16s
 unsigned long backoff_interval = 1000UL << msg.retryCount;
 msg.nextRetryTime = now + backoff_interval;
 msg.retryCount++;
 
 // Попытка повторной отправки
 bool success = _sendMessageWithRetry(msg.message);
 if (success && !msg.requiresConfirmation) {
 _updateNetworkStats(true, false);
 it = _pendingMessages.erase(it);
 continue;
 }
 }
 ++it;
 }
}
```

**Математическая модель backoff:**
```
retry_interval(n) = base_interval × 2^n
где:
- base_interval = 1000ms
- n = номер попытки (0, 1, 2, 3, 4)
- максимум 5 попыток
```

**Последовательность интервалов:** 1s → 2s → 4s → 8s → 16s

#### Система Подтверждений (ACK Protocol)

```cpp
// Отправка сообщения с требованием подтверждения
uint32_t messageId = _generateMessageId();
_addConfirmation(messageId, destNodeId);

JsonDocument msg;
msg["type"] = "sensor_data";
msg["messageId"] = messageId;
msg["requiresAck"] = true;
msg["sensorId"] = sensorId;
msg["value"] = value;

_addToPendingMessages(msg, true, destNodeId);

// Обработка подтверждения
void SensorPublisher::handleConfirmation(uint32_t from, const JsonDocument& doc) {
 uint32_t messageId = doc["messageId"];
 _markConfirmationReceived(messageId, from);
 
 // Удаляем сообщение из очереди повторов
 _pendingMessages.erase(
 std::remove_if(_pendingMessages.begin(), _pendingMessages.end(),
 [messageId](const PendingMessage& msg) {
 return msg.messageId == messageId;
 }), 
 _pendingMessages.end());
}
```

#### Статистика Надежности Сети

```cpp
struct NetworkStats {
 uint32_t totalMessagesSent; // Общее количество отправленных
 uint32_t totalMessagesReceived; // Общее количество полученных
 uint32_t failedDeliveries; // Неудачные доставки
 uint32_t successfulConfirmations; // Успешные подтверждения
 unsigned long lastHeartbeatTime; // Последний heartbeat
 float reliabilityScore; // Оценка надежности
};

float SensorPublisher::getNetworkReliability() {
 if (_networkStats.totalMessagesSent == 0) return 1.0f;
 
 float delivery_rate = 1.0f - 
 (float)_networkStats.failedDeliveries / _networkStats.totalMessagesSent;
 
 float confirmation_rate = 
 (float)_networkStats.successfulConfirmations / _networkStats.totalMessagesSent;
 
 // Комбинированная оценка надежности
 return 0.7f * delivery_rate + 0.3f * confirmation_rate;
}
```

---

### PinManager - Умное Управление GPIO

#### Система Кэширования DHT Датчиков

**Проблема:** DHT22 требует минимум 2 секунды между чтениями, но может давать как температуру, так и влажность.

**Решение:** Одно физическое чтение кэшируется для нескольких виртуальных пинов.

```cpp
struct DhtCacheEntry {
 float temperature = -999.0f; // Кэшированная температура
 float humidity = -999.0f; // Кэшированная влажность
 bool tempValid = false; // Валидность температуры
 bool humValid = false; // Валидность влажности
 unsigned long readCycleId = 0; // ID цикла (защита от повторного чтения)
 unsigned long timestamp = 0; // Время последнего чтения
};

// Алгоритм кэширования
SensorData PinManager::_readDhtSensorData(const PinConfig& config, DHT* dht) {
 uint8_t gpio = config.gpio;
 DhtCacheEntry& cache = _dhtCache[gpio];
 
 // Проверяем, читали ли уже в этом цикле
 if (cache.readCycleId == _updateCycleId) {
 // Возвращаем кэшированное значение
 if (config.type == PIN_TYPE_DHT22) {
 return {cache.temperature, SENSOR_DATA_TEMPERATURE, cache.timestamp};
 } else if (config.type == PIN_TYPE_DHT22_HUM) {
 return {cache.humidity, SENSOR_DATA_HUMIDITY, cache.timestamp};
 }
 }
 
 // Выполняем физическое чтение
 unsigned long now = millis();
 cache.temperature = dht->readTemperature();
 cache.humidity = dht->readHumidity();
 cache.tempValid = !isnan(cache.temperature);
 cache.humValid = !isnan(cache.humidity);
 cache.readCycleId = _updateCycleId;
 cache.timestamp = now;
 
 // Возвращаем соответствующее значение
 if (config.type == PIN_TYPE_DHT22 && cache.tempValid) {
 return {cache.temperature, SENSOR_DATA_TEMPERATURE, now};
 } else if (config.type == PIN_TYPE_DHT22_HUM && cache.humValid) {
 return {cache.humidity, SENSOR_DATA_HUMIDITY, now};
 }
 
 return {-999.0f, SENSOR_DATA_UNKNOWN, now}; // Ошибка чтения
}
```

#### Система Exponential Backoff для Ошибок Датчиков

```cpp
// Обработка ошибок с адаптивным интервалом
void PinManager::_handleSensorError(const String& pinName) {
 _dhtConsecutiveFailures[pinName]++;
 
 // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
 unsigned long backoff = std::min(30000UL, 
 1000UL << _dhtConsecutiveFailures[pinName]);
 _dhtBack