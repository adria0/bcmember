# bcmember

This registry system for the Blockchain Catalunya association (https://www.blockchaincatalunya.org)

### Disclaimer

This is a "hobby-mode" project. It cointain bugs, non-documented code, etc...

BTW I'm learning golang, so if you find something that could be improved, structure, etc... please let's me know! 

### Folder contents

- `contracts/` the assets smartcontract, this smartcontract will hold all the assets generated by the association to his associates. The main contract is the `Assets.sol`

- `web/` is the associate mobile-friendy web application.

- `server/` is the backend system for the web. golang <3 

- `aragonapp/` is a wrapper for using the assets contract inside with the amazing aragonOs (see https://aragon.one )

### The assets contract

It's a custom non-fungible token

NOTE: This is not a decentralized token, this means that tokens can be created and destroyed by the smartcontract owners and administrators. The Blockchain Catalunya association v1.0 is a centralized organization.

the API:

- `mint(address _owner, uint16 _class, bool _transferable, uint64 _caducity, string _description)`
  - `_owner` of the asset
  - `_class` of asset (id card, a specific training, etc...)
  - `_transferable` if the owner can transfer the asset to other member or not
  - `_caducity` of the asset
  - `_description` (short) of the asset

- `burn(uint128 _serial)`
  - `_serial` to be burnt

- `transfer(uint128 _serial, address _to, bool _notify)`
  - `_serial` of asset being transferred
  - `_to` the recipient
  - `_notify` execute callback `onAssetsFallback` on the recipient address

- `transferOffchain(uint128 _serial, address _to, uint64 _nonce, uint8 _v, bytes32 _r, bytes32 _s)`
  - the same of `transfer` but with an offline generated signature see tests for an example. You need to use an incremental nonce here.

- `setCustomAttr1(uint128 _serial, bytes32 _value)`
  - the owner of the asset can set an field in their assets with some value
  - `_serial` of the asset
  - `_value` to be set

- `setCustomAttr2(uint128 _serial, bytes32 _value)`
  - the owner of the contract can set an field in their assets with some value. this is usefull, for instance, to set a SWARM/IPFS hash of a better representation of the asset.
  - `_serial` of the asset
  - `_value` to be set

### The web application

A friend helped me to write a decent and modern-looking web application, but ok, I am not a web developer, I am a security guy, so expect rare things here.

- `ui.js` is the class managing all the user interface stuff, it's the controller
- `bc.js` manages the communication with the backend server and the blockchain

Maybe here it's where makes sense to explain how authorization works:

briefly:

- User generates a keypair in the browser and keeps it the browser storage
- Webapp sends a JSONRPC `bc_register` message to the server (yes, the server talks JSONRPC not JSON/REST) with the associate but also sending an `Authorization` HTTP header with the signature of the JSONRPC message made with the user private key. See the `_postSignedJsonRpc` function here. Server processes it.
- Server will respond with a JWT token, this JWT token will be used by the client as an authorization for the web3, since backend also acts as a web3 gateway.

```
+-----+               +---------+     +-------+
| web |               | server  |     | geth  |
+-----+               +---------+     +-------+
   |                       |              |
   | generate keypair      |              |
   |-----------------      |              |
   |                |      |              |
   |<----------------      |              |
   |                       |              |
   | signed JSONRPC        |              |
   |---------------------->|              |
   |                       |              |
   |                   JWT |              |
   |<----------------------|              |
   |                       |              |
   | web3call + JWT        |              |
   |---------------------->|              |
   |                       |              |
   |                       | web3call     |
   |                       |------------->|
   |                       |              |
   |                       |     response |
   |                       |<-------------|
   |                       |              |
   |              response |              |
   |<----------------------|              |
   |                       |              |
```

### The server

The server is writen in golang <3 and have the following endpoints:

- `/web3` the web3 JWT-authorized gateway
- `/dapp` is serving the webapp
- `/rpc`  is serving the signed JSONRPC calls 
- `/config` retrieves the server parameters needed by the webapp

There's a configuration file template in template-bcserver.yaml

### How to start the system

- deploy the `contracts/contract/Assets.sol` smartcontract
- create a configuration file named `yournostname-bcserver.yaml`, with the configuration parameters (see the template)
- go to `web/` and run `npm i && npm run dist` 
- go to `server/` and run `make get`, and `make run` (you need golang installed)




