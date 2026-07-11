// Fake song data.
// Later, this fake data will be replaced by real Spotify API data.
const songs = [
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    cover: "https://i.scdn.co/image/ab67616d0000b273c1f2f2d7636d7f5f4cdbca98",
    duration: 200, // duration in seconds
    mood: "hype"
  },
  {
    title: "Die With A Smile",
    artist: "Lady Gaga, Bruno Mars",
    cover: "https://i.scdn.co/image/ab67616d0000b27382ea2e9e1858aa012c57cd45",
    duration: 251,
    mood: "romantic"
  },
  {
    title: "Sweater Weather",
    artist: "The Neighbourhood",
    cover: "https://i.scdn.co/image/ab67616d0000b273a5a5cdd8f20f2e46f84db7a7",
    duration: 240,
    mood: "chill"
  },
  {
    title:"Happy Now",
    artist:"Zedd, Elley Duhé",
    cover:"https://en.wikipedia.org/wiki/File:Zedd_and_Elley_Duh%C3%A9_Happy_Now.png#/media/File:Zedd_and_Elley_Duh%C3%A9_Happy_Now.png",
    duration: 210,
    mood:"ecstasy"
  }
];

// ------------------------------
// APP STATE
// ------------------------------

// Index of the current fake "live Spotify" song
let currentSongIndex = 0;

// Progress of the live song in seconds
let currentProgress = 0;

// Current visual mode: "album" or "vinyl"
let currentMode = "album";

// Whether display is locked to one selected song
let isLocked = false;

// Stores locked song data when display is locked
let lockedSong = null;

// Stores progress of the locked song separately
let lockedProgress = 0;

// Whether fake playback is playing or paused
let isPlaying = true;

// Later this will simulate Spotify being connected/offline
let isSpotifyConnected = true;

// Stores the latest real Spotify song fetched from backend
let liveSpotifySong = null;

// ------------------------------
// GET HTML ELEMENTS
// ------------------------------

// Main display card
const displayCard = document.getElementById("displayCard");

// Album and vinyl images
const albumCover = document.getElementById("albumCover");
const vinylCover = document.getElementById("vinylCover");

// Song text elements
const songTitle = document.getElementById("songTitle");
const artistName = document.getElementById("artistName");

// Progress bar and time elements
const progressFill = document.getElementById("progressFill");
const currentTime = document.getElementById("currentTime");
const totalTime = document.getElementById("totalTime");
const progressSection = document.getElementById("progressSection");

// Status text
const statusText = document.getElementById("statusText");

// Wrappers for album mode and vinyl mode
const albumWrapper = document.getElementById("albumWrapper");
const vinylWrapper = document.getElementById("vinylWrapper");
const idleVisual = document.getElementById("idleVisual");

// Buttons
const albumModeBtn = document.getElementById("albumModeBtn");
const vinylModeBtn = document.getElementById("vinylModeBtn");
const lockBtn = document.getElementById("lockBtn");
const nextSongBtn = document.getElementById("nextSongBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const connectBtn = document.getElementById("connectBtn");

// ------------------------------
// HELPER FUNCTIONS
// ------------------------------

// Converts seconds into minute:second format.
// Example: 125 seconds becomes 2:05
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Returns background gradient based on the song mood.
// Later, we can replace this with album-cover color extraction.
function getMoodBackground(mood) {
  if (mood === "hype") {
    return "linear-gradient(135deg, #ff512f, #dd2476)";
  }

  if (mood === "romantic") {
    return "linear-gradient(135deg, #41295a, #2f0743)";
  }

  if (mood === "chill") {
    return "linear-gradient(135deg, #1f4037, #99f2c8)";
  }

  if (mood === "ecstasy") {
    return "linear-gradient(135deg, #25A3CB, #CE181A, #F9D423)";
  }

  // Default background if no mood matches

  if (mood === "default") {
  return "linear-gradient(135deg, #292929, #111111)";
}

}

// Decides which song should be shown.
// If locked, show the locked song.
// If unlocked, show the current live song.
function getActiveSong() {
  // If display is locked, always show the locked song
  if (isLocked && lockedSong !== null) {
    return lockedSong;
  }

  // If Spotify is disconnected and display is not locked,
  // show idle screen
  if (!isSpotifyConnected) {
    return null;
  }

  // If real Spotify data exists, show it
  if (liveSpotifySong !== null) {
    return liveSpotifySong;
  }

  // Fallback to fake data while real Spotify data is loading
  // In real Spotify mode, do NOT fall back to fake songs
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

async function fetchSpotifyTrack() {
  try {
    const response = await fetch("/current-track");
    const data = await response.json();

    console.log("Spotify data:", data);

    // If backend says not connected or there is an error
    if (!data.connected) {
      isSpotifyConnected = false;
      liveSpotifySong = null;
      updateDisplay();
      return;
    }

    isSpotifyConnected = true;

    // If Spotify is connected but no track is playing
    if (!data.track) {
  liveSpotifySong = null;

  // For display behavior, no active track means idle/disconnected state
  // unless the display is locked.
  isSpotifyConnected = false;

  updateDisplay();
  return;
}

    // Convert backend track data into our frontend song format
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

    isSpotifyConnected = false;
    liveSpotifySong = null;

    updateDisplay();
  }
}

// ------------------------------
// DISPLAY UPDATE FUNCTIONS
// ------------------------------

// Main function that refreshes everything visible on screen.
function updateDisplay() {
  const song = getActiveSong();

  // If there is no song to display, show idle screen
  if (song === null) {
  songTitle.textContent = "No song playing";
  artistName.textContent = "Connect Spotify or play a song";

  displayCard.style.background = "linear-gradient(135deg, #202020, #050505)";

  progressFill.style.width = "0%";
  currentTime.textContent = "0:00";
  totalTime.textContent = "0:00";

  statusText.textContent = "Idle Mode";

  // Hide album/vinyl visuals and show cute idle visual
  albumWrapper.classList.add("hidden");
  vinylWrapper.classList.add("hidden");
  idleVisual.classList.remove("hidden");

  // Hide progress section when Spotify is disconnected
  progressSection.classList.add("hidden");

  return;
}

  const activeProgress = getActiveProgress();

  // Hide progress when display is locked or Spotify is disconnected
  if (isLocked || !isSpotifyConnected) {
    progressSection.classList.add("hidden");
  } else {
    progressSection.classList.remove("hidden");
}

  // Hide progress when Spotify is disconnected.
// This applies even if a locked song is still being displayed.
if (!isSpotifyConnected) {
  progressSection.classList.add("hidden");
} else {
  progressSection.classList.remove("hidden");
}

  // Update song text
  songTitle.textContent = song.title;
  artistName.textContent = song.artist;

  // Update images
  albumCover.src = song.cover;
  vinylCover.src = song.cover;

  // Update background based on mood
  displayCard.style.background = getMoodBackground(song.mood);

  // Calculate progress percentage
  const progressPercent = (activeProgress / song.duration) * 100;

  // Update progress bar
  progressFill.style.width = `${progressPercent}%`;

  // Update time labels
  currentTime.textContent = formatTime(activeProgress);
  totalTime.textContent = formatTime(song.duration);

  // Status text logic
  if (isLocked) {
    statusText.textContent = "Locked Display Mode";
    lockBtn.textContent = "Unlock Display";
  } else if (!isSpotifyConnected) {
    statusText.textContent = "Spotify Disconnected";
    lockBtn.textContent = "Lock Display";
  } else if (!isPlaying) {
    statusText.textContent = "Playback Paused";
    lockBtn.textContent = "Lock Display";
  } else {
    statusText.textContent = "Live Spotify Preview";
    lockBtn.textContent = "Lock Display";
  }

  // Play/pause button text
  if (isPlaying) {
    playPauseBtn.textContent = "Pause";
  } else {
    playPauseBtn.textContent = "Play";
  }

  // Visual state classes
  // Pause visual motion only when Spotify is connected and playback is paused.
// If display is locked and Spotify disconnects, vinyl should still spin aesthetically.
  if (isSpotifyConnected && !isPlaying) {
    displayCard.classList.add("paused");
  } else {
    displayCard.classList.remove("paused");
}

  if (isLocked) {
    displayCard.classList.add("locked");
  } else {
    displayCard.classList.remove("locked");
  }

  updateMode();
}


// Shows album mode or vinyl mode based on currentMode.
function updateMode() {

    // Hide idle visual whenever a real song is being displayed
    idleVisual.classList.add("hidden");
  if (currentMode === "album") {
    albumWrapper.classList.remove("hidden");
    vinylWrapper.classList.add("hidden");

    albumModeBtn.classList.add("active");
    vinylModeBtn.classList.remove("active");
  }

  if (currentMode === "vinyl") {
    albumWrapper.classList.add("hidden");
    vinylWrapper.classList.remove("hidden");

    albumModeBtn.classList.remove("active");
    vinylModeBtn.classList.add("active");
  
}
}

// Simulates song progress every second.
// Later, Spotify API will give us real progress.
function simulateProgress() {
  // If playback is paused, no progress should move
  if (!isPlaying) {
    updateDisplay();
    return;
  }

  // If real Spotify data is not available yet, run fake simulation
  if (liveSpotifySong === null && isSpotifyConnected) {
    currentProgress++;

    const liveSong = songs[currentSongIndex];

    if (currentProgress >= liveSong.duration) {
      currentProgress = 0;
      currentSongIndex = (currentSongIndex + 1) % songs.length;
    }
  }

  // Locked display progress should move only if Spotify is connected
  // if (isLocked && lockedSong !== null && isSpotifyConnected) {
  //   lockedProgress++;

  //   if (lockedProgress >= lockedSong.duration) {
  //     lockedProgress = 0;
  //   }
  // }

  updateDisplay();
}

// ------------------------------
// BUTTON EVENT LISTENERS
// ------------------------------

// Switch to album mode
albumModeBtn.addEventListener("click", function () {
  currentMode = "album";
  updateDisplay();
});

connectBtn.addEventListener("click", function () {
  isSpotifyConnected = !isSpotifyConnected;

  if (isSpotifyConnected) {
    connectBtn.textContent = "Simulate Disconnect";
    fetchSpotifyTrack();
  } else {
    connectBtn.textContent = "Reconnect Spotify";
    liveSpotifySong = null;
  }

  updateDisplay();
});

playPauseBtn.addEventListener("click", function () {
  isPlaying = !isPlaying;
  updateDisplay();
});

// Switch to vinyl mode
vinylModeBtn.addEventListener("click", function () {
  currentMode = "vinyl";
  updateDisplay();
});

// Lock or unlock the currently displayed song
lockBtn.addEventListener("click", function () {
  if (isLocked) {
    // Unlock display and return to live Spotify view
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

// Simulates Spotify moving to another song
nextSongBtn.addEventListener("click", function () {
  // This button is only for fake-data testing.
  // If real Spotify data is active, it should not change Spotify.
  if (liveSpotifySong === null) {
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    currentProgress = 0;
    isPlaying = true;
  }

  updateDisplay();
});

// ------------------------------
// INITIAL STARTUP
// ------------------------------

// First load
fetchSpotifyTrack();

// Refresh Spotify data every 3 seconds
setInterval(fetchSpotifyTrack, 3000);

// Smooth local progress simulation for fallback/locked mode
setInterval(simulateProgress, 1000);