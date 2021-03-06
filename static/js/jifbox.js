(function() {

  // variable declaration 
  var streaming = false,
      video        = document.querySelector('#vdo'),
      canvas       = document.querySelector('#cnvs'),
      photo        = document.querySelector('#photo'),
      startbutton  = document.querySelector('button#snap'),
      burst_switch = document.querySelector('#burst-switch'),
      burst        = false,
      frames       = 12,
      frame_delay  = 250,
      snap_delay   = 500,
      width = 320,
      height = 0,
      count = -1,
      needsReset = false,
      isGiffing = false,

      // instantiates a new gif object
      gif = new GIF({
        workers: 2,
        quality: 10,
        width: 320,
        height: 240,
        workerScript: '/static/gif.js/dist/gif.worker.js'
      });


  // Access to browser camera
  navigator.getMedia = ( navigator.getUserMedia ||
                         navigator.webkitGetUserMedia ||
                         navigator.mozGetUserMedia ||
                         navigator.msGetUserMedia);

  navigator.getMedia(
    {
      video: true,
      audio: false
    },
    function(stream) {
      if (navigator.mozGetUserMedia) {
        video.mozSrcObject = stream;
      } else {
        var vendorURL = window.URL || window.webkitURL;
        video.src = vendorURL.createObjectURL(stream);
      }
      video.play();
    },
    function(err) {
      console.log("An error occured! " + err);
    }
  );

  video.addEventListener('canplay', function(ev){
    if (!streaming) {
      height = video.videoHeight / (video.videoWidth/width);
      video.setAttribute('width', width);
      video.setAttribute('height', height);
      canvas.setAttribute('width', width);
      canvas.setAttribute('height', height);
      streaming = true;
    }
  }, false);


  // Takes picture, draws image from canvas, sets img src attribute
  // adds img to gif frame
  // (could benefit from getting refactored into multiple single responsibility functions)
  function takepicture(){
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(video, 0, 0, width, height);
    var data = canvas.toDataURL('image/png');
    // flash after every frame
    document.querySelector('.overlay-flash').classList.remove('is-hidden');
    setTimeout(function(){
      document.querySelector('.overlay-flash').classList.add('is-hidden');
    }, 75);

    count++;
    if ( count === frames ) {
      document.querySelector('#jif').src = '/static/gif.js/site/contents/images/loading.gif'
      gif.render();
    } else if ( burst ) {
      snapPhoto();
    }

    // Quick fix for weird count
    if (count <= frames) {
      document.querySelector('.photo' + count).setAttribute('src', data);
    }

    gif.addFrame(document.querySelector('.photo' + count), {delay: frame_delay});
    count = count % frames;
  }

  // Timer to call takepicture() when app is in burst mode
  function snapPhoto(){
    if (count < frames ){
      console.log(count)
      setTimeout(takepicture, snap_delay);
    }
  }

  // gif event listener to generate url blob
  gif.on('finished', function(blob) {
    document.querySelector('#jif').src = URL.createObjectURL(blob);
    count = -1;
    gif.frames = [];
    gif.running = false;
    uploadGIF(blob);
    needsReset = true;
    // show finished gif and tip
    document.querySelector('.finished-jif').classList.remove('is-hidden');
    document.querySelector('.tip').classList.remove('is-hidden');

    isGiffing = false;

    setTimeout(removeGif, 5000);

  });

  function removeGif(){
    document.querySelector('.finished-jif').classList.add('is-hidden');
  }

  // listens to checkbox for burst mode
  burst_switch.addEventListener('change', function(){
    burst = this.checked;
    isGiffing = false;
  });

  // event listener for the startbutton to take a picture
  startbutton.addEventListener('click', function(ev){
    if (!needsReset) {
      prepCapture();
      ev.preventDefault();
    } else {
      // this is a reset click
      needsReset = false;
      var i = 0;
      for (i = 0; i < frames; i++) {
        document.querySelector('.photo' + i).src = '/static/img/placeholder_frame.png';
      }

      // hide gif and tip
      document.querySelector('.finished-jif').classList.add('is-hidden');
      document.querySelector('.tip').classList.add('is-hidden');
    }
  }, false);

  document.addEventListener('keyup', function(ev){
    if ( ev.keyCode == 32 ){
      // spacebar to trigger capture
      prepCapture();
    } else if ( ev.keyCode == 90 ){
      // "z" key to check burst_switch
      burst_switch.checked = true;
      burst = true;
    } else if ( ev.keyCode == 88 ) {
      // "x" key to uncheck burst_switch
      burst_switch.checked = false;
      burst = false;
    }
  });

  function prepCapture(){    
    if (!burst || !isGiffing) {
      isGiffing = true;
      burst == true ? countdown() : takepicture();
    }
  }

  var count_down = 5

  function countdown(){
    var msg = document.querySelector('.video-msg');
    msg.style.fontSize="26px";
    msg.style.padding="10px";
    msg.style.zIndex="999";
    msg.style.backgroundColor="black";


    if (count_down > 0 ) {
      msg.innerHTML = count_down;
      count_down--;
      setTimeout(countdown, 700)
    } else {
      count_down = 5;
      msg.style.fontSize="16px";
      msg.style.padding="75px";
      msg.style.zIndex="1";
      msg.style.backgroundColor="rgba(0,0,0,0.5)";
      snapPhoto();
    }
  }

  // creates the img frames
  function createFrameEls(){
    for (var i = 0; i < frames; i++){
      var img = document.createElement('img');
      img.setAttribute('src', '/static/img/placeholder_frame.png');
      img.setAttribute('class', 'photo' + i );
      document.querySelector('.snaps').appendChild(img);
    }
  }

  function applySettings(){
    var request = new XMLHttpRequest();
    request.open('GET', '/get-settings', true);
    request.send();
    request.onload = function() {
      if (request.status >= 200 && request.status < 400){
        // Success!
        data = JSON.parse(request.responseText);
        frames = data.frames;
        frame_delay = data.frame_delay;
        snap_delay = data.snap_delay;
      } else {
        console.log("hmm something isn't right")
      }
      createFrameEls();
    }
  }

  function uploadGIF(blob){

    var formData = new FormData();
    formData.append('giffile', blob, 'jif.gif');

    var request = new XMLHttpRequest();
    request.open('POST', '/giffed', true);
    request.send(formData);
    request.onload = function() {
      if (request.status === 200) {
        // done
      } else {
        // an error occured
      }
    }

  }

  applySettings();

})();