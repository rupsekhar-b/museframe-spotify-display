// ===============================
// MuseFrame - Frontend Logic
// ===============================

// ---------- DOM ELEMENTS ----------
const displayCard = document.getElementById("displayCard");
const statusText = document.getElementById("statusText");

const albumWrapper = document.getElementById("albumWrapper");
const vinylWrapper = document.getElementById("vinylWrapper");
const albumCover = document.getElementById("albumCover");
const vinylCover = document.getElementById("vinylCover");

const songTitle = document.getElementById("songTitle");
const artistName = document.getElementById("artistName");

const progressSection = document.getElementById("progressSection");
const progressFill = document.getElementById("progressFill");
const currentTimeText = document.getElementById("currentTime");
const totalTimeText = document.getElementById("totalTime");

const idleVisual = document.getElementById("idleVisual");
const idleText = document.getElementById("idleText");

const albumModeBtn = document.getElementById("albumModeBtn");
const vinylModeBtn = document.getElementById("vinylModeBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const lockBtn = document.getElementById("lockBtn");
const nextSongBtn = document.getElementById("nextSongBtn");
const connectBtn = document.getElementById("connectBtn");
const blurBgBtn = document.getElementById("blurBgBtn");
const colorBgBtn = document.getElementById("colorBgBtn");


// ---------- FAKE SONGS FOR DEV TESTING ----------
const songs = [
  {
    title: "Midnight City",
    artist: "M83",
    cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500",
    duration: 245,
    progress: 0,
    mood: "night"
  },
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    cover: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=500",
    duration: 200,
    progress: 0,
    mood: "hype"
  },
  {
    title: "Golden Hour",
    artist: "JVKE",
    cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500",
    duration: 210,
    progress: 0,
    mood: "warm"
  }
];


// ---------- APP STATE ----------
let liveSpotifySong = null;

let currentSongIndex = 0;
let currentProgress = 0;

let currentMode = "album";

let isLoggedIn = false;
let isSpotifyConnected = false;
let isPlaying = false;

let isLocked = false;
let lockedSong = null;
let lockedProgress = 0;

// Used only for the prototype disconnect button
let simulateOffline = false;

let backgroundMode = "blur";
let extractedBackgroundCache = {};

let lastSpotifyProgress = 0;
let lastSpotifyFetchTime = Date.now();


// ---------- HELPER FUNCTIONS ----------
function formatTime(seconds) {
  // Progress can become decimal because of smooth animation.
  // We floor it so the UI shows clean time like 2:16, not 2:16.482.
  const cleanSeconds = Math.floor(seconds);

  const mins = Math.floor(cleanSeconds / 60);
  const secs = cleanSeconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}


function getMoodBackground(mood) {
  if (mood === "hype") {
    return "linear-gradient(135deg, #ff512f, #dd2476)";
  }

  if (mood === "warm") {
    return "linear-gradient(135deg, #f7971e, #ffd200)";
  }

  if (mood === "night") {
    return "linear-gradient(135deg, #141E30, #243B55)";
  }

  // Default background for real Spotify songs
  return "linear-gradient(135deg, #111111, #292929)";
}

function getAlbumArtBackground(coverUrl) {
  if (!coverUrl) {
    return "linear-gradient(135deg, #111111, #292929)";
  }

  return `
    linear-gradient(
      135deg,
      rgba(0, 0, 0, 0.72),
      rgba(0, 0, 0, 0.46)
    ),
    url("${coverUrl}")
  `;
}

function rgbToCss(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}


function darkenColor(color, amount = 0.45) {
  return {
    r: Math.round(color.r * amount),
    g: Math.round(color.g * amount),
    b: Math.round(color.b * amount)
  };
}


function boostColor(color, amount = 1.2) {
  return {
    r: Math.min(255, Math.round(color.r * amount)),
    g: Math.min(255, Math.round(color.g * amount)),
    b: Math.min(255, Math.round(color.b * amount))
  };
}


function getColorGradientBackground(color) {
  const boosted = boostColor(color, 1.15);
  const dark = darkenColor(color, 0.35);

  return `
    radial-gradient(
      circle at 30% 20%,
      ${rgbToCss(boosted)},
      transparent 32%
    ),
    linear-gradient(
      135deg,
      ${rgbToCss(dark)},
      #090909
    )
  `;
}


function extractAverageColorFromImage(imageUrl) {
  return new Promise((resolve) => {
    if (!imageUrl) {
      resolve({ r: 30, g: 30, b: 30 });
      return;
    }

    // Use cached color if already extracted
    if (extractedBackgroundCache[imageUrl]) {
      resolve(extractedBackgroundCache[imageUrl]);
      return;
    }

    const img = new Image();

    // Important for canvas-based color extraction
    img.crossOrigin = "anonymous";

    img.onload = function () {
      try {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        // Small size is enough and faster
        canvas.width = 40;
        canvas.height = 40;

        context.drawImage(img, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < pixels.length; i += 4) {
          const red = pixels[i];
          const green = pixels[i + 1];
          const blue = pixels[i + 2];

          // Ignore very dark and very bright pixels
          const brightness = red + green + blue;

          if (brightness < 45 || brightness > 720) {
            continue;
          }

          r += red;
          g += green;
          b += blue;
          count++;
        }

        if (count === 0) {
          resolve({ r: 40, g: 40, b: 40 });
          return;
        }

        const averageColor = {
          r: Math.round(r / count),
          g: Math.round(g / count),
          b: Math.round(b / count)
        };

        extractedBackgroundCache[imageUrl] = averageColor;
        resolve(averageColor);
      } catch (error) {
        console.error("Color extraction failed:", error);
        resolve({ r: 35, g: 35, b: 35 });
      }
    };

    img.onerror = function () {
      resolve({ r: 35, g: 35, b: 35 });
    };

    img.src = imageUrl;
  });
}

async function updateBackground(activeSong) {
  if (!activeSong || !activeSong.cover) {
    displayCard.style.background = "linear-gradient(135deg, #111111, #292929)";
    displayCard.style.backgroundSize = "cover";
    displayCard.style.backgroundPosition = "center";
    displayCard.style.backgroundRepeat = "no-repeat";
    return;
  }

  if (backgroundMode === "blur") {
    displayCard.style.background = getAlbumArtBackground(activeSong.cover);
    displayCard.style.backgroundSize = "cover";
    displayCard.style.backgroundPosition = "center";
    displayCard.style.backgroundRepeat = "no-repeat";
    return;
  }

  if (backgroundMode === "color") {
    const averageColor = await extractAverageColorFromImage(activeSong.cover);

    displayCard.style.background = getColorGradientBackground(averageColor);
    displayCard.style.backgroundSize = "cover";
    displayCard.style.backgroundPosition = "center";
    displayCard.style.backgroundRepeat = "no-repeat";
  }
}


function getActiveSong() {
  // Locked display always has priority
  if (isLocked && lockedSong !== null) {
    return lockedSong;
  }

  // If real Spotify song exists, show it
  if (liveSpotifySong !== null) {
    return liveSpotifySong;
  }

  // Otherwise show logged-out / idle screen
  return null;
}


function getActiveProgress() {
  if (isLocked && lockedSong !== null) {
    return lockedProgress;
  }

  if (liveSpotifySong !== null) {
    return liveSpotifySong.progress;
  }

  return currentProgress;
}


// ---------- SPOTIFY FETCH ----------
async function fetchSpotifyTrack() {
  // Prototype-only: simulate disconnect without touching backend
  if (simulateOffline) {
    liveSpotifySong = null;
    isSpotifyConnected = false;
    isPlaying = false;

    // Simulated disconnect means user is still logged in,
    // but playback/device is unavailable.
    isLoggedIn = true;

    updateDisplay();
    return;
  }

  try {
    const response = await fetch("/current-track");
    const data = await response.json();

    console.log("Spotify data:", data);

    // CASE 1: Backend says not connected
    if (!data.connected) {
      liveSpotifySong = null;
      isSpotifyConnected = false;
      isPlaying = false;

      if (data.message === "Not logged in to Spotify") {
        isLoggedIn = false;
      } else {
        // Token/API/network issue, but user may still be logged in
        isLoggedIn = true;
      }

      updateDisplay();
      return;
    }

    // If we reach here, Spotify login/token is valid
    isLoggedIn = true;
    isSpotifyConnected = true;

    // CASE 2: Logged in, but no song currently playing
    if (!data.track) {
      liveSpotifySong = null;
      isPlaying = false;

      updateDisplay();
      return;
    }

    // CASE 3: Live Spotify track exists
    liveSpotifySong = {
      title: data.track.title,
      artist: data.track.artist,
      cover: data.track.cover,
      duration: data.track.duration,
      progress: data.track.progress,
      is_playing: data.track.is_playing,
      mood: "default"
    };

    isPlaying = data.track.is_playing;

    lastSpotifyProgress = data.track.progress;
    lastSpotifyFetchTime = Date.now();

    updateDisplay();
  } catch (error) {
    console.error("Failed to fetch Spotify track:", error);

    liveSpotifySong = null;
    isSpotifyConnected = false;
    isPlaying = false;

    // Fetch failure does not always mean logged out
    isLoggedIn = true;

    updateDisplay();
  }
}


// ---------- DISPLAY UPDATE ----------
function updateDisplay() {
  const activeSong = getActiveSong();

  // Reset classes
  displayCard.classList.toggle("locked", isLocked);

  // Pause vinyl only when NOT locked and Spotify is connected but paused
  if (!isLocked && isSpotifyConnected && !isPlaying) {
    displayCard.classList.add("paused");
  } else {
    displayCard.classList.remove("paused");
  }

  // ---------- LOGGED OUT / IDLE SCREEN ----------
  if (activeSong === null) {
    albumWrapper.classList.add("hidden");
    vinylWrapper.classList.add("hidden");
    idleVisual.classList.remove("hidden");
    progressSection.classList.add("hidden");

    if (!isLoggedIn) {
      songTitle.textContent = "MuseFrame";
      artistName.textContent = "Looking for your music...";
      statusText.textContent = "Logged Out";
      idleText.textContent = "Login with Spotify to connect";
    } else {
      songTitle.textContent = "No Music Playing";
      artistName.textContent = "Start Spotify on your phone";
      statusText.textContent = "Connected";
      idleText.textContent = "Waiting for playback...";
    }

    if (!isLoggedIn) {
      displayCard.style.background = `
        radial-gradient(circle at 50% 35%, rgba(120, 120, 255, 0.22), transparent 34%),
        linear-gradient(135deg, #090909, #1f1f2e)
      `;
    } else {
      displayCard.style.background = `
        radial-gradient(circle at 50% 35%, rgba(29, 185, 84, 0.18), transparent 34%),
        linear-gradient(135deg, #0b0f0d, #1b2922)
      `;
  }
  displayCard.style.backgroundSize = "cover";
  displayCard.style.backgroundPosition = "center";
  displayCard.style.backgroundRepeat = "no-repeat";
  return;
  }

  // ---------- LIVE / LOCKED SONG SCREEN ----------
  idleVisual.classList.add("hidden");

  songTitle.textContent = activeSong.title;
  artistName.textContent = activeSong.artist;

  albumCover.src = activeSong.cover;
  vinylCover.src = activeSong.cover;

  albumCover.alt = `${activeSong.title} album cover`;
  vinylCover.alt = `${activeSong.title} vinyl cover`;

  updateBackground(activeSong);

  // Show correct visual mode
  if (currentMode === "album") {
    albumWrapper.classList.remove("hidden");
    vinylWrapper.classList.add("hidden");
  } else {
    albumWrapper.classList.add("hidden");
    vinylWrapper.classList.remove("hidden");
  }

  // Progress bar behavior:
  // - visible for live connected song
  // - hidden when locked
  // - hidden when disconnected
  if (isLocked || !isSpotifyConnected || !isLoggedIn) {
    progressSection.classList.add("hidden");
  } else {
    progressSection.classList.remove("hidden");
  }

  const activeProgress = getActiveProgress();
  const progressPercent = activeSong.duration
    ? (activeProgress / activeSong.duration) * 100
    : 0;

  progressFill.style.width = `${Math.min(progressPercent, 100)}%`;
  currentTimeText.textContent = formatTime(activeProgress);
  totalTimeText.textContent = formatTime(activeSong.duration);

  // Status text
  if (isLocked) {
    statusText.textContent = "Locked Display";
  } else if (!isPlaying) {
    statusText.textContent = "Paused";
  } else {
    statusText.textContent = "Live Preview Mode";
  }

  // Button states
  albumModeBtn.classList.toggle("active", currentMode === "album");
  vinylModeBtn.classList.toggle("active", currentMode === "vinyl");
  blurBgBtn.classList.toggle("active", backgroundMode === "blur");
  colorBgBtn.classList.toggle("active", backgroundMode === "color");
  lockBtn.classList.toggle("locked-active", isLocked);

  playPauseBtn.textContent = isPlaying ? "Pause" : "Resume";
  lockBtn.textContent = isLocked ? "Unlock Display" : "Lock Display";
}


// ---------- MODE UPDATE ----------
function updateMode(mode) {
  currentMode = mode;
  updateDisplay();
}


// ---------- SMOOTH LOCAL PROGRESS ----------
function simulateProgress() {
  if (!isPlaying || liveSpotifySong === null || isLocked) {
    updateDisplay();
    return;
  }

  if (isSpotifyConnected) {
    const elapsedSeconds = (Date.now() - lastSpotifyFetchTime) / 1000;
    const estimatedProgress = lastSpotifyProgress + elapsedSeconds;

    liveSpotifySong.progress = Math.min(
      estimatedProgress,
      liveSpotifySong.duration
    );
  }

  updateDisplay();
}


// ---------- EVENT LISTENERS ----------
albumModeBtn.addEventListener("click", function () {
  updateMode("album");
});


vinylModeBtn.addEventListener("click", function () {
  updateMode("vinyl");
});


playPauseBtn.addEventListener("click", function () {
  // Prototype-only local pause.
  // Real Spotify playback should be controlled from Spotify app for now.
  isPlaying = !isPlaying;
  updateDisplay();
});


lockBtn.addEventListener("click", function () {
  if (isLocked) {
    isLocked = false;
    lockedSong = null;
    lockedProgress = 0;
  } else {
    const songToLock = getActiveSong();

    if (songToLock !== null) {
      isLocked = true;
      lockedSong = { ...songToLock };
      lockedProgress = getActiveProgress();
    }
  }

  updateDisplay();
});


nextSongBtn.addEventListener("click", function () {
  // Only useful for fake/dev mode.
  // Real Spotify song changes should happen from Spotify itself.
  if (liveSpotifySong === null) {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    currentProgress = 0;
    isPlaying = true;
  }

  updateDisplay();
});


connectBtn.addEventListener("click", function () {
  simulateOffline = !simulateOffline;

  if (simulateOffline) {
    connectBtn.textContent = "Reconnect Spotify";
    liveSpotifySong = null;
    isSpotifyConnected = false;
    isPlaying = false;
  } else {
    connectBtn.textContent = "Simulate Disconnect";
    fetchSpotifyTrack();
  }

  updateDisplay();
});

blurBgBtn.addEventListener("click", function () {
  backgroundMode = "blur";
  updateDisplay();
});


colorBgBtn.addEventListener("click", function () {
  backgroundMode = "color";
  updateDisplay();
});


// ---------- START APP ----------
fetchSpotifyTrack();

setInterval(fetchSpotifyTrack, 3000);
setInterval(simulateProgress, 250);