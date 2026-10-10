# Forwards Stripe payment messages (webhooks) from your Stripe sandbox to the app running
# on this computer, so test purchases are recorded. Run with:  npm run stripe:listen
#
# Uses the sandbox key already in .env.local (no "stripe login" needed), saves the
# matching webhook secret into .env.local as STRIPE_WEBHOOK_SECRET, then keeps running.
# Leave it open while testing purchases; press Ctrl+C to stop.

$envFile = Join-Path $PSScriptRoot "..\.env.local"
if (-not (Test-Path $envFile)) { Write-Error ".env.local not found. Copy .env.example first."; exit 1 }

$lines = [System.IO.File]::ReadAllLines((Resolve-Path $envFile))
$keyLine = $lines | Where-Object { $_ -match '^STRIPE_SECRET_KEY=' } | Select-Object -First 1
$key = if ($keyLine) { ($keyLine -split '=', 2)[1].Trim() } else { "" }
if (-not $key.StartsWith("sk_test_")) {
  Write-Error "STRIPE_SECRET_KEY in .env.local must be a test/sandbox key (sk_test_...)."
  exit 1
}

# The webhook secret for this sandbox. It stays the same between runs.
$secret = (stripe listen --api-key $key --print-secret).Trim()
if (-not $secret.StartsWith("whsec_")) { Write-Error "Could not get a webhook secret from the Stripe CLI."; exit 1 }

$found = $false
for ($i = 0; $i -lt $lines.Length; $i++) {
  if ($lines[$i] -match '^STRIPE_WEBHOOK_SECRET=') { $lines[$i] = "STRIPE_WEBHOOK_SECRET=$secret"; $found = $true }
}
if (-not $found) {
  $lines += ""
  $lines += "# SECRET. Written by npm run stripe:listen (proves payment messages come from Stripe)."
  $lines += "STRIPE_WEBHOOK_SECRET=$secret"
}
[System.IO.File]::WriteAllLines((Resolve-Path $envFile), $lines, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Saved STRIPE_WEBHOOK_SECRET to .env.local. Forwarding Stripe events to the app. Leave this window open." -ForegroundColor Green

# Purchases happen on providers' own (connected) accounts, so forward Connect events.
stripe listen --api-key $key --forward-connect-to localhost:3000/api/stripe/webhook --events checkout.session.completed
