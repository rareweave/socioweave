let { executeTxQuery, executeBundlrQuery, wait, makeBundlrQuery, findTxById, fetchTxContent, fetchBundledTxContent } = require("./utils.js")
let consola = require("consola")
let lmdb = require("lmdb")
const { fetch } = require("ofetch")

module.exports = async function startSyncLoop() {
    await sync()
    setInterval(sync, 5000)
}

async function sync() {
    for await (let transaction of (await executeBundlrQuery([["Data-Protocol", "Comment"]]))) {
        
        if (!transaction.tags.find(t => t.name == "Content-Type") || !transaction.tags.find(t => t.name == "Data-Source")) { continue }
        let content = await fetchBundledTxContent(transaction.id)
        if (!content || !content.length) { continue }
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
        let masterAccount = await databases.masters.get(transaction.owner.address);
        if (!masterAccount) {
            masterAccount = (await subaccounts.fetchMaster(transaction.owner.address, "Comments").catch(e => transaction.owner.address))?.address || transaction.owner.address
            if (masterAccount != transaction.owner.address) {
                await databases.masters.put(transaction.owner.address, masterAccount)
            }
        }

        let arprofile = await Account.get(masterAccount)
        let messageToSend= {
            profile: arprofile,
            uploaderAddress: transaction.owner.address,
            content: (transaction.tags.find(t => t.name == "Content-Type")?.value == "text/plain" && content.length <= 2000) ? content.toString() : null,
            timestamp: transaction.timestamp,
            masterAccount: masterAccount || transaction.owner.address,
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
                    if(typeof interface!='object'){return}
                    interface.raw.write(`

event: ping
data: pong

`)
                }
                , 1000)
        }
        consola.info(`Downloaded comment ` + transaction.id + ` (Bundled), commented on: ` + transaction.tags.find(t => t.name == "Data-Source").value + `, by: ` + transaction.address)

    }
    for await (let transaction of (await executeTxQuery(0, [["Data-Protocol", "Comment"]], true))) {
        if (await databases.transactions.doesExist(transaction.id)) { return }
        if (!transaction.tags.find(t => t.name == "Content-Type") || !transaction.tags.find(t => t.name == "Data-Source")) { continue }
        let content = await fetchTxContent(transaction.id)
        if (!content || !content.length) { continue }
        if (transaction.tags.find(t => t.name == "Content-Type")?.value == "text/plain" && content.length <= 2000) {
            transaction.content = content
        }
        await databases.transactions.put(transaction.id, transaction)
        await databases.transactionsContents.put(transaction.id, { content: content, contentType: transaction.tags.find(t => t.name == "Content-Type") })
        if (!await databases.indexes.doesExist(transaction.tags.find(t => t.name == "Data-Source").value)) {
            await databases.indexes.put(transaction.tags.find(t => t.name == "Data-Source").value, [])
        }
        let index = new Map(await databases.indexes.get(transaction.tags.find(t => t.name == "Data-Source").value))
        index.set(transaction.id, transaction.timestamp)
        await databases.indexes.put(transaction.tags.find(t => t.name == "Data-Source").value, ([...index.entries()]).sort((a, b) => b[1] - a[1]))

        await databases.commentCount.put(transaction.tags.find(t => t.name == "Data-Source").value, index.size)
        consola.info(`Downloaded comment ` + transaction.id + ` (Base), commented on: ` + transaction.tags.find(t => t.name == "Data-Source").value + `, by: ` + transaction.address)
    }
}