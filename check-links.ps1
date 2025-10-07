# Скрипт для проверки всех внутренних ссылок в markdown файлах
$ErrorActionPreference = "Continue"

# Получить все markdown файлы (исключая папку .kiro)
$mdFiles = Get-ChildItem -Path . -Filter *.md -Recurse -File | Where-Object { $_.FullName -notlike "*\.kiro\*" }

$brokenLinks = @()
$workingLinks = @()
$totalLinks = 0

Write-Host "=== Проверка внутренних ссылок в документации ===" -ForegroundColor Cyan
Write-Host ""

foreach ($file in $mdFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + '\', '')
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    
    # Найти все markdown ссылки [текст](url) и [текст](url#якорь)
    $linkPattern = '\[([^\]]+)\]\(([^)]+)\)'
    $matches = [regex]::Matches($content, $linkPattern)
    
    if ($matches.Count -gt 0) {
        Write-Host "Проверка: $relativePath" -ForegroundColor Yellow
        
        foreach ($match in $matches) {
            $linkText = $match.Groups[1].Value
            $linkUrl = $match.Groups[2].Value
            
            # Пропустить внешние ссылки (http, https, mailto и т.д.)
            if ($linkUrl -match '^(https?:|mailto:|ftp:|#)') {
                continue
            }
            
            $totalLinks++
            
            # Разделить URL и якорь
            $parts = $linkUrl -split '#', 2
            $targetPath = $parts[0]
            $anchor = if ($parts.Length -gt 1) { $parts[1] } else { $null }
            
            # Пропустить пустые пути (ссылки только на якорь в том же файле)
            if ([string]::IsNullOrWhiteSpace($targetPath)) {
                # Проверить существует ли якорь в текущем файле
                if ($anchor) {
                    $anchorPattern = "^#{1,6}\s+.*$anchor"
                    if ($content -match $anchorPattern -or $content -match "<a\s+name=`"$anchor`"") {
                        $workingLinks += @{
                            File = $relativePath
                            Link = $linkUrl
                            Text = $linkText
                            Status = "OK (anchor in same file)"
                        }
                    } else {
                        $brokenLinks += @{
                            File = $relativePath
                            Link = $linkUrl
                            Text = $linkText
                            Reason = "Якорь не найден в том же файле"
                        }
                        Write-Host "  ❌ Битый якорь: #$anchor" -ForegroundColor Red
                    }
                }
                continue
            }
            
            # Разрешить относительный путь
            $fileDir = Split-Path $file.FullName -Parent
            $targetFullPath = Join-Path $fileDir $targetPath
            $targetFullPath = [System.IO.Path]::GetFullPath($targetFullPath)
            
            # Проверить существует ли целевой файл
            if (Test-Path $targetFullPath) {
                # Если есть якорь, проверить существует ли он в целевом файле
                if ($anchor) {
                    $targetContent = Get-Content $targetFullPath -Raw -Encoding UTF8
                    
                    # Преобразовать якорь в формат regex (стиль GitHub)
                    $anchorLower = $anchor.ToLower() -replace '[^\w\s-]', '' -replace '\s+', '-'
                    
                    # Проверить заголовок или HTML якорь
                    $headingPattern = "^#{1,6}\s+.*"
                    $headings = [regex]::Matches($targetContent, $headingPattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
                    
                    $anchorFound = $false
                    foreach ($heading in $headings) {
                        $headingText = $heading.Value -replace '^#{1,6}\s+', ''
                        $headingAnchor = $headingText.ToLower() -replace '[^\w\s-]', '' -replace '\s+', '-'
                        
                        if ($headingAnchor -eq $anchorLower -or $headingText -match $anchor) {
                            $anchorFound = $true
                            break
                        }
                    }
                    
                    # Также проверить HTML якоря
                    if (-not $anchorFound -and $targetContent -match "<a\s+name=`"$anchor`"") {
                        $anchorFound = $true
                    }
                    
                    if ($anchorFound) {
                        $workingLinks += @{
                            File = $relativePath
                            Link = $linkUrl
                            Text = $linkText
                            Status = "OK"
                        }
                        Write-Host "  ✅ $linkUrl" -ForegroundColor Green
                    } else {
                        $brokenLinks += @{
                            File = $relativePath
                            Link = $linkUrl
                            Text = $linkText
                            Reason = "Якорь не найден в целевом файле"
                        }
                        Write-Host "  ❌ Битый якорь: $linkUrl" -ForegroundColor Red
                    }
                } else {
                    $workingLinks += @{
                        File = $relativePath
                        Link = $linkUrl
                        Text = $linkText
                        Status = "OK"
                    }
                    Write-Host "  ✅ $linkUrl" -ForegroundColor Green
                }
            } else {
                $brokenLinks += @{
                    File = $relativePath
                    Link = $linkUrl
                    Text = $linkText
                    Reason = "Файл не найден"
                }
                Write-Host "  ❌ Битая ссылка: $linkUrl (файл не найден)" -ForegroundColor Red
            }
        }
        Write-Host ""
    }
}

# Итоги
Write-Host "=== Итоги ===" -ForegroundColor Cyan
Write-Host "Всего проверено внутренних ссылок: $totalLinks" -ForegroundColor White
Write-Host "Рабочих ссылок: $($workingLinks.Count)" -ForegroundColor Green
Write-Host "Битых ссылок: $($brokenLinks.Count)" -ForegroundColor Red
Write-Host ""

if ($brokenLinks.Count -gt 0) {
    Write-Host "=== Детали битых ссылок ===" -ForegroundColor Red
    foreach ($broken in $brokenLinks) {
        Write-Host "Файл: $($broken.File)" -ForegroundColor Yellow
        Write-Host "  Ссылка: $($broken.Link)" -ForegroundColor White
        Write-Host "  Текст: $($broken.Text)" -ForegroundColor Gray
        Write-Host "  Причина: $($broken.Reason)" -ForegroundColor Red
        Write-Host ""
    }
    
    # Сохранить в файл
    $brokenLinks | ConvertTo-Json | Out-File "broken-links-report.json" -Encoding UTF8
    Write-Host "Отчёт о битых ссылках сохранён в: broken-links-report.json" -ForegroundColor Yellow
} else {
    Write-Host "✅ Все внутренние ссылки работают!" -ForegroundColor Green
}
