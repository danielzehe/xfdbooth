const electron = require('electron')
const {ipcMain} = require('electron')
const spawn = require('child_process').spawn
const uuidV1 = require('uuid/v1')
const im = require('imagemagick')
const qr = require('qr-encode');
const scpClient = require('scp2').Client
const request = require('request')
const fs = require('fs')


// const remoteurl = 'localhost:64888'
const remoteurl = 'photobooth.danielwithsilver.com'

const useflickr = false;
const usescp =false;
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
  // console.log(arg)  // prints "ping"
  // event.sender.send('asynchronous-reply', 'pong')
  mainWindow.loadURL(url.format({ pathname:path.join(__dirname,'index.html'),
                                  protocol: 'file',
                                  slashes:true}));


  mainWindow.webContents.once('did-finish-load',()=>{
      mainWindow.webContents.send('picturetype',arg);
  })

})

ipcMain.on('showMain',(event,args)=>{
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'main.html'),
    protocol: 'file:',
    slashes: true
  }))
})


ipcMain.on('takepic',(event,args)=>{
  // console.log(args);
  let basename = 'photos/'+uuidV1();
  let numberofpics =1;
  if(args=='4sq' || args == '4col'){
    numberofpics =4
  }
  else if(args =='3'){
    numberofpics = 3
  }
  let p = Promise.resolve();
  // let filenames = new Array();
  // for(let i=0;i<numberofpics;i++){
  //   let filename = basename+'_'+i+'.jpg';
  //   // let phototaking = spawnSync('gphoto2',['--capture-image-and-download','--filename='+filename]);
  //   filenames.push(filename);
  //   p = p.then(()=>takepicwithfilename(filename))
  //   // phototaking.stdout.pipe(process.stdout);
  // }

  p=p.then(()=>takeNpicswithbasename(basename,numberofpics))


  p=p.then((filenames)=>showProcessingWindow(filenames));
  //once the pictures are taken, stitch them into one
  if(args=='4sq'){
    p=p.then((filenames)=>makecollage4Sq(filenames,basename));
  }
  else if(args=='4col'){
    p=p.then((filenames)=>makecollage4Col(filenames,basename));
  }
  else if(args=='1'){
    p=p.then((filenames)=>makecollage1(filenames,basename));
  }
  else if(args=='3'){
    p=p.then((filenames)=>makecollage3(filenames,basename));
  }
  if(useflickr){
    p = p.then((colfilename)=>uploadtoFlickr(colfilename));

    p = p.then((photoID)=>getLinkforPhotoIDfromFlickr(photoID));
  }
  else if(usescp){
    //using scp 
    p=p.then((colfilename)=>uploadviaSCP(colfilename));

  }
  else{
    p=p.then((colfilename)=>uploadviaHTTP(colfilename));
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

function showProcessingWindow(filenames){


  return new Promise((resolve, reject)=>{
    mainWindow.loadURL(url.format({pathname:path.join(__dirname,'processing.html'),protocol:'file',slashes:true}));
       mainWindow.webContents.once('did-finish-load',()=>{
      // mainWindow.webContents.send('previewimg',filename);
        mainWindow.webContents.send('previewimg',filenames[0]);

      resolve(filenames);
    })
  })

}

function uploadviaHTTP(filename){
  console.log('uploading to http api: ',filename)

  mainWindow.webContents.send('previewimg',filename);
  return new Promise((resolve,reject)=>{
    let filestream =  fs.createReadStream(filename)   
    const stats = fs.statSync(filename)
    const totalsize = stats.size
    var formData={
       avatar:filestream
    }

    r = request.post({url:'http://'+remoteurl+'/api/upload', formData: formData}, function optionalCallback(err, httpResponse, body) {
      if (err) {
        return console.error('upload failed:', err);
      }
      console.log('Upload successful!  Server responded with:', body);
      let photourl = 'http://'+remoteurl+'/web/singlepic/'+filename;

      resolve(photourl)
    });
    let blockLength = 0;
    filestream.on('data', function(data) {
      blockLength += data.length
      // console.log(blockLength/totalsize);

      sendProgress(blockLength/totalsize,mainWindow);

      //TODO progress is here
    })


  });
}


function sendProgress(progress,view){
  view.webContents.send('progess',progress);
}

function uploadviaSCP(filename){
  console.log('uploading to scp: ',filename);
  mainWindow.webContents.send('previewimg',filename);

  return new Promise((resolve,reject)=>{
    var client = new scpClient();

    client.defaults(scpCreds)

    client.upload(filename,'/var/www/virtual/llb/photobooth.danielwithsilver.com',(err)=>{
      console.log('upload done');
      let photourl = 'http://photobooth.danielwithsilver.com/'+filename;
      console.log('returning photoURL: '+photourl);
      resolve(photourl);
    })

    client.on('transfer', (buffer, uploaded, total)=>{
      // console.log('progress: '+(uploaded/total)+'%');
      sendProgress(uploaded/total,mainWindow);
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
  mainWindow.webContents.send('previewimg',filename);
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



function makecollage4Sq(filenames,basename){
  console.log(filenames);
//crop before adding the bar
  return new Promise((resolve,reject)=>{
      let finalname = basename+'_po.jpg';
      let convertargs = ['(',filenames[0],filenames[1],'+append',')','(',filenames[2],filenames[3],'+append',')','-append',finalname];

      im.convert(convertargs,(err,stdout)=>{
          if (err) {
            reject();
          }
          else{
            console.log('collaging done');

            // let composite = spawn('composite',['-gravity','South','lower1.jpg',finalname,basename+'_all.jpg']);



            im.crop({srcPath:finalname,dstPath:basename+'_c.jpg',width:2*2592,height:2*1728-200,quality:1,gravity:"Center"}, function(err2,stdout2,stderr){

              let convertargs2 = ['(',basename+'_c.jpg','lower1.jpg',')','-append',basename+'_all.jpg'];
              im.convert(convertargs2,(err3,stdout3)=>{
                if(err){
                  reject();
                }
                else{
                  resolve(basename+'_all.jpg');

                }
              })
            })
          }
          
      });
  })
}


function makecollage4Col(filenames,basename){
  console.log(filenames);

  return new Promise((resolve,reject)=>{
      let finalname = basename+'_all.jpg';
      let convertargs = ['(',filenames[0],filenames[1],filenames[2],filenames[3],'top1.png',')','-append',finalname];
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

function makecollage1(filenames,basename){
  console.log(filenames);
  return new Promise((resolve,reject)=>{
    let finalname = basename+'_all.jpg';
    let convertargs = ['(',filenames[0],'lower1 small.jpeg',')','-append',finalname];
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

function makecollage3(filenames,basename){
  // console.log('for 3'+filenames);
  return new Promise((resolve,reject)=>{

    for(var i=0;i<3;i++){
      if(filenames[i]==undefined){
        console.log('file '+i+' not there');
        filenames[i] = 'backup-photo.jpg';
      }
      else{
        if(!fs.existsSync(filenames[i])){
          console.log('file '+i+' not there');
          filenames[i] = 'backup-photo.jpg';
        }
      }
    }
  console.log('for 3'+filenames);
    let finalname = basename+'_all.jpg'
    let convertargs = ['background.jpg','-page','+95+715',filenames[0]+'[2262x1509]','-page','+2410+715',filenames[1]+'[1093x729]','-page','+2410+1495',filenames[2]+'[1093x729]','-layers','flatten',finalname];
    // console.log(convertargs);
    im.convert(convertargs,(err,stdout)=>{
      if(err){
        console.log(err);
        reject();
      }
      else{
        console.log('collaging ddone');
        resolve(finalname);
      }
    })
  });
}

function takeNpicswithbasename(basename,n){
  return new Promise((resolve,reject)=>{
    let filenames = new Array();
    let phototaking = spawn('gphoto2',['--capture-image-and-download','-F '+n,'-I 3','--filename='+basename+'_%n.jpg']);
    // filenames.push(basename+'.jpg');
    phototaking.stdout.pipe(process.stdout);
    phototaking.stdout.setEncoding('utf8');
    phototaking.stdout.on('data',(data)=>{
      // console.log(data);

      const re = new RegExp('as ('+basename+'_[0-9].jpg)','i')
      // console.log(re);
      let found = data.match(re);
      if(found!=null){
        // console.log(found[1]);
        filenames.push(found[1]);
      }
    })
    phototaking.on('close',(err)=>{

       // console.log('done taking '+n+' pictures');
       resolve(filenames);
    })
  })
}

function takepicwithfilename(filename){
  return new Promise((resolve,reject)=>{
    let phototaking = spawn('gphoto2',['--capture-image-and-download','--filename=photos/'+filename]);
    phototaking.stdout.pipe(process.stdout);

    phototaking.on('close',(err)=>{
      console.log("done taking 1 picture");
       resolve(filename);
    })
  });
}

