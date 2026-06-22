import fs from 'fs';

// Patches the PE subsystem from GUI (2) back to CONSOLE (3)
const exePath = process.argv[2];
if (!exePath) { console.error('usage: node fix-subsystem.js <exe>'); process.exit(1); }

const buf = fs.readFileSync(exePath);
const peOffset = buf.readUInt32LE(0x3C);
const subsystemOffset = peOffset + 24 + 68;
const current = buf.readUInt16LE(subsystemOffset);
if (current === 3) {
  console.log('subsystem already CONSOLE (3), skipping');
  process.exit(0);
}
buf.writeUInt16LE(3, subsystemOffset);
fs.writeFileSync(exePath, buf);
console.log('patched subsystem from', current, 'to 3 (CONSOLE)');
