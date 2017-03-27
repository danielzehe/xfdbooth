const {webFrame} = require('electron')
webFrame.setZoomLevelLimits(1, 1)

const {ipcRenderer} = require('electron')


function startPicTaking(){
	ipcRenderer.send('startProcess', 'now')
}