import store from 'store';

export default class localprofile {

	static reset() {
		store.remove('bc-address')
		store.remove('bc-pvk')
		store.remove('bc-backupdone')
	}

	static get initialized() {
		return store.get('bc-address') !== undefined;		
	}

	static get address() {
		return store.get('bc-address');		
	}

	static get backedup() {
		return store.get('bc-backupdone');
	}

	static get pvk() {
		return store.get('bc-pvk');
	}

	static set address(value) {
		store.set('bc-address',value);		
	}

	static set backedup(value) {
		store.set('bc-backupdone',value);
	}

	static set pvk(value) {
		store.set('bc-pvk',value);
	}

}