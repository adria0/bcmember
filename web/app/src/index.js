import ui from './ui';

import './style.scss';

window.addEventListener('load', async function() {

	const u = new ui();
	await u.init()
	u.ui_main_show();

});
