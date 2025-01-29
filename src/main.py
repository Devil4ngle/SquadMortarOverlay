from server import start_websocket_servers
from gui import create_gui
from config import load_config

def main():
    # Load configuration
    config = load_config()
    # Start websocket servers in separate threads
    start_websocket_servers(config)
    
    # Create and start GUI
    root = create_gui(config)
    root.mainloop()

if __name__ == "__main__":
    main()