import http.server
import socketserver
import os
import time
import tkinter as tk
from tkinter import scrolledtext
import webbrowser
import threading
from pynput import keyboard
import asyncio
from websockets.server import serve
import keyboard
from tkinter import simpledialog
import shutil
import json

# from scripts.imageLayering import overlay_images

dir_path = "frontend/public/merged"
if os.path.exists(dir_path):
    shutil.rmtree(dir_path)

def read_config(key):
    with open("config/config.json", "r") as config_file:
            config_data = json.load(config_file)
            return config_data.get(key, "k")
    
def save_config(key,value):
    with open("config/config.json", "r") as config_file:
        existing_config = json.load(config_file)
    existing_config[key] = value

    with open("config/config.json", "w") as config_file:
        json.dump(existing_config, config_file)

settings = {'hotkey': read_config('hotkey')}

async def handle_map(websocket):
    await websocket.send('Open')
    while True:
        if keyboard.is_pressed(settings['hotkey']):
            await websocket.send('Map')
            response = await websocket.recv()
            filename = "merged/merged_{}.png".format(int(time.time()))
            # overlay_images(response, filename)
            await websocket.send(filename)
            await asyncio.sleep(0.3)

async def handle_coordinates(websocket):
    await websocket.send('Open')
    coordinate_window = tk.Toplevel()
    coordinate_window.overrideredirect(True)
    coordinate_window.geometry("+10+0")
    coordinate_window.lift()
    coordinate_window.wm_attributes("-topmost", True)
    coordinate_window.wm_attributes("-disabled", True)
    coordinate_window.wm_attributes("-transparentcolor", "white")
    # Create a label to display coordinates
    label = tk.Label(coordinate_window, font=('Arial Black', '20'))
    label.pack()
    while True:
        response = await websocket.recv()
        label.config(text=response)  # Update label text
        coordinate_window.update_idletasks()
        print(response)  # print the coordinates

async def main_coordinates():
    async with serve(handle_coordinates, "localhost", 12346):
        await asyncio.Future()  # run forever

async def main_map():
    async with serve(handle_map, "localhost", 12345):
        await asyncio.Future()  # run forever

def start_loop_map():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main_map())

def start_loop_coordinates():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main_coordinates())

websocket_thread_map = threading.Thread(target=start_loop_map)
websocket_thread_map.daemon = True
websocket_thread_map.start()

websocket_thread_coordinates = threading.Thread(target=start_loop_coordinates)
websocket_thread_coordinates.daemon = True
websocket_thread_coordinates.start()


# Create the main window
root = tk.Tk()
root.geometry("560x300")
root.title("Squad Mortar Overlay")

# Set an icon (replace 'icon.ico' with your icon file)
root.iconbitmap('icon.ico')

# Disable window resizing
root.resizable(width=False, height=False)

# Create a scrollable text field and insert the provided text
text = scrolledtext.ScrolledText(root, wrap="word", height=10, state=tk.NORMAL) 
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
    webbrowser.open("http://localhost:8000/")

def ask_hotkey():
    new_hotkey = simpledialog.askstring("Input", "Enter the hotkey:", parent=root)
    if new_hotkey:
        settings['hotkey'] = new_hotkey
    save_config('hotkey',new_hotkey)
    button_hotkey.config(text="Set Hotkey " + settings['hotkey'])


# Create buttons
button_github = tk.Button(root, text="Github", command=open_github)
button_discord = tk.Button(root, text="Discord", command=open_discord)
button_html = tk.Button(root, text="Open squadmortar.xyz", command=open_html)
button_hotkey = tk.Button(root, text="Set Overlay Hotkey. Current: "+ settings['hotkey'], command=ask_hotkey)


# Place buttons at the bottom
button_hotkey.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 5), pady=(5, 10))
button_github.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 10))
button_discord.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 10))
button_html.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 10))

# Define the handler to use for the server
Handler = http.server.SimpleHTTPRequestHandler
Handler.directory = 'frontend/public/'

# Define the socket server
httpd = socketserver.TCPServer(("", 8000), Handler)

# Start the server in a new thread
server_thread = threading.Thread(target=httpd.serve_forever)
server_thread.daemon = True
server_thread.start()

# Define a protocol to close the server and thread when the window is closed
def on_closing():
    root.destroy()  # Destroy the window

root.protocol("WM_DELETE_WINDOW", on_closing)

# Start the main loop
root.mainloop()
