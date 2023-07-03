const fp = require('fastify-plugin')
let { fetchTxContent } = require("../utils.js")
module.exports = fp(async function (app, opts) {
    app.get("/content/:txId", async (req, resp) => {

        let txData = await databases.transactionsContents.get(req.params.txId)
        if (!txData) {
            resp.statusCode(404)
            return "No content found"
        }
        resp.header("Content-Type", txData.contentType)
        return txData.content
    })
})