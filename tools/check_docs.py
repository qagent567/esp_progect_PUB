"""Проверка публичного комплекта документации. Требуется только Python 3."""
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit
import json
import re
import sys
import xml.etree.ElementTree as ET


def check(root):
    root = root.resolve()
    errors = []
    manifest = json.loads((root / 'publication-manifest.json').read_text(encoding='utf-8'))
    entries = manifest['files']
    allowed = set(entries)
    if len(allowed) != len(entries):
        errors.append('Повторяющиеся пути в перечне файлов.')
    links = 0
    pages = 0
    for name in entries:
        rel = PurePosixPath(name)
        file = root / name
        if rel.is_absolute() or '..' in rel.parts or '\\' in name or ':' in name:
            errors.append(f'{name}: небезопасный относительный путь.')
            continue
        if not file.is_file() or file.is_symlink() or root not in file.resolve().parents:
            errors.append(f'{name}: файл отсутствует или выходит за границы комплекта.')
            continue
        if file.suffix not in {'.md', '.svg', '.json', '.py'} and name not in {'LICENSE', '.gitignore', '.gitattributes'}:
            errors.append(f'{name}: неподдерживаемый тип файла документации.')
        if file.suffix == '.svg':
            try:
                tree = ET.fromstring(file.read_text(encoding='utf-8'))
                if tree.find('{http://www.w3.org/2000/svg}title') is None:
                    errors.append(f'{name}: отсутствует описание иллюстрации.')
                if any(el.tag.rsplit('}', 1)[-1] in {'script', 'foreignObject'} for el in tree.iter()):
                    errors.append(f'{name}: исполняемое содержимое в SVG.')
            except ET.ParseError as exc:
                errors.append(f'{name}: повреждён SVG: {exc}')
        if file.suffix != '.md':
            continue
        pages += 1
        content = file.read_text(encoding='utf-8')
        if '\ufffd' in content:
            errors.append(f'{name}: повреждённая кодировка.')
        headings = re.findall(r'^# ', content, re.MULTILINE)
        if len(headings) != 1 and not name.startswith('.github/'):
            errors.append(f'{name}: ожидается один основной заголовок.')
        fences = re.findall(r'^```[^\n]*', content, re.MULTILINE)
        if len(fences) % 2:
            errors.append(f'{name}: незакрытый блок примера.')
        if re.search(r'\b(?:src/|include/|agent_gpt/)|[A-Z]:\\|https://github\.com/qagent567/esp_progect(?:/|\b(?!_PUB))', content):
            errors.append(f'{name}: ссылка на внутреннюю структуру или закрытый репозиторий.')
        if re.search(r'^```(?:cpp|c\+\+|c|h|hpp)\s*$', content, re.MULTILINE):
            errors.append(f'{name}: листинг реализации не входит в публичную документацию.')
        if re.search(r'волшеб|\bмагия\b|100%|zero-allocation', content, re.IGNORECASE):
            errors.append(f'{name}: проверьте стиль или абсолютное обещание.')
        prose = re.sub(r'^```[^\n]*\n.*?^```\s*$', '', content, flags=re.MULTILINE | re.DOTALL)
        for match in re.finditer(r'!?\[[^\]\n]*\]\(([^)\n]+)\)', prose):
            target = match.group(1).strip().strip('<>')
            url = urlsplit(target)
            if url.scheme or url.netloc:
                continue
            links += 1
            dest = (file.parent / unquote(url.path)).resolve() if url.path else file.resolve()
            try:
                key = dest.relative_to(root).as_posix()
            except ValueError:
                errors.append(f'{name}: ссылка выходит за пределы комплекта: {target}')
                continue
            if key not in allowed or not dest.is_file():
                errors.append(f'{name}: цель ссылки не входит в комплект: {target}')
            elif url.fragment and dest.suffix == '.md':
                target_text = dest.read_text(encoding='utf-8')
                anchor = unquote(url.fragment)
                ids = []
                for heading in re.findall(r'^#{1,6}\s+(.+)$', target_text, re.MULTILINE):
                    ids.append(re.sub(r'[^\w\- ]', '', heading.lower()).replace(' ', '-'))
                if anchor not in ids:
                    errors.append(f'{name}: неизвестный якорь: {target}')
    return errors, {'files': len(entries), 'markdown_pages': pages, 'local_links': links}


if __name__ == '__main__':
    try:
        errors, stats = check(Path(__file__).resolve().parents[1])
    except (OSError, ValueError, KeyError) as exc:
        print(f'Ошибка чтения комплекта: {exc}')
        sys.exit(1)
    for error in errors:
        print(error)
    print(json.dumps({**stats, 'errors': len(errors)}, ensure_ascii=False))
    sys.exit(1 if errors else 0)
