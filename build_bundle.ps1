$files = @(
  'js/utils.js',
  'js/supabase.js',
  'js/state.js',
  'js/components/tables.js',
  'js/storage.js',
  'js/excelParser.js',
  'js/views/facturacion.js',
  'js/views/vendedor.js',
  'js/views/producto.js',
  'js/main.js'
)

$out = "(function(){"  + "`n"

foreach ($f in $files) {
  $out += "// === $f ===" + "`n"
  $lines = Get-Content $f -Encoding utf8
  foreach ($line in $lines) {
    if ($line -match '^\s*import\s') { continue }
    $line = $line -replace '^\s*export\s+default\s+', ''
    $line = $line -replace '^\s*export\s+', ''
    $out += $line + "`n"
  }
  $out += "`n"
}

$out += "})();"

[System.IO.File]::WriteAllText("js/bundle.js", $out, [System.Text.UTF8Encoding]::new($false))
Write-Host "Bundle created: js/bundle.js"
