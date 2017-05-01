const {webFrame} = require('electron')
const {ipcRenderer} = require('electron')
webFrame.setZoomLevelLimits(1, 1)
ipcRenderer.on('progess',(evnt,args)=>{
	console.log(args);
	document.getElementById('percent').innerHTML=(args*100).toFixed(0)+'%';
})

ipcRenderer.on('previewimg',(evnt,args)=>{
	console.log("previewing image: "+args);
	document.getElementById('preview').src=args;
})



function startPicTaking(){
	ipcRenderer.send('showMain')
}