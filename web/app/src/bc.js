import rlp from 'rlp';
import web3 from 'web3';
import store from 'store'
import lightwallet from 'eth-lightwallet';
import localprofile from './localprofile';
import $ from 'jquery';

export default class bc {

    constructor( ) {
    	this.jwt = null
    	this.web3 = null
    	this.keystore = null
    	this.userInfo = null
    	console.log(this.initialized)
    }

    async init() {
    	this.serverconfig = await $.ajax('/config')
    	console.log(this.serverconfig)
    }

    get localprofile() {
		return localprofile;	
	}

	reset() {
		localprofile.reset()
    	this.jwt = null
    	this.web3 = null
    	this.keystore = null
    	this.userInfo = null
	}

	_updateJwt(_jwt) {
		this.jwt = _jwt
		this.web3 = new Web3(new Web3.providers.HttpProvider("/web3",0,"jwt",this.jwt));
	}

	_assetArrayToMap(v) {
		return {
			address:       v[0],
			serial:        v[1].toNumber(),
			class :        v[2].toNumber(),
			transferable : v[3],
			caducity :     v[4],
			description :  v[5]
		}
	}

	getAssetsInfo() {
		const abi = [{"constant":false,"inputs":[{"name":"_serial","type":"uint256"},{"name":"_to","type":"address"},{"name":"_notify","type":"bool"}],"name":"transfer","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"uint256"}],"name":"assetOwners","outputs":[{"name":"owner","type":"address"},{"name":"serial","type":"uint128"},{"name":"class","type":"uint64"},{"name":"transferable","type":"bool"},{"name":"caducity","type":"uint64"},{"name":"description","type":"string"},{"name":"customAttr1","type":"uint256"},{"name":"customAttr2","type":"uint256"},{"name":"ownerIndex","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"changeOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_serial","type":"uint256"}],"name":"burn","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_dac","type":"address"}],"name":"removeOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_newOwnerCandidate","type":"address"}],"name":"proposeOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_serial","type":"uint256"},{"name":"_to","type":"address"},{"name":"_nonce","type":"uint64"},{"name":"_v","type":"uint8"},{"name":"_r","type":"bytes32"},{"name":"_s","type":"bytes32"}],"name":"transferOffchain","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"acceptOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"nonces","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_serial","type":"uint256"},{"name":"_value","type":"uint256"}],"name":"setCustomAttr2","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_owner","type":"address"},{"name":"_class","type":"uint16"},{"name":"_transferable","type":"bool"},{"name":"_caducity","type":"uint64"},{"name":"_description","type":"string"}],"name":"mint","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"assets","outputs":[{"name":"owner","type":"address"},{"name":"serial","type":"uint128"},{"name":"class","type":"uint64"},{"name":"transferable","type":"bool"},{"name":"caducity","type":"uint64"},{"name":"description","type":"string"},{"name":"customAttr1","type":"uint256"},{"name":"customAttr2","type":"uint256"},{"name":"ownerIndex","type":"uint64"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"newOwnerCandidate","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"assetCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_addr","type":"address"}],"name":"ownerAssetCount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_serial","type":"uint256"},{"name":"_value","type":"uint256"}],"name":"setCustomAttr1","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"name":"serial","type":"uint256"},{"indexed":false,"name":"from","type":"address"},{"indexed":false,"name":"to","type":"address"}],"name":"LogTransfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"by","type":"address"},{"indexed":true,"name":"to","type":"address"}],"name":"OwnershipRequested","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[],"name":"OwnershipRemoved","type":"event"}]
		const contract = this.web3.eth.contract(abi);
		const instance = contract.at(this.serverconfig.assetsContractAddress)
		const assetCount = instance.ownerAssetCount(localprofile.address , { from : localprofile.address }).toNumber()
		let info = []
		for (let i=0;i<assetCount;i++) {
			const asset = instance.assetOwners(localprofile.address,i, { from : localprofile.address })
			info.push(this._assetArrayToMap(asset))
		}
		return info
	}


	async _postSignedJsonRpc(method, params, keyStore, pwDerivedKey, address) {

		const nonce = + new Date()			

		const paramsWithNonce = params.concat(method).concat(nonce)
		const encoded = rlp.encode(paramsWithNonce);

		const sig = lightwallet.signing.signMsg(
			keyStore, pwDerivedKey, encoded, address
		)
		const sighex = 
			Buffer.from(sig.r).toString('hex')+
			Buffer.from(sig.s).toString('hex')+
			Buffer.from(new Uint8Array([sig.v])).toString('hex')

		const msg = {
			"jsonrpc" : "2.0",
			"method"  : method,
			"params"  : params.concat(address),
			"id"      : nonce
		}

		return await $.ajax({
	    	url: '/rpc',
	    	type: 'POST',
	    	contentType: 'application/json',
	    	dataType: 'json',
	    	data: JSON.stringify(msg),
	    	beforeSend: function(request) {
	    		request.setRequestHeader("Authorization","Signature "+sighex);
	  		}
		}) 
	}

	_createVault (v) {
		return new Promise( (resolve, reject) => {
			lightwallet.keystore.createVault(v, (err, ks) => {
				if (err) reject(err);
				else resolve(ks);
			})
		});
	}

	_keyFromPassword (ks,password) {
		return new Promise( (resolve, reject) => {
			ks.keyFromPassword(password, (err, ks) => {
				if (err) reject(err);
				else resolve(ks);
			})
		});
	}

	async createWallet(passwd, firstName,secondName,email,mode,interest,captcha) {


		const ks = await this._createVault({ password: passwd })
		const pwDerivedKey = await this._keyFromPassword(ks,passwd)

        ks.generateNewAddress(pwDerivedKey, 1);

        const address = "0x"+ks.getAddresses()[0];

        let resp = await this._postSignedJsonRpc(
			"bc_register",
			[firstName,secondName,email,mode,interest,captcha],
			ks,pwDerivedKey,address
		)

		if (resp.error) {
			throw resp.error.message;
		}

        localprofile.address = address;
        localprofile.pvk = ks.serialize();
        localprofile.backedup = false;

        this.keystore = ks;
		this.userInfo = {
			firstName : firstName,
			secondName : secondName,
			email : email
		}
	}

	async login(passwd) {

		const ks = lightwallet.keystore.deserialize(localprofile.pvk)
		const pwDerivedKey = await this._keyFromPassword(ks,passwd)
        let resp = await this._postSignedJsonRpc(
			"bc_auth",
			[],
			ks,pwDerivedKey,localprofile.address
		)
		console.log("resp",resp)

		if (resp.error) {
			throw resp.error.message;
		}

        this.keystore = ks;
		this.userInfo = resp.data.member
		this._updateJwt(resp.data.jwt)

	}

	async recoverAndLogin(backup,passwd) {

		const ks = lightwallet.keystore.deserialize(backup)
		const pwDerivedKey = await this._keyFromPassword(ks,passwd)
		if (!ks.isDerivedKeyCorrect(pwDerivedKey)) {
			throw "Contrassenya incorrecte"
		}
		
		const address = "0x"+ks.getAddresses()[0]

        let resp = await this._postSignedJsonRpc(
			"bc_auth",
			[],
			ks,pwDerivedKey,address
		)

		if (resp.error) {
			throw resp.error.message;
		}

        localprofile.address = address;
        localprofile.pvk = backup;
        localprofile.backedup = true;

        this.keystore = ks;
		this.userInfo = resp.data.member
		this._updateJwt(resp.data.jwt)

	}

}
