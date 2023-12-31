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
    commentCount: lmdb.open("./db/commentCount"),
    masters:lmdb.open("./db/masters")
}
global.arweave = Arweave.init(config.arweaveConfig)
global.subaccounts = new arweaveSubaccounts(global.arweave, null, config.gateways.arweaveGql, config.gateways.arweaveGateway)
global.commentStreamListeners={}
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

    app.addContentTypeParser('application/octet-stream', function (request, payload, done) {
        let data = Buffer.alloc(0)
        payload.on('data', chunk => {
            if (chunk.length + data.length >= 1e+8) {
                throw "Too big payload"
            }
            data = Buffer.concat([data,chunk])
        })
        payload.on('end', () => {
            done(null, data)
        })
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
