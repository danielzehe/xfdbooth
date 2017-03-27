const electron = require('electron')
const {ipcMain} = require('electron')
const spawn = require('child_process').spawn
const uuidV1 = require('uuid/v1')
const im = require('imagemagick')

const os = require('os');
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.

  mainWindow = new BrowserWindow({width: 800, height: 480,frame:false,resizable:false})
  if(os.arch()=='arm'){
    mainWindow.setFullScreen(true);
    mainWindow.setResizable(true);
    mainWindow.setKiosk(true);
  }


  // and load the index.html of the app.
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'main.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('startProcess', (event, arg) => {
  console.log(arg)  // prints "ping"
  // event.sender.send('asynchronous-reply', 'pong')
  mainWindow.loadURL(url.format({ pathname:path.join(__dirname,'index.html'),
                                  protocol: 'file',
                                  slashes:true}));
})


ipcMain.on('takepic',(event,args)=>{
  let basename = uuidV1();
  let numberofpics =4;
  let p = Promise.resolve();
  for(let i=0;i<numberofpics;i++){
    let filename = basename+'_'+i+'.jpg';
    // let phototaking = spawnSync('gphoto2',['--capture-image-and-download','--filename='+filename]);
    p = p.then(()=>takepicwithfilename(filename))
    // phototaking.stdout.pipe(process.stdout);
  }
  p.then(()=>{
    console.log('make more');
      let convertargs = ['(',basename+'_'+0+'.jpg',basename+'_'+1+'.jpg','+append',')','(','(',basename+'_'+2+'.jpg',basename+'_'+3+'.jpg','+append',')','lower.jpg','-append',')','-append',basename+'_all.jpg'];

      im.convert(convertargs,(err,stdout)=>{
          if (err) throw err;
          
      });
  })
})


function takepicwithfilename(filename){
  return new Promise((resolve,reject)=>{
    let phototaking = spawn('gphoto2',['--capture-image-and-download','--filename='+filename]);
    phototaking.stdout.pipe(process.stdout);

    phototaking.on('close',(err)=>{
      console.log("done");
       resolve(filename);
    })
  });
}

