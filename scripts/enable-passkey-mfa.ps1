# Turns on passkeys as a two-step factor (Supabase "MFA WebAuthn") for the Supabase project.
# The dashboard has no switch for this yet, so it goes through Supabase's Management API.
#
# Run it yourself in PowerShell from the project folder:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/enable-passkey-mfa.ps1
# It asks for a Supabase personal access token (supabase.com/dashboard/account/tokens).
# The token is only used for these two requests and is never saved. Delete the token afterwards.

$ErrorActionPreference = "Stop"

# project ref from .env.local (the part before .supabase.co; not secret)
$urlLine = Get-Content .env.local | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' } | Select-Object -First 1
if ($urlLine -notmatch 'https://([a-z0-9]+)\.supabase\.co') { throw "Couldn't read NEXT_PUBLIC_SUPABASE_URL from .env.local" }
$ref = $Matches[1]

$secure = Read-Host "Paste your Supabase access token (it won't show)" -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
$headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
$api = "https://api.supabase.com/v1/projects/$ref/config/auth"

$before = Invoke-RestMethod -Uri $api -Headers $headers -Method Get
Write-Host "Before: enroll=$($before.mfa_web_authn_enroll_enabled) verify=$($before.mfa_web_authn_verify_enabled)"

$body = @{ mfa_web_authn_enroll_enabled = $true; mfa_web_authn_verify_enabled = $true } | ConvertTo-Json
$after = Invoke-RestMethod -Uri $api -Headers $headers -Method Patch -Body $body
Write-Host "After:  enroll=$($after.mfa_web_authn_enroll_enabled) verify=$($after.mfa_web_authn_verify_enabled)" -ForegroundColor Green
Write-Host "Done. You can delete the access token now."
