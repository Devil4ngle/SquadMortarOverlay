import cv2
import os
from pathlib import Path
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent.parent))
# Define the base path for the maps and screenshots
maps_base_path = "frontend/public/maps"
screenshots_base_path = "tests\\tests_images"

map_locations = {
    "screenshot_1": "albasrah",
    "screenshot_2": "albasrah",
    "screenshot_3": "albasrah",
    "screenshot_4": "goosebay",
    "screenshot_5": "goosebay",
    "screenshot_6": "goosebay",
    "screenshot_7": "gorodok",
    "screenshot_8": "gorodok",
    "screenshot_9": "gorodok",
    "screenshot_10": "kokan",
    "screenshot_11": "kokan",
    "screenshot_12": "kokan",
    "screenshot_13": "chora",
    "screenshot_14": "chora",
    "screenshot_15": "chora",
}


# Create the result_images directory if it doesn't exist
result_images_dir = Path("tests\\result_images")
result_images_dir.mkdir(exist_ok=True)

for screenshot_name, map_name in map_locations.items():

    img1 = cv2.imread(os.path.join(screenshots_base_path, screenshot_name) + ".png")
    for map_type in ["basemap"]: #"terrainmap", "topomap"
        img2_path = Path(maps_base_path) / map_name / map_type / "0.webp"
        print(img2_path)
        print(os.path.join(screenshots_base_path, screenshot_name))
        if img2_path.exists():
            img2 = cv2.imread(str(img2_path))

            # Resize img1 to match img2's dimensions
            img1_resized = cv2.resize(
                img1, (img2.shape[1], img2.shape[0]), interpolation=cv2.INTER_LINEAR
            )

            alpha = 0.6 
            betha = 0.45
            gamma = 0
            img_out = cv2.addWeighted(img1_resized, alpha, img2, betha, gamma)
            output_file_path = result_images_dir / f"{map_name}_{map_type}_{screenshot_name.split('_')[-1]}_{alpha}_{betha}_{gamma}.png"
            cv2.imwrite(str(output_file_path), img_out)

            alpha = 0.9 
            betha = 0.2
            gamma = 0
            img_out = cv2.addWeighted(img1_resized, alpha, img2, betha, gamma)
            output_file_path = result_images_dir / f"{map_name}_{map_type}_{screenshot_name.split('_')[-1]}_{alpha}_{betha}_{gamma}.png"
            cv2.imwrite(str(output_file_path), img_out)

            print(f"Saved overlay image to {output_file_path}")
