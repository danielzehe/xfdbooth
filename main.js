const {webFrame} = require('electron')
webFrame.setZoomLevelLimits(1, 1)

const {ipcRenderer} = require('electron')


function startPicTaking4Square(){
	ipcRenderer.send('startProcess', '4sq')
}

function startPicTaking4Column(){
	ipcRenderer.send('startProcess','4col')
}

function startPicTaking1(){
	ipcRenderer.send('startProcess','1')
}