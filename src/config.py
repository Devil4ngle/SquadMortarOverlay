# config.py
import os
import json
import sys

VERSION = "2.4.0"

DEFAULT_CONFIG = {
    "hotkey": "!",
    "coordinates_x": 700,
    "coordinates_y": 5,
    "font_size": 17,
    "coordinates_visible": True,
    "map_coordinates": {
        "top": 0,
        "left": 0,
        "bottom": 0,
        "right": 0
    }
}

CONFIG_FILE_PATH = "config/config.json"
CONFIG_DIR = "config"

def save_map_coordinates(coordinates):
    """Saves map coordinates configuration"""
    with open(CONFIG_FILE_PATH, "r") as config_file:
        existing_config = json.load(config_file)
    
    existing_config["map_coordinates"] = coordinates
    
    with open(CONFIG_FILE_PATH, "w") as config_file:
        json.dump(existing_config, config_file, indent=4)

def get_map_coordinates():
    """Gets map coordinates configuration"""
    with open(CONFIG_FILE_PATH, "r") as config_file:
        config_data = json.load(config_file)
        return config_data.get("map_coordinates", DEFAULT_CONFIG["map_coordinates"])
    
def ensure_config_directory():
    """Ensures the config directory exists"""
    if not os.path.exists(CONFIG_DIR):
        os.makedirs(CONFIG_DIR)

def create_default_config():
    """Creates default configuration file if it doesn't exist"""
    if not os.path.exists(CONFIG_FILE_PATH):
        with open(CONFIG_FILE_PATH, "w") as config_file:
            json.dump(DEFAULT_CONFIG, config_file, indent=4)

def read_config(key):
    """Reads a specific configuration value"""
    with open(CONFIG_FILE_PATH, "r") as config_file:
        config_data = json.load(config_file)
        return config_data.get(key, DEFAULT_CONFIG.get(key))

def save_config(key, value):
    """Saves a specific configuration value"""
    with open(CONFIG_FILE_PATH, "r") as config_file:
        existing_config = json.load(config_file)
    existing_config[key] = value

    with open(CONFIG_FILE_PATH, "w") as config_file:
        json.dump(existing_config, config_file, indent=4)

def load_config():
    """Loads and returns the entire configuration"""
    ensure_config_directory()
    create_default_config()
    return {
        "hotkey": read_config("hotkey"),
        "coordinates_x": read_config("coordinates_x"),
        "coordinates_y": read_config("coordinates_y"),
        "font_size": read_config("font_size"),
        "coordinates_visible": read_config("coordinates_visible"),
    }

def get_icon_path():
    """Returns the path to the application icon"""
    try:
        icon_path = "favicon.ico"
        base_path = sys._MEIPASS
    except Exception:
        icon_path = "favicon.ico"
        base_path = os.path.abspath(".")
    return os.path.join(base_path, icon_path)
