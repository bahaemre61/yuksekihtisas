 = @("src\app\dashboard\duyurular\page.tsx", "src\app\dashboard\tekniktaleplerim\page.tsx", "src\app\dashboard\yemek\page.tsx", "src\app\dashboard\page.tsx", "src\components\forms\TeknikTalepForm.tsx")
foreach ($f in $files) {
    if (Test-Path $f) {
        $content = Get-Content $f -Raw
        $content = $content -replace 'bg-white', 'bg-base-100'
        $content = $content -replace 'bg-gray-50', 'bg-base-200'
        $content = $content -replace 'bg-gray-100', 'bg-base-200'
        $content = $content -replace 'text-gray-800', 'text-base-content'
        $content = $content -replace 'text-gray-900', 'text-base-content'
        $content = $content -replace 'text-gray-700', 'text-base-content/80'
        $content = $content -replace 'text-gray-600', 'text-base-content/70'
        $content = $content -replace 'text-gray-500', 'text-base-content/60'
        $content = $content -replace 'text-gray-400', 'text-base-content/50'
        $content = $content -replace 'border-gray-200', 'border-base-200'
        $content = $content -replace 'border-gray-300', 'border-base-300'
        $content = $content -replace 'border-gray-100', 'border-base-200'
        $content = $content -replace 'bg-blue-600', 'bg-primary'
        $content = $content -replace 'text-blue-600', 'text-primary'
        $content = $content -replace 'text-blue-500', 'text-primary'
        $content = $content -replace 'bg-blue-50', 'bg-primary/10'
        $content = $content -replace 'hover:bg-blue-700', 'hover:brightness-90'
        $content = $content -replace 'text-white', 'text-base-100'
        Set-Content -Path $f -Value $content
    }
}
