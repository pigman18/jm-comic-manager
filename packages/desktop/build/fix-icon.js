import fs from 'fs';
import path from 'path';
import { NtExecutable, NtExecutableResource, Resource, Data } from 'resedit';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'dist');
const exeName = fs.readdirSync(outputDir).find(f => f.endsWith('.exe'));
if (!exeName) { console.error('No exe found in dist/'); process.exit(1); }
const exePath = path.join(outputDir, exeName);
const iconPath = path.join(__dirname, '..', 'icon.ico');

if (!fs.existsSync(iconPath)) { console.error('icon.ico not found'); process.exit(1); }

const buf = fs.readFileSync(exePath);
const exe = NtExecutable.from(buf);
const res = NtExecutableResource.from(exe);
const iconBuf = fs.readFileSync(iconPath);
const iconFile = Data.IconFile.from(iconBuf);
Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, iconFile.icons.map(i => i.data));
console.log('Icon applied');

const vi = Resource.VersionInfo.fromEntries(res.entries)[0];
if (vi) {
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    ProductName: 'JM漫画管理器', FileDescription: 'JM漫画管理器',
    InternalName: 'JMComicManager', OriginalFilename: exeName,
  });
  vi.outputToResourceEntries(res.entries);
}
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
console.log('Metadata applied OK');
