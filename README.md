# MuseFrame

MuseFrame is a Spotify-powered aesthetic music display frame that shows the currently playing song in real time.

It displays live album art, song title, artist name, playback progress, and supports multiple visual modes such as album mode and vinyl mode. The project is currently a software prototype built with Flask, JavaScript, HTML, and CSS, with a future vision of becoming a hardware music frame.

## Features

- Live Spotify currently playing display
- Album art, song title, and artist name
- Album display mode
- Vinyl display mode with spinning record animation
- Lock display mode
- Idle state when no music is connected
- Spotify OAuth login
- Access token refresh handling
- Local token persistence
- Logout support for switching users
- Separate prototype control panel

## Tech Stack

- Python
- Flask
- Spotify Web API
- HTML
- CSS
- JavaScript
- OAuth 2.0
- dotenv

## Project Status

MuseFrame is currently in the first working prototype stage.

Completed:

- Spotify login flow
- Live currently playing track fetch
- Frontend display integration
- Album and vinyl modes
- Lock display behavior
- Idle mode
- Token refresh handling
- Local token storage
- GitHub checkpoint

Planned:

- Smooth progress animation
- Better visual polish
- Album-art-based background colors
- Improved idle animation
- Phone control interface
- NFC tap-to-connect
- QR fallback login
- Hardware frame version
- Built-in speaker exploration

## Hardware Vision

The long-term goal is to turn MuseFrame into a complete ambient music experience product.

Future hardware ideas include:

- A wall-mounted display frame
- NFC tap-to-connect
- QR code fallback login
- Local phone control page
- Logout from phone or display
- Built-in Bluetooth speaker
- Minimal physical controls
- Shared-user mode
- “Looking for your music...” pairing screen

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/rupsekhar-b/museframe-spotify-display.git
cd museframe-spotify-display

###2. Install dependencies

pip install -r requirements.txt

###3. Create a .env file

Create a .env file in the root folder:

SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:5000/callback
FLASK_SECRET_KEY=your_secret_key

###4. Set Spotify Redirect URI

In the Spotify Developer Dashboard, add this redirect URI:

http://127.0.0.1:5000/callback
5. Run the app
python app.py

Open:

http://127.0.0.1:5000

Then log in with Spotify and start playing music.

Security Note

This project uses a .env file and local token storage.

The following files should never be committed:

.env
token_store.json

They are already included in .gitignore.

Author

Built by Rupsekhar Bhattacharya as a personal software + hardware learning project.