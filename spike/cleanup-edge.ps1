# shot.mjs が起動したヘッドレス Edge（一時フォルダ edge-* を使うもの）を全部止める。0 になるまで繰り返す
foreach ($i in 1..10) {
  $p = Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'user-data-dir=[^ ]*\\Temp\\edge-' }
  if (-not $p) { break }
  $p | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}
"leftover headless edge: " + (Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -match 'user-data-dir=[^ ]*\\Temp\\edge-' } | Measure-Object).Count
