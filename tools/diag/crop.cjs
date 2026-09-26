const sharp = require('sharp')
const [f, l, t, w, h, out] = process.argv.slice(2)
sharp(f).extract({ left: +l, top: +t, width: +w, height: +h }).resize({ width: Math.min(1400, +w * 2) }).toFile(out).then(() => console.log('ok ' + out), (e) => console.log('ERR ' + e.message))
