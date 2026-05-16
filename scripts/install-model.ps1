param(
    [string]$ModelPath = "..\gemma-4-E2B-it-Q4_K_M.gguf",
    [string]$PackageName = "com.manan.offlineai"
)

$resolvedModel = Resolve-Path -LiteralPath $ModelPath -ErrorAction Stop
$fileName = Split-Path -Path $resolvedModel -Leaf
$remoteDir = "/sdcard/Android/data/$PackageName/files/models"
$remotePath = "$remoteDir/$fileName"

adb shell "mkdir -p $remoteDir"
adb push $resolvedModel $remotePath
adb shell "ls -lh $remotePath"
