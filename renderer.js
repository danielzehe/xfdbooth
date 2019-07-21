const { webFrame } = require("electron");
const { ipcRenderer } = require("electron");
webFrame.setZoomLevelLimits(1, 1);
navigator.webkitGetUserMedia(
  { video: true },
  function(stream) {
    document.getElementById("camera").src = URL.createObjectURL(stream);
  },
  function() {
    alert("could not connect stream");
  }
);

ipcRenderer.on("picturetype", (evnt, args) => {
  let cdinterval = setInterval(docountdown, 1000);
  let maxcountdown = 5;

  function docountdown() {
    document.getElementById("countdown").innerHTML = maxcountdown;
    if (maxcountdown-- == 0) {
      clearInterval(cdinterval);
      document.getElementById("countdown").innerHTML = ":)";
      ipcRenderer.send("takepic", args);
    }
  }
});

// let cdinterval = setInterval(docountdown, 1000);
// let maxcountdown = 2;

// function docountdown(){

// 	document.getElementById('countdown').innerHTML = maxcountdown;
// 	if(maxcountdown--==0){
// 		clearInterval(cdinterval);
// 		document.getElementById('countdown').innerHTML = " :)";
// 		ipcRenderer.send('takepic');

// 	}
// }
