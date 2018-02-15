/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertFail = require("./helpers/assertFail.js");

const Assets = artifacts.require("../contracts/Assets.sol");

contract("Assets", (accounts) => {

    const ALFA  = "0x0000000000000000000000000000000000000000"
    const OMEGA = "0x000000000000000000000000000000000000dead"
    const ATTR1 = web3.sha3("attr1");
    const ATTR2 = web3.sha3("attr2");

    const now = () => Math.floor(Date.now() / 1000)

    const mapAsset = asset => {
        return {
            owner        : asset[0],
            serial       : asset[1].toNumber(),
            class        : asset[2].toNumber(),
            transferable : asset[3],
            caducity     : asset[4],
            description  : asset[5],
            customAttr1  : asset[6],
            customAttr2  : asset[7],
            ownerIndex   : asset[8].toNumber()
        }
    }

    const dumpassets = async (acc) => {

        const short = (a) => {
            return a.owner+",serial:"+a.serial+",index:"+a.ownerIndex
        }

        let inf=""
        const count = (await assets.ownerAssetCount(acc)).toNumber()
        inf+="-----------------------------------------\n"
        inf+=acc+":\n";
        for (let i=0;i<count;i++){
            const serial = await assets.ownersSerials(acc,i)
            const asset2 = await assets.assets(serial)
            const asset2map = mapAsset(asset2)
            inf+=" ->"+i+" serial "+serial+" "+short(asset2map)+"\n"
        }
        inf+="----------------------------------------\n"
        return inf
    }


    const {
        0: owner,
        1: admin,
        2: acc1,
        3: acc2
    } = accounts;

    let assets;

    beforeEach(async () => {
        assets = await Assets.new();
        await assets.setAcl(admin, await assets.ACL_ASSETADMIN())
    });

    /// --- mint

    it("Minting creates a new asset and event is generated", async () => {

        const result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });

        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[ 0 ].event, "LogTransfer");
        assert.equal(result.logs[ 0 ].args.serial, 0);
        assert.equal(result.logs[ 0 ].args.from, ALFA);
        assert.equal(result.logs[ 0 ].args.to, acc1);

        const asset = mapAsset(await assets.assets(result.logs[ 0 ].args.serial))

        assert.equal(asset.owner, acc1);
        assert.equal(asset.serial, 0);
        assert.equal(asset.class, 1000);
        assert.equal(asset.transferable, true);
        assert.equal(asset.caducity, 9191);
        assert.equal(asset.description, "asset1");

        assert.equal(await assets.ownerAssetCount(acc1),1)

    });

    it("Authorized can mint", async () => {

        await assets.mint(acc1, 1000, true, 9191, "asset1", { from: admin });

    });

    it("Non-autorized cannot mint", async () => {
        
        try {
            await assets.mint(acc1, 1000, true, 9191, "asset1", { from: acc1 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

    /// --- transfer

    it("An asset can be tranferred to other account and event is generated", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        
        result = await assets.transfer(serial, acc2, false, { from: acc1 });
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[ 0 ].event, "LogTransfer");
        assert.equal(result.logs[ 0 ].args.serial.toNumber(), serial.toNumber());
        assert.equal(result.logs[ 0 ].args.from, acc1);
        assert.equal(result.logs[ 0 ].args.to, acc2);

    });

    it("An asset cannot be tranferred by non-owner", async () => {
        
        let result =await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial

        try {
            await assets.transfer(serial, acc2, false, { from: acc2 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

    it("A non-transferable asset cannot be tranferred", async () => {
        
        let result = await assets.mint(acc1, 1000, false, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        
        try {
            await assets.transfer(serial, acc2, false, { from: acc1 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });


    it("Try transfer back and forth", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset0", { from: owner });
        const serial1 = result.logs[ 0 ].args.serial
        result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial2 = result.logs[ 0 ].args.serial
        result = await assets.mint(acc1, 1000, true, 9191, "asset2", { from: owner });
        const serial3 = result.logs[ 0 ].args.serial
        
        await assets.transfer(serial1, acc2, false, { from: acc1 });
        await assets.transfer(serial2, acc2, false, { from: acc1 });
        await assets.transfer(serial3, acc2, false, { from: acc1 });

        await assets.transfer(serial2, acc1, false, { from: acc2 });
        await assets.transfer(serial1, acc1, false, { from: acc2 });
        await assets.transfer(serial3, acc1, false, { from: acc2 });

        await assets.transfer(serial3, acc2, false, { from: acc1 });
        await assets.transfer(serial2, acc2, false, { from: acc1 });
        await assets.transfer(serial1, acc2, false, { from: acc1 });

    });


    /// --- burn


    it("An asset can be burnt by owner", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });

        assert.equal(await assets.ownerAssetCount(acc1),1)

        const serial = result.logs[ 0 ].args.serial;

        result = await assets.burn(serial, { from: owner });
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[ 0 ].event, "LogTransfer");
        assert.equal(result.logs[ 0 ].args.serial.toNumber(), serial.toNumber());
        assert.equal(result.logs[ 0 ].args.from, acc1);
        assert.equal(result.logs[ 0 ].args.to, OMEGA);

        assert.equal(await assets.ownerAssetCount(acc1),0)
        assert.equal(await assets.ownerAssetCount(OMEGA),1)

    });

    it("An asset can be burnt by authorized", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });

        const serial = result.logs[ 0 ].args.serial;

        await assets.burn(serial, { from: admin });

    });

    it("An asset cannot be burnt by non-authorized", async () => {
        
        let result =await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial

        try {
            await assets.burn(serial, { from: acc2 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

    /// ---- attr1

    it("Asset owner can set attr1", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        await assets.setCustomAttr1(serial, ATTR1 , { from: acc1 });

        const asset = mapAsset(await assets.assets(result.logs[ 0 ].args.serial))

        assert.equal( asset.customAttr1, ATTR1 );

    });

    it("Contract owner cannot set attr1", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        try {
            await assets.setCustomAttr1(serial, ATTR1 , { from: owner });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");
    });

    /// ---- attr2

    it("Contract owner can set attr2", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        await assets.setCustomAttr2(serial, ATTR2 , { from: owner });

        const asset = mapAsset(await assets.assets(result.logs[ 0 ].args.serial))

        assert.equal( asset.customAttr2, ATTR2 );

    });

    it("Contract auhtorized can set attr2", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        await assets.setCustomAttr2(serial, ATTR2 , { from: admin });
    });

    it("Asset owner cannot set attr2", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        try {
            await assets.setCustomAttr2(serial, ATTR2 , { from: acc1 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");
    });

    /// ---- offline trasfers

    const uint128hex = v => {
        return v.toString(16).padStart(32,'0')
    }
    const uint64hex = v => {
        return v.toString(16).padStart(16,'0')
    }

    const offlineTransfer = (serial, to, acc , nonce, extra ) => {

        const encoded = assets.transferOffchain.request(serial,to,nonce,0,0,0).params[0].data
        const preimage = assets.address + encoded.slice(2) + extra
        const hash = web3.sha3(preimage, {encoding: 'hex'})

        const sig = web3.eth.sign(acc, hash).slice(2)

        const r = `0x${sig.slice(0, 64)}`
        const s = `0x${sig.slice(64, 128)}`
        const v = web3.toDecimal(sig.slice(128, 130)) + 27

        return assets.transferOffchain(serial, to, nonce, v, r,s)

    }

    it("Transfer with offline signature", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        
        result = await offlineTransfer(serial, acc2, acc1, 1, "");
        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[ 0 ].event, "LogTransfer");
        assert.equal(result.logs[ 0 ].args.serial.toNumber(), serial.toNumber());
        assert.equal(result.logs[ 0 ].args.from, acc1);
        assert.equal(result.logs[ 0 ].args.to, acc2);

    });

    it("Cannot transfer with bad offline signature", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial = result.logs[ 0 ].args.serial
        
        try {
            await offlineTransfer(serial, acc2, acc1, 1, "00");
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });    

    it("Can transfer again incrementing nonce", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial1 = result.logs[ 0 ].args.serial
        result = await assets.mint(acc1, 1000, true, 9191, "asset2", { from: owner });
        const serial2 = result.logs[ 0 ].args.serial
 
        await offlineTransfer(serial1, acc2, acc1, 1, "");
        await offlineTransfer(serial2, acc2, acc1, 2, "");

    });

    it("Cannot transfer reusing nonce", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial1 = result.logs[ 0 ].args.serial
        result = await assets.mint(acc1, 1000, true, 9191, "asset2", { from: owner });
        const serial2 = result.logs[ 0 ].args.serial
        
        await offlineTransfer(serial1, acc2, acc1, 1, "");
        try {
            await offlineTransfer(serial2, acc2, acc1, 1, "");
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

    it("Cannot transfer bypassing a nonce", async () => {
        
        let result = await assets.mint(acc1, 1000, true, 9191, "asset1", { from: owner });
        const serial1 = result.logs[ 0 ].args.serial
        result = await assets.mint(acc1, 1000, true, 9191, "asset2", { from: owner });
        const serial2 = result.logs[ 0 ].args.serial
        
        await offlineTransfer(serial1, acc2, acc1, 1, "");
        try {
            await await offlineTransfer(serial2, acc2, acc1, 3, "");
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

});