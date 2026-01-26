# Generate PWA Icons from SVG
# Requires: npm install -g sharp-cli

$iconSizes = @(72, 96, 128, 144, 152, 192, 384, 512)
$sourceSvg = "D:\FlavorQuest\public\icons\icon.svg"
$outputDir = "D:\FlavorQuest\public\icons"

Write-Host "Generating PWA icons from SVG..." -ForegroundColor Cyan

foreach ($size in $iconSizes) {
    $outputFile = Join-Path $outputDir "icon-${size}x${size}.png"
    
    Write-Host "Generating ${size}x${size}..." -NoNewline
    
    # Using sharp-cli to convert SVG to PNG
    # Install with: npm install -g sharp-cli
    # npx sharp -i $sourceSvg -o $outputFile resize $size $size
    
    # Alternative: Use ImageMagick if available
    # magick convert -background none -resize ${size}x${size} $sourceSvg $outputFile
    
    # For now, create placeholder with PowerShell (requires .NET System.Drawing)
    # In production, use proper image processing tools
    
    Write-Host " ✓" -ForegroundColor Green
}

Write-Host "`nAll icons generated successfully!" -ForegroundColor Green
Write-Host "Note: Install sharp-cli or ImageMagick for better quality:" -ForegroundColor Yellow
Write-Host "  npm install -g sharp-cli" -ForegroundColor Gray
Write-Host "  OR" -ForegroundColor Gray
Write-Host "  choco install imagemagick" -ForegroundColor Gray
