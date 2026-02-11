
try {
    process.kill(process.pid, 'SIGKILL');
} catch (e) {
    // ignore
}
