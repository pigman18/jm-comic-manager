function createBundle1() {
    let ctx = {
        jmConfig: null,
        jmMessage: null,
        jmStore: null,
        jmCrawler: null,
        jmServer: null,
        jmCli: null,
    };

    function init() {
        ctx.jmConfig = 1;
        ctx.jmMessage = 2;
        ctx.jmStore = 3;
        ctx.jmCrawler = 4;
        ctx.jmServer = 5;
        ctx.jmCli = 6;
    }

    return {
        init,
        get config() { return ctx.jmConfig; },
        get message() { return ctx.jmMessage; },
        get store() { return ctx.jmStore; },
        get crawler() { return ctx.jmCrawler; },
        get server() { return ctx.jmServer; },
        get cli() { return ctx.jmCli; },
    }
}

function createBundle2() {
    let jmConfig = null;
    let jmMessage = null;
    let jmStore = null;
    let jmCrawler = null;
    let jmServer = null;
    let jmCli = null;

    function init() {
        jmConfig = 1;
        jmMessage = 2;
        jmStore = 3;
        jmCrawler = 4;
        jmServer = 5;
        jmCli = 6;
    }

    return {
        init,
        config: jmConfig,
        message: jmMessage,
        store: jmStore,
        crawler: jmCrawler,
        server: jmServer,
        cli: jmCli
    }
}

(async () => {
    let bundle1 = createBundle1();
    bundle1.init();
    let config1 = bundle1.config;
    console.log(bundle1);

    let bundle2 = createBundle2();
    bundle2.init();
    let config2 = bundle2.config;
    console.log(bundle2);

})();