const electron = require('electron')
const {ipcMain} = require('electron')
const spawn = require('child_process').spawn
const uuidV1 = require('uuid/v1')
const im = require('imagemagick')
const qr = require('qr-encode');
const scpClient = require('scp2').Client


const useflickr = false;
const flickrOps = require('./flickrcreds.js');
const scpCreds = require('./scpcreds.js');
var Flickr = require("flickrapi"),
    FlickrOptions= {
      api_key : flickrOps.api_key,
      secret: flickrOps.secret,
      permissions:'write',
      user_id :flickrOps.user_id,
      access_token: flickrOps.access_token,
      access_token_secret : flickrOps.access_token_secret
    };



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
  let filenames = new Array();
  for(let i=0;i<numberofpics;i++){
    let filename = basename+'_'+i+'.jpg';
    // let phototaking = spawnSync('gphoto2',['--capture-image-and-download','--filename='+filename]);
    filenames.push(filename);
    p = p.then(()=>takepicwithfilename(filename))
    // phototaking.stdout.pipe(process.stdout);
  }
  //once the pictures are taken, stitch them into one
  p=p.then(()=>makecollage(filenames,basename));

  if(useflickr){
    p = p.then((colfilename)=>uploadtoFlickr(colfilename));

    p = p.then((photoID)=>getLinkforPhotoIDfromFlickr(photoID));
  }
  else{
    //using scp 
    p=p.then((colfilename)=>uploadviaSCP(colfilename));

  }
  p.then((photourl)=>{
    genQRCodeandShow(photourl);
  })
})


function genQRCodeandShow(photourl){
  mainWindow.loadURL(url.format({ pathname:path.join(__dirname,'qrwindow.html'),
                                  protocol: 'file',
                                  slashes:true}));
    mainWindow.webContents.once('did-finish-load',()=>{
      mainWindow.webContents.send('qrcodedata',qr(photourl,{type:8,size:6,level:'Q'}));
  })
}


function uploadviaSCP(filename){
  console.log('uploading to scp: ',filename);

  return new Promise((resolve,reject)=>{
    var client = new scpClient();

    client.defaults(scpCreds)

    client.upload(filename,'<destination>',(err)=>{
      console.log('upload done');
      let photourl = '<photourl>'+filename;
      console.log('returning photoURL: '+photourl);
      resolve(photourl);
    })

    client.on('transfer', (buffer, uploaded, total)=>{
      console.log('progress: '+(uploaded/total)+'%');
    })

  }) 

}


function getLinkforPhotoIDfromFlickr(photoID){
  return new Promise((resolve,reject)=>{
    Flickr.authenticate(FlickrOptions, function(error, flickr) {
      console.log("getting INFO: ",photoID);
      flickr.photos.getSizes({
        api_key: flickrOps.api_key,
        user_id: flickrOps.user_id,
        authenticated: true,
        photo_id:photoID

        }, function(err, result) {
          resolve(result.sizes.size[10].source);

      });
    });
  });
}



function uploadtoFlickr(filename){
  console.log("uploading ", filename);

  return new Promise((resolve,reject)=>{
    Flickr.authenticate(FlickrOptions, function(error, flickr) {
      var uploadOptions = {
        photos: [{
          title: "test",
          is_public:0,
          photo: __dirname + "/"+filename
        }]
      };
      console.log("uploading: ",uploadOptions);
      Flickr.upload(uploadOptions, FlickrOptions, function(err, result) {
        if(err) {
          return console.error(error);
        }
        console.log("photos uploaded", result);
        resolve(result[0]);
      });
    });
  });
}



function makecollage(filenames,basename){
  console.log(filenames);
  return new Promise((resolve,reject)=>{
      let finalname = basename+'_all.jpg';
      let convertargs = ['(',filenames[0],filenames[1],'+append',')','(','(',filenames[2],filenames[3],'+append',')','lower1.jpg','-append',')','-append',finalname];

      im.convert(convertargs,(err,stdout)=>{
          if (err) {
            reject();
          }
          else{
            console.log('collaging done');
            resolve(finalname);
          }
          
      });
  })
}


function takepicwithfilename(filename){
  return new Promise((resolve,reject)=>{
    let phototaking = spawn('gphoto2',['--capture-image-and-download','--filename='+filename]);
    phototaking.stdout.pipe(process.stdout);

    phototaking.on('close',(err)=>{
      console.log("done taking 1 picture");
       resolve(filename);
    })
  });
}

