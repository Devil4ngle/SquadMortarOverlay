import cv2
import numpy as np
import pyautogui


def capture_screenshot():
    screen_width, screen_height = pyautogui.size()

    # Capture the entire screen
    screenshot = pyautogui.screenshot()

    # Convert the screenshot to an OpenCV image
    screenshot_cv = np.array(screenshot)
    screenshot_cv = cv2.cvtColor(screenshot_cv, cv2.COLOR_RGB2BGR)

    # Get the resolution of the game window
    game_resolution = (screen_width, screen_height)

    # Define the coordinates based on the game resolution
    coordinates = {
        "2560x1440": {"mapCoordinates": [1001, 136, 2278, 1412]},
        "1920x1080": {"mapCoordinates": [751, 102, 1708, 1059]},
        "1920x1200": {"mapCoordinates": [751, 102, 1708, 1059]},
    }
    # Use coordinates based on the game resolution
    current_resolution = f"{game_resolution[0]}x{game_resolution[1]}"
    map_coordinates = coordinates[current_resolution]["mapCoordinates"]

    cropped_image = screenshot_cv[
        map_coordinates[1] : map_coordinates[3], map_coordinates[0] : map_coordinates[2]
    ]

    return cropped_image


def overlay_images(image_data):
    img1 = capture_screenshot()
    img2 = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
    img1 = cv2.resize(
        img1, (img2.shape[1], img2.shape[0]), interpolation=cv2.INTER_CUBIC
    )
    img_out = cv2.addWeighted(img1, 0.90, img2, 0.30, -15)
    _, img_encoded = cv2.imencode(".png", img_out)
    return img_encoded.tobytes()
