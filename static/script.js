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


// ---------- HELPER FUNCTIONS ----------
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

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

    displayCard.style.background = "linear-gradient(135deg, #111111, #292929)";
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

  displayCard.style.background = getMoodBackground(activeSong.mood);

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
  // Do not move anything if nothing is playing
  if (!isPlaying) {
    updateDisplay();
    return;
  }

  // Smooth progress for live Spotify song between backend refreshes
  if (liveSpotifySong !== null && isSpotifyConnected && !isLocked) {
    liveSpotifySong.progress++;

    if (liveSpotifySong.progress > liveSpotifySong.duration) {
      liveSpotifySong.progress = liveSpotifySong.duration;
    }
  }

  // Fake songs are no longer shown automatically in real mode,
  // but this remains for future dev/testing use.
  if (liveSpotifySong === null && isSpotifyConnected && !isLocked) {
    const fakeSong = songs[currentSongIndex];

    currentProgress++;

    if (currentProgress >= fakeSong.duration) {
      currentProgress = 0;
      currentSongIndex = (currentSongIndex + 1) % songs.length;
    }
  }

  // Locked mode intentionally has no progress bar,
  // so we do not advance lockedProgress visually.

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


// ---------- START APP ----------
fetchSpotifyTrack();

setInterval(fetchSpotifyTrack, 3000);
setInterval(simulateProgress, 1000);