import asyncio
import http.server
import os
import time
import tkinter as tk
import webbrowser
import threading
import keyboard
import websockets
from websockets.server import serve
from tkinter import simpledialog
import shutil
import json
from scripts.image_layering import overlay_images
from tkinter import messagebox
import requests
import subprocess
import functools

DEFAULT_CONFIG = {"hotkey": "k", "coordinates_x": 30, "coordinates_y": 0}
CONFIG_FILE_PATH = "config/config.json"
DIR_PATH_MERGE = "frontend/public/merged"


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
}


# Clean Merged folder
if os.path.exists(DIR_PATH_MERGE):
    shutil.rmtree(DIR_PATH_MERGE)
os.makedirs(DIR_PATH_MERGE)


# WebSocket Part
async def handle_map(websocket):
    await websocket.send("Open")
    while True:
        if keyboard.is_pressed(settings["hotkey"]):
            await websocket.send("Map")
            response = await websocket.recv()
            filename = "merged/merged_{}.png".format(int(time.time()))
            filename = overlay_images(response, filename)
            print(filename)
            await websocket.send(filename)
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
        coordinate_window.withdraw()
        # Create a label to display coordinates
        label = tk.Label(coordinate_window, font=("Arial Black", "20"))
        label.pack()

        while True:
            response = await websocket.recv()

            if not response:
                coordinate_window.withdraw()  # Hide the window
            else:
                label.config(text=response)  # Update label text
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
    async with serve(handle_map, "localhost", 12345):
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

# Server Part
class SilentHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args, **kwargs):
        pass
    
class MyHttpServerThread(threading.Thread):
    
    def __init__(self, address=("0.0.0.0",8000), target_dir="."):
        super().__init__()
        self.address = address
        self.target_dir = "."
        self.server = http.server.HTTPServer(address, functools.partial(SilentHandler, directory=self.target_dir))
        self.start()
 
    def run(self):
        self.server.serve_forever(poll_interval=1)

    def stop(self):
        self.server.shutdown() 

http_server = MyHttpServerThread()


# GUI Part
root = tk.Tk()
root.geometry("560x300")

# Version
with open("VERSION.txt", "r") as local_file:
    local_content = local_file.read().strip()

root.title("Squad Mortar Overlay " + local_content)

# Set an icon (replace 'icon.ico' with your icon file)
root.iconbitmap("icon.ico")

# Disable window resizing
root.resizable(width=False, height=False)

# Create a text field and insert the provided text
text = tk.Text(root, wrap="word", height=10, state=tk.NORMAL, bg="black", fg="yellow")
with open("config/text.txt", "r") as file:
    text_content = file.read()
text.insert(tk.END, text_content)

text.config(state=tk.DISABLED)
text.pack(expand=True, fill=tk.BOTH)

# Define button click events
def open_github():
    webbrowser.open("https://github.com/Devil4ngle/squadmortar")


def open_discord():
    webbrowser.open("https://discord.gg/ghrksNETNA")


def open_html():
    webbrowser.open("http://localhost:8000/frontend/public/")


def ask_hotkey():
    new_hotkey = simpledialog.askstring("Input", "Enter the hotkey:", parent=root)
    if new_hotkey:
        settings["hotkey"] = new_hotkey
        save_config("hotkey", new_hotkey)
    button_hotkey.config(text="ASSIGN NEW OVERLAY HOTKEY: '" + settings["hotkey"] + "'")


def ask_coordinates():
    new_x = simpledialog.askinteger("Input", "Enter Coordinates X:", parent=root)
    new_y = simpledialog.askinteger("Input", "Enter Coordinates Y:", parent=root)
    if new_x is not None and new_y is not None:
        settings["coordinates_x"] = new_x
        settings["coordinates_y"] = new_y
        save_config("coordinates_x", new_x)
        save_config("coordinates_y", new_y)
        button_coordinates.config(
            text=f"ASSIGN NEW COORDINATES: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}"
        )


def check_version():
    # URL of the remote VERSION.txt file
    remote_url = "https://raw.githubusercontent.com/Devil4ngle/squadmortar-release/main/VERSION.txt"

    try:
        # Fetch content of remote VERSION.txt file
        remote_content = requests.get(remote_url).text.strip()

        print(remote_content)
        # Read content of local VERSION.txt file
        with open("VERSION.txt", "r") as local_file:
            local_content = local_file.read().strip()

        # Compare contents
        if remote_content == local_content:
            messagebox.showinfo("Up to Date", "The application is up to date.")
        else:
            # Run external update script
            os.chdir("scripts/")
            subprocess.Popen("start cmd /K update.bat", shell=True)

            # Close the Python program
            http_server.stop()
            root.destroy()

    except Exception as e:
        messagebox.showerror("Error", f"An error occurred: {str(e)}")


# Create frames
frame1 = tk.Frame(root, bg="black")
frame2 = tk.Frame(root, bg="black")

# Create buttons
button_hotkey = tk.Button(
    frame1,
    text="ASSIGN NEW OVERLAY HOTKEY: '" + settings["hotkey"] + "'",
    command=ask_hotkey,
    bg="gray",
    fg="white",
)
button_coordinates = tk.Button(
    frame1,
    text=f"ASSIGN NEW COORDINATES: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}",
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
    frame2, text="OPEN Squadmortar.xyz", command=open_html, bg="gray", fg="white"
)
button_update = tk.Button(
    frame2, text="UPDATE", command=check_version, bg="gray", fg="white"
)


# Place buttons in the frames
button_hotkey.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 5), pady=(5, 0))
button_coordinates.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 5), pady=(5, 0))
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
    http_server.stop()


root.protocol("WM_DELETE_WINDOW", on_closing)

# Start the main loop
root.mainloop()
