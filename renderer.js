const {webFrame} = require('electron')
webFrame.setZoomLevelLimits(1, 1)
navigator.webkitGetUserMedia({video: true},
  function(stream) {
    document.getElementById('camera').src = URL.createObjectURL(stream);
  },
  function() {
    alert('could not connect stream');
  }
);
function takepic(){
	console.log("hallo");
}