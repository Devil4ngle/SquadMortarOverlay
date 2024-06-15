import os
import time

def delete_file_with_retry(file_path, max_retries=3, wait_seconds=1):
    """Attempt to delete a file, retrying on PermissionError and OSError."""
    for attempt in range(max_retries):
        try:
            os.remove(file_path)
            print(f"Successfully deleted {file_path}")
            return True
        except (PermissionError, OSError) as e:
            print(f"Attempt {attempt + 1} - Could not delete {file_path}: {e}")
            time.sleep(wait_seconds)
    print(f"Failed to delete {file_path} after {max_retries} attempts.")
    return False

def delete_files_except_zero_webp(folder_path):
    """Delete all files in the specified directory and its subdirectories except '0.webp'."""
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file != '0.webp':
                file_path = os.path.join(root, file)
                delete_file_with_retry(file_path)

# Path to the 'maps' directory
maps_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'maps'))

# Iterate over each subdirectory in the 'maps' directory
for map_name in os.listdir(maps_dir):
    for terrain_type in ['basemap', 'terrainmap', 'topomap']:
        folder_path = os.path.join(maps_dir, map_name, terrain_type)
        if os.path.exists(folder_path):
            delete_files_except_zero_webp(folder_path)
            print(f'Non-0.webp files deleted in {folder_path}')