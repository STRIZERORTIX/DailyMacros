# Smoke test for Stage 2. Run from the server folder while `npm run dev` is running:
#   powershell -ExecutionPolicy Bypass -File .\test-api.ps1
# It creates a throwaway test user in your database (delete it later from Atlas if you like).

$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api"
$json = "application/json"

function Show($label, $obj) { Write-Host "`n== $label" -ForegroundColor Cyan; $obj | ConvertTo-Json -Depth 8 }

$email = "test$(Get-Random)@example.com"
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType $json -Body (@{ email = $email; password = "password123"; name = "Test" } | ConvertTo-Json)
Show "register" $reg.user
$h = @{ Authorization = "Bearer $($reg.token)" }

$today = (Get-Date).ToString("yyyy-MM-dd")
$yesterday = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd")

# 3 x 32 g wheat flakes = 96 g. Expect kcal 336, protein 8.6, carbs 73, fat 1.4, fiber 7.7
$entry = @{
  date = $yesterday; meal = "breakfast"; grams = 96; servingLabel = "32 g serving"; servings = 3
  food = @{ source = "custom"; name = "Wheat flakes"; per100g = @{ kcal = 350; protein = 9; carbs = 76; fat = 1.5; fiber = 8 } }
} | ConvertTo-Json -Depth 6
$created = Invoke-RestMethod -Method Post -Uri "$base/logs" -Headers $h -ContentType $json -Body $entry
Show "created entry totals" $created.totals

# Change the portion to 64 g: totals should be recalculated by the server
$patched = Invoke-RestMethod -Method Patch -Uri "$base/logs/$($created._id)" -Headers $h -ContentType $json -Body (@{ grams = 64 } | ConvertTo-Json)
Show "after PATCH grams=64" $patched.totals

# Copy yesterday onto today, then read today
$copy = Invoke-RestMethod -Method Post -Uri "$base/logs/copy" -Headers $h -ContentType $json -Body (@{ fromDate = $yesterday; toDate = $today } | ConvertTo-Json)
Show "copy" $copy
$day = Invoke-RestMethod -Uri "$base/logs?date=$today" -Headers $h
Show "today totals" $day.totals
Show "today breakfast" $day.byMeal.breakfast

# Weight
$w = Invoke-RestMethod -Method Put -Uri "$base/weights/$today" -Headers $h -ContentType $json -Body (@{ weightKg = 96.8 } | ConvertTo-Json)
Show "weight saved" $w
Show "weights" (Invoke-RestMethod -Uri "$base/weights" -Headers $h)

# Profile + login + validation error
$me = Invoke-RestMethod -Method Patch -Uri "$base/auth/me" -Headers $h -ContentType $json -Body (@{ profile = @{ age = 25; sex = "male"; heightCm = 183; weightKg = 97; goalWeightKg = 86 } } | ConvertTo-Json -Depth 4)
Show "profile" $me.user.profile

$week = Invoke-RestMethod -Uri "$base/insights?range=week&end=$today" -Headers $h
Show "insights week loggedDays" $week.adherence
Show "insights week averages" $week.averages

$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType $json -Body (@{ email = $email; password = "password123" } | ConvertTo-Json)
Write-Host "`nlogin token received: $([bool]$login.token)"

try {
  Invoke-RestMethod -Method Post -Uri "$base/logs" -Headers $h -ContentType $json -Body (@{ date = "bad" } | ConvertTo-Json) | Out-Null
} catch {
  Write-Host "`nExpected 400 for bad body: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
}

Write-Host "`nAll checks ran." -ForegroundColor Green
