import os
import shutil

# Specify the folders and files you want to copy here (paths are relative to the script location)
FOLDERS_TO_COPY = []
FILES_TO_COPY = ["src/main.py","src/gui.py","src/server.py","src/config.py","src/image_layering.py","frontend/SquadCalc/src/js/smcConnector.js", "README.md"]

def copy_files(source_folder, destination_folder, folders_to_copy, files_to_copy):
    # Delete destination folder if it exists, then recreate it
    if os.path.exists(destination_folder):
        shutil.rmtree(destination_folder)
    os.makedirs(destination_folder)
    print(f"Created clean destination folder: {destination_folder}")

    for folder in folders_to_copy:
        src_folder_path = os.path.join(source_folder, folder)
        if os.path.exists(src_folder_path):
            for root, dirs, files in os.walk(src_folder_path):
                for file in files:
                    src_file_path = os.path.join(root, file)
                    dest_file_path = os.path.join(destination_folder, file)
                    counter = 1
                    while os.path.exists(dest_file_path):
                        file_name, file_extension = os.path.splitext(file)
                        dest_file_path = os.path.join(destination_folder, f"{file_name}_{counter}{file_extension}")
                        counter += 1
                    shutil.copy2(src_file_path, dest_file_path)
                    print(f"Copied file: {src_file_path} -> {dest_file_path}")
        else:
            print(f"Folder not found: {folder}")

    for file in files_to_copy:
        src_file_path = os.path.join(source_folder, file)
        if os.path.exists(src_file_path):
            dest_file_path = os.path.join(destination_folder, os.path.basename(file))
            counter = 1
            while os.path.exists(dest_file_path):
                file_name, file_extension = os.path.splitext(os.path.basename(file))
                dest_file_path = os.path.join(destination_folder, f"{file_name}_{counter}{file_extension}")
                counter += 1
            shutil.copy2(src_file_path, dest_file_path)
            print(f"Copied file: {src_file_path} -> {dest_file_path}")
        else:
            print(f"File not found: {file}")

def main():
    # Get the script directory and go up one level to the parent directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    source_folder = os.path.dirname(script_dir)  # Go up one level
    destination_folder = os.path.join(source_folder, "context-claude")

    if not os.path.exists(source_folder):
        print(f"Error: Source folder not found in {source_folder}")
        return

    copy_files(source_folder, destination_folder, FOLDERS_TO_COPY, FILES_TO_COPY)

if __name__ == "__main__":
    main()