#!/usr/bin/env node
import * as ResEdit from 'resedit';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(os.homedir(), '.pkg-cache', 'v3.6');
const FETCHED = path.join(CACHE_DIR, 'fetched-v22.22.3-win-x64');
const BUILT = path.join(CACHE_DIR, 'built-v22.22.3-win-x64');
const FETCHED_BAK = FETCHED + '.build-bak';
const ICON = path.resolve(_dirname, '../../../resources/icon.ico');
const DIST = path.resolve(_dirname, '../dist');
const BUNDLE = path.join(DIST, 'jm.core.all.js');
const OUTPUT_TMP = path.join(DIST, 'exe_ascii_tmp.exe');
const OUTPUT_FINAL = path.join(DIST, 'jm.core.exe');

const lang = 1033;
const codepage = 1200;

function restoreFetched() {
    if (fs.existsSync(FETCHED_BAK)) {
        if (fs.existsSync(FETCHED)) fs.unlinkSync(FETCHED);
        fs.renameSync(FETCHED_BAK, FETCHED);
    }
}

function buildWithIcon() {
    if (!fs.existsSync(FETCHED)) {
        console.warn('Fetched template not found. Run build:pkg first.');
        return;
    }

    console.log('Preparing template with custom icon...');
    fs.copyFileSync(FETCHED, BUILT);

    const exeData = fs.readFileSync(BUILT);
    const exe = ResEdit.NtExecutable.from(exeData);
    const res = ResEdit.NtExecutableResource.from(exe);

    const icoBuf = fs.readFileSync(ICON);
    const count = icoBuf.readUInt16LE(4);
    const iconEntries = [];
    for (let i = 0; i < count; i++) {
        const off = 6 + i * 16;
        const dataOff = icoBuf.readUInt32LE(off + 12);
        const size = icoBuf.readUInt32LE(off + 8);
        iconEntries.push(ResEdit.Data.IconItem.from(icoBuf, dataOff, size));
    }

    const iconGroupEntry = res.entries.find(e => e.type === 14);
    const iconGroupId = iconGroupEntry ? iconGroupEntry.id : 1;

    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
        res.entries, iconGroupId, lang, iconEntries
    );

    const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
    if (viList.length > 0) {
        const vi = viList[0];
        const pkgPath = path.resolve(_dirname, '../package.json');
        const pack = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const [major, minor, patch] = pack.version.split('.');
        vi.setFileVersion(Number(major), Number(minor), Number(patch), 0, lang);
        vi.setProductVersion(Number(major), Number(minor), Number(patch), 0, lang);
        vi.setStringValues(
            {lang, codepage},
            {
                FileDescription: pack.description,
                ProductName: pack.title,
                CompanyName: pack.title,
                ProductVersion: pack.version,
                FileVersion: pack.version,
                OriginalFilename: 'jm.core.exe',
                LegalCopyright: `© ${new Date().getFullYear()} ${pack.author}`,
            }
        );
        vi.outputToResourceEntries(res.entries);
    }

    res.outputResource(exe);
    const newBinary = exe.generate();
    fs.writeFileSync(BUILT, Buffer.from(newBinary));
    console.log('  Template ready:', BUILT);

    // Crash recovery
    if (fs.existsSync(FETCHED_BAK)) {
        restoreFetched();
    }

    // Hide fetched so pkg uses built (no hash check)
    fs.renameSync(FETCHED, FETCHED_BAK);

    console.log('Rebuilding with custom icon...');
    execSync([
        'npx', '@yao-pkg/pkg',
        BUNDLE,
        '--targets', 'node22-win-x64',
        '--output', OUTPUT_TMP,
    ].join(' '), {cwd: path.resolve(_dirname, '..'), stdio: 'inherit'});

    restoreFetched();

    if (fs.existsSync(OUTPUT_TMP)) {
        if (fs.existsSync(OUTPUT_FINAL)) fs.unlinkSync(OUTPUT_FINAL);
        fs.renameSync(OUTPUT_TMP, OUTPUT_FINAL);
    }

    console.log('Done:', OUTPUT_FINAL);
}

try {
    buildWithIcon();
} catch (err) {
    console.error('Build failed:', err.message);
    restoreFetched();
    process.exit(1);
}
