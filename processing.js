const {webFrame} = require('electron')
const {ipcRenderer} = require('electron')
webFrame.setZoomLevelLimits(1, 1)
ipcRenderer.on('progess',(evnt,args)=>{
	console.log(args);
	document.getElementById('percent').innerHTML=args.toFixed(2);
})

ipcRenderer.on('previewimg',(evnt,args)=>{
	console.log("previewing image: "+args);
	document.getElementById('preview').src=args;
})