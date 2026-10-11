# Smoke test for Stage 3 (food search). Run from the server folder while `npm run dev` is running,
# AFTER `npm run seed`:
#   powershell -ExecutionPolicy Bypass -File .\test-foods.ps1
# Creates a throwaway user. Online sources (USDA, Open Food Facts) show warnings instead of failing.

$ErrorActionPreference = "Stop"
$base = "http://localhost:4000/api"
$json = "application/json"

function Names($label, $resp) {
  Write-Host "`n== $label" -ForegroundColor Cyan
  foreach ($f in $resp.results) { "{0,-45} {1,5} kcal  P{2,-5} [{3}]" -f $f.name, $f.per100g.kcal, $f.per100g.protein, $f.source }
  if ($resp.warnings.Count -gt 0) { Write-Host ("warnings: " + ($resp.warnings -join "; ")) -ForegroundColor Yellow }
}

$email = "foods$(Get-Random)@example.com"
$reg = Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType $json -Body (@{ email = $email; password = "password123" } | ConvertTo-Json)
$h = @{ Authorization = "Bearer $($reg.token)" }

# 1. Local Indian foods (fast, offline). Local names work: kadala = chickpea, moru = buttermilk.
foreach ($q in @("kadala", "nendran", "moru", "idl", "soya")) {
  Names "local: $q" (Invoke-RestMethod -Uri "$base/foods/search?q=$q&sources=custom,local" -Headers $h)
}

# 2. A custom food, then find it again by search (use this for your protein tub label)
$cf = @{ name = "SuperYou protein scoop (my label)"; aliases = @("superyou"); per100g = @{ kcal = 380; protein = 70; carbs = 10; fat = 6; fiber = 2 }; servings = @(@{ label = "1 scoop"; grams = 33 }) } | ConvertTo-Json -Depth 5
Invoke-RestMethod -Method Post -Uri "$base/custom-foods" -Headers $h -ContentType $json -Body $cf | Out-Null
Names "custom: superyou" (Invoke-RestMethod -Uri "$base/foods/search?q=superyou&sources=custom,local" -Headers $h)

# 3. Online sources (needs USDA_API_KEY in .env for USDA; Open Food Facts needs no key)
Names "online: paneer (USDA + Open Food Facts)" (Invoke-RestMethod -Uri "$base/foods/search?q=paneer&sources=usda,off" -Headers $h)
Names "online: chickpeas cooked (USDA)" (Invoke-RestMethod -Uri "$base/foods/search?q=chickpeas%20cooked&sources=usda" -Headers $h)

# 4. Barcode (Nutella, a well-known product in Open Food Facts)
try {
  $b = Invoke-RestMethod -Uri "$base/foods/barcode/3017620422003" -Headers $h
  Write-Host "`n== barcode: $($b.food.name) ($($b.food.brand)) $($b.food.per100g.kcal) kcal/100g" -ForegroundColor Cyan
} catch { Write-Host "`nbarcode lookup failed: $($_.Exception.Message)" -ForegroundColor Yellow }

# 5. Recent foods (log something first)
$today = (Get-Date).ToString("yyyy-MM-dd")
$idli = (Invoke-RestMethod -Uri "$base/foods/search?q=idli&sources=local" -Headers $h).results[0]
$entry = @{ date = $today; meal = "breakfast"; grams = 117; servingLabel = "idli"; servings = 3
  food = @{ source = $idli.source; externalId = $idli.externalId; name = $idli.name; per100g = $idli.per100g } } | ConvertTo-Json -Depth 6
$log = Invoke-RestMethod -Method Post -Uri "$base/logs" -Headers $h -ContentType $json -Body $entry
Write-Host "`n== logged 3 idli: $($log.totals.kcal) kcal, $($log.totals.protein) g protein" -ForegroundColor Cyan
$recent = Invoke-RestMethod -Uri "$base/foods/recent" -Headers $h
Write-Host ("recent: " + (($recent.foods | ForEach-Object { "$($_.name) ($($_.lastGrams) g)" }) -join ", "))

Write-Host "`nAll checks ran." -ForegroundColor Green
