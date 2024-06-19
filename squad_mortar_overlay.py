import asyncio
import base64
import os
import sys
import tkinter as tk
import webbrowser
import threading
import keyboard
import urllib.request
import websockets
from websockets.server import serve
from tkinter import simpledialog
import json
from scripts.image_layering import overlay_images
from tkinter import messagebox
import requests

VERSION = "2.1.0"

DEFAULT_CONFIG = {
    "hotkey": "!",
    "coordinates_x": 700,
    "coordinates_y": 5,
    "font_size": 17,
}

CONFIG_FILE_PATH = "config/config.json"

TEXT_CONTENT = """Optional Improvements for Map Overlay:
    - Tab -> Right site of screen -> Map Icon Scale 0.3
    - Tab -> Right site of screen -> Grid Opacity 0

 When this application is started, 
 http://localhost:8000/ (SquadCalc) needs to be
 refreshed if already open.

 When assigning new coordinates, the location will be updated upon 
 restarting the application or adding new mortar points 
 on http://localhost:8000/ (SquadCalc).

 When pressing the overlay hotkey the Minimap in Squad must be 
 open (the capslock one) and fully zoomed out with side bar opened."""

# Create config directory if it does not exist
if not os.path.exists("config"):
    os.makedirs("config")

# Save config
if not os.path.exists(CONFIG_FILE_PATH):
    with open(CONFIG_FILE_PATH, "w") as config_file:
        json.dump(DEFAULT_CONFIG, config_file, indent=4)


def read_config(key):
    with open(CONFIG_FILE_PATH, "r") as config_file:
        config_data = json.load(config_file)
        return config_data.get(key, "k")


def save_config(key, value):
    with open(CONFIG_FILE_PATH, "r") as config_file:
        existing_config = json.load(config_file)
    existing_config[key] = value

    with open(CONFIG_FILE_PATH, "w") as config_file:
        json.dump(existing_config, config_file)


settings = {
    "hotkey": read_config("hotkey"),
    "coordinates_x": read_config("coordinates_x"),
    "coordinates_y": read_config("coordinates_y"),
    "font_size": read_config("font_size"),
}


# WebSocket Part
async def handle_map(websocket):
    await websocket.send("Open")
    while True:
        if keyboard.is_pressed(settings["hotkey"]):
            await websocket.send("Map")
            image_data = await websocket.recv()
            modified_image_data = overlay_images(image_data)
            await websocket.send(modified_image_data)
            await asyncio.sleep(0.5)
        await asyncio.sleep(0.1)


async def handle_coordinates(websocket):
    try:
        await websocket.send("Open")
        coordinate_window = tk.Toplevel()
        coordinate_window.overrideredirect(True)
        coordinate_window.geometry(
            f"+{settings['coordinates_x']}+{settings['coordinates_y']}"
        )
        coordinate_window.lift()
        coordinate_window.wm_attributes("-topmost", True)
        coordinate_window.wm_attributes("-disabled", True)
        coordinate_window.wm_attributes("-transparentcolor", "white")
        coordinate_window.wm_attributes("-toolwindow", True)
        coordinate_window.withdraw()
        # Create a label to display coordinates
        label = tk.Label(coordinate_window, font=("Arial Black", settings["font_size"]))
        label.pack()

        while True:
            response = await websocket.recv()

            if not response:
                coordinate_window.withdraw()  # Hide the window
            else:
                label.config(text=response)  # Update label text
                label.config(font=("Arial Black", settings["font_size"]))
                coordinate_window.geometry(
                    f"+{settings['coordinates_x']}+{settings['coordinates_y']}"
                )
                coordinate_window.update_idletasks()
                coordinate_window.deiconify()
    except websockets.exceptions.ConnectionClosed:
        coordinate_window.withdraw()


async def start_coordinate_server():
    async with serve(handle_coordinates, "localhost", 12346):
        await asyncio.Future()  # run forever


async def start_map_server():
    async with serve(handle_map, "localhost", 12345, max_size=10 * 1024 * 1024):
        await asyncio.Future()  # run forever


def start_loop_map():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_map_server())


def start_loop_coordinates():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(start_coordinate_server())


websocket_thread_map = threading.Thread(target=start_loop_map)
websocket_thread_map.daemon = True
websocket_thread_map.start()

websocket_thread_coordinates = threading.Thread(target=start_loop_coordinates)
websocket_thread_coordinates.daemon = True
websocket_thread_coordinates.start()

# GUI Part
root = tk.Tk()
root.geometry("560x300")

try:
    base_path = sys._MEIPASS
except Exception:
    base_path = os.path.abspath(".")
iconPath = os.path.join(base_path, "icon.ico")

root.iconbitmap(iconPath)

root.title("Squad Mortar Overlay " + VERSION)

# Disable window resizing
root.resizable(width=False, height=False)

# Create a text field and insert the provided text
text = tk.Text(root, wrap="word", height=10, state=tk.NORMAL, bg="black", fg="yellow")
text.insert(tk.END, TEXT_CONTENT)
text.config(state=tk.DISABLED)
text.pack(expand=True, fill=tk.BOTH)

# Define button click events
def open_github():
    webbrowser.open("https://github.com/Devil4ngle/squadmortar")


def open_discord():
    webbrowser.open("https://discord.gg/ghrksNETNA")


def open_html():
    webbrowser.open("https://devil4ngle.github.io/squadmortar/")


def ask_font_size():
    font_size = simpledialog.askinteger("Input", "Enter the Font Size:", parent=root)
    if font_size:
        settings["font_size"] = font_size
        save_config("font_size", font_size)
    button_font_size.config(
        text="ASSIGN FONT SIZE: '" + str(settings["font_size"]) + "'"
    )


def ask_hotkey():
    new_hotkey = simpledialog.askstring("Input", "Enter the hotkey:", parent=root)
    if new_hotkey:
        settings["hotkey"] = new_hotkey
        save_config("hotkey", new_hotkey)
    button_hotkey.config(text="ASSIGN HOTKEY: '" + settings["hotkey"] + "'")


def ask_coordinates():
    new_x = simpledialog.askinteger("Input", "Enter Coordinates X:", parent=root)
    new_y = simpledialog.askinteger("Input", "Enter Coordinates Y:", parent=root)
    if new_x is not None and new_y is not None:
        settings["coordinates_x"] = new_x
        settings["coordinates_y"] = new_y
        save_config("coordinates_x", new_x)
        save_config("coordinates_y", new_y)
        button_coordinates.config(
            text=f"ASSIGN COORDINATES: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}"
        )


def check_version():
    # URL of the remote VERSION.txt file
    remote_url = "https://raw.githubusercontent.com/Devil4ngle/squadmortar/main/VERSION.txt"

    try:
        # Fetch content of remote VERSION.txt file
        remote_content = requests.get(remote_url).text.strip()

        # Compare contents
        if remote_content == VERSION:
            messagebox.showinfo("Up to Date", "The application is up to date.")
        else:
            messagebox.showinfo("Update available", "Download the latest version.")
            webbrowser.open(
                "https://github.com/Devil4ngle/squadmortar/releases"
            )
    except Exception as e:
        messagebox.showerror("Error", f"An error occurred: {str(e)}")


# Create frames
frame1 = tk.Frame(root, bg="black")
frame2 = tk.Frame(root, bg="black")

# Create buttons
button_hotkey = tk.Button(
    frame1,
    text="ASSIGN HOTKEY: '" + settings["hotkey"] + "'",
    command=ask_hotkey,
    bg="gray",
    fg="white",
)
button_font_size = tk.Button(
    frame1,
    text="ASSIGN FONT SIZE: '" + str(settings["font_size"]) + "'",
    command=ask_font_size,
    bg="gray",
    fg="white",
)
button_coordinates = tk.Button(
    frame1,
    text=f"ASSIGN COORDINATES: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}",
    command=ask_coordinates,
    bg="gray",
    fg="white",
)
button_github = tk.Button(
    frame2, text="GITHUB", command=open_github, bg="gray", fg="white"
)
button_discord = tk.Button(
    frame2, text="DISCORD", command=open_discord, bg="gray", fg="white"
)
button_html = tk.Button(
    frame2, text="OPEN SquadCalc", command=open_html, bg="gray", fg="white"
)
button_update = tk.Button(
    frame2, text="UPDATE", command=check_version, bg="gray", fg="white"
)


# Place buttons in the frames
button_hotkey.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 5), pady=(5, 0))
button_font_size.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 0))
button_coordinates.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 0))
button_github.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 5), pady=(5, 5))
button_discord.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 5))
button_html.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 5))
button_update.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 5))

# Place frames on the root window
frame1.pack(fill=tk.X)
frame2.pack(fill=tk.X)

# Define a protocol to close the server and thread when the window is closed
def on_closing():
    root.destroy()  # Destroy the window


root.protocol("WM_DELETE_WINDOW", on_closing)

# Start the main loop
root.mainloop()
