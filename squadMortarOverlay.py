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
from scripts.imageLayering import overlay_images

async def handler(websocket):
    while True:
        if keyboard.is_pressed('k'):
             await websocket.send('Map')
             response = await websocket.recv()
             filename = "merged/merged_{}.png".format(int(time.time()))
             print(filename)
             overlay_images(response,filename)
             await websocket.send(filename)
             await asyncio.sleep(0.5)

async def main():
    async with serve(handler, "localhost", 12345):
        await asyncio.Future()  # run forever

def start_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main())

websocket_thread = threading.Thread(target=start_loop)
websocket_thread.start()

label = tk.Label(text='1399.5, 331.2', font=('Arial Black','20'))
label.master.overrideredirect(True)
label.master.geometry("+700+0")
label.master.lift()
label.master.wm_attributes("-topmost", True)
label.master.wm_attributes("-disabled", True)
label.master.wm_attributes("-transparentcolor", "white")
label.pack()

label = tk.Label(text='1329.5, 331.2', font=('Arial Black','20'))
label.master.overrideredirect(True)
label.master.geometry("+700+100")
label.master.lift()
label.master.wm_attributes("-topmost", True)
label.master.wm_attributes("-disabled", True)
label.master.wm_attributes("-transparentcolor", "white")
label.pack()

# Create the main window
root = tk.Tk()
root.geometry("560x300")
root.title("Squad Mortar Overlay")

# Set an icon (replace 'icon.ico' with your icon file)
root.iconbitmap('icon.ico')

# Disable window resizing
root.resizable(width=False, height=False)

# Create a scrollable text field and insert the provided text
text = scrolledtext.ScrolledText(root, wrap="word", height=10, state=tk.DISABLED)  # Set wrap to "word" for word wrapping
text.insert(tk.END, "Your text here...")  # Replace with your text
text.pack(expand=True, fill=tk.BOTH)

# Define button click events
def open_github():
    webbrowser.open("https://github.com/Devil4ngle/squadmortar")

def open_discord():
    webbrowser.open("https://discord.gg/ghrksNETNA")

def open_html():
    webbrowser.open("http://localhost:8000/")

# Create buttons
button_github = tk.Button(root, text="Github", command=open_github)
button_discord = tk.Button(root, text="Discord", command=open_discord)
button_html = tk.Button(root, text="Open squadmortar.xyz", command=open_html)

# Place buttons at the bottom, each taking 1/3 of the width
button_github.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 5), pady=(5, 10))
button_discord.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=5, pady=(5, 10))
button_html.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(5, 0), pady=(5, 10))

# Change the current working directory
os.chdir('frontend/public/')

# Define the handler to use for the server
Handler = http.server.SimpleHTTPRequestHandler

# Define the socket server
httpd = socketserver.TCPServer(("", 8000), Handler)

# Start the server in a new thread
server_thread = threading.Thread(target=httpd.serve_forever)
server_thread.start()

# Define a protocol to close the server and thread when the window is closed
def on_closing():
    httpd.shutdown()  # Shut down the server
    server_thread.join()  # Wait for the server thread to finish
    websocket_thread.join()  # Wait for the webscoket thread to finish
    root.destroy()  # Destroy the window

root.protocol("WM_DELETE_WINDOW", on_closing)

# Start the main loop
root.mainloop()
