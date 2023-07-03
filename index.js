let lmdb = require("lmdb")
let JSON5 = require("json5")
let autoLoad = require("@fastify/autoload")
let consola = require("consola")
let Arweave = require('arweave')
let ArProfile = require("arweave-account")
let arweaveSubaccounts = require("arweave-subaccounts")
const app = require('fastify')({ logger: true })
let fs = require("fs")
global.fetch = require("ofetch").fetch
global.Headers=require("ofetch").Headers
global.config = JSON5.parse(fs.readFileSync("./config.json5", "utf8"))
global.databases = {
    transactions: lmdb.open("./db/transactions"),
    transactionsContents: lmdb.open("./db/transactionsContents"),
    cursors: lmdb.open("./db/cursors"),
    indexes: lmdb.open("./db/indexes"),
    commentCount: lmdb.open("./db/commentCount")
}
global.arweave = Arweave.init(config.arweaveConfig)
global.subaccounts = new arweaveSubaccounts(global.arweave, null, config.gateways.arweaveGql, config.gateways.arweaveGateway)

global.Account = new ArProfile.default({
    gateway: config.arweaveConfig,
    cacheIsActivated: true,
    cacheSize: 1000,
    cacheTime: 60000
})

// console.log(subaccounts.)

let startSyncLoop = require("./syncer.js");

consola.info("Starting SocioWeave daemon")
startSyncLoop()


const start = async () => {

    app.addHook("preHandler", (req, res, done) => {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "*");
        res.header("Access-Control-Allow-Headers", "*");
        const isPreflight = /options/i.test(req.method);
        if (isPreflight) {
            return res.send();
        }
        done()
    })
    app.register(autoLoad, {
        dir: require("path").join(__dirname, 'routes')
    })

    try {
        await app.listen({ port: config.port })
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}
start()
