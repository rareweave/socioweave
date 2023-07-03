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
                let masterAccount;
                if (await databases.masters.doesExist(comment.address)) {
                    masterAccount=await databases.masters.get(comment.address)
                } else {
                    masterAccount = (await subaccounts.fetchMaster(comment.address, "Comments").catch(e => comment.address))?.address || comment.address
                    if (masterAccount !== comment.address) {
                        await databases.masters.put(comment.address)
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
})