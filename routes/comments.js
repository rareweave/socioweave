const fp = require('fastify-plugin')
let { fetchTxContent } = require("../utils.js")
module.exports = fp(async function (app, opts) {
    app.get("/comments/:contentId", async (req, resp) => {
        let start = req.query.start || 0
        let amount = Math.min(req.query.amount || 20, 100)
        if (!await databases.commentCount.doesExist(req.params.contentId)) {
            return []
        } else {
            let index = (await databases.indexes.get(req.params.contentId)).slice(start, start + amount).map(i => i[0])
            let repliesCount = await databases.commentCount.getMany(index)
            let fetchedComments = await databases.transactions.getMany(index)

            fetchedComments = await Promise.all(fetchedComments.map(async (comment, i) => {
                let masterAccount= await databases.masters.get(comment.address);
                if(!masterAccount){
                    masterAccount = (await subaccounts.fetchMaster(comment.address, "Comments").catch(e => comment.address))?.address || comment.address
                    if (masterAccount != comment.address) {
                        await databases.masters.put(comment.address,masterAccount)
                    }
                }

                let arprofile = await Account.get(masterAccount)
                return {
                    profile: arprofile,
                    uploaderAddress: comment.address,
                    content:comment.content?comment.content.toString():null,
                    timestamp:comment.timestamp,
                    masterAccount: masterAccount || comment.address,
                    id: comment.id,
                    repliesCount: repliesCount[i] || 0,
                    contentType: comment.tags.find(t => t.name == "Content-Type")?.value
                }
            }))

            return fetchedComments
        }
    })
    app.get("/comment-stream/:contentId", async (req, resp) => {
        if (!commentStreamListeners[req.params.contentId]) {
            commentStreamListeners[req.params.contentId]=[]
        }
        commentStreamListeners[req.params.contentId].push({id:req.id,interface:resp})
        resp.raw.writeHead(200, "OK", {
            "Content-Type": "text/event-stream",
            "Connection": "keep-alive",
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers":"*"
        })
        req.raw.on("close", () => {
            global.commentStreamListeners[req.params.contentId] = commentStreamListeners[req.params.contentId].filter(connection=>connection.id!=req.id)
        })
        resp.raw.write(`
event: connected
data: connected

`)
//         setInterval(() => {
//             resp.raw.write(`
// event: ping
// data: pong
// `)
//         },5000)
    })
})