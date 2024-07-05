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
        "3840x2160": {"mapCoordinates": [1502, 204, 3417, 2119]},
    }
    # Use coordinates based on the game resolution
    current_resolution = f"{game_resolution[0]}x{game_resolution[1]}"
    map_coordinates = coordinates[current_resolution]["mapCoordinates"]

    cropped_image = screenshot_cv[
        map_coordinates[1] : map_coordinates[3], map_coordinates[0] : map_coordinates[2]
    ]

    return cropped_image


def overlay_images(image_data):
    zoomed_in_image = capture_screenshot()
    clean_minimap = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
    downscale_factor = 0.4 
    clean_minimap_small = cv2.resize(clean_minimap, None, fx=downscale_factor, fy=downscale_factor, interpolation=cv2.INTER_LINEAR)

    # Feature detection and description on downscaled clean_minimap
    sift = cv2.SIFT_create()
    kp1_small, des1_small = sift.detectAndCompute(clean_minimap_small, None)
    # Feature detection and description on original zoomed_in_image
    kp2, des2 = sift.detectAndCompute(zoomed_in_image, None)

    # Use FLANN based matcher for SIFT/SURF
    FLANN_INDEX_KDTREE = 1
    index_params = dict(algorithm=FLANN_INDEX_KDTREE, trees=1)
    search_params = dict(checks=10)

    flann = cv2.FlannBasedMatcher(index_params, search_params)
    matches = flann.knnMatch(des1_small, des2, k=2)

    # Filter matches using the Lowe's ratio test
    good_matches = []
    for m, n in matches:
        if m.distance < 0.7 * n.distance:
            good_matches.append(m)

    if len(good_matches) > 10:
        src_pts_small = np.float32([kp1_small[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

        # Scale points back to original clean_minimap size
        src_pts = src_pts_small / downscale_factor

        # Compute homography on original-sized points
        matrix, mask = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 5.0)

        # Warp the zoomed-in image using the homography matrix
        h, w, _ = clean_minimap.shape
        warped_image = cv2.warpPerspective(zoomed_in_image, matrix, (w, h))

        # Paste the zoomed-in image onto the clean minimap
        mask = np.max(warped_image, axis=2) > 0
        clean_minimap[mask] = warped_image[mask]

    _, img_encoded = cv2.imencode(".png", clean_minimap)
    return img_encoded.tobytes()    
