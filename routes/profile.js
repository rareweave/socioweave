const fp = require('fastify-plugin')
let { fetchTxContent } = require("../utils.js")
module.exports = fp(async function (app, opts) {
    app.get("/profile/:address", async (req, resp) => {
        return await Account.get(req.params.address)
    })
})