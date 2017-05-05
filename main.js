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

function startPicTaking(){
	ipcRenderer.send('startProcess','3')
}

function quit(){
	ipcRenderer.send('quit','now');
}