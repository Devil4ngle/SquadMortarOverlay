import shutil
import time
import cv2
import os
from pathlib import Path
from pathlib import Path
import sys
import cv2
from PIL import Image
import numpy as np
import cv2.cuda as cuda

sys.path.append(str(Path(__file__).parent.parent))
# Define the base path for the maps and screenshots
maps_base_path = "frontend/public/maps"
screenshots_base_path = "tests\\tests_images"

map_locations = {
   # "screenshot_1": "albasrah",
   # "screenshot_2": "albasrah",
   # "screenshot_3": "albasrah",
   # "screenshot_4": "goosebay",
   # "screenshot_5": "goosebay",
   # "screenshot_6": "goosebay",
   # "screenshot_7": "gorodok",
   # "screenshot_8": "gorodok",
   # "screenshot_9": "gorodok",
   # "screenshot_10": "kokan",
   # "screenshot_11": "kokan",
   # "screenshot_12": "kokan",
   # "screenshot_13": "chora",
   # "screenshot_14": "chora",
   "screenshot_15": "chora",
   # "screenshot_23": "tallil",
   "screenshot_21": "gorodok",
   "screenshot_20": "gorodok",
   "screenshot_24": "tallil",
}


# Create the result_images directory if it doesn't exist
result_images_dir = Path("tests\\result_images")

if result_images_dir.exists():
    shutil.rmtree(result_images_dir)
    
result_images_dir.mkdir(exist_ok=True)

for screenshot_name, map_name in map_locations.items():

    img2 = cv2.imread(os.path.join(screenshots_base_path, screenshot_name) + ".png")
    for map_type in ["basemap"]: #"terrainmap", "topomap"
        img2_path = Path(maps_base_path) / map_name / map_type / "0.webp"
        print(img2_path)
        print(os.path.join(screenshots_base_path, screenshot_name))
        if img2_path.exists():
            img1 = cv2.imread(str(img2_path))

            clean_minimap = img1
            zoomed_in_image = img2
            
            start_time = time.time()

            # Parameters
            downscale_factor = 0.4  # Adjust as needed, ensuring it balances performance with accuracy

            # Downscale clean_minimap for faster processing
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
            else:
                print("Not enough matches are found - {}/{}".format(len(good_matches), 10))

            end_time = time.time()
            execution_time = end_time - start_time
            print(f"Execution time: {execution_time} seconds")

            clean_minimap = cv2.cvtColor(clean_minimap, cv2.COLOR_BGR2RGB)
            im_pil = Image.fromarray(clean_minimap)
            im_pil.show()