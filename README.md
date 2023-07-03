# SocioWeave - The arweave's social API

SocioWeave is backend server for various social protocols on Arweave network.

It implements [Permaweb Comments Spec](https://specs.g8way.io/?tx=SYCrxZYzhP_L_iwmxS7niejyeJ_XhJtN4EArplCPHGQ), integrating [Rareweave Subaccounts](https://github.com/rareweave/subaccounts) for best UX and [ArProfile](https://github.com/metaweave/arprofile) for handling users profiles.

It also uses [Bundlr Network](https://bundlr.network) timestamping for proper comments sorting and leverages its fast settlement, which in combination with Rareweave Subaccounts, gives best web3 UX possible.

## Installation

You can use free SocioWeave node (<https://socioweave.rareweave.store>) hosted by RareWeave team, however it's *highly recommended* for censorship-resistance reasons to host your own one.  

```sh
git clone https://github.com/rareweave/socioweave/
cd socioweave
yarn
```

Now configure gateways and other settings in `config.json5`:

```sh
nano config.json5
```

After you're fine with config, save it and start socioweave node:

```sh
node . # or start with process manager like pm2
```

If you're seeing logs of loading comments, congrats! You've just started your SocioWeave node. Otherwise contact the RareWeave team in our discord (<https://discord.gg/2esZrmXsqs>) so that we can assist you with running SocioWeave.


## API

For this doc, let's assume that `$nodeAddress` is schemed like this: `<http|https>://<node ip or domain>:<node port>/`.

### Fetching comments on specific content (by tx id)

Method: `GET`

URI: `$nodeAddress/comments/:txId`

Params:

- `txId`
> Transaction ID to get comments on.

Query params:
- `start`
> Skip X amount of comments and select starting from specified in query.
- `amount`
> Amount of comments to fetch. 100 max, 20 default 

Returns: Array[...[Comment](#comment)]

### Fetching comment content

Method: `GET`

URI: `$nodeAddress/content/:txId`

Params:

- `txId`
> Transaction ID to get content of.

Returns: Content

### Fetching ArProfile of address

Method: `GET`

URI: `$nodeAddress/profile/:address`

Params:

- `address`
> Address to fetch profile for.

Returns: [ArProfile](#arprofile)


## Structures

### Comment

```js
{
    profile:<ArProfile>,//ArProfile info of master account (from subaccounts) 
    id:<String>,//Comment TXID
    contentType:<String>,//Comment content type
    repliesCount:<Integer>,//Amount of replies to comment
    masterAccount:<String>,//Address of master account which posted this comment
    uploaderAddress:<String>//Address of uploader of comment, might be subaccount
}
```

### ArProfile

[See at ArProfile page](https://arprofile.g8way.io/) 