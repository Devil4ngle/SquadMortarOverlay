import tkinter as tk
from tkinter import simpledialog, messagebox
import webbrowser
import requests
from config import VERSION, save_config, get_icon_path

TEXT_CONTENT = """
 When changing settings they will be applied upon 
 adding new mortar points on (SquadCalc).

 When pressing the overlay hotkey the Minimap in Squad must be 
 open (the Capslock one) with the side bar open. 
 Fully zoomed in screenshot on the Minimap might fail."""

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
                f"Latest version: {latest_version}. Download the latest version."
            )
            webbrowser.open("https://github.com/Devil4ngle/SquadMortarOverlay/releases")
    except Exception as e:
        messagebox.showerror(
            "Error",
            f"An error occurred while checking for updates: {str(e)}"
        )

class SettingsCallbacks:
    def __init__(self, settings, update_gui):
        self.settings = settings
        self.update_gui = update_gui

    def ask_font_size(self):
        font_size = simpledialog.askinteger("Input", "Enter the Font Size:")
        if font_size:
            self.settings["font_size"] = font_size
            save_config("font_size", font_size)
            self.update_gui()

    def ask_hotkey(self):
        new_hotkey = simpledialog.askstring("Input", "Enter the hotkey:")
        if new_hotkey:
            self.settings["hotkey"] = new_hotkey
            save_config("hotkey", new_hotkey)
            self.update_gui()

    def ask_coordinates(self):
        new_x = simpledialog.askinteger("Input", "Enter Coordinates X:")
        new_y = simpledialog.askinteger("Input", "Enter Coordinates Y:")
        if new_x is not None and new_y is not None:
            self.settings["coordinates_x"] = new_x
            self.settings["coordinates_y"] = new_y
            save_config("coordinates_x", new_x)
            save_config("coordinates_y", new_y)
            self.update_gui()

    def toggle_coordinate_window(self):
        new_state = not self.settings["coordinates_visible"]
        self.settings["coordinates_visible"] = new_state
        save_config("coordinates_visible", new_state)
        self.update_gui()

def create_gui(settings):
    root = tk.Tk()
    root.title(f"Squad Mortar Overlay {VERSION}")
    root.resizable(width=False, height=False)
    root.iconbitmap(get_icon_path())

    # Create update callback for GUI elements
    def update_gui_elements():
        button_toggle_coordinates.config(
            text="COORDINATES WINDOW: " + ("ON" if settings["coordinates_visible"] else "OFF")
        )
        button_hotkey.config(
            text="CHANGE OVERLAY HOTKEY: '" + settings["hotkey"] + "'"
        )
        button_font_size.config(
            text="CHANGE FONT SIZE: " + str(settings["font_size"])
        )
        button_coordinates.config(
            text=f"CHANGE COORDINATES: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}"
        )

    callbacks = SettingsCallbacks(settings, update_gui_elements)

    # Create text field
    text = tk.Text(root, wrap="word", height=10, state=tk.NORMAL, bg="black", fg="yellow")
    text.insert(tk.END, TEXT_CONTENT)
    text.config(state=tk.DISABLED)
    text.pack(expand=True, fill=tk.BOTH)

    # Create frames
    frames = [tk.Frame(root, bg="black") for _ in range(3)]
    
    # Create buttons with consistent styling
    button_style = {"bg": "gray", "fg": "white"}
    
    # Frame 0 buttons
    button_toggle_coordinates = tk.Button(
        frames[0],
        text="COORDINATES WINDOW: " + ("ON" if settings["coordinates_visible"] else "OFF"),
        command=callbacks.toggle_coordinate_window,
        **button_style
    )
    button_hotkey = tk.Button(
        frames[0],
        text=f"CHANGE OVERLAY HOTKEY: '{settings['hotkey']}'",
        command=callbacks.ask_hotkey,
        **button_style
    )

    # Frame 1 buttons
    button_font_size = tk.Button(
        frames[1],
        text=f"CHANGE FONT SIZE: {settings['font_size']}",
        command=callbacks.ask_font_size,
        **button_style
    )
    button_coordinates = tk.Button(
        frames[1],
        text=f"CHANGE COORDINATES: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}",
        command=callbacks.ask_coordinates,
        **button_style
    )

    # Frame 2 buttons
    button_github = tk.Button(
        frames[2],
        text="GITHUB",
        command=lambda: webbrowser.open("https://github.com/Devil4ngle/SquadMortarOverlay"),
        **button_style
    )
    button_discord = tk.Button(
        frames[2],
        text="DISCORD",
        command=lambda: webbrowser.open("https://discord.gg/ghrksNETNA"),
        **button_style
    )
    button_html = tk.Button(
        frames[2],
        text="OPEN SquadCalc",
        command=lambda: webbrowser.open("https://squadcalc.app/"),
        **button_style
    )
    button_update = tk.Button(
        frames[2],
        text="UPDATE",
        command=check_version,
        **button_style
    )

    # Pack buttons in frames
    for frame_idx, frame_buttons in enumerate([
        [button_toggle_coordinates, button_hotkey],
        [button_font_size, button_coordinates],
        [button_github, button_discord, button_update, button_html]
    ]):
        for i, button in enumerate(frame_buttons):
            button.pack(
                side=tk.LEFT,
                fill=tk.X,
                expand=True,
                padx=(5 if i == 0 else 0, 5),
                pady=(5, 0 if frame_idx < 2 else 5)
            )
        frames[frame_idx].pack(fill=tk.X)

    def on_closing():
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_closing)
    return root