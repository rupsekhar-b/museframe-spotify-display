import os
import base64
import urllib.parse
import json

import requests
from flask import Flask, redirect, request, session, jsonify, render_template
from dotenv import load_dotenv


# Load variables from .env file
load_dotenv()

app = Flask(__name__)

# Flask needs this to safely store session data in browser cookies.
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-key")


# Spotify credentials from .env
CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
REDIRECT_URI = os.getenv("SPOTIFY_REDIRECT_URI")


# Spotify URLs
AUTH_URL = "https://accounts.spotify.com/authorize"
TOKEN_URL = "https://accounts.spotify.com/api/token"
CURRENT_TRACK_URL = "https://api.spotify.com/v1/me/player/currently-playing"


# Permissions we need from Spotify
SCOPE = "user-read-currently-playing user-read-playback-state"


# Local token storage file
# IMPORTANT: This file must be added to .gitignore later.
TOKEN_STORE_FILE = "token_store.json"


def save_tokens(token_data):
    """
    Saves Spotify tokens locally so login survives Flask/browser restarts.
    """
    existing_tokens = load_tokens()

    # Spotify may not always send refresh_token during refresh.
    # So we preserve the old refresh_token if a new one is not provided.
    if existing_tokens and "refresh_token" not in token_data:
        token_data["refresh_token"] = existing_tokens.get("refresh_token")

    with open(TOKEN_STORE_FILE, "w") as file:
        json.dump(token_data, file)


def load_tokens():
    """
    Loads saved Spotify tokens from local file.
    """
    if not os.path.exists(TOKEN_STORE_FILE):
        return None

    with open(TOKEN_STORE_FILE, "r") as file:
        return json.load(file)


def clear_tokens():
    """
    Deletes saved Spotify tokens during logout.
    """
    if os.path.exists(TOKEN_STORE_FILE):
        os.remove(TOKEN_STORE_FILE)


@app.route("/")
def home():
    """
    Loads the main display page.
    """
    return render_template("index.html")


@app.route("/login")
def login():
    """
    Sends user to Spotify permission screen.
    """
    params = {
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
        "show_dialog": "true"
    }

    auth_link = f"{AUTH_URL}?{urllib.parse.urlencode(params)}"
    return redirect(auth_link)


@app.route("/callback")
def callback():
    """
    Spotify redirects here after user approves access.
    We exchange the temporary code for access and refresh tokens.
    """
    error = request.args.get("error")

    if error:
        return f"Spotify authorization failed: {error}"

    code = request.args.get("code")

    if not code:
        return "No authorization code received from Spotify."

    auth_header = base64.b64encode(
        f"{CLIENT_ID}:{CLIENT_SECRET}".encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI
    }

    try:
        response = requests.post(TOKEN_URL, headers=headers, data=data, timeout=5)
    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": "Could not reach Spotify token API",
            "details": str(e)
        }), 200

    if response.status_code != 200:
        return jsonify({
            "error": "Failed to get token",
            "status_code": response.status_code,
            "details": response.text
        }), 200

    token_data = response.json()

    # Store in Flask session
    session["access_token"] = token_data.get("access_token")
    session["refresh_token"] = token_data.get("refresh_token")

    # Also store locally so login survives restart
    save_tokens(token_data)

    return redirect("/")


def refresh_access_token():
    """
    Uses the refresh token to get a new Spotify access token.
    Also saves the new token so login persists.
    """
    tokens = load_tokens()

    refresh_token = None

    if tokens:
        refresh_token = tokens.get("refresh_token")

    if not refresh_token:
        refresh_token = session.get("refresh_token")

    if not refresh_token:
        print("No refresh token found.")
        return None

    auth_header = base64.b64encode(
        f"{CLIENT_ID}:{CLIENT_SECRET}".encode()
    ).decode()

    headers = {
        "Authorization": f"Basic {auth_header}",
        "Content-Type": "application/x-www-form-urlencoded"
    }

    data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    }

    try:
        response = requests.post(TOKEN_URL, headers=headers, data=data, timeout=5)
    except requests.exceptions.RequestException as e:
        print("Refresh token request failed:", e)
        return None

    if response.status_code != 200:
        print("Refresh failed:", response.status_code, response.text)
        return None

    token_data = response.json()

    # Preserve refresh token if Spotify only sends a new access token.
    token_data["refresh_token"] = refresh_token

    save_tokens(token_data)

    new_access_token = token_data.get("access_token")

    if new_access_token:
        session["access_token"] = new_access_token
        session["refresh_token"] = refresh_token
        print("Access token refreshed successfully.")
        return new_access_token

    return None


@app.route("/current-track")
def current_track():
    """
    Fetches the user's currently playing Spotify track.

    Handles:
    - not logged in
    - expired access token
    - Spotify API unreachable
    - no song playing
    """
    tokens = load_tokens()

    access_token = None

    # First try locally saved token
    if tokens:
        access_token = tokens.get("access_token")

    # If no saved token, try browser session token
    if not access_token:
        access_token = session.get("access_token")

    # If still no token, user needs to login
    if not access_token:
        return jsonify({
            "connected": False,
            "track": None,
            "message": "Not logged in to Spotify"
        }), 200

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    try:
        response = requests.get(CURRENT_TRACK_URL, headers=headers, timeout=5)
    except requests.exceptions.RequestException as e:
        return jsonify({
            "connected": False,
            "track": None,
            "message": "Could not reach Spotify API",
            "details": str(e)
        }), 200

    # Access token expired or invalid
    if response.status_code == 401:
        print("Access token expired/invalid. Trying refresh...")

        new_access_token = refresh_access_token()

        if not new_access_token:
            return jsonify({
                "connected": False,
                "track": None,
                "message": "Token expired and refresh failed",
                "status_code": 401
            }), 200

        headers = {
            "Authorization": f"Bearer {new_access_token}"
        }

        try:
            response = requests.get(CURRENT_TRACK_URL, headers=headers, timeout=5)
        except requests.exceptions.RequestException as e:
            return jsonify({
                "connected": False,
                "track": None,
                "message": "Could not reach Spotify API after refresh",
                "details": str(e)
            }), 200

    # No song currently playing
    if response.status_code == 204:
        return jsonify({
            "connected": True,
            "track": None,
            "is_playing": False,
            "message": "No song currently playing"
        }), 200

    # Any other Spotify error
    if response.status_code != 200:
        print("Spotify API error:", response.status_code, response.text)

        return jsonify({
            "connected": False,
            "track": None,
            "message": "Could not fetch current track",
            "status_code": response.status_code
        }), 200

    data = response.json()
    item = data.get("item")

    if item is None:
        return jsonify({
            "connected": True,
            "track": None,
            "is_playing": False,
            "message": "No track item found"
        }), 200

    album_images = item.get("album", {}).get("images", [])
    cover_url = album_images[0]["url"] if album_images else ""

    artists = item.get("artists", [])
    artist_names = ", ".join([artist["name"] for artist in artists])

    cleaned_track = {
        "title": item.get("name"),
        "artist": artist_names,
        "cover": cover_url,
        "duration": item.get("duration_ms", 0) // 1000,
        "progress": data.get("progress_ms", 0) // 1000,
        "is_playing": data.get("is_playing", False),
        "spotify_url": item.get("external_urls", {}).get("spotify")
    }

    return jsonify({
        "connected": True,
        "track": cleaned_track
    }), 200


@app.route("/logout")
def logout():
    """
    Logs out current Spotify user from this display.
    Another user can then connect their Spotify account.
    """
    session.clear()
    clear_tokens()

    return redirect("/")


if __name__ == "__main__":
    app.run(debug=True)