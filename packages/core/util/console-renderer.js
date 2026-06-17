// console-renderer.js
'use strict'

/**
 * Spring Boot 风格时间
 */
function springBootTime() {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    const h = String(now.getHours()).padStart(2, '0')
    const i = String(now.getMinutes()).padStart(2, '0')
    const s = String(now.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${i}:${s}`
}

function safeNumber(v) {
    return typeof v === 'number' && !Number.isNaN(v) ? v : null
}

function fmtMs(ms) {
    if (!ms || ms < 0) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
}

function fmtSpeed(bytes, ms) {
    if (!bytes || !ms) return ''
    const bps = bytes / (ms / 1000)
    if (bps < 1024) return `${bps.toFixed(0)}B/s`
    if (bps < 1024 * 1024) return `${(bps / 1024).toFixed(1)}KB/s`
    return `${(bps / 1024 / 1024).toFixed(1)}MB/s`
}

/* ================= hex → ANSI ================= */

function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16)
    return {
        r: (n >> 16) & 255,
        g: (n >> 8) & 255,
        b: n & 255,
    }
}

function rgbToAnsi256(r, g, b) {
    return `\x1b[38;5;${rgbToCode(r, g, b)}m`
}

function rgbToCode(r, g, b) {
    if (r === g && g === b) {
        if (r < 8) return 16
        if (r > 248) return 231
        return Math.round(((r - 8) / 247) * 24) + 232
    }
    return (
        16 +
        36 * Math.round(r / 51) +
        6 * Math.round(g / 51) +
        Math.round(b / 51)
    )
}

function colorizeHex(text, hex) {
    if (!hex) return text
    const { r, g, b } = hexToRgb(hex)
    return `${rgbToAnsi256(r, g, b)}${text}\x1b[0m`
}

/* ================= renderer ================= */

function createConsoleRenderer(protocol, theme, options = {}) {
    if (!protocol || !theme) {
        throw new Error('protocol and theme are required')
    }

    const {
        time = true,
        formatTime = springBootTime,
        renderBody,
    } = options

    function render(payload) {
        if (!payload || typeof payload !== 'object') return ''

        const {
            phase,
            state,
            step,
            stepState,
            number,
            error,
            complete,
            total,
            startTime,
            endTime,
            stepStartTime,
            stepEndTime,
        } = payload

        const safeComplete = safeNumber(complete)
        const safeTotal = safeNumber(total)
        const safeStart = safeNumber(startTime)
        const safeEnd = safeNumber(endTime)
        const safeStepStart = safeNumber(stepStartTime)
        const safeStepEnd = safeNumber(stepEndTime)

        const prefix = time ? `[${formatTime()}] ` : ''

        const phaseCfg = theme.phase?.[phase] || {}
        const phaseText = colorizeHex(phaseCfg.text || `[${phase}]`, phaseCfg.color)

        const stepText = theme.step?.[step] || step || ''

        /* ✅ status 支持 hex */
        const statusCfg = theme.status?.[state] || {}
        const statusText = colorizeHex(statusCfg.text || `[${state}]`, statusCfg.color)

        const stepCost =
            safeStepStart !== null && safeStepEnd !== null
                ? ` ⏱ ${fmtMs(safeStepEnd - safeStepStart)}`
                : ''

        const totalCost =
            safeStart !== null && safeEnd !== null
                ? ` ⏱ ${fmtMs(safeEnd - safeStart)}`
                : ''

        const avgSpeed =
            safeStart !== null && safeEnd !== null && safeComplete !== null
                ? ` 🚀 ${fmtSpeed(safeComplete, safeEnd - safeStart)}`
                : ''

        const body =
            typeof renderBody === 'function'
                ? renderBody(payload)
                : ''

        if (state === protocol.STATE.SUCCESS) {
            return `${prefix}${phaseText} ${statusText}${body}${totalCost}${avgSpeed}`
        }

        if (state === protocol.STATE.ERROR) {
            return `${prefix}${phaseText} ${statusText}${body}：${error?.message || error || ''}`
        }

        if (state === protocol.STATE.START) {
            return `${prefix}${phaseText} ${statusText}${body}`
        }

        if (state === protocol.STATE.WAITING) {
            return `${prefix}${phaseText} ${statusText}${body}`
        }

        if (state === protocol.STATE.RUNNING) {
            const bar =
                safeComplete !== null && safeTotal !== null
                    ? progress(safeComplete, safeTotal)
                    : ''

            if (bar) {
                return `${prefix}${phaseText} ${statusText} ${stepText}${body} ${bar}${stepCost}`
            }

            return `${prefix}${phaseText} ${statusText} ${stepText}${body}${stepCost}`
        }

        return `${prefix}${phaseText} ${statusText}${body}`
    }

    function progress(complete, total, width = 20) {
        if (!total) return ''
        const r = Math.min(complete / total, 1)
        const f = Math.round(r * width)
        return '[' + '█'.repeat(f) + '░'.repeat(width - f) + `] ${complete}/${total}`
    }

    return { render }
}

module.exports = { createConsoleRenderer }
