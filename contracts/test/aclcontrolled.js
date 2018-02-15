/* global artifacts */
/* global contract */
/* global web3 */
/* global assert */

const assertFail = require("./helpers/assertFail.js");

const AclControlledTest = artifacts.require("../contracts/AclControlledTest.sol");

contract("AclControlledTest", (accounts) => {

    const mapAclEntry = aclEntry => {
        return {
            addr  : aclEntry[0],
            acl   : aclEntry[1].toNumber()
        }
    }

    const {
        0: owner,
        1: acc1,
        2: acc2
    } = accounts;

    let aclcontrolled;
    let ACL_BYPASS;
    let ACL_OWNER;
    let ACL_A;
    let ACL_B;

    beforeEach(async () => {
        aclcontrolled = await AclControlledTest.new();
        ACL_BYPASS = await aclcontrolled.ACL_BYPASS();
        ACL_OWNER = await aclcontrolled.ACL_OWNER();
        ACL_A = await aclcontrolled.ACL_A();
        ACL_B = await aclcontrolled.ACL_B();
    });

    it("ACL can be set by owner", async () => {

        const result = await aclcontrolled.setAcl(acc1, ACL_A, { from: owner });

        assert.equal(result.logs.length, 1);
        assert.equal(result.logs[ 0 ].event, "AclChanged");
        assert.equal(result.logs[ 0 ].args.addr, acc1);
        assert.equal(result.logs[ 0 ].args.acl.toNumber(), ACL_A.toNumber());

    });

    it("ACL cannot be set by non-owner", async () => {
        
        try {
	        await aclcontrolled.setAcl(acc1, ACL_A, { from: acc1 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

    it("cannot be called if regular account does not have permissions", async () => {

        try {
	        await aclcontrolled.testAorB({ from: acc1 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

    it("cannot be called if owner account does not have permissions", async () => {

        try {
	        await aclcontrolled.testAorB({ from: acc1 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

    it("can be called if regular acount has the permissions", async () => {

        const result = await aclcontrolled.setAcl(acc1, ACL_A, { from: owner });
	    await aclcontrolled.testAorB({ from: acc1 });

    });

    it("can be called if regular account has more permissions", async () => {

        const result = await aclcontrolled.setAcl(acc1, ACL_A|ACL_B, { from: owner });
	    await aclcontrolled.testAorB({ from: acc1 });

    });

    it("can be called if owner acount without setting permissions (1)", async () => {

	    await aclcontrolled.testOwner({ from: owner });

    });

    it("can be called if owner acount without setting permissions (2)", async () => {

	    await aclcontrolled.testOwnerOrA({ from: owner });

    });

    it("onlyowner cannot be called by non owner", async () => {

        try {
	        await aclcontrolled.testOwner({ from: acc1 });
        } catch (error) {
            return assertFail(error);
        }
        assert.fail("should have thrown before");

    });

    it("bypass can be called by anyone", async () => {

	    await aclcontrolled.testBypass({ from: acc1 });

    });


    it("owner flags can be put programatically via setAcl", async () => {

        await aclcontrolled.setAcl(acc1, ACL_OWNER, { from: owner });
	    await aclcontrolled.testOwner({ from: acc1 });

    });

    /// --- set, clear, alter ACL

    it("existing ACL can be removed", async () => {

	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_A), false);
	    assert.equal(await aclcontrolled.checkAcl(acc2,ACL_B), false);

        await aclcontrolled.setAcl(acc1, ACL_A, { from: owner });
	    assert.equal(await aclcontrolled.aclCount(), 1);
	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_A), true);
	    assert.equal(await aclcontrolled.checkAcl(acc2,ACL_B), false);

        await aclcontrolled.setAcl(acc2, ACL_B, { from: owner });
	    assert.equal(await aclcontrolled.aclCount(), 2);
	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_A), true);
	    assert.equal(await aclcontrolled.checkAcl(acc2,ACL_B), true);

        await aclcontrolled.setAcl(acc1, 0, { from: owner });
	    assert.equal(await aclcontrolled.aclCount(), 1);
	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_A), false);
	    assert.equal(await aclcontrolled.checkAcl(acc2,ACL_B), true);

        await aclcontrolled.setAcl(acc2, 0, { from: owner });
	    assert.equal(await aclcontrolled.aclCount(), 0);
	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_A), false);
	    assert.equal(await aclcontrolled.checkAcl(acc2,ACL_B), false);
    });


    it("existing ACL can be modified", async () => {
        await aclcontrolled.setAcl(acc1, ACL_A, { from: owner });
	    assert.equal(await aclcontrolled.aclCount(), 1);
	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_A), true);
	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_B), false);

        await aclcontrolled.setAcl(acc1, ACL_B, { from: owner });
	    assert.equal(await aclcontrolled.aclCount(), 1);
	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_A), false);
	    assert.equal(await aclcontrolled.checkAcl(acc1,ACL_B), true);
    });



});