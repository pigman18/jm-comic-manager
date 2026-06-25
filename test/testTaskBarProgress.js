const { setProgress, setIndeterminate, setError } = require('taskbar-progress');

(async () => {
// 不确定进度
    setIndeterminate();

// 模拟进度
    let i = 0;
    const timer = setInterval(() => {
        i += 5;
        setProgress(i / 100);
        if (i >= 100) {
            clearInterval(timer);
            setTimeout(() => setProgress(-1), 1000);
        }
    }, 200);
})();
