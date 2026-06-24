const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

const TMP = () => path.join(os.tmpdir(), 'com.pigman18');

/**
 * 获取可用的 Windows AppId
 * powershell：Get-StartApps | Where-Object { $_.AppID } | Format-Table -AutoSize
 * @param {string} customAppId - 你期望使用的自定义 AppId
 * @param {string} fallbackAppId - 回退 AppId（系统自带）
 * @returns {string} 最终可用的 AppId
 */
function resolveAppId(customAppId,fallbackAppId = 'Microsoft.Windows.Shell.RunDialog') {
    if (process.platform !== 'win32') {
        return customAppId;
    }
    try {
        const regPath = `HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings\\${customAppId}`;

        // 判断注册表是否存在
        execSync(
            `powershell -NoProfile -Command "Test-Path '${regPath}'"`,
            { stdio: 'ignore' }
        );

        // 存在 → 用自定义
        return customAppId;
    } catch {
        // 不存在 → 回退
        return fallbackAppId;
    }
}

/**
 * 保存base64图片
 * @param base64
 * @param filename
 * @returns {string|null}
 */
function saveB64Image(base64, filename) {
    if (!base64) return null;
    const isDu = base64.startsWith('data:');
    const m = isDu ? base64.match(/^data:image\/(\w+);base64,(.+)$/) : null;
    const buf = m ? Buffer.from(m[2], 'base64') : Buffer.from(base64, 'base64');
    let fn = filename;
    if (!fn.includes('.')) {
        const ext = m ? ((m[1] === 'jpeg' || m[1] === 'ico') ? m[1] : 'jpg') : 'dat';
        fn = `${fn}.${ext}`;
    }
    const fp = path.join(TMP(), fn);
    if (!fs.existsSync(TMP())) fs.mkdirSync(TMP(), { recursive: true });
    try { fs.writeFileSync(fp, buf); return fp; } catch { return null; }
}

module.exports = {
    resolveAppId,
    saveB64Image
}