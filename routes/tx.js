const fp = require('fastify-plugin')
let { fetchTxContent, fetchBundledTxContent } = require("../utils.js")
let consola = require("consola")
const { $fetch } = require('ofetch')
const { DataItem } = require('arbundles')
module.exports = fp(async function (app, opts) {
    app.post("/tx", async (req, resp) => {
        let bundlrResponse
        try {
            bundlrResponse = await (await $fetch.native(config.gateways.bundlrPost, {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream"
                },
                body: req.body
            })).json();
        } catch (e) {
            resp.status(400)
            return "Failed posting to bundlr"
        }
        if (bundlrResponse && bundlrResponse.id && bundlrResponse.timestamp) {
            if (await databases.transactions.doesExist(bundlrResponse.id)){return}
            let transaction = new DataItem(req.body)
            if (!transaction) { return }
            transaction.address = await arweave.wallets.ownerToAddress(transaction.owner)
            transaction.owner={address:transaction.address}
            if (!transaction.tags.find(t => t.name == "Content-Type") || !transaction.tags.find(t => t.name == "Data-Source")) { return }
            let content = Buffer.from(transaction.data,"base64")
            if (!content || !content.length) { return }
            if (transaction.tags.find(t => t.name == "Content-Type")?.value == "text/plain" && content.length <= 2000) {
                transaction.content = content
            }
            await databases.transactions.put(transaction.id, transaction)
            await databases.transactionsContents.put(transaction.id, { content: content, contentType: transaction.tags.find(t => t.name == "Content-Type")?.value })
            if (!await databases.indexes.doesExist(transaction.tags.find(t => t.name == "Data-Source").value)) {
                await databases.indexes.put(transaction.tags.find(t => t.name == "Data-Source").value, [])
            }
            let index = new Map(await databases.indexes.get(transaction.tags.find(t => t.name == "Data-Source").value))
            index.set(transaction.id, transaction.timestamp)
            await databases.indexes.put(transaction.tags.find(t => t.name == "Data-Source").value, ([...index.entries()]).sort((a, b) => b[1] - a[1]))
            await databases.commentCount.put(transaction.tags.find(t => t.name == "Data-Source").value, index.size)
            let masterAccount = await databases.masters.get(transaction.address);
            if (!masterAccount) {
                masterAccount = (await subaccounts.fetchMaster(transaction.address, "Comments").catch(e => null))?.address || transaction.address
                if (masterAccount != transaction.address) {
                    await databases.masters.put(transaction.address, masterAccount)
                }
            }
            
            let arprofile = await Account.get(masterAccount)
            let messageToSend = {
                profile: arprofile,
                uploaderAddress: transaction.address,
                content: (transaction.tags.find(t => t.name == "Content-Type")?.value == "text/plain" && content.length <= 2000) ? content.toString() : null,
                timestamp: bundlrResponse.timestamp,
                masterAccount: masterAccount || transaction.address,
                id: transaction.id,
                repliesCount: 0,
                contentType: transaction.tags.find(t => t.name == "Content-Type")?.value
            }
            if (global.commentStreamListeners[transaction.tags.find(t => t.name == "Data-Source").value]) {
                global.commentStreamListeners[transaction.tags.find(t => t.name == "Data-Source").value].forEach(({ interface }) => {
                    interface.raw.write(`

event: newMessage
data: ${JSON.stringify(messageToSend)}

`)
                })
                setTimeout(
                    () => {
                        if (typeof interface!="object") { return }
                        interface.raw.write(`

event: ping
data: pong

`)
                    }
                    , 1000)
            }
            consola.info(`Downloaded comment ` + transaction.id + ` (Bundled), commented on: ` + transaction.tags.find(t => t.name == "Data-Source").value + `, by: ` + transaction.address)
        }
    })
})