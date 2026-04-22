//VARIABLES

let ripples = [];
let songs = [];
let currentSong = -1;
let isPlaying = false;
let isSpawning = false;
let spawnCounter = 0;

let playStartTime = 0;
let pausedTime = 0;


// DOC ELEMENTS
const fileInput = document.getElementById("file-input");
const songList = document.getElementById("song-list");
const clearBtn = document.getElementById("clear-btn");
const loadingEl = document.getElementById("loading");
const nowPlaying = document.getElementById("now-playing");
const npTitle = document.getElementById("np-title");
const visBarsEl = document.getElementById("vis-bars");

// MAKE VISUALIZER BARS
for (let i = 0; i < 14; i++) {
  const bar = document.createElement("div");
  bar.className = "vbar";
  bar.style.height = "2px";
  visBarsEl.appendChild(bar);
}
const visBars = visBarsEl.querySelectorAll(".vbar");

// HIDE AFTER 5 SECONDS
setTimeout(() => {
  document.getElementById("hint").style.opacity = "0";
}, 5000);

//Setup
function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  angleMode(DEGREES);
  background(0);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0);
}
// FILE UPLOAD
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);
  if (files.length === 0) return;

  let fileIndex = 0;

  function loadNextFile() {
    if (fileIndex >= files.length) {
      loadingEl.classList.remove("show");
      fileInput.value = "";
      return;
    }

    const file = files[fileIndex];
    fileIndex++;

    loadingEl.classList.add("show");

    const url = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^.]+$/, "");

    loadSound(
      url,
      function (sound) {
        const fft = new p5.FFT(0.9, 64);
        const amp = new p5.Amplitude(0.9);

        sound.connect(fft);
        sound.connect(amp);

        songs.push({
          name: name,
          sound: sound,
          fft: fft,
          amp: amp,
        });

        drawSongList();
        loadNextFile();
      },
      function (error) {
        console.error("Error loading sound:", error);
        loadingEl.classList.remove("show");
        loadNextFile();
      }
    );
  }

  loadNextFile();
});

// SONG LIST
function drawSongList() {
  songList.innerHTML = "";

  for (let i = 0; i < songs.length; i++) {
    const row = document.createElement("div");
    row.className = "song-row";
    if (i === currentSong) row.className += " active";

    const nameSpan = document.createElement("span");
    nameSpan.className = "song-name";
    nameSpan.textContent = songs[i].name;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "song-del";
    deleteBtn.textContent = "✕";

    row.appendChild(nameSpan);
    row.appendChild(deleteBtn);

    row.addEventListener("click", function (event) {
      if (event.target !== deleteBtn) {
        selectSong(i);
      }
    });

    deleteBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      deleteSong(i);
    });

    songList.appendChild(row);
  }
}

function deleteSong(i) {
  songs[i].sound.stop();
  songs.splice(i, 1);

  if (i === currentSong) {
    currentSong = -1;
    isPlaying = false;
    isSpawning = false;
    pausedTime = 0;
    playStartTime = 0;
    nowPlaying.classList.remove("visible");
  } else if (i < currentSong) {
    currentSong--;
  }

  drawSongList();
}

function selectSong(i) {
  if (currentSong >= 0 && songs[currentSong]) {
    songs[currentSong].sound.stop();
  }

  currentSong = i;
  isPlaying = false;
  isSpawning = false;
  ripples = [];
  pausedTime = 0;
  playStartTime = 0;

  npTitle.textContent = songs[i].name;
  nowPlaying.classList.add("visible");
  drawSongList();
}

clearBtn.addEventListener("click", () => {
  ripples = [];
});

// PLAYBACK TIME

function getPlaybackTime() {
  if (isPlaying) {
    return pausedTime + (millis() - playStartTime) / 1000;
  } else {
    return pausedTime;
  }
}

// color changes gradually after 15 seconds
function getRippleColor() {
  let time = getPlaybackTime();

  if (time < 15) {
    return {
      hue: 200,
      sat: 5,
      bright: 100,
    };
  }

  let t = time - 15;
  let hue = (200 + t * 8) % 360;
  let sat = map(t, 0, 10, 20, 85);
  sat = constrain(sat, 20, 85);

  return {
    hue: hue,
    sat: sat,
    bright: 100,
  };
}

// MOUSE CLICK
function mousePressed() {
  // ignore clicks on top-left control area
  if (mouseX < 250 && mouseY < 320) return;

  if (isSpawning) {
    isSpawning = false;

    if (currentSong >= 0 && songs[currentSong]) {
      songs[currentSong].sound.pause();
      pausedTime = getPlaybackTime();
      isPlaying = false;
    }
  } else {
    isSpawning = true;
    spawnCounter = 0;

    if (currentSong >= 0 && songs[currentSong]) {
      songs[currentSong].sound.loop();
      playStartTime = millis();
      isPlaying = true;
    } else if (songs.length > 0) {
      selectSong(0);
      songs[0].sound.loop();
      playStartTime = millis();
      pausedTime = 0;
      isPlaying = true;
      isSpawning = true;
    }
  }
}

// CREATE RIPPLE
function makeRipple(bassEnergy, ampLevel, spectrum) {
  let sizeLevel = constrain(ampLevel, 0.02, 1.0);
  let isBeat = bassEnergy > 0.65;

  let colorInfo = getRippleColor();

  let hue = (colorInfo.hue + random(-10, 10) + 360) % 360;
  let sat = constrain(colorInfo.sat + random(-8, 8), 0, 100);

  if (!isBeat) {
    sat = sat * 0.35;
  }

  ripples.push({
    x: mouseX,
    y: mouseY,
    baseX: mouseX,
    baseY: mouseY,
    radius: isBeat ? 12 : 6,
    maxRadius: map(
      sizeLevel,
      0.02,
      1.0,
      min(width, height) * 0.25,
      min(width, height) * 0.55
    ),
    life: 1,
    speed: map(sizeLevel, 0.02, 1.0, 2.5, 7.0),
    beat: isBeat,
    hue: hue,
    sat: sat,
  });
}

// DRAW LOOP
function draw() {
  let spectrum = [];
  let bassEnergy = 0;
  let midEnergy = 0;
  let trebleEnergy = 0;
  let ampLevel = 0;

  if (currentSong >= 0 && isPlaying) {
    let song = songs[currentSong];

    spectrum = song.fft.analyze();
    bassEnergy = song.fft.getEnergy("bass") / 255;
    midEnergy = song.fft.getEnergy("mid") / 255;
    trebleEnergy = song.fft.getEnergy("treble") / 255;
    ampLevel = song.amp.getLevel();

    for (let i = 0; i < visBars.length; i++) {
      let binIndex = floor((i / visBars.length) * spectrum.length);
      let value = (spectrum[binIndex] || 0) / 255;
      visBars[i].style.height = max(2, value * 16) + "px";
    }
  } else {
    for (let i = 0; i < visBars.length; i++) {
      visBars[i].style.height = "2px";
    }
  }

  // spawn ripples
  if (isSpawning && isPlaying) {
    spawnCounter++;
    let threshold = map(bassEnergy, 0, 1, 20, 2);

    if (spawnCounter >= threshold) {
      makeRipple(bassEnergy, ampLevel, spectrum);
      spawnCounter = 0;
    }
  }

  // fade old frames
  let fadeAmount = map(midEnergy, 0, 1, 14, 6);
  noStroke();
  fill(0, 0, 0, fadeAmount);
  rect(0, 0, width, height);

  // draw ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    let ripple = ripples[i];

    let extraSpeed = bassEnergy * (ripple.beat ? 6.0 : 3.5);
    ripple.radius += ripple.speed + extraSpeed;
    ripple.life = max(0, 1 - ripple.radius / ripple.maxRadius);

    if (ripple.life <= 0) {
      ripples.splice(i, 1);
      continue;
    }

    let alpha = ripple.life * (ripple.beat ? 95 : 75);
    let ringCount = ripple.beat ? 4 : 3;

    noFill();

    for (let ring = 0; ring < ringCount; ring++) {
      let spacing = ripple.beat ? 20 : 16;
      let ringRadius = ripple.radius - ring * spacing;

      if (ringRadius <= 0) continue;

      let ringAlpha = alpha * (1 - ring * 0.22);
      let lineWidth = ripple.beat ? 2.2 - ring * 0.45 : 1.6 - ring * 0.4;

      strokeWeight(lineWidth);
      stroke(ripple.hue, ripple.sat, 100, ringAlpha);

      if (spectrum.length > 0) {
        let points = [];
        let segments = ripple.beat ? 180 : 128;

        for (let s = 0; s < segments; s++) {
          let angle = (s / segments) * 360;
          let binIndex = floor((s / segments) * spectrum.length);
          let binValue = (spectrum[binIndex] || 0) / 255;

          let wobble1 = binValue * (28 + bassEnergy * 55) * (1 - ring * 0.3);
          let wobble2 = trebleEnergy * 8 * sin(angle * 6 + frameCount * 4);
          let wobble = wobble1 + wobble2;

          if (ripple.beat) wobble *= 2.2;

          let finalRadius = ringRadius + wobble;
          let px = ripple.baseX + finalRadius * cos(angle);
          let py = ripple.baseY + finalRadius * sin(angle);

          points.push({ x: px, y: py });
        }

        beginShape();
        for (let p = 0; p < points.length; p++) {
          vertex(points[p].x, points[p].y);
        }
        vertex(points[0].x, points[0].y);
        endShape();
      } else {
        ellipse(ripple.baseX, ripple.baseY, ringRadius * 2, ringRadius * 2);
      }
    }

    // center dot
    noStroke();
    let dotSize = ripple.beat ? 10 + bassEnergy * 18 : 5 + bassEnergy * 7;
    fill(ripple.hue, ripple.sat, 100, alpha * 0.5);
    ellipse(ripple.baseX, ripple.baseY, dotSize, dotSize);

    // glow for beat ripples
    if (ripple.beat && ripple.life > 0.4) {
      fill(ripple.hue, ripple.sat * 0.75, 100, alpha * 0.08);
      ellipse(
        ripple.baseX,
        ripple.baseY,
        ripple.radius * 2.4,
        ripple.radius * 2.4
      );
    }
  }

  // bass border flash
  if (bassEnergy > 0.35) {
    let borderAlpha = map(bassEnergy, 0.35, 1.0, 0, 40);
    noFill();
    strokeWeight(bassEnergy * 3.0);
    stroke(0, 0, 100, borderAlpha);
    rect(2, 2, width - 4, height - 4);
  }

  // strong bass screen flash
  if (bassEnergy > 0.95) {
    let flashAlpha = map(bassEnergy, 0.95, 1.0, 0, 12);
    noStroke();
    fill(0, 0, 100, flashAlpha);
    rect(0, 0, width, height);
  }

  // cursor crosshair
  if (isSpawning) {
    stroke(0, 0, 100, 25);
    strokeWeight(0.8);
    line(mouseX - 12, mouseY, mouseX + 12, mouseY);
    line(mouseX, mouseY - 12, mouseX, mouseY + 12);
  }
}
