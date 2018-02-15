import $ from 'jquery';
import filesaver from 'file-saver';
import validator from 'validator';
import toastr from 'toastr';
import bc from './bc';
import dateformat from 'dateformat';

import './style.scss';

export default class ui {

    constructor( ) {

    	this.bc = new bc();

        $('body').show();
		$('#ui_create_show').click(() => this.ui_create_show());
		$('#ui_restore_show').click(() => this.ui_restore_show());
		$('#ui_restore_restore').click(() => this.ui_restore_restore());
		$('#ui_create_create').click(() => this.ui_create_create());
		$('#ui_backup_backup').click(() => this.ui_backup_backup());
		$('#ui_auth_auth').click(() => this.ui_auth_auth());
		$('#ui_restore_back').click(() => this.ui_main_show());
		$('#ui_create_back').click(() => this.ui_main_show());
		$('#ui_registered_userinfo').click(()=>this.ui_registered_userinfo());
		$('#ui_registered_viewtokens').click(()=>this.ui_registered_viewtokens());

		this.ui_main_show();
    }

    async init () {
    	await this.bc.init()
    }

	showWaiting(visible) {
		if (visible) {
			$('#spinner').show()
		} else {
			$('#spinner').hide()		
		}
	}

	showSection(section) {

		$('.section').hide()
		$(section).show()

		if (!this.bc.localprofile.initialized) {
		} else {
			let html = this.bc.localprofile.address
			html += " <a href=# id=unlinkid>desvincular</a>"
			$("#footer").html(html)
			$('#unlinkid').click(() => this.unlinkid())
		}

	}

	ui_main_show() {

		if (!this.bc.localprofile.initialized) {
			this.showSection('.section-main')
		} else {
			if (this.bc.userInfo == null) {
				this.ui_auth_show()
			} else {
				this.ui_registered_show()
			}
		}
	}

	ui_create_show() {
		this.showSection('.section-create')
	}

	ui_restore_show() {
		this.showSection('.section-restore')
	}

	ui_auth_show() {

		const address = this.bc.localprofile.address
		const link =  `<a href="https://etherscan.io/address/${address}">${address}</a>`;
		$('#authaddress').html(link)

		this.showSection('.section-auth')
		
	}

	ui_registered_show() {

		this.showSection('.section-registered')
		console.log("userInfo",this.bc.userInfo)
		
		if (!this.bc.userInfo.emailVerified) {
			toastr.error("Consulteu el correu per verificar l'email");
		}

		if ( !this.bc.localprofile.backedup ) {
			$('#backupdiv').show()
		}

	}

	ui_registered_userinfo() {

		let info = this.bc.userInfo.firstName+" "+this.bc.userInfo.secondName+"<br>"+this.bc.userInfo.email

		if (this.bc.userInfo.emailVerified) {
			info += " (Verificat)"
		} else {
			info += " (No verificat)"
		}

		const address = this.bc.localprofile.address
		const link =  `<a href="https://etherscan.io/address/${address}">${address}</a>`;
		info += "<br>ID ethereum: "+link

		toastr.info(info)

	}

	async ui_registered_viewtokens() {
		const assets = await this.bc.getAssetsInfo()
		if (assets.length ==0) {
			toastr.info("No teniu actius registrats")
			return;	
		} 
		let assetsInfo = ''
		for (let i = 0; i < assets.length; i++) {
			let assetInfo = `- ${assets[i].description} (num ${assets[i].serial}`
			if (assets[i].caducity !=0) {
				assetInfo += ', valid fins el '+
					dateformat(new Date(assets[i].caducity*1000),"dd/mm/yyyy");
			}
			assetInfo+=")<br>"
			assetsInfo += assetInfo;
		}		
		toastr.info(assetsInfo)
	}

	async ui_auth_auth() {

		const authpasswd = $(".section-auth #authpasswd").val()
		try {
			await this.bc.login(authpasswd)
			this.ui_registered_show()
		} catch (e) {
			toastr.error(e)
		}

	}

	unlinkid() {
		const agree = confirm("Esteu segurs?")
		if (agree==true) {
			this.bc.reset()
			this.ui_main_show()
		}
	}

	ui_backup_backup() {
		const pvk = this.bc.localprofile.pvk
		var blob = new Blob([pvk], {type: "text/json;charset=utf-8"});
		filesaver.saveAs(blob, "bc_identity.json");
		this.bc.localprofile.backedup = true
		$('#backupdiv').hide()
	}

	ui_restore_restore() {

		const passwd = $("#restorepasswd").val()
		const file = $("#restorefile")[0].files[0]

		var reader = new FileReader();
		var _this = this
		reader.onload = async function(e) {
		  try {
			  await _this.bc.recoverAndLogin(reader.result,passwd)
			  _this.ui_registered_show()
		  } catch (e) {
		  	  toastr.error(e)
		  }
		}
	    reader.readAsText(file);

	}

	async ui_create_create() {

		const captcha = grecaptcha.getResponse()
		const firstName = $(".section-create #firstname").val()
		const secondName = $(".section-create #secondname").val()
		const email = $(".section-create #email").val()
		const passwd1 = $(".section-create #passwd1").val()
		const passwd2 = $(".section-create #passwd2").val()
		const mode = $(".section-create #mode").val()
		const interest = $(".section-create #interest").val()

		if (firstName.length < 2) {
			toastr.error('Nom massa curt');
			return	
		}
		if (secondName.length < 2) {
			toastr.error('Cognom massa curt');		
			return	
		}

		if (!validator.isEmail(email)) {
			toastr.error('Email invalid');		
			return	
		}

		if (passwd1.length < 4) {
			toastr.error('Contrassenya massa curta');
			return;
		}

		if (passwd1 != passwd2) {
			toastr.error('Les contrassenyes no coincideixen');
			return;
		}
		
		if (captcha.length == 0 ) {
			toastr.error('Heu de validar que sou humà');
			return;		
		}
		
		this.showWaiting(true)

		try {
			await this.bc.createWallet(passwd1,firstName,secondName,email,mode,interest,captcha)
			this.showWaiting(false)
			this.ui_main_show()
		} catch (e) {
			this.showWaiting(false)
			toastr.error(e);			
		}
	}
}
