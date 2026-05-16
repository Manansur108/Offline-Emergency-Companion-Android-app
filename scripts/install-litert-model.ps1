param(
    [string]$ModelPath = ".\gemma4_2b_v09_obfus_fix_all_modalities_thinking.litertlm",
    [string]$PackageName = "com.manan.offlineai"
)

$resolvedModel = Resolve-Path -LiteralPath $ModelPath -ErrorAction Stop
$fileName = Split-Path -Path $resolvedModel -Leaf
$remoteDir = "/sdcard/Android/data/$PackageName/files/models"
$remotePath = "$remoteDir/$fileName"

adb shell "mkdir -p $remoteDir"
adb push $resolvedModel $remotePath
adb shell "ls -lh $remotePath"
