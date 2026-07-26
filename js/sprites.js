(function () {
  var F = window.FPEM;
  var T = F.T;
  function loadFrames(prefix, count, ext) {
    ext = ext === undefined ? 'webp' : ext;
    var frames = [];
    var loaded = 0;
    for (var i = 1; i <= count; i++) {
      var img = new Image();
      img.src = 'imgs/' + prefix + i + '.' + ext;
      img.onload = function () { loaded++; };
      frames.push(img);
    }
    return { frames: frames, isLoaded: function () { return loaded === count; } };
  }
  F.loadFrames = loadFrames;
  F.thavelSprite = loadFrames('thavel', 4);
  F.bloomieSprite = loadFrames('bloomie', 4);
  F.circleSprite = loadFrames('circle', 4, 'png');
  F.oreoImg = new Image();
  F.oreoImg.src = 'imgs/oreo.png';
  F.assignmentImg = new Image();
  F.assignmentImg.src = 'imgs/assignment.png';
  F.kitkatImg = new Image();
  F.kitkatImg.src = 'imgs/kitkats.PNG';
  F.appleImg = new Image();
  F.appleImg.src = 'imgs/apple.PNG';
  F.flashlightImg = new Image();
  F.flashlightImg.src = 'imgs/flashlight.png';
  F.menuBgImg = new Image();
  F.menuBgImg.src = 'imgs/fpebgquality.png';
  F.ENEMY_VARIANTS = [
    {
      name: 'Miss Circle',
      body: '#cc2222', stroke: '#991111', eye: '#ff0',
      minimap: '#cc2222', weight: 1 / 3,
      speed: 17 * T, w: 7 * T, h: 9 * T,
      drawW: 13 * T, drawH: 14 * T,
      sprite: F.circleSprite
    },
    {
      name: 'Miss Bloomie',
      body: '#4287f5', stroke: '#2b5fad', eye: '#fff',
      minimap: '#4287f5', weight: 1 / 3,
      speed: 20 * T, w: 6 * T, h: 6 * T,
      drawW: 8 * T, drawH: 8 * T,
      sprite: F.bloomieSprite
    },
    {
      name: 'Miss Thavel',
      body: '#3da34d', stroke: '#2a7535', eye: '#ffd700',
      minimap: '#3da34d', weight: 1 / 3,
      speed: 18 * T, w: 5 * T, h: 7 * T,
      drawW: 10 * T, drawH: 9 * T,
      sprite: F.thavelSprite
    }
  ];
})();
