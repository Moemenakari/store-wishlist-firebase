// Keeps `npm start` alive after seeding so the emulators stay up until Ctrl+C.
console.log('App: http://127.0.0.1:5000  ·  Emulator UI: http://127.0.0.1:4000  ·  Ctrl+C to stop');
setInterval(() => {}, 1 << 30);
