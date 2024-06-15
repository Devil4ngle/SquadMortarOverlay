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
    }
    # Use coordinates based on the game resolution
    current_resolution = f"{game_resolution[0]}x{game_resolution[1]}"
    map_coordinates = coordinates[current_resolution]["mapCoordinates"]

    cropped_image = screenshot_cv[
        map_coordinates[1] : map_coordinates[3], map_coordinates[0] : map_coordinates[2]
    ]

    return cropped_image


def overlay_images(image_path, output_path):
    image_path_public = "frontend/dist/" + image_path
    output_path_public = "frontend/dist/" + output_path
    img1 = capture_screenshot()

    if img1 is False:
        return image_path
    # read images
    img2 = cv2.imread(image_path_public)

    # resize images
    img1 = cv2.resize(
        img1, (img2.shape[1], img2.shape[0]), interpolation=cv2.INTER_LINEAR
    )

    # blend images
    img_out = cv2.addWeighted(img1, 0.6, img2, 0.45, 0)

    # save the output
    cv2.imwrite(output_path_public, img_out)
    # print(output_path_public)
    return output_path