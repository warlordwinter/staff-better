# PowerShell script to deploy Lambda function code
# Usage: .\deploy-lambda.ps1

Write-Host "🚀 Deploying Lambda function code..." -ForegroundColor Cyan

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✓ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "   Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
try {
    $nodeVersion = node --version 2>&1
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install it first." -ForegroundColor Red
    exit 1
}

# Navigate to Lambda directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
npm install --production

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Dependencies installed" -ForegroundColor Green

# Create deployment package
Write-Host "`n📦 Creating deployment package..." -ForegroundColor Cyan

# Remove old zip if exists
if (Test-Path "function.zip") {
    Remove-Item "function.zip" -Force
    Write-Host "✓ Removed old function.zip" -ForegroundColor Yellow
}

# Create zip file (Windows PowerShell 5.1+ has Compress-Archive)
try {
    Compress-Archive -Path "index.js", "emailTemplate.js", "node_modules" -DestinationPath "function.zip" -Force
    Write-Host "✓ Created function.zip" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to create zip file: $_" -ForegroundColor Red
    Write-Host "   Make sure you're using PowerShell 5.1 or later" -ForegroundColor Yellow
    exit 1
}

# Check zip file size
$zipSize = (Get-Item "function.zip").Length / 1MB
Write-Host "   Package size: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Gray

if ($zipSize -gt 50) {
    Write-Host "⚠️  Warning: Package is larger than 50MB. Consider using Lambda layers for dependencies." -ForegroundColor Yellow
}

# Deploy to Lambda
Write-Host "`n☁️  Deploying to AWS Lambda..." -ForegroundColor Cyan
Write-Host "   Function name: DailySummaryEmail" -ForegroundColor Gray

try {
    aws lambda update-function-code `
        --function-name DailySummaryEmail `
        --zip-file fileb://function.zip `
        --region us-east-1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Lambda function deployed successfully!" -ForegroundColor Green
        
        # Wait a moment for deployment to complete
        Write-Host "`n⏳ Waiting for deployment to complete..." -ForegroundColor Cyan
        Start-Sleep -Seconds 3
        
        # Get function configuration to verify
        Write-Host "`n📋 Verifying deployment..." -ForegroundColor Cyan
        aws lambda get-function --function-name DailySummaryEmail --region us-east-1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Deployment verified" -ForegroundColor Green
            Write-Host "`n💡 Next steps:" -ForegroundColor Cyan
            Write-Host "   1. Check CloudWatch Logs: /aws/lambda/DailySummaryEmail" -ForegroundColor Gray
            Write-Host "   2. Test the function using AWS Console or CLI" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Deployment failed. Check AWS credentials and permissions." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error deploying: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ Done!" -ForegroundColor Green

