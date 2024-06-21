import cv2
import os
import pygetwindow as gw
import time
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))
from scripts.image_layering import capture_screenshot

windows = gw.getWindowsWithTitle("SquadGame")
window = windows[0]
try:
    window.activate()
except Exception as e:
    window.minimize()
    window.maximize()
time.sleep(1)

img1 = capture_screenshot()

# Define the base directory and initial file name
base_dir = "tests/tests_images"
file_name = "screenshot_"
extension = ".png"
numeration = 1

# Construct the full path for the file
full_path = os.path.join(base_dir, f"{file_name}{numeration}{extension}")

# Check if the file exists and find the next available numeration
while os.path.exists(full_path):
    numeration += 1
    full_path = os.path.join(base_dir, f"{file_name}{numeration}{extension}")

# Save the screenshot with the new file name
cv2.imwrite(full_path, img1)
