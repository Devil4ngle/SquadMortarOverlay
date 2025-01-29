import tkinter as tk
from tkinter import simpledialog, messagebox
import webbrowser
import requests
from config import VERSION, save_config, get_icon_path, get_map_coordinates

TEXT_CONTENT = """ First time setup: You need to configure the minimap Region. 
 A 3-second countdown will start, switch to Squad, and draw a red square
 over your minimap area (the Capslock one). 
 Press Enter to confirm the selection
 This will be saved even after restart in the config folder!

 When pressing the Overlay screenshot hotkey:
 - The Minimap in Squad must be open (the Capslock one) 
 - Fully zoomed in/out screenshots on the Minimap might fail
 """

class MapCoordinateSelector:
    def __init__(self):
        self.root = tk.Tk()
        self.root.attributes('-alpha', 0.3)
        self.root.attributes('-topmost', True)
        self.root.attributes('-fullscreen', True)
        
        # Create transparent canvas
        self.canvas = tk.Canvas(self.root, highlightthickness=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # Variables to store coordinates
        self.start_x = None
        self.start_y = None
        self.current_rect = None
        
        # Bind mouse events
        self.canvas.bind('<Button-1>', self.start_selection)
        self.canvas.bind('<B1-Motion>', self.update_selection)
        self.canvas.bind('<ButtonRelease-1>', self.end_selection)
        
        # Add instructions label
        instructions = ("Click and drag to select the map area.\n"
                       "Press Enter to confirm or Escape to cancel.")
        self.label = tk.Label(self.root, text=instructions, 
                            bg='black', fg='white', pady=10)
        self.label.place(relx=0.5, rely=0.1, anchor='center')
        
        # Bind keyboard events
        self.root.bind('<Return>', self.confirm_selection)
        self.root.bind('<Escape>', self.cancel_selection)
        
        self.coordinates = None

    def start_selection(self, event):
        self.start_x = event.x
        self.start_y = event.y
        if self.current_rect:
            self.canvas.delete(self.current_rect)
        self.current_rect = self.canvas.create_rectangle(
            event.x, event.y, event.x, event.y,
            outline='red', width=2
        )

    def update_selection(self, event):
        if self.current_rect:
            self.canvas.coords(
                self.current_rect,
                self.start_x, self.start_y,
                event.x, event.y
            )

    def end_selection(self, event):
        if self.current_rect:
            coords = self.canvas.coords(self.current_rect)
            self.coordinates = {
                "left": int(min(coords[0], coords[2])),
                "top": int(min(coords[1], coords[3])),
                "right": int(max(coords[0], coords[2])),
                "bottom": int(max(coords[1], coords[3]))
            }

    def confirm_selection(self, event=None):
        if self.coordinates:
            save_config("map_coordinates", self.coordinates)
            self.root.quit()
            self.root.destroy()

    def cancel_selection(self, event=None):
        self.coordinates = None
        self.root.quit()
        self.root.destroy()

    def get_coordinates(self):
        self.root.mainloop()
        return self.coordinates

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
            from server import update_all_windows
            update_all_windows(self.settings)
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
            from server import update_all_windows
            update_all_windows(self.settings)
            self.update_gui()

    def toggle_coordinate_window(self):
        new_state = not self.settings["coordinates_visible"]
        self.settings["coordinates_visible"] = new_state
        save_config("coordinates_visible", new_state)
        from server import update_all_windows
        update_all_windows(self.settings)
        self.update_gui()

    def countdown_and_select_map(self, button_map_area):
        countdown_window = tk.Toplevel()
        countdown_window.title("Countdown")
        countdown_window.geometry("200x100")
        countdown_window.attributes('-topmost', True)
        
        label = tk.Label(countdown_window, text="Starting in: 3", font=("Arial", 20))
        label.pack(expand=True)
        
        def update_countdown(count):
            if count > 0:
                label.config(text=f"Starting in: {count}")
                countdown_window.after(1000, update_countdown, count - 1)
            else:
                countdown_window.destroy()
                selector = MapCoordinateSelector()
                new_coordinates = selector.get_coordinates()
                if new_coordinates:
                    messagebox.showinfo(
                        "Success",
                        "Map coordinates have been updated."
                    )
                    button_map_area.config(text="Configure Minimap Region (Set)")
        
        update_countdown(3)

    def select_map_area(self, button_map_area):
        self.countdown_and_select_map(button_map_area)
        
def create_gui(settings):
    root = tk.Tk()
    root.title(f"Squad Mortar Overlay {VERSION}")
    root.resizable(width=False, height=False)
    root.iconbitmap(get_icon_path())

    def update_gui_elements():
        button_toggle_coordinates.config(
            text="Toggle Mortar Overlay Display: " + ("VISIBLE" if settings["coordinates_visible"] else "HIDDEN")
        )
        button_hotkey.config(
            text=f"Minimap Screenshot Hotkey: '{settings['hotkey']}'"
        )
        button_font_size.config(
            text=f"Overlay Text Size: {settings['font_size']}px"
        )
        button_coordinates.config(
            text=f"Overlay Window Position: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}"
        )

    callbacks = SettingsCallbacks(settings, update_gui_elements)

    text = tk.Text(root, wrap="word", height=10, state=tk.NORMAL, bg="black", fg="yellow")
    text.insert(tk.END, TEXT_CONTENT)
    text.config(state=tk.DISABLED)
    text.pack(expand=True, fill=tk.BOTH)

    frames = [tk.Frame(root, bg="black") for _ in range(3)]
    button_style = {"bg": "gray", "fg": "white"}
    
    # Frame 0 buttons
    button_toggle_coordinates = tk.Button(
        frames[0],
        text="Toggle Mortar Overlay Display: " + ("VISIBLE" if settings["coordinates_visible"] else "HIDDEN"),
        command=callbacks.toggle_coordinate_window,
        **button_style
    )
    button_hotkey = tk.Button(
        frames[0],
        text=f"Minimap Screenshot Hotkey: '{settings['hotkey']}'",
        command=callbacks.ask_hotkey,
        **button_style
    )

    # Frame 1 buttons
    button_font_size = tk.Button(
        frames[1],
        text=f"Overlay Text Size: {settings['font_size']}px",
        command=callbacks.ask_font_size,
        **button_style
    )
    button_coordinates = tk.Button(
        frames[1],
        text=f"Overlay Window Position: X:{settings['coordinates_x']} Y:{settings['coordinates_y']}",
        command=callbacks.ask_coordinates,
        **button_style
    )
    
    # Check if map coordinates are set
    map_coords = get_map_coordinates()
    is_map_configured = not all(value == 0 for value in map_coords.values())
    
    button_map_area = tk.Button(
        frames[1],
        text="Configure Minimap Region" + (" (SET)" if is_map_configured else "(NOT SET)"),
        command=lambda: callbacks.select_map_area(button_map_area),
        **button_style
    )

    # Frame 2 buttons
    button_github = tk.Button(
        frames[2],
        text="View Source Code (GitHub)",
        command=lambda: webbrowser.open("https://github.com/Devil4ngle/SquadMortarOverlay"),
        **button_style
    )
    button_discord = tk.Button(
        frames[2],
        text="Join Support Discord",
        command=lambda: webbrowser.open("https://discord.gg/ghrksNETNA"),
        **button_style
    )
    button_html = tk.Button(
        frames[2],
        text="Open SquadCalc Website",
        command=lambda: webbrowser.open("https://squadcalc.app/"),
        **button_style
    )
    button_update = tk.Button(
        frames[2],
        text="Check for Updates",
        command=check_version,
        **button_style
    )

    # Pack buttons in frames
    for frame_idx, frame_buttons in enumerate([
        [button_toggle_coordinates, button_hotkey],
        [button_font_size, button_coordinates, button_map_area],
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