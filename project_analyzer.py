import os
import datetime

# --- Конфигурация ---
OUTPUT_FILENAME = "project_summary.txt"
MAX_LINES_TO_READ = 15  # Сколько строк читать из начала файлов HTML/JS
KNOWN_SUBFOLDERS = ['js', 'css', 'assets', 'lib']

# --- Вспомогательные функции ---
def get_script_location_message():
    """Возвращает сообщение о том, где должен находиться скрипт."""
    return (
        "Пожалуйста, убедитесь, что этот скрипт (project_analyzer.py) находится "
        "в корневой папке вашего проекта перед запуском.\n"
        "Корневая папка - это та, где обычно лежит ваш главный HTML файл (например, index.html) "
        "и подпапки, такие как 'js', 'css' и т.д."
    )

def list_directory_tree(startpath, output_lines):
    """Создает строковое представление дерева каталогов."""
    output_lines.append("Структура каталогов:")
    output_lines.append("--------------------")
    # Проверяем, находимся ли мы действительно в той папке, где лежит скрипт
    # и есть ли ожидаемые подпапки, чтобы избежать сканирования не того места.
    # Это простая проверка; в реальном сценарии может потребоваться более надежная.
    current_dir_content = os.listdir(startpath)
    is_likely_project_root = any(f.endswith(('.html', '.htm')) for f in current_dir_content) or \
                             any(d in current_dir_content for d in KNOWN_SUBFOLDERS if os.path.isdir(os.path.join(startpath, d)))

    if not is_likely_project_root and startpath == os.getcwd():
         output_lines.append("ПРЕДУПРЕЖДЕНИЕ: Кажется, скрипт запущен не из корневой папки проекта,")
         output_lines.append("либо структура папок нетипична. Вывод может быть неполным.")
         output_lines.append(get_script_location_message())


    for root, dirs, files in os.walk(startpath):
        # Пропускаем служебные директории (например, .git, .vscode, __pycache__)
        dirs[:] = [d for d in dirs if not d.startswith('.') and not d.startswith('__')]
        files = [f for f in files if not f.startswith('.')] # Пропускаем скрытые файлы

        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * (level)
        output_lines.append(f"{indent}{os.path.basename(root) if root != startpath else '.'}/")
        subindent = ' ' * 4 * (level + 1)
        for f in sorted(files):
            output_lines.append(f"{subindent}- {f}")
    output_lines.append("\n")


def read_file_head(filepath, max_lines):
    """Читает первые N строк файла."""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = [f.readline().strip() for _ in range(max_lines)]
            # Удаляем пустые строки в конце, если они есть
            while lines and not lines[-1]:
                lines.pop()
            return "\n".join(lines) if lines else "[Пустой или не удалось прочитать начало файла]"
    except Exception as e:
        return f"[Ошибка чтения файла: {e}]"

# --- Основная логика скрипта ---
def analyze_project():
    project_root = os.getcwd() # Предполагаем, что скрипт запускается из корня проекта
    output_lines = []

    output_lines.append("Отчет по анализу проекта")
    output_lines.append("========================")
    output_lines.append(f"Дата сканирования: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    output_lines.append(f"Корень проекта: {project_root}\n")

    # Проверка, существуют ли ожидаемые папки, чтобы дать пользователю подсказку
    found_known_subfolders = [folder for folder in KNOWN_SUBFOLDERS if os.path.isdir(os.path.join(project_root, folder))]
    if not found_known_subfolders and not any(f.endswith(('.html', '.htm')) for f in os.listdir(project_root)):
        output_lines.append("ПРЕДУПРЕЖДЕНИЕ: Не найдены стандартные подпапки (js, css и т.д.) или HTML файлы в текущей директории.")
        output_lines.append(get_script_location_message())
        output_lines.append("\n")


    list_directory_tree(project_root, output_lines)

    # HTML файлы в корне
    output_lines.append("HTML файлы (в корне проекта):")
    output_lines.append("----------------------------")
    root_files = [f for f in os.listdir(project_root) if os.path.isfile(os.path.join(project_root, f))]
    html_files = [f for f in root_files if f.lower().endswith(('.html', '.htm'))]
    if html_files:
        for filename in html_files:
            output_lines.append(f"\nФайл: {filename}")
            output_lines.append(f"--- Первые {MAX_LINES_TO_READ} строк ---")
            output_lines.append(read_file_head(os.path.join(project_root, filename), MAX_LINES_TO_READ))
            output_lines.append("----------------------")
    else:
        output_lines.append("[HTML файлы в корне не найдены]")
    output_lines.append("\n")

    # Файлы в стандартных подпапках
    for folder_name in KNOWN_SUBFOLDERS:
        folder_path = os.path.join(project_root, folder_name)
        output_lines.append(f"Файлы в папке '{folder_name}/':")
        output_lines.append("------------------------" + "-" * len(folder_name)) # Подчеркивание по длине имени папки
        if os.path.isdir(folder_path):
            files_in_folder = [f for f in os.listdir(folder_path) if os.path.isfile(os.path.join(folder_path, f))]
            if files_in_folder:
                for filename in sorted(files_in_folder):
                    output_lines.append(f"- {filename}")
                    if folder_name == 'js' and filename.lower().endswith('.js'): # Для JS файлов показываем начало
                        filepath = os.path.join(folder_path, filename)
                        output_lines.append(f"  --- Первые {MAX_LINES_TO_READ} строк ({filename}) ---")
                        output_lines.append("  " + read_file_head(filepath, MAX_LINES_TO_READ).replace("\n", "\n  ")) # Добавляем отступ к строкам из файла
                        output_lines.append("  ----------------------")
            else:
                output_lines.append(f"[Файлы в папке '{folder_name}/' не найдены]")
        else:
            output_lines.append(f"[Папка '{folder_name}/' не найдена]")
        output_lines.append("\n")

    # Запись в файл
    try:
        with open(OUTPUT_FILENAME, 'w', encoding='utf-8') as f:
            f.write("\n".join(output_lines))
        print(f"Анализ завершен. Результаты сохранены в файл: {OUTPUT_FILENAME}")
    except Exception as e:
        print(f"Ошибка при записи файла {OUTPUT_FILENAME}: {e}")
        print("\n".join(output_lines)) # Если не удалось записать, выводим в консоль

if __name__ == "__main__":
    analyze_project()