/**
 * AgriSwarm Mobile Dashboard Engine
 * 
 * Логика управления мобильным/PWA приложением AgriSwarm.
 * Поддерживает два режима работы:
 * 1. Live Mode: Получение данных и управление реальной платой ESP32 по REST API/SSE.
 * 2. Demo Mode: Локальная симуляция датчиков, правил, Mesh-сети и терминала для тестирования.
 */

// Глобальное состояние приложения (по умолчанию Demo-режим)
const AppState = {
  isLive: false,
  espIp: "10.0.0.1",
  theme: "dark", // "dark" или "light"
  activeTab: "dashboard",
  
  // Данные узла (текущие значения)
  sensors: {
    temp: 24.5,
    moisture: 42,
    battery: 88,
    voltage: 3.92,
    uptime: 1240, // в секундах
    freeHeap: 184500, // байт
    ecoMode: true
  },
  
  // Исторические данные для графиков
  history: {
    temp: [23.1, 23.4, 23.8, 24.1, 24.3, 24.5],
    moisture: [45, 44, 44, 43, 43, 42]
  },
  
  // Конфигурация пинов
  pins: {
    "pin_34": { type: "sensor_moisture", label: "G34", name: "Влажность почвы", interval: 10, powerPin: false },
    "pin_27": { type: "relay", label: "G27", name: "Освещение грядок", priority: "RULE" },
    "pin_12": { type: "relay", label: "G12", name: "Насос полива", priority: "MANUAL" }, // невыведенный на SVG, но активный
    "pin_14": { type: "relay", label: "G14", name: "Вентиляция", priority: "AUTO" } // невыведенный на SVG, но активный
  },
  
  // Менеджер правил (RuleEngine)
  rules: [
    { id: 1, trigger: "moisture", condition: "lt", value: 35, target: "pump", duration: 15, cooldown: 60, lastTriggered: 0 }
  ],
  
  // Топология роя (Mesh-сеть)
  meshNodes: [
    { id: "1001", name: "Gateway_Node_0", role: "GATEWAY", rssi: -45, battery: 98, ip: "10.0.0.1", x: 250, y: 200 },
    { id: "1002", name: "Node_Tomato_A", role: "NODE", rssi: -68, battery: 88, parent: "1001", x: 150, y: 100 },
    { id: "1003", name: "Node_Cucumbers_B", role: "NODE", rssi: -72, battery: 74, parent: "1001", x: 350, y: 120 },
    { id: "1004", name: "Node_WaterValve_C", role: "NODE", rssi: -82, battery: 52, parent: "1002", x: 100, y: 300 }
  ],

  // Выбранный для настройки пин
  selectedPin: null
};

// Терминальная история
const TerminalHistory = {
  commands: [],
  historyIndex: -1
};

// ==========================================================================
// Инициализация при загрузке страницы
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initTheme();
  initConnection();
  initDashboardCharts();
  initPinoutVisualizer();
  initRulesBuilder();
  initTerminal();
  
  // Запуск главного фонового цикла (симуляция/опрос)
  setInterval(appTick, 2000);
  
  // Первичная отрисовка всего
  renderDashboard();
  renderMeshNetwork();
  renderRules();
});

// ==========================================================================
// 1. Навигация и Табы
// ==========================================================================
function initNavigation() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetTab = tab.getAttribute("data-tab");
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  // Убрать active со всех табов и секций
  document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  
  // Активировать нужный
  const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  const targetSection = document.getElementById(`tab-${tabId}`);
  
  if (targetBtn && targetSection) {
    targetBtn.classList.add("active");
    targetSection.classList.add("active");
    AppState.activeTab = tabId;
    
    // Перерисовать специфичные компоненты при открытии вкладок
    if (tabId === "mesh") {
      setTimeout(renderMeshNetwork, 100);
    } else if (tabId === "dashboard") {
      setTimeout(drawCharts, 100);
    }
  }
}

// ==========================================================================
// 2. Тема оформления (Светлая / Темная)
// ==========================================================================
function initTheme() {
  const themeBtn = document.getElementById("themeToggleBtn");
  
  // Проверяем сохраненную тему
  const savedTheme = localStorage.getItem("agriswarm-theme");
  if (savedTheme === "light") {
    document.body.classList.remove("dark-theme");
    document.body.classList.add("light-theme");
    AppState.theme = "light";
    themeBtn.textContent = "🌙 Темно";
  }
  
  themeBtn.addEventListener("click", () => {
    if (document.body.classList.contains("dark-theme")) {
      document.body.classList.remove("dark-theme");
      document.body.classList.add("light-theme");
      AppState.theme = "light";
      themeBtn.textContent = "🌙 Темно";
      localStorage.setItem("agriswarm-theme", "light");
    } else {
      document.body.classList.remove("light-theme");
      document.body.classList.add("dark-theme");
      AppState.theme = "dark";
      themeBtn.textContent = "☀️ Поле";
      localStorage.setItem("agriswarm-theme", "dark");
    }
    // Перерисовать графики и mesh под новую палитру
    drawCharts();
    renderMeshNetwork();
  });
}

// ==========================================================================
// 3. Подключение и связь с ESP32 REST API
// ==========================================================================
function initConnection() {
  const connectBtn = document.getElementById("connectBtn");
  const ipInput = document.getElementById("espIpInput");
  
  connectBtn.addEventListener("click", async () => {
    const ip = ipInput.value.trim();
    if (!ip) return;
    
    connectBtn.disabled = true;
    connectBtn.textContent = "Связь...";
    writeTerminalSystem(`Попытка подключения к узлу http://${ip}...`);
    
    try {
      // Имитируем запрос к /api/status платы
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 сек таймаут
      
      const response = await fetch(`http://${ip}/api/status`, { 
        method: "GET", 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        writeTerminalSuccess(`Подключение успешно! Ответ от http://${ip}`);
        AppState.isLive = true;
        AppState.espIp = ip;
        updateConnectionUI(true);
        // Заполняем данные из платы
        syncDataFromESP32(data);
      } else {
        throw new Error(`HTTP Status ${response.status}`);
      }
    } catch (err) {
      console.warn("REST API connection failed, falling back to Demo Mode:", err);
      writeTerminalError(`Ошибка подключения к http://${ip}. Переход в автономный Demo-режим.`);
      AppState.isLive = false;
      updateConnectionUI(false);
    } finally {
      connectBtn.disabled = false;
      connectBtn.textContent = AppState.isLive ? "Отключить" : "Подключить";
    }
  });
}

function updateConnectionUI(isOnline) {
  const statusIndicator = document.getElementById("connectionStatus");
  if (isOnline) {
    statusIndicator.className = "status-indicator status-online";
    statusIndicator.textContent = "Live: Wi-Fi";
  } else {
    statusIndicator.className = "status-indicator status-offline";
    statusIndicator.textContent = "Demo Mode";
  }
}

async function syncDataFromESP32(statusData) {
  // Обновляем локальное состояние из ответа реальной платы
  if (statusData) {
    AppState.sensors.uptime = statusData.uptime || AppState.sensors.uptime;
    AppState.sensors.freeHeap = statusData.free_heap || AppState.sensors.freeHeap;
    AppState.sensors.battery = statusData.battery || AppState.sensors.battery;
    AppState.sensors.voltage = statusData.voltage || AppState.sensors.voltage;
  }
  
  // Дополнительно запрашиваем пины
  try {
    const resPins = await fetch(`http://${AppState.espIp}/api/pins`);
    if (resPins.ok) {
      const pinsData = await resPins.json();
      // Синхронизируем настройки пинов
      updatePinsState(pinsData);
    }
  } catch (e) {
    console.error("Error fetching pins config:", e);
  }
  
  renderDashboard();
}

function updatePinsState(pinsData) {
  // Парсим данные от ESP32 в наш формат
  if (Array.isArray(pinsData)) {
    pinsData.forEach(p => {
      const pinId = `pin_${p.pin}`;
      if (AppState.pins[pinId]) {
        AppState.pins[pinId].type = p.type;
        AppState.pins[pinId].name = p.name;
        if (p.value !== undefined) {
          if (p.type === "sensor_temp") AppState.sensors.temp = parseFloat(p.value);
          if (p.type === "sensor_moisture") AppState.sensors.moisture = parseInt(p.value);
        }
      }
    });
  }
}

// ==========================================================================
// 4. Отрисовка Дашборда и Графики (Canvas Zero-Dependency Plotter)
// ==========================================================================
function renderDashboard() {
  // Текст
  document.getElementById("valTemp").textContent = AppState.sensors.temp.toFixed(1);
  document.getElementById("valMoisture").textContent = AppState.sensors.moisture;
  document.getElementById("valBattery").textContent = AppState.sensors.battery;
  document.getElementById("valVoltage").textContent = AppState.sensors.voltage.toFixed(2) + " В";
  
  // Батарея
  const batteryBar = document.getElementById("valBatteryBar");
  batteryBar.style.width = `${AppState.sensors.battery}%`;
  
  // Эко-режим
  const ecoBadge = document.getElementById("valEcoMode");
  if (AppState.sensors.ecoMode) {
    ecoBadge.className = "badge badge-eco";
    ecoBadge.textContent = "Eco Enabled";
  } else {
    ecoBadge.className = "badge";
    ecoBadge.style.background = "rgba(239, 68, 68, 0.15)";
    ecoBadge.style.color = "var(--danger-color)";
    ecoBadge.textContent = "High Performance";
  }
  
  // Переключатели реле
  // Насос полива (GPIO 12)
  const relayWater = document.getElementById("relayWaterPump");
  // Вентиляция (GPIO 14)
  const relayVent = document.getElementById("relayVentilation");
  // Свет (GPIO 27)
  const relayLight = document.getElementById("relayLighting");
  
  // Привязываем события клика к переключателям
  setupRelayToggle(relayWater, "pin_12", "water_pump");
  setupRelayToggle(relayVent, "pin_14", "ventilation");
  setupRelayToggle(relayLight, "pin_27", "lighting");
  
  drawCharts();
}

function setupRelayToggle(checkbox, pinKey, apiName) {
  // Отвязываем старые слушатели
  checkbox.onchange = null;
  
  checkbox.addEventListener("change", async (e) => {
    const isChecked = e.target.checked;
    writeTerminalSystem(`Ручная команда: переключить ${pinKey} (${apiName}) -> ${isChecked ? "ВКЛ" : "ВЫКЛ"}`);
    
    if (AppState.isLive) {
      try {
        const res = await fetch(`http://${AppState.espIp}/api/pins/toggle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: pinKey.replace("pin_", ""), state: isChecked ? 1 : 0, priority: "MANUAL" })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        writeTerminalSuccess(`ESP32 подтвердил переключение ${apiName}`);
      } catch (err) {
        writeTerminalError(`Сбой связи при управлении реле ${apiName}: ${err.message}`);
        e.target.checked = !isChecked; // Откат назад
      }
    } else {
      // Имитируем локально
      writeTerminalSuccess(`[Имитация] Реле ${apiName} успешно переключено в ${isChecked ? "ON" : "OFF"}`);
    }
  });
}

// Простой Canvas-рисовальщик графиков, работающий полностью оффлайн
function drawCharts() {
  drawSparkline("tempChart", AppState.history.temp, "#ef4444");
  drawSparkline("moistureChart", AppState.history.moisture, "#3b82f6");
}

function drawSparkline(canvasId, data, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  
  // Устанавливаем физическое разрешение канваса с учетом DPI
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);
  
  ctx.clearRect(0, 0, width, height);
  
  if (data.length < 2) return;
  
  const minVal = Math.min(...data) - 0.5;
  const maxVal = Math.max(...data) + 0.5;
  const valRange = maxVal - minVal;
  
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  for (let i = 0; i < data.length; i++) {
    const x = (i / (data.length - 1)) * (width - 10) + 5;
    const y = height - ((data[i] - minVal) / valRange) * (height - 10) - 5;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  
  // Создаем мягкий градиент под линией (эффект свечения)
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, color + "22"); // прозрачный цвет
  grad.addColorStop(1, "transparent");
  
  ctx.lineTo((width - 10) + 5, height);
  ctx.lineTo(5, height);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();
}

function initDashboardCharts() {
  // Настройка размеров канвасов при изменении окна
  window.addEventListener("resize", drawCharts);
}

// ==========================================================================
// 5. Визуальный конфигуратор пинов ESP32 (SVG Board Click Handler)
// ==========================================================================
function initPinoutVisualizer() {
  const pins = document.querySelectorAll(".esp-pin");
  pins.forEach(pin => {
    pin.addEventListener("click", () => {
      selectPin(pin.id);
    });
  });
  
  document.getElementById("pinDeviceType").addEventListener("change", (e) => {
    const type = e.target.value;
    const sensorGrp = document.getElementById("sensorSettingsGrp");
    const relayGrp = document.getElementById("relaySettingsGrp");
    
    sensorGrp.style.display = (type.startsWith("sensor")) ? "block" : "none";
    relayGrp.style.display = (type.startsWith("relay") || type === "vent") ? "block" : "none";
  });
  
  document.getElementById("pinUsePowerPin").addEventListener("change", (e) => {
    document.getElementById("powerPinSubGrp").style.display = e.target.checked ? "block" : "none";
  });
  
  document.getElementById("savePinConfigBtn").addEventListener("click", savePinConfig);
  
  // Подкрасим уже назначенные пины
  updateSvgPinHighlights();
}

function selectPin(pinId) {
  // Проверяем, можно ли настраивать пин (не GND, не 3V3, не EN, не VIN, не RX/TX)
  if (pinId.includes("GND") || pinId.includes("3V3") || pinId === "pin_EN" || pinId === "pin_VIN" || pinId === "pin_1" || pinId === "pin_3") {
    document.getElementById("configPinName").textContent = `Пин ${pinId.replace("pin_", "")} (Зарезервирован)`;
    document.getElementById("pinConfigInputs").style.display = "none";
    return;
  }
  
  // Снять выделение со старого
  document.querySelectorAll(".esp-pin").forEach(p => p.classList.remove("active-pin"));
  
  // Выделить текущий
  const pinEl = document.getElementById(pinId);
  pinEl.classList.add("active-pin");
  AppState.selectedPin = pinId;
  
  // Показать форму настройки
  const pinLabel = pinId.replace("pin_", "GPIO ");
  document.getElementById("configPinName").textContent = `Настройка ${pinLabel}`;
  document.getElementById("pinConfigInputs").style.display = "block";
  
  // Заполнить текущими значениями
  const config = AppState.pins[pinId] || { type: "none" };
  document.getElementById("pinDeviceType").value = config.type || "none";
  
  // Вызов события, чтобы обновить видимость под-групп настроек
  const event = new Event("change");
  document.getElementById("pinDeviceType").dispatchEvent(event);
  
  if (config.type && config.type.startsWith("sensor")) {
    document.getElementById("sensorPollInterval").value = config.interval || 10;
    document.getElementById("pinUsePowerPin").checked = config.powerPin || false;
    document.getElementById("pinUsePowerPin").dispatchEvent(new Event("change"));
  }
  if (config.priority) {
    document.getElementById("relayPriority").value = config.priority;
  }
}

async function savePinConfig() {
  const pinId = AppState.selectedPin;
  if (!pinId) return;
  
  const type = document.getElementById("pinDeviceType").value;
  const pinNumber = pinId.replace("pin_", "");
  
  const config = {
    type: type,
    label: pinId.replace("pin_", "G")
  };
  
  if (type !== "none") {
    if (type.startsWith("sensor")) {
      config.interval = parseInt(document.getElementById("sensorPollInterval").value);
      config.powerPin = document.getElementById("pinUsePowerPin").checked;
      config.name = type === "sensor_temp" ? "Температура воздуха" : "Влажность почвы";
    } else {
      config.priority = document.getElementById("relayPriority").value;
      config.name = type === "relay" ? "Насос полива" : "Вентиляция";
    }
  }
  
  writeTerminalSystem(`Сохранение настроек пина GPIO ${pinNumber}...`);
  
  if (AppState.isLive) {
    try {
      const response = await fetch(`http://${AppState.espIp}/api/pins/setup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinNumber, type: type, interval: config.interval || 0, priority: config.priority || "MANUAL" })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      writeTerminalSuccess(`Пин GPIO ${pinNumber} успешно перенастроен на плате.`);
      AppState.pins[pinId] = config;
    } catch (err) {
      writeTerminalError(`Ошибка сохранения конфигурации пина на ESP32: ${err.message}`);
    }
  } else {
    // В демо-режиме просто сохраняем в ОЗУ
    if (type === "none") {
      delete AppState.pins[pinId];
    } else {
      AppState.pins[pinId] = config;
    }
    writeTerminalSuccess(`[Имитация] Конфигурация пина GPIO ${pinNumber} сохранена.`);
  }
  
  updateSvgPinHighlights();
  renderDashboard();
}

function updateSvgPinHighlights() {
  document.querySelectorAll(".esp-pin").forEach(pinEl => {
    const pinId = pinEl.id;
    // Сбросить классы подсветки
    pinEl.setAttribute("fill", "");
    
    // GND, EN, 3V3 красим отдельно
    if (pinId.includes("GND")) pinEl.setAttribute("fill", "#212121");
    else if (pinId.includes("3V3")) pinEl.setAttribute("fill", "#d32f2f");
    else if (pinId === "pin_EN") pinEl.setAttribute("fill", "#757575");
    else if (pinId.includes("pin_1") || pinId.includes("pin_3")) pinEl.setAttribute("fill", "#757575"); // RX/TX
    else {
      // Это пользовательский пин
      const config = AppState.pins[pinId];
      if (config && config.type !== "none") {
        if (config.type.startsWith("sensor")) {
          pinEl.setAttribute("fill", "var(--pin-mapped-sensor)"); // Оранжевый
        } else {
          pinEl.setAttribute("fill", "var(--pin-mapped-relay)"); // Синий
        }
      } else {
        pinEl.setAttribute("fill", "var(--pin-free)"); // Желтый/свободный
      }
    }
  });
}

// ==========================================================================
// 6. Визуализация Swarm Mesh топологии (Canvas Node Map)
// ==========================================================================
function renderMeshNetwork() {
  const canvas = document.getElementById("meshCanvas");
  if (!canvas || AppState.activeTab !== "mesh") return;
  
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  
  ctx.clearRect(0, 0, width, height);
  
  const isDark = AppState.theme === "dark";
  
  // Рисуем связи (линии) между узлами
  AppState.meshNodes.forEach(node => {
    if (node.parent) {
      const parentNode = AppState.meshNodes.find(n => n.id === node.parent);
      if (parentNode) {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y);
        ctx.lineTo(parentNode.x, parentNode.y);
        ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(15, 23, 42, 0.2)";
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Качество сигнала над линией
        const midX = (node.x + parentNode.x) / 2;
        const midY = (node.y + parentNode.y) / 2;
        ctx.font = `10px ${AppState.font-family}`;
        ctx.fillStyle = node.rssi > -70 ? "var(--success-color)" : "var(--warning-color)";
        ctx.fillText(`${node.rssi} dBm`, midX - 20, midY - 5);
      }
    }
  });
  
  // Рисуем кружки узлов
  AppState.meshNodes.forEach(node => {
    ctx.beginPath();
    ctx.arc(node.x, node.y, 25, 0, 2 * Math.PI);
    
    if (node.role === "GATEWAY") {
      ctx.fillStyle = isDark ? "#10b981" : "#059669";
    } else {
      ctx.fillStyle = isDark ? "#4f46e5" : "#2563eb";
    }
    ctx.fill();
    
    // Белая каемка
    ctx.strokeStyle = isDark ? "#ffffff" : "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Имена
    ctx.font = `bold 10px ${AppState.font-family}`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(node.name.substring(0, 8), node.x, node.y + 4);
    
    // Роль под узлом
    ctx.font = `9px ${AppState.font-family}`;
    ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.6)" : "#475569";
    ctx.fillText(node.role, node.x, node.y + 36);
  });
  
  // Заполняем список узлов справа от карты
  const listEl = document.getElementById("nodesList");
  listEl.innerHTML = "";
  document.getElementById("nodesCount").textContent = AppState.meshNodes.length;
  
  AppState.meshNodes.forEach(node => {
    const item = document.createElement("div");
    item.className = "node-item";
    
    const roleClass = node.role === "GATEWAY" ? "role-gateway" : "role-node";
    const signalStatus = node.rssi > -65 ? "Отличный" : (node.rssi > -80 ? "Средний" : "Слабый");
    
    item.innerHTML = `
      <div class="node-title-row">
        <span class="node-name">${node.name}</span>
        <span class="node-role-badge ${roleClass}">${node.role}</span>
      </div>
      <div class="node-meta-row">
        <span>Signal: ${node.rssi} dBm (${signalStatus})</span>
        <span>Battery: ${node.battery}%</span>
      </div>
    `;
    listEl.appendChild(item);
  });
}

// ==========================================================================
// 7. Менеджер Правил (Rule Builder)
// ==========================================================================
function initRulesBuilder() {
  document.getElementById("addRuleBtn").addEventListener("click", createRule);
}

function renderRules() {
  const container = document.getElementById("rulesContainer");
  container.innerHTML = "";
  
  if (AppState.rules.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Правила автоматизации не настроены.</p>`;
    return;
  }
  
  AppState.rules.forEach(rule => {
    const item = document.createElement("div");
    item.className = "rule-item";
    
    const sensorName = rule.trigger === "temp" ? "Температура" : "Влажность";
    const condSymbol = rule.condition === "lt" ? "<" : ">";
    const valUnit = rule.trigger === "temp" ? "°C" : "%";
    
    const targetName = rule.target === "pump" ? "🚿 Насос полива" : (rule.target === "vent" ? "💨 Вентиляция" : "💡 Освещение");
    
    item.innerHTML = `
      <div class="rule-body">
        ЕСЛИ <span class="rule-highlight">${sensorName}</span> ${condSymbol} <span class="rule-val-hl">${rule.value}${valUnit}</span>, 
        ТО активировать <span class="rule-highlight">${targetName}</span> на <span class="rule-val-hl">${rule.duration} сек</span> 
        (Кулдаун: ${rule.cooldown} сек)
      </div>
      <button class="rule-delete-btn" onclick="deleteRule(${rule.id})">Удалить</button>
    `;
    container.appendChild(item);
  });
}

async function createRule() {
  const trigger = document.getElementById("ruleTriggerSensor").value;
  const condition = document.getElementById("ruleCondition").value;
  const value = parseInt(document.getElementById("ruleValue").value);
  const actionTarget = document.getElementById("ruleActionTarget").value;
  const duration = parseInt(document.getElementById("ruleDuration").value);
  const cooldown = parseInt(document.getElementById("ruleCooldown").value);
  
  // Превращаем actionTarget в название устройства
  let target = "pump";
  if (actionTarget === "vent") target = "vent";
  if (actionTarget === "light") target = "light";
  
  const newRule = {
    id: Date.now(),
    trigger: trigger,
    condition: condition,
    value: value,
    target: target,
    duration: duration,
    cooldown: cooldown,
    lastTriggered: 0
  };
  
  writeTerminalSystem(`Запись нового правила автоматизации...`);
  
  if (AppState.isLive) {
    try {
      const res = await fetch(`http://${AppState.espIp}/api/rules/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRule)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      writeTerminalSuccess("Правило сохранено во флеш-память ESP32.");
      AppState.rules.push(newRule);
    } catch (e) {
      writeTerminalError(`Ошибка записи правила в ESP32: ${e.message}`);
    }
  } else {
    AppState.rules.push(newRule);
    writeTerminalSuccess("[Имитация] Правило сохранено в оперативную память.");
  }
  
  renderRules();
}

async function deleteRule(id) {
  writeTerminalSystem(`Удаление правила с ID ${id}...`);
  
  if (AppState.isLive) {
    try {
      const res = await fetch(`http://${AppState.espIp}/api/rules/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: id })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      writeTerminalSuccess("Правило удалено на плате.");
      AppState.rules = AppState.rules.filter(r => r.id !== id);
    } catch (e) {
      writeTerminalError(`Сбой связи при удалении правила: ${e.message}`);
    }
  } else {
    AppState.rules = AppState.rules.filter(r => r.id !== id);
    writeTerminalSuccess("[Имитация] Правило удалено.");
  }
  
  renderRules();
}

// Выносим deleteRule в глобальную область, так как она вызывается из onclick в HTML
window.deleteRule = deleteRule;

// ==========================================================================
// 8. Терминал CLI (Command Line Interface)
// ==========================================================================
function initTerminal() {
  const terminalInput = document.getElementById("terminalInput");
  const chips = document.querySelectorAll(".chip-btn");
  
  terminalInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const cmd = terminalInput.value.trim();
      if (cmd) {
        executeCliCommand(cmd);
        terminalInput.value = "";
      }
    }
  });
  
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const cmd = chip.getAttribute("data-cmd");
      executeCliCommand(cmd);
    });
  });
}

function executeCliCommand(cmd) {
  // Вывод команды в консоль
  writeTerminalUserCmd(cmd);
  
  if (AppState.isLive) {
    // В Live режиме отправляем по HTTP POST к /api/cli
    sendCliToESP32(cmd);
  } else {
    // Симуляция ответов в Demo режиме
    setTimeout(() => {
      const lowerCmd = cmd.toLowerCase().trim();
      if (lowerCmd === "help") {
        writeTerminalLine(`Доступные команды в Demo-режиме:
  help        - Показать это руководство
  status      - Состояние системы и памяти
  node_list   - Список узлов mesh-сети
  topics_tree - Дерево топиков данных
  blackbox rtc- Считать лог аварий из RTC SRAM
  clear       - Очистить консоль`);
      } else if (lowerCmd === "status") {
        writeTerminalLine(`=== SYSTEM STATUS ===
  Uptime: ${AppState.sensors.uptime} сек
  DRAM Free: ${AppState.sensors.freeHeap} байт
  Battery: ${AppState.sensors.battery}% (${AppState.sensors.voltage.toFixed(2)}V)
  Eco-Mode: Active
  Mesh SSID: AgriSwarmMesh
  Nodes In Mesh: ${AppState.meshNodes.length}`);
      } else if (lowerCmd === "node_list") {
        let out = "=== MESH NODES LIST ===\n";
        AppState.meshNodes.forEach(n => {
          out += `* [${n.id}] Name: ${n.name} | Role: ${n.role} | RSSI: ${n.rssi} dBm | Battery: ${n.battery}%\n`;
        });
        writeTerminalLine(out.trim());
      } else if (lowerCmd === "topics_tree") {
        writeTerminalLine(`=== DATA TOPICS TREE ===
  swarm/
    gateway/
      status -> JSON
    nodes/
      tomato_a/
        temp -> 24.5 °C
        moisture -> 42%
      cucumbers_b/
        temp -> 22.8 °C
      watervalve_c/
        state -> OFF`);
      } else if (lowerCmd === "blackbox rtc") {
        writeTerminalLine(`=== BLACKBOX RTC REPORT ===
  [CRASH DETECTED]
  Timestamp: RTC Epoch + 1824 sec
  Reason: Watchdog Reset (WDT) triggered in task 'NetworkTask'
  PC: 0x400D28F0
  EXCVADDR: 0x00000000
  Stack Dump: 0x3ffb1a20 ... 0x3ffb1b50
  System Recovery: SUCCESS (Re-established mesh in 480ms)`);
      } else if (lowerCmd === "clear") {
        document.getElementById("terminalOutput").innerHTML = "";
      } else {
        writeTerminalLine(`Unknown command: '${cmd}'. Type 'help' for support.`);
      }
    }, 100);
  }
}

async function sendCliToESP32(cmd) {
  try {
    const response = await fetch(`http://${AppState.espIp}/api/cli`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: cmd })
    });
    if (response.ok) {
      const outputText = await response.text();
      writeTerminalLine(outputText);
    } else {
      writeTerminalError(`Ошибка сервера: HTTP ${response.status}`);
    }
  } catch (err) {
    writeTerminalError(`Сбой связи при передаче CLI-команды: ${err.message}`);
  }
}

function writeTerminalLine(text, className = "system-msg") {
  const output = document.getElementById("terminalOutput");
  const line = document.createElement("div");
  line.className = `terminal-line ${className}`;
  line.innerText = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function writeTerminalUserCmd(text) {
  writeTerminalLine(text, "user-cmd");
}

function writeTerminalSystem(text) {
  writeTerminalLine(text, "system-msg");
}

function writeTerminalSuccess(text) {
  writeTerminalLine(text, "success-msg");
}

function writeTerminalError(text) {
  writeTerminalLine(text, "error-msg");
}

// ==========================================================================
// 9. Жизненный цикл - Таймер опроса и симуляции (appTick)
// ==========================================================================
function appTick() {
  AppState.sensors.uptime += 2;
  
  if (AppState.isLive) {
    // В Live режиме каждую секунду запрашиваем обновленные показания
    pollLiveTelemetry();
  } else {
    // В Demo режиме плавно изменяем датчики, чтобы эмулировать жизнь
    simulateTelemetry();
  }
}

async function pollLiveTelemetry() {
  try {
    const res = await fetch(`http://${AppState.espIp}/api/status`);
    if (res.ok) {
      const data = await res.json();
      AppState.sensors.freeHeap = data.free_heap || AppState.sensors.freeHeap;
      AppState.sensors.uptime = data.uptime || AppState.sensors.uptime;
      AppState.sensors.battery = data.battery || AppState.sensors.battery;
      AppState.sensors.voltage = data.voltage || AppState.sensors.voltage;
    }
    
    const resPins = await fetch(`http://${AppState.espIp}/api/pins`);
    if (resPins.ok) {
      const data = await resPins.json();
      updatePinsState(data);
    }
    
    renderDashboard();
  } catch (err) {
    console.warn("Telemetry polling failed:", err);
  }
}

function simulateTelemetry() {
  // Колебания температуры (-0.2 до +0.2)
  const tempDiff = (Math.random() - 0.5) * 0.4;
  AppState.sensors.temp = Math.max(10, Math.min(45, AppState.sensors.temp + tempDiff));
  
  // Колебания влажности почвы (-1 до +1)
  const moistDiff = Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
  AppState.sensors.moisture = Math.max(10, Math.min(99, AppState.sensors.moisture + moistDiff));
  
  // Накапливаем историю (ограничиваем 10 точками)
  AppState.history.temp.push(AppState.sensors.temp);
  if (AppState.history.temp.length > 10) AppState.history.temp.shift();
  
  AppState.history.moisture.push(AppState.sensors.moisture);
  if (AppState.history.moisture.length > 10) AppState.history.moisture.shift();
  
  // Эмуляция разряда батареи (очень медленно)
  if (Math.random() > 0.98) {
    AppState.sensors.battery = Math.max(10, AppState.sensors.battery - 1);
    AppState.sensors.voltage = 3.3 + (AppState.sensors.battery / 100) * 0.7;
  }
  
  // Проверяем правила автоматизации
  evaluateRulesDemo();
  
  // Перерисовываем
  renderDashboard();
  
  // Обновляем батарейки в узлах mesh
  AppState.meshNodes.forEach(node => {
    if (node.role !== "GATEWAY" && Math.random() > 0.95) {
      node.battery = Math.max(1, node.battery - 1);
    }
  });
  renderMeshNetwork();
}

function evaluateRulesDemo() {
  const pumpRelay = document.getElementById("relayWaterPump");
  const ventRelay = document.getElementById("relayVentilation");
  
  AppState.rules.forEach(rule => {
    let sensorValue = 0;
    if (rule.trigger === "temp") sensorValue = AppState.sensors.temp;
    if (rule.trigger === "moisture") sensorValue = AppState.sensors.moisture;
    
    let isTriggered = false;
    if (rule.condition === "lt" && sensorValue < rule.value) isTriggered = true;
    if (rule.condition === "gt" && sensorValue > rule.value) isTriggered = true;
    
    const now = AppState.sensors.uptime;
    
    if (isTriggered && (now - rule.lastTriggered > rule.cooldown)) {
      rule.lastTriggered = now;
      writeTerminalLine(`[RuleEngine] Сработало правило! Датчик ${rule.trigger} = ${sensorValue}. Действие: включить ${rule.target} на ${rule.duration} сек.`, "success-msg");
      
      // Включаем насос или вентилятор
      if (rule.target === "pump") {
        pumpRelay.checked = true;
        setTimeout(() => {
          pumpRelay.checked = false;
          writeTerminalLine(`[RuleEngine] Действие правила завершено. Отключение ${rule.target}.`, "system-msg");
        }, rule.duration * 1000);
      } else if (rule.target === "vent") {
        ventRelay.checked = true;
        setTimeout(() => {
          ventRelay.checked = false;
          writeTerminalLine(`[RuleEngine] Действие правила завершено. Отключение ${rule.target}.`, "system-msg");
        }, rule.duration * 1000);
      }
    }
  });
}
