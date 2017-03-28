const {webFrame} = require('electron')
webFrame.setZoomLevelLimits(1, 1)

const {ipcRenderer} = require('electron')


ipcRenderer.on('qrcodedata',(evnt,args)=>{
	console.log(args);
	document.getElementById('qrcode').src=args;
})

function startPicTaking(){
	ipcRenderer.send('startProcess', 'now')
}