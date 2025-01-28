import asyncio
import os
import sys
import tkinter as tk
import webbrowser
import threading
import keyboard
import websockets
from websockets.server import serve
from tkinter import simpledialog
import json
from scripts.image_layering import capture_screenshot, overlay_images , get_cached_image
from tkinter import messagebox
import requests

VERSION = "2.4.0"

DEFAULT_CONFIG = {
    "hotkey": "!",
    "coordinates_x": 700,
    "coordinates_y": 5,
    "font_size": 17,
    "coordinates_visible": True,
}

CONFIG_FILE_PATH = "config/config.json"
CONFIG_DIR = "config"

TEXT_CONTENT = """
 When changing settings they will be applied upon 
 adding new mortar points on (SquadCalc).

 
 When pressing the overlay hotkey the Minimap in Squad must be 
 open (the Capslock one) with the side bar open. 
 Fully zoomed in screenshot on the Minimap might fail."""

# Hotkey event
last_key_pressed = None

def on_key_press(event):
    global last_key_pressed
    last_key_pressed = event.name

keyboard.on_press(on_key_press)


# Create config directory if it does not exist
if not os.path.exists(CONFIG_DIR):
    os.makedirs(CONFIG_DIR)

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
    "coordinates_visible": read_config("coordinates_visible"),
}


async def handle_map(websocket):
    await websocket.send("Open")
    global last_key_pressed
    current_map_name = None
    
    while True:
        if last_key_pressed == settings["hotkey"]:
            # Reset hotkey
            last_key_pressed = None
            
            # Capture screen
            zoomed_in_image = capture_screenshot()
            
            # Get map name
            await websocket.send("Map")
            new_map_name = await websocket.recv()
            
            # Only request image data if map changed or not in cache
            image_data = None
            if new_map_name != current_map_name or get_cached_image(new_map_name) is None:
                await websocket.send("MapData")
                image_data = await websocket.recv()
                current_map_name = new_map_name
            
            # Process and send image
            modified_image_data = overlay_images(
                image_data if image_data is not None else get_cached_image(current_map_name).tobytes(), 
                zoomed_in_image, 
                current_map_name
            )
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
        label = tk.Label(coordinate_window, font=("Open Sans", settings["font_size"]))
        label.pack()

        while True:
            response = await websocket.recv()

            if settings['coordinates_visible'] == False or not response:
                coordinate_window.withdraw()  # Hide the window
            else:
                label.config(text=response)  # Update label text
                label.config(font=("Open Sans", settings["font_size"]))
                coordinate_window.geometry(
                    f"+{settings['coordinates_x']}+{settings['coordinates_y']}"
                )
                coordinate_window.update_idletasks()
                coordinate_window.deiconify()
    except websockets.exceptions.ConnectionClosed:
        coordinate_window.withdraw()


async def start_coordinate_server():
    async with serve(handle_coordinates, "localhost", 12346):
        await asyncio.Future()


async def start_map_server():
    async with serve(handle_map, "localhost", 12345, max_size=10 * 1024 * 1024):
        await asyncio.Future()


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

try:
    icon_path = "favicon.ico"
    base_path = sys._MEIPASS
except Exception:
    icon_path = "favicon.ico"
    base_path = os.path.abspath(".")
iconPath = os.path.join(base_path, icon_path)

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
    webbrowser.open("https://github.com/Devil4ngle/SquadMortarOverlay")


def open_discord():
    webbrowser.open("https://discord.gg/ghrksNETNA")


def open_html():
    webbrowser.open("https://squadcalc.app/")

def ask_font_size():
    font_size = simpledialog.askinteger("Input", "Enter the Font Size:", parent=root)
    if font_size:
        settings["font_size"] = font_size
        save_config("font_size", font_size)
    button_font_size.config(
        text="CHANGE FONT SIZE: '" + str(settings["font_size"]) + "'"
    )


def ask_hotkey():
    new_hotkey = simpledialog.askstring("Input", "Enter the hotkey:", parent=root)
    if new_hotkey:
        settings["hotkey"] = new_hotkey
        save_config("hotkey", new_hotkey)
    button_hotkey.config(text="CHANGE OVERLAY HOTKEY: '" + settings["hotkey"] + "'")


def ask_coordinates():
    new_x = simpledialog.askinteger("Input", "Enter Coordinates X:", parent=root)
    new_y = simpledialog.askinteger("Input", "Enter Coordinates Y:", parent=root)
    if new_x is not None and new_y is not None:
        settings["coordinates_x"] = new_x
        settings["coordinates_y"] = new_y
        save_config("coordinates_x", new_x)
        save_config("coordinates_y", new_y)
        button_coordinates.config(
            text=f"CHANGE COORDINATES: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}"
        )


def check_version():
    api_url = "https://api.github.com/repos/Devil4ngle/SquadMortarOverlay/releases/latest"
    try:
        response = requests.get(api_url)
        response_json = response.json()
        latest_version = response_json["tag_name"]

        if latest_version == VERSION:
            messagebox.showinfo("Up to Date", "The application is up to date.")
        else:
            messagebox.showinfo(
                "Update available",
                f"Latest version: {latest_version}. Download the latest version.",
            )
            webbrowser.open("https://github.com/Devil4ngle/SquadMortarOverlay/releases")
    except Exception as e:
        messagebox.showerror(
            "Error", f"An error occurred while checking for updates: {str(e)}"
        )

def toggle_coordinate_window():
    current_state = settings["coordinates_visible"]
    new_state = not current_state
    settings["coordinates_visible"] = new_state
    save_config("coordinates_visible", new_state)
    if settings["coordinates_visible"]:
        button_toggle_coordinates.config(text="COORDINATE WINDOW: ON")
    else:
        button_toggle_coordinates.config(text="COORDINATE WINDOW: OFF")

# Create frames
frame0 = tk.Frame(root, bg="black")
frame1 = tk.Frame(root, bg="black")
frame2 = tk.Frame(root, bg="black")

# Create buttons
button_toggle_coordinates = tk.Button(
    frame0,
    text="COORDINATES WINDOW: " + ("ON" if settings["coordinates_visible"] else "OFF"), 
    command=toggle_coordinate_window,
    bg="gray",
    fg="white",
)
button_hotkey = tk.Button(
    frame0,
    text="CHANGE OVERLAY HOTKEY:  '" + settings["hotkey"] + "'",
    command=ask_hotkey,
    bg="gray",
    fg="white",
)
button_font_size = tk.Button(
    frame1,
    text="CHANGE FONT SIZE: " + str(settings["font_size"]),
    command=ask_font_size,
    bg="gray",
    fg="white",
)
button_coordinates = tk.Button(
    frame1,
    text=f"CHANGE COORDINATES: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}",
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
button_toggle_coordinates.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 5), pady=(5, 0))
button_hotkey.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 0))
button_font_size.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 5), pady=(5, 0))
button_coordinates.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 0))
button_github.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 5), pady=(5, 5))
button_discord.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 5))
button_update.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 5))
button_html.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 5))

# Place frames on the root window
frame0.pack(fill=tk.X)
frame1.pack(fill=tk.X)
frame2.pack(fill=tk.X)

# Define a protocol to close the server and thread when the window is closed
def on_closing():
    root.destroy()  # Destroy the window


root.protocol("WM_DELETE_WINDOW", on_closing)

# Start the main loop
root.mainloop()
