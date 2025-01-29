import asyncio
import websockets
import threading
from websockets.server import serve
import tkinter as tk
from image_layering import capture_screenshot, overlay_images, get_cached_image
import keyboard

# Global variable for tracking last key pressed
last_key_pressed = None

def on_key_press(event):
    global last_key_pressed
    last_key_pressed = event.name

keyboard.on_press(on_key_press)

async def handle_map(websocket, settings):
    await websocket.send("Open")
    global last_key_pressed
    current_map_name = None
    
    while True:
        if last_key_pressed == settings["hotkey"]:
            last_key_pressed = None
            zoomed_in_image = capture_screenshot()
            
            await websocket.send("Map")
            new_map_name = await websocket.recv()
            
            image_data = None
            if new_map_name != current_map_name or get_cached_image(new_map_name) is None:
                await websocket.send("MapData")
                image_data = await websocket.recv()
                current_map_name = new_map_name
            
            modified_image_data = overlay_images(
                image_data if image_data is not None else get_cached_image(current_map_name).tobytes(), 
                zoomed_in_image, 
                current_map_name
            )
            await websocket.send(modified_image_data)
            await asyncio.sleep(0.5)
        await asyncio.sleep(0.1)

async def handle_coordinates(websocket, settings):
    try:
        await websocket.send("Open")
        coordinate_window = create_coordinate_window(settings)
        label = tk.Label(coordinate_window, font=("Open Sans", settings["font_size"]))
        label.pack()

        while True:
            response = await websocket.recv()
            update_coordinate_window(coordinate_window, label, response, settings)
            
    except websockets.exceptions.ConnectionClosed:
        coordinate_window.withdraw()

def create_coordinate_window(settings):
    window = tk.Toplevel()
    window.overrideredirect(True)
    window.geometry(f"+{settings['coordinates_x']}+{settings['coordinates_y']}")
    window.lift()
    window.wm_attributes("-topmost", True)
    window.wm_attributes("-disabled", True)
    window.wm_attributes("-transparentcolor", "white")
    window.wm_attributes("-toolwindow", True)
    window.withdraw()
    return window

def update_coordinate_window(window, label, response, settings):
    if not settings['coordinates_visible'] or not response:
        window.withdraw()
    else:
        label.config(
            text=response,
            font=("Open Sans", settings["font_size"])
        )
        window.geometry(f"+{settings['coordinates_x']}+{settings['coordinates_y']}")
        window.update_idletasks()
        window.deiconify()

def start_server_loop(server_type, settings):
    async def start_map_server():
        async with serve(
            lambda ws: handle_map(ws, settings),
            "localhost",
            12345,
            max_size=10 * 1024 * 1024
        ):
            await asyncio.Future()

    async def start_coordinate_server():
        async with serve(
            lambda ws: handle_coordinates(ws, settings),
            "localhost",
            12346
        ):
            await asyncio.Future()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    if server_type == "map":
        loop.run_until_complete(start_map_server())
    else:
        loop.run_until_complete(start_coordinate_server())

def start_websocket_servers(settings):
    """Starts both websocket servers in separate threads"""
    websocket_thread_map = threading.Thread(
        target=start_server_loop,
        args=("map", settings)
    )
    websocket_thread_map.daemon = True
    websocket_thread_map.start()

    websocket_thread_coordinates = threading.Thread(
        target=start_server_loop,
        args=("coordinates", settings)
    )
    websocket_thread_coordinates.daemon = True
    websocket_thread_coordinates.start()

    return (websocket_thread_map, websocket_thread_coordinates)
