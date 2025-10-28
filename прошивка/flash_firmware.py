#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для загрузки прошивки на ESP32
Автоматически определяет COM-порты и предоставляет графический интерфейс
"""

import sys
import os
import serial
import serial.tools.list_ports
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import subprocess
import threading

class ModernFlashFirmwareGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("🌾 AgriSwarm - ESP32 Flasher")
        self.root.geometry("1200x700")  # Широкое окно для двух колонок
        self.root.resizable(True, True)  # Разрешить изменение размера
        self.root.minsize(900, 550)  # Минимальный размер
        self.root.configure(bg="#f8f9fa")

        # Настройка стиля
        self.setup_style()

        # Путь к firmware.bin по умолчанию
        # Сначала ищем в папке firmware/
        firmware_dir = os.path.join(os.path.dirname(__file__), "firmware")
        default_path_firmware = os.path.join(firmware_dir, "firmware.bin")
        default_path_root = os.path.join(os.path.dirname(__file__), "firmware.bin")
        
        # Проверяем наличие папки firmware с файлами
        if os.path.exists(firmware_dir) and os.path.exists(default_path_firmware):
            self.firmware_path = default_path_firmware
            self.firmware_base_dir = firmware_dir  # Базовая директория для поиска других файлов
        elif os.path.exists(default_path_root):
            self.firmware_path = default_path_root
            self.firmware_base_dir = os.path.dirname(__file__)  # Корневая директория
        else:
            self.firmware_path = ""
            self.firmware_base_dir = os.path.dirname(__file__)

        # Список доступных COM-портов
        self.com_ports = self.get_com_ports()

        # Флаги состояния
        self.is_flashing = False

        self.setup_ui()
        
    def setup_style(self):
        """Настройка современного стиля"""
        # Настройка стиля для ttk элементов
        self.style = ttk.Style()

        # Стиль для кнопок
        self.style.configure(
            "Modern.TButton",
            padding=10,
            relief="flat",
            background="#007bff",
            foreground="white",
            font=("Segoe UI", 10, "bold"),
            borderwidth=0
        )
        self.style.map(
            "Modern.TButton",
            background=[("active", "#0056b3"), ("!active", "#007bff")],
            foreground=[("active", "white")]
        )

        # Стиль для рамок
        self.style.configure(
            "Card.TFrame",
            background="white",
            relief="flat",
            borderwidth=1
        )

        # Стиль для меток
        self.style.configure(
            "Title.TLabel",
            font=("Segoe UI", 16, "bold"),
            background="#f8f9fa",
            foreground="#212529"
        )

        self.style.configure(
            "Section.TLabel",
            font=("Segoe UI", 11, "bold"),
            background="white",
            foreground="#495057"
        )

        self.style.configure(
            "Status.TLabel",
            font=("Segoe UI", 9),
            background="#f8f9fa",
            foreground="#6c757d"
        )

        # Стиль для прогресс-бара
        self.style.configure(
            "Horizontal.TProgressbar",
            background="#007bff",
            troughcolor="#e9ecef",
            borderwidth=0,
            lightcolor="#007bff",
            darkcolor="#007bff"
        )

    def setup_ui(self):
        """Создание современного интерфейса"""
        # Основной контейнер с двумя колонками
        main_container = ttk.Frame(self.root)
        main_container.pack(fill="both", expand=True, padx=10, pady=10)

        # ЛЕВАЯ КОЛОНКА - Настройки
        left_frame = ttk.Frame(main_container, style="Card.TFrame")
        left_frame.pack(side="left", fill="both", expand=False, padx=(0, 5))
        left_frame.configure(width=500)  # Фиксированная ширина
        left_frame.pack_propagate(False)

        # ПРАВАЯ КОЛОНКА - Логи и прогресс
        right_frame = ttk.Frame(main_container, style="Card.TFrame")
        right_frame.pack(side="right", fill="both", expand=True, padx=(5, 0))
        
        # Сохраняем ссылку на правую панель
        self.log_panel = right_frame

        # Создаем Canvas для прокрутки в левой колонке
        canvas = tk.Canvas(left_frame, bg="white", highlightthickness=0)
        scrollbar = ttk.Scrollbar(left_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas, style="Card.TFrame")

        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)

        # Привязываем колесо мыши для прокрутки
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)

        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        # Настройка правой панели с логами
        self.setup_log_panel(right_frame)

        # Переменная для хранения вывода в процессе загрузки
        self.flash_output = []

        # Заголовок с иконкой
        title_frame = ttk.Frame(scrollable_frame)
        title_frame.pack(pady=(10, 20), fill="x", padx=20)

        title_label = ttk.Label(
            title_frame,
            text="🌾 AgriSwarm",
            style="Title.TLabel"
        )
        title_label.pack(side="left")

        subtitle_label = ttk.Label(
            title_frame,
            text="ESP32 Firmware Flasher",
            style="Title.TLabel"
        )
        subtitle_label.pack(side="right")

        # Секция COM-порта
        com_section = self.create_section(scrollable_frame, "🔌 COM-порт", 15)

        # Выпадающий список COM-портов
        self.com_var = tk.StringVar(value=self.com_ports[0] if self.com_ports else "COM-порты не найдены")

        com_frame = ttk.Frame(com_section)
        com_frame.pack(fill="x", pady=5, padx=15)

        ttk.Label(
            com_frame,
            text="Выберите порт:",
            font=("Segoe UI", 10),
            background="white"
        ).pack(anchor="w", pady=(0, 5))

        # Стильный комбо-бокс
        self.com_combo = ttk.Combobox(
            com_frame,
            textvariable=self.com_var,
            values=self.com_ports,
            state="readonly",
            font=("Segoe UI", 10),
            width=35
        )
        self.com_combo.pack(fill="x", pady=(0, 10))

        # Кнопка обновления
        refresh_frame = ttk.Frame(com_frame)
        refresh_frame.pack(fill="x")

        refresh_btn = tk.Button(
            refresh_frame,
            text="🔄 Обновить список",
            command=self.refresh_com_ports,
            relief="flat",
            bg="#28a745",
            fg="white",
            font=("Segoe UI", 9, "bold"),
            padx=10,
            pady=5,
            cursor="hand2"
        )
        refresh_btn.pack(anchor="w")

        # Секция файла прошивки
        file_section = self.create_section(scrollable_frame, "📁 Файл прошивки", 15)

        self.file_var = tk.StringVar(value=self.firmware_path)

        file_frame = ttk.Frame(file_section)
        file_frame.pack(fill="x", pady=5, padx=15)

        ttk.Label(
            file_frame,
            text="Путь к файлу:",
            font=("Segoe UI", 10),
            background="white"
        ).pack(anchor="w", pady=(0, 5))

        # Поле ввода с рамкой
        file_entry_frame = ttk.Frame(file_frame)
        file_entry_frame.pack(fill="x", pady=(0, 10))

        file_entry = tk.Entry(
            file_entry_frame,
            textvariable=self.file_var,
            font=("Consolas", 9),
            relief="solid",
            borderwidth=1,
            bg="white"
        )
        file_entry.pack(side="left", fill="x", expand=True, padx=(0, 10))

        # Кнопки выбора
        browse_btn = tk.Button(
            file_entry_frame,
            text="📁 Обзор",
            command=self.browse_file,
            relief="flat",
            bg="#6c757d",
            fg="white",
            font=("Segoe UI", 9, "bold"),
            padx=12,
            pady=5,
            cursor="hand2"
        )
        browse_btn.pack(side="right", padx=(0, 5))
        
        # Кнопка сброса к умолчанию
        reset_btn = tk.Button(
            file_entry_frame,
            text="🔄 По умолчанию",
            command=self.reset_to_default,
            relief="flat",
            bg="#17a2b8",
            fg="white",
            font=("Segoe UI", 9, "bold"),
            padx=12,
            pady=5,
            cursor="hand2"
        )
        reset_btn.pack(side="right")

        # Информация о файле
        self.file_info_label = ttk.Label(
            file_section,
            text=self.get_file_info(),
            font=("Segoe UI", 8),
            background="white",
            foreground="#6c757d"
        )
        self.file_info_label.pack(anchor="w", pady=5)

        # Кнопка загрузки
        button_frame = ttk.Frame(scrollable_frame)
        button_frame.pack(pady=20, fill="x", padx=20)

        self.flash_btn = tk.Button(
            button_frame,
            text="🚀 ЗАГРУЗИТЬ ПРОШИВКУ",
            command=self.flash_firmware,
            relief="flat",
            bg="#007bff",
            fg="white",
            font=("Segoe UI", 14, "bold"),
            padx=30,
            pady=15,
            cursor="hand2",
            state="normal"
        )
        self.flash_btn.pack(fill="x")

        # Статусная строка
        status_frame = ttk.Frame(self.root, padding="10")
        status_frame.pack(fill="x", side="bottom")

        self.status_label = ttk.Label(
            status_frame,
            text="✅ Готов к загрузке",
            style="Status.TLabel"
        )
        self.status_label.pack(side="left")

        # Прогресс-бар (скрытый по умолчанию)
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(
            status_frame,
            variable=self.progress_var,
            maximum=100,
            style="Horizontal.TProgressbar"
        )

        # Изначально скрываем прогресс-бар
        self.progress_bar.pack_forget()

    def setup_log_panel(self, parent):
        """Настройка правой панели с логами"""
        # Заголовок панели
        log_title = ttk.Label(
            parent,
            text="📋 Лог загрузки",
            style="Section.TLabel",
            font=("Segoe UI", 12, "bold")
        )
        log_title.pack(pady=10, anchor="w", padx=15)

        # Разделитель
        separator = ttk.Separator(parent, orient="horizontal")
        separator.pack(fill="x", padx=15)

        # Прогресс-бар в правой панели
        self.progress_label = ttk.Label(
            parent,
            text="⏸ Готов к загрузке",
            font=("Segoe UI", 10),
            foreground="#6c757d"
        )
        self.progress_label.pack(pady=(15, 10), anchor="w", padx=15)

        self.progress_var_right = tk.DoubleVar()
        self.progress_bar_right = ttk.Progressbar(
            parent,
            variable=self.progress_var_right,
            maximum=100,
            style="Horizontal.TProgressbar"
        )
        self.progress_bar_right.pack(fill="x", padx=15, pady=(0, 15))

        # Текстовое поле для логов
        self.log_text = tk.Text(
            parent,
            height=20,
            font=("Consolas", 9),
            bg="#1e1e1e",
            fg="#d4d4d4",
            wrap="word",
            relief="flat",
            borderwidth=1
        )
        self.log_text.pack(fill="both", expand=True, padx=15, pady=(0, 15))

        # Скроллбар для логов
        log_scrollbar = ttk.Scrollbar(parent, orient="vertical", command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=log_scrollbar.set)
        log_scrollbar.pack(side="right", fill="y", pady=(0, 15))

        # Кнопка копирования логов
        buttons_frame = ttk.Frame(parent)
        buttons_frame.pack(fill="x", padx=15, pady=(0, 15))

        copy_logs_btn = tk.Button(
            buttons_frame,
            text="📋 Копировать логи",
            command=self.copy_logs,
            relief="flat",
            bg="#6c757d",
            fg="white",
            font=("Segoe UI", 9, "bold"),
            padx=15,
            pady=8,
            cursor="hand2"
        )
        copy_logs_btn.pack(side="left", padx=(0, 10))

        copy_info_btn = tk.Button(
            buttons_frame,
            text="📄 Копировать информацию",
            command=self.copy_file_info,
            relief="flat",
            bg="#17a2b8",
            fg="white",
            font=("Segoe UI", 9, "bold"),
            padx=15,
            pady=8,
            cursor="hand2"
        )
        copy_info_btn.pack(side="left")

    def add_log(self, message, level="info"):
        """Добавить запись в лог"""
        # Определяем цвет по уровню
        colors = {
            "info": "#d4d4d4",
            "success": "#4ec9b0",
            "warning": "#ffa500",
            "error": "#f48771"
        }
        color = colors.get(level, "#d4d4d4")

        # Добавляем сообщение
        self.log_text.insert("end", f"{message}\n")
        
        # Ограничиваем количество строк (последние 100)
        if int(self.log_text.index("end-1c").split('.')[0]) > 100:
            self.log_text.delete("1.0", "2.0")

        # Прокручиваем вниз
        self.log_text.see("end")
        self.root.update()

    def update_progress(self, value, text):
        """Обновить прогресс-бар в правой панели"""
        self.progress_var_right.set(value)
        self.progress_label.config(text=text)

    def copy_logs(self):
        """Копировать логи в буфер обмена"""
        try:
            logs_content = self.log_text.get("1.0", "end-1c")
            if logs_content.strip():
                self.root.clipboard_clear()
                self.root.clipboard_append(logs_content)
                self.status_label.config(text="✅ Логи скопированы в буфер обмена", foreground="#28a745")
                self.root.after(2000, lambda: self.status_label.config(text="✅ Готов к загрузке", foreground="#6c757d"))
            else:
                messagebox.showinfo("Информация", "Логи пусты")
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось скопировать логи:\n{e}")

    def copy_file_info(self):
        """Копировать информацию о файле в буфер обмена"""
        try:
            firmware_file = self.file_var.get()
            if not firmware_file or not os.path.exists(firmware_file):
                messagebox.showwarning("Предупреждение", "Файл прошивки не выбран")
                return

            # Собираем информацию
            com_port = self.com_var.get()
            firmware_dir = os.path.dirname(firmware_file)
            bootloader_file = os.path.join(firmware_dir, "bootloader.bin")
            partitions_file = os.path.join(firmware_dir, "partitions.bin")

            # Формируем информацию о файлах
            bootloader_status = "✅ Найден" if os.path.exists(bootloader_file) else "❌ Не найден"
            bootloader_size = f"{os.path.getsize(bootloader_file) / 1024:.2f} KB" if os.path.exists(bootloader_file) else "N/A"
            
            partitions_status = "✅ Найден" if os.path.exists(partitions_file) else "❌ Не найден"
            partitions_size = f"{os.path.getsize(partitions_file) / 1024:.2f} KB" if os.path.exists(partitions_file) else "N/A"
            
            info = f"""🌾 AgriSwarm ESP32 Firmware Flasher - Информация

📅 Дата: {self.get_current_timestamp()}
🔌 COM-порт: {com_port}

📁 ФАЙЛЫ ПРОШИВКИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 bootloader.bin: {bootloader_status}
   Путь: {bootloader_file}
   Размер: {bootloader_size}

📋 partitions.bin: {partitions_status}
   Путь: {partitions_file}
   Размер: {partitions_size}

📦 firmware.bin: ✅ Найден
   Путь: {firmware_file}
   Размер: {os.path.getsize(firmware_file) / (1024 * 1024):.2f} MB

⚙️ НАСТРОЙКИ ЗАГРУЗКИ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Скорость загрузки: 921600 baud
• Flash mode: dio
• Flash frequency: 40m
• Чип: ESP32
• Адреса загрузки:
  - 0x1000: bootloader.bin
  - 0x8000: partitions.bin
  - 0x10000: firmware.bin

🔧 ТЕХНИЧЕСКАЯ ИНФОРМАЦИЯ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"""
            
            # Добавляем метаданные файлов
            import time
            if os.path.exists(bootloader_file):
                info += f"\n📦 bootloader.bin изменен: {time.ctime(os.path.getmtime(bootloader_file))}"
            if os.path.exists(partitions_file):
                info += f"\n📋 partitions.bin изменен: {time.ctime(os.path.getmtime(partitions_file))}"
            
            mtime_firmware = time.ctime(os.path.getmtime(firmware_file))
            info += f"\n📦 firmware.bin изменен: {mtime_firmware}"
            
            # Копируем в буфер обмена
            self.root.clipboard_clear()
            self.root.clipboard_append(info)
            self.status_label.config(text="✅ Информация скопирована в буфер обмена", foreground="#28a745")
            self.root.after(2000, lambda: self.status_label.config(text="✅ Готов к загрузке", foreground="#6c757d"))
            
        except Exception as e:
            messagebox.showerror("Ошибка", f"Не удалось скопировать информацию:\n{e}")

    def get_current_timestamp(self):
        """Получить текущую дату и время"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    def create_section(self, parent, title, pady):
        """Создать секцию с заголовком"""
        section = ttk.Frame(parent)
        section.pack(fill="x", pady=pady, padx=20)

        # Заголовок секции
        title_label = ttk.Label(
            section,
            text=title,
            style="Section.TLabel"
        )
        title_label.pack(anchor="w", pady=(0, 10))

        # Разделительная линия
        separator = ttk.Separator(section, orient="horizontal")
        separator.pack(fill="x", pady=(0, 5))

        return section
        
    def get_com_ports(self):
        """Получить список доступных COM-портов"""
        ports = serial.tools.list_ports.comports()
        com_list = [f"{port.device} - {port.description}" for port in ports]
        return com_list if com_list else ["COM-порты не найдены"]

    def get_file_info(self):
        """Получить информацию о файле"""
        if not self.firmware_path or not os.path.exists(self.firmware_path):
            return "📄 Файл не выбран"

        size = os.path.getsize(self.firmware_path)
        size_mb = size / (1024 * 1024)

        import time
        mtime = time.ctime(os.path.getmtime(self.firmware_path))

        return f"📊 Размер: {size_mb:.2f} MB | 📅 Изменен: {mtime[:10]}"

    def update_file_info(self):
        """Обновить информацию о файле"""
        self.file_info_label.config(text=self.get_file_info())

    def refresh_com_ports(self):
        """Обновить список COM-портов"""
        self.com_ports = self.get_com_ports()
        self.com_combo['values'] = self.com_ports
        self.com_var.set(self.com_ports[0] if self.com_ports else "COM-порты не найдены")

        self.status_label.config(text="🔄 Список COM-портов обновлен", foreground="#28a745")
        self.root.after(2000, lambda: self.status_label.config(text="✅ Готов к загрузке", foreground="#6c757d"))

    def browse_file(self):
        """Выбрать файл прошивки"""
        filename = filedialog.askopenfilename(
            title="Выберите файл прошивки (.bin)",
            filetypes=[
                ("Binary files", "*.bin"),
                ("All files", "*.*")
            ],
            initialdir=os.path.dirname(self.firmware_path) if self.firmware_path else "."
        )

        if filename:
            self.firmware_path = filename  # Сохраняем путь
            self.firmware_base_dir = os.path.dirname(filename)  # Обновляем базовую директорию
            self.file_var.set(filename)
            self.update_file_info()

    def reset_to_default(self):
        """Сбросить к файлам по умолчанию"""
        # Определяем путь по умолчанию
        firmware_dir = os.path.join(os.path.dirname(__file__), "firmware")
        default_path_firmware = os.path.join(firmware_dir, "firmware.bin")
        default_path_root = os.path.join(os.path.dirname(__file__), "firmware.bin")
        
        if os.path.exists(firmware_dir) and os.path.exists(default_path_firmware):
            self.firmware_path = default_path_firmware
            self.firmware_base_dir = firmware_dir
            self.file_var.set(default_path_firmware)
            self.status_label.config(text="✅ Используется папка firmware/", foreground="#28a745")
        elif os.path.exists(default_path_root):
            self.firmware_path = default_path_root
            self.firmware_base_dir = os.path.dirname(__file__)
            self.file_var.set(default_path_root)
            self.status_label.config(text="✅ Используется корневая папка", foreground="#28a745")
        else:
            self.status_label.config(text="❌ Файлы по умолчанию не найдены", foreground="#dc3545")
        
        self.root.after(2000, lambda: self.status_label.config(text="✅ Готов к загрузке", foreground="#6c757d"))
        self.update_file_info()

    def validate_inputs(self):
        """Проверить корректность ввода"""
        com_port = self.com_var.get()
        firmware_file = self.file_var.get()

        if not com_port or "COM" not in com_port:
            messagebox.showerror("Ошибка", "❌ Не выбран COM-порт!")
            return False

        if not firmware_file or not os.path.exists(firmware_file):
            messagebox.showerror("Ошибка", "❌ Файл прошивки не выбран или не найден!")
            return False

        if not firmware_file.lower().endswith('.bin'):
            messagebox.showerror("Ошибка", "❌ Выберите файл с расширением .bin!")
            return False

        # Проверяем esptool
        try:
            import esptool
        except ImportError:
            messagebox.showerror("Ошибка", "❌ esptool не установлен!\n\nУстановите: pip install esptool pyserial")
            return False

        return True

    def show_progress(self, value, text):
        """Обновить прогресс и статус"""
        self.progress_var.set(value)
        self.status_label.config(text=text)
        # Обновляем также правую панель
        self.update_progress(value, text)
        self.root.update()

    def flash_firmware_thread(self, com_port, firmware_file):
        """Загрузка прошивки в отдельном потоке"""
        try:
            # Проверяем esptool
            try:
                import esptool
                self.show_progress(10, "🔧 Запуск esptool...")
                self.add_log(f"🚀 Начало загрузки прошивки", "info")
                self.add_log(f"📁 Файл: {os.path.basename(firmware_file)}", "info")
                self.add_log(f"🔌 Порт: {com_port}", "info")

                # Определяем базовую директорию с firmware
                # Используем сохраненную базовую директорию или директорию файла
                firmware_dir = getattr(self, 'firmware_base_dir', os.path.dirname(firmware_file))
                bootloader_file = os.path.abspath(os.path.join(firmware_dir, "bootloader.bin"))
                partitions_file = os.path.abspath(os.path.join(firmware_dir, "partitions.bin"))
                
                # Диагностика
                self.add_log(f"🔍 Путь firmware: {firmware_dir}", "info")
                self.add_log(f"🔍 Bootloader путь: {bootloader_file}", "info")
                self.add_log(f"🔍 Partitions путь: {partitions_file}", "info")
                
                # Проверяем наличие всех необходимых файлов
                files_to_upload = []
                bootloader_exists = os.path.exists(bootloader_file)
                partitions_exists = os.path.exists(partitions_file)
                
                self.add_log(f"🔍 Bootloader существует: {bootloader_exists}", "info")
                self.add_log(f"🔍 Partitions существует: {partitions_exists}", "info")
                
                if bootloader_exists:
                    files_to_upload.extend(["0x1000", bootloader_file])
                    self.add_log(f"📦 Bootloader: {os.path.basename(bootloader_file)} → 0x1000", "info")
                else:
                    self.add_log(f"⚠️ bootloader.bin не найден", "warning")
                
                if partitions_exists:
                    files_to_upload.extend(["0x8000", partitions_file])
                    self.add_log(f"📋 Partitions: {os.path.basename(partitions_file)} → 0x8000", "info")
                else:
                    self.add_log(f"⚠️ partitions.bin не найден", "warning")
                
                # Определяем адрес для firmware
                if bootloader_exists and partitions_exists:
                    # Полная загрузка: bootloader + partitions + firmware
                    firmware_address = "0x10000"
                    files_to_upload.extend([firmware_address, firmware_file])
                    self.add_log(f"📦 Firmware: {os.path.basename(firmware_file)} → 0x10000", "info")
                elif bootloader_exists:
                    # Только bootloader: загружаем firmware на 0x10000
                    firmware_address = "0x10000"
                    files_to_upload.extend([firmware_address, firmware_file])
                    self.add_log(f"📦 Firmware: {os.path.basename(firmware_file)} → 0x10000", "info")
                    self.add_log(f"⚠️ Partitions отсутствует, используем упрощенный режим", "warning")
                else:
                    # Нет bootloader: простая загрузка firmware на 0x1000
                    firmware_address = "0x1000"
                    files_to_upload = [firmware_address, firmware_file]
                    self.add_log(f"📦 Firmware: {os.path.basename(firmware_file)} → 0x1000", "info")
                    self.add_log(f"⚠️ Bootloader отсутствует, простая загрузка", "warning")

                # Команда для загрузки с параметрами из platformio.ini
                cmd = [
                    sys.executable, "-m", "esptool",
                    "--chip", "esp32",
                    "--port", com_port,
                    "--baud", "921600",
                    "--before", "default_reset",
                    "--after", "hard_reset",
                    "write_flash",
                    "-z",  # Сжатие для ускорения
                    "--flash_mode", "dio",
                    "--flash_freq", "40m",
                    "--flash_size", "detect"
                ]
                
                # Добавляем файлы для загрузки
                cmd.extend(files_to_upload)

                self.show_progress(20, "📡 Подключение к ESP32...")

                # Запускаем процесс
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )

                # Читаем вывод в реальном времени
                for line in iter(process.stdout.readline, ''):
                    line = line.strip()
                    if line:
                        self.add_log(line, "info")
                        if "Writing at" in line:
                            self.show_progress(30, "📝 Запись прошивки...")
                        elif "Wrote" in line and "bytes" in line:
                            self.show_progress(80, "💾 Запись завершена, проверка...")
                        elif "Hard resetting" in line:
                            self.show_progress(90, "🔄 Перезагрузка ESP32...")

                process.wait()

                if process.returncode == 0:
                    self.show_progress(100, "✅ Прошивка успешно загружена!")
                    self.add_log("✅ Прошивка успешно загружена!", "success")
                    self.root.after(1000, lambda: messagebox.showinfo(
                        "Успех! 🎉",
                        "Прошивка успешно загружена на ESP32!\n\n"
                        "Плата перезагрузилась и готова к работе."
                    ))
                else:
                    raise Exception("Ошибка выполнения esptool")

            except ImportError:
                raise Exception("esptool не установлен. Установите: pip install esptool")

        except Exception as e:
            self.show_progress(0, f"❌ Ошибка: {str(e)}")
            self.add_log(f"❌ Ошибка: {str(e)}", "error")
            error_message = str(e)  # Сохраняем ошибку в переменную
            self.root.after(1000, lambda err=error_message: messagebox.showerror(
                "Ошибка загрузки",
                f"Не удалось загрузить прошивку:\n\n{err}\n\n"
                "Проверьте:\n"
                "• Подключение ESP32\n"
                "• Выбор правильного COM-порта\n"
                "• Установку esptool (pip install esptool)"
            ))
        finally:
            self.is_flashing = False
            self.flash_btn.config(state="normal", text="🚀 ЗАГРУЗИТЬ ПРОШИВКУ")
            # Скрываем прогресс-бар
            self.progress_bar.pack_forget()

    def flash_firmware(self):
        """Запустить загрузку прошивки"""
        if self.is_flashing:
            return

        if not self.validate_inputs():
            return

        # Получить параметры
        com_port = self.com_var.get().split(" - ")[0]  # Извлекаем "COM13" из "COM13 - USB Serial Device"
        firmware_file = self.file_var.get()

        # Проверяем, что файл существует
        if not os.path.exists(firmware_file):
            messagebox.showerror("Ошибка", f"❌ Файл не найден:\n{firmware_file}")
            return

        # Конвертируем путь в абсолютный для надежности
        firmware_file = os.path.abspath(firmware_file)

        # Подтверждение с детальной информацией
        confirm_msg = f"""🌾 AgriSwarm - Подтверждение загрузки

📁 Файл: {firmware_file}
📊 Размер: {os.path.getsize(firmware_file) / 1024 / 1024:.2f} MB
🔌 Порт: {com_port}

⚠️ Внимание:
• Убедитесь, что ESP32 подключена
• Закройте Serial Monitor и другие программы
• Процесс займет 30-60 секунд

Продолжить?"""

        if not messagebox.askyesno("Подтверждение", confirm_msg):
            return

        # Начинаем загрузку
        self.is_flashing = True
        self.flash_btn.config(state="disabled", text="⏳ ЗАГРУЗКА...")
        self.progress_bar.pack(side="right", fill="x", expand=True, padx=(20, 0))
        self.progress_var.set(0)

        # Запускаем в отдельном потоке
        flash_thread = threading.Thread(
            target=self.flash_firmware_thread,
            args=(com_port, firmware_file)
        )
        flash_thread.daemon = True
        flash_thread.start()

def main():
    """Главная функция"""
    root = tk.Tk()
    app = ModernFlashFirmwareGUI(root)
    root.mainloop()

    # Добавляем обработчик закрытия окна
    def on_closing():
        if hasattr(app, 'is_flashing') and app.is_flashing:
            if messagebox.askyesno("Подтверждение", "Загрузка прошивки в процессе. Закрыть?"):
                root.destroy()
        else:
            root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_closing)

if __name__ == "__main__":
    main()

