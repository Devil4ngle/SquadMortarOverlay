import cv2
import numpy as np
import pyautogui

DOWNSCALE_FACTOR = 0.5
DOWNSCALE_FACTOR_ORIGINAL = 0.8

class ImageCache:
    def __init__(self):
        self.memory_cache = {}
    
    def get_image(self, key):
        return self.memory_cache.get(key)
    
    def store_image(self, key, image):
        self.memory_cache[key] = image

image_cache = ImageCache()

def get_cached_image(map_name):
    return image_cache.get_image(map_name)

def resize_and_cache_image(image, scale_factor, cache_key):
    cached_image = image_cache.get_image(cache_key)
    
    if cached_image is not None:
        return cached_image
    
    resized_image = cv2.resize(image, None,
                              fx=scale_factor,
                              fy=scale_factor,
                              interpolation=cv2.INTER_LINEAR)
    image_cache.store_image(cache_key, resized_image)
    return resized_image

def get_or_create_downscaled_image(clean_minimap, map_name):
    return resize_and_cache_image(clean_minimap, DOWNSCALE_FACTOR, f"{map_name}_small")

def get_or_create_original_image(image_data, map_name):
    clean_minimap = image_cache.get_image(map_name)
    if clean_minimap is None:
        # Decode image
        clean_minimap = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
        # Resize and cache original sized image
        clean_minimap = resize_and_cache_image(clean_minimap, DOWNSCALE_FACTOR_ORIGINAL, map_name)
    return clean_minimap

def overlay_images(image_data, zoomed_in_image, map_name):
    clean_minimap = get_or_create_original_image(image_data, map_name)
    clean_minimap_small = get_or_create_downscaled_image(clean_minimap, map_name)
    
    sift = cv2.SIFT_create()
    kp1_small, des1_small = sift.detectAndCompute(clean_minimap_small, None)
    kp2, des2 = sift.detectAndCompute(zoomed_in_image, None)
    
    flann = cv2.FlannBasedMatcher(
        dict(algorithm=1, trees=1),
        dict(checks=10)
    )
    matches = flann.knnMatch(des1_small, des2, k=2)
    
    good_matches = []
    for m, n in matches:
        if m.distance < 0.7 * n.distance:
            good_matches.append(m)
    
    result_minimap = clean_minimap.copy()
    
    if len(good_matches) > 10:
        src_pts_small = np.float32([kp1_small[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        
        src_pts = src_pts_small / DOWNSCALE_FACTOR
        matrix, mask = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, 5.0)
        
        h, w, _ = result_minimap.shape
        warped_image = cv2.warpPerspective(zoomed_in_image, matrix, (w, h))
        
        mask = np.max(warped_image, axis=2) > 0
        result_minimap[mask] = warped_image[mask]
    
    _, img_encoded = cv2.imencode(".jpg", result_minimap)
    return img_encoded.tobytes()

def capture_screenshot():
    screen_width, screen_height = pyautogui.size()
    screenshot = pyautogui.screenshot()
    screenshot_cv = np.array(screenshot)
    screenshot_cv = cv2.cvtColor(screenshot_cv, cv2.COLOR_RGB2BGR)
    
    game_resolution = (screen_width, screen_height)
    coordinates = {
        "2560x1440": {"mapCoordinates": [1001, 136, 2278, 1412]},
        "1920x1080": {"mapCoordinates": [751, 102, 1708, 1059]},
        "1920x1200": {"mapCoordinates": [728, 113, 1791, 1177]},
        "2560x1080": {"mapCoordinates": [1071, 102, 2028, 1059]},
        "2560x1600": {"mapCoordinates": [970, 151, 2389, 1569]},
        "2880x1620": {"mapCoordinates": [1127, 153, 2563, 1589]},
        "3439x1439": {"mapCoordinates": [1441, 136, 2718, 1412]},
        "3440x1440": {"mapCoordinates": [747, 136, 3412, 1412]},
        "3840x2160": {"mapCoordinates": [1502, 204, 3417, 2119]},
    }
    
    current_resolution = f"{game_resolution[0]}x{game_resolution[1]}"
    map_coordinates = coordinates[current_resolution]["mapCoordinates"]
    
    return screenshot_cv[
        map_coordinates[1] : map_coordinates[3],
        map_coordinates[0] : map_coordinates[2]
    ]