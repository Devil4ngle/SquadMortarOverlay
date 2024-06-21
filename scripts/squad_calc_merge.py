import os
from PIL import Image

def merge_images(folder_path):
    # Initialize a list to store the paths of the parts of the image
    parts = []

    # Walk through the directory to find all the parts that start with '4_'
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.startswith('4_') and file.endswith('.webp'):
                parts.append(os.path.join(root, file))

    # Sort the parts to ensure they are in the correct order
    parts.sort(key=lambda x: (int(x.split('_')[1]), int(x.split('_')[2].split('.')[0])))

    # Assuming each part of the image is of the same size
    # Load the first image to get the width and height
    sample_image = Image.open(parts[0])
    width, height = sample_image.size

    # Calculate the total width and height of the final image
    total_width = width * 16  # 16 images in a row
    total_height = height * 16  # 16 images in a column
    
    # Create a new blank image with the calculated total width and height
    merged_image = Image.new('RGB', (total_width, total_height))
    # Open the original image
    image = Image.open(parts[0])
    icc_profile = image.info["icc_profile"]
    image.close()
    # Paste each part of the image into the correct position
    for part in parts:
        with Image.open(part).convert('RGB') as image:            
            x_index = int(part.split('_')[1])
            y_index = int(part.split('_')[2].split('.')[0])
            merged_image.paste(image, (x_index * width, y_index * height))
            
    # Save the merged image in the same folder with the name '0.webp'
    merged_image = merged_image.resize((4096, 4096))
    merged_image.save(os.path.join(folder_path, '0.webp'), icc_profile=icc_profile)

# Path to the 'maps' directory
maps_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'public', 'maps'))


# Iterate over each subdirectory in the 'maps' directory
for map_name in os.listdir(maps_dir):
    for terrain_type in ['basemap', 'terrainmap', 'topomap']:
        folder_path = os.path.join(maps_dir, map_name, terrain_type)
        if os.path.exists(folder_path):
            merge_images(folder_path)
            
            print(f'Merged image saved in {folder_path}')