from multiprocessing import Process
from pathlib import Path
from threading import Thread
import tkinter as tk
from PIL import Image, ImageTk
import math
import cv2
import numpy as np
import os
import tkinter as tk

maps_base_path = "frontend/public/maps"
screenshots_base_path = "tests/tests_images"

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

# Load images based on the defined paths and map locations
images = []  # This will hold the loaded images
for screenshot_name, map_name in map_locations.items():
    img1_path = os.path.join(screenshots_base_path, screenshot_name + ".png")
    img1 = cv2.imread(img1_path)
    if img1 is not None:
        for map_type in ["basemap"]:  # You can add "terrainmap", "topomap" as needed
            img2_path = Path(maps_base_path) / map_name / map_type / "0.webp"
            if img2_path.exists():
                img2 = cv2.imread(str(img2_path))
                if img2 is not None:
                    # Store the pair (or processed version) in the images list
                    images.append((img1, img2))


class Application(tk.Frame):
    def __init__(self, master=None, images=None):
        super().__init__(master)

        self.master.geometry("600x400")
        self.images = images
        self.pil_image = None
        self.my_title = "Python Image Viewer"
        self.current_image_index = 0
        self.alpha = tk.DoubleVar(value=0.85)
        self.beta = tk.DoubleVar(value=0.2)
        self.gamma = tk.DoubleVar(value=0.0)
        self.master.title(self.my_title)
        self.create_menu()
        self.create_widget()
        self.reset_transform()

    def create_menu(self):
        menu_bar = tk.Menu(self.master)
        self.master.config(menu=menu_bar)
        menu_bar.add_command(label="Previous", command=self.previous_image)
        menu_bar.add_command(label="Next", command=self.next_image)

    def next_image(self):
        self.current_image_index = (self.current_image_index + 1) % len(self.images)
        self.set_image(self.current_image_index)

    def previous_image(self):
        self.current_image_index = (self.current_image_index - 1) % len(self.images)
        self.set_image(self.current_image_index)

    def create_widget(self):

        frame_statusbar = tk.Frame(self.master, bd=1, relief=tk.SUNKEN)
        self.label_image_info = tk.Label(
            frame_statusbar, text="image info", anchor=tk.E, padx=5
        )
        self.label_image_info.pack(side=tk.RIGHT)
        frame_statusbar.pack(side=tk.BOTTOM, fill=tk.X)

        self.canvas = tk.Canvas(self.master, background="black")
        self.canvas.pack(expand=True, fill=tk.BOTH)

        self.master.bind("<Button-1>", self.mouse_down_left)
        self.master.bind("<B1-Motion>", self.mouse_move_left)
        self.master.bind("<Motion>", self.mouse_move)
        self.master.bind("<Double-Button-1>", self.mouse_double_click_left)
        self.master.bind("<MouseWheel>", self.mouse_wheel)
        
        # Slider for alpha
        self.alpha_slider = tk.Scale(self.master, from_=0, to_=1, resolution=0.01, orient=tk.HORIZONTAL, label="Alpha", variable=self.alpha, command=self.update_image)
        self.alpha_slider.pack(fill=tk.X, padx=5, pady=5)

        # Slider for beta
        self.beta_slider = tk.Scale(self.master, from_=0, to_=1, resolution=0.01, orient=tk.HORIZONTAL, label="Beta", variable=self.beta, command=self.update_image)
        self.beta_slider.pack(fill=tk.X, padx=5, pady=5)

        # Slider for gamma
        self.gamma_slider = tk.Scale(self.master, from_=-100, to_=100, resolution=1, orient=tk.HORIZONTAL, label="Gamma", variable=self.gamma, command=self.update_image)
        self.gamma_slider.pack(fill=tk.X, padx=5, pady=5)
        

    def update_image(self, event=None):
        # This method will be called whenever a slider's value changes.
        # It should re-blend and redraw the image using the current alpha, beta, and gamma values.
        if self.images and len(self.images) > self.current_image_index:
            self.set_image(self.current_image_index)
            
    def apply_values(self):
        alpha = float(self.alpha_entry.get())
        beta = float(self.beta_entry.get())
        gamma = float(self.gamma_entry.get())
        print(f"Alpha: {alpha}, Beta: {beta}, Gamma: {gamma}")
        
    def set_image(self, file_index):
        if not file_index or not self.images:
            return

        # Assuming file_index is an index in the self.images list
        img1, img2 = self.images[file_index]

        img1_resized = cv2.resize(
            img1, (img2.shape[1], img2.shape[0]), interpolation=cv2.INTER_CUBIC
        )

        # Use the alpha, beta, and gamma values from the sliders
        alpha = self.alpha.get()
        beta = self.beta.get()
        gamma = self.gamma.get()

        # Blend the images
        img_out = cv2.addWeighted(img1_resized, alpha, img2, beta, gamma)

        # Convert the OpenCV image (img_out) to a PIL image
        self.pil_image = Image.fromarray(cv2.cvtColor(img_out, cv2.COLOR_BGR2RGB))

        #self.zoom_fit(self.pil_image.width, self.pil_image.height)
        self.draw_image(self.pil_image)

        self.master.title(self.my_title + " - Image " + str(file_index + 1))
        self.label_image_info[
            "text"
        ] = f"Blended Image: {self.pil_image.width} x {self.pil_image.height}"

    def mouse_down_left(self, event):
        self.__old_event = event

    def mouse_move_left(self, event):
        if self.pil_image == None:
            return
        self.translate(event.x - self.__old_event.x, event.y - self.__old_event.y)
        self.redraw_image()
        self.__old_event = event

    def mouse_move(self, event):
        if self.pil_image == None:
            return

    def mouse_double_click_left(self, event):
        if self.pil_image == None:
            return
        self.zoom_fit(self.pil_image.width, self.pil_image.height)
        self.redraw_image()

    def mouse_wheel(self, event):
        if self.pil_image == None:
            return

        if event.state != 9:
            if event.delta < 0:

                self.scale_at(0.8, event.x, event.y)
            else:

                self.scale_at(1.25, event.x, event.y)
        else:
            if event.delta < 0:

                self.rotate_at(-5, event.x, event.y)
            else:

                self.rotate_at(5, event.x, event.y)
        self.redraw_image()

    def reset_transform(self):
        self.mat_affine = np.eye(3)

    def translate(self, offset_x, offset_y):
        mat = np.eye(3)
        mat[0, 2] = float(offset_x)
        mat[1, 2] = float(offset_y)

        self.mat_affine = np.dot(mat, self.mat_affine)

    def scale(self, scale: float):
        mat = np.eye(3)
        mat[0, 0] = scale
        mat[1, 1] = scale

        self.mat_affine = np.dot(mat, self.mat_affine)

    def scale_at(self, scale: float, cx: float, cy: float):

        self.translate(-cx, -cy)

        self.scale(scale)

        self.translate(cx, cy)

    def rotate(self, deg: float):
        mat = np.eye(3)
        mat[0, 0] = math.cos(math.pi * deg / 180)
        mat[1, 0] = math.sin(math.pi * deg / 180)
        mat[0, 1] = -mat[1, 0]
        mat[1, 1] = mat[0, 0]

        self.mat_affine = np.dot(mat, self.mat_affine)

    def rotate_at(self, deg: float, cx: float, cy: float):

        self.translate(-cx, -cy)

        self.rotate(deg)

        self.translate(cx, cy)

    def zoom_fit(self, image_width, image_height):

        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()

        if (image_width * image_height <= 0) or (canvas_width * canvas_height <= 0):
            return

        self.reset_transform()

        scale = 1.0
        offsetx = 0.0
        offsety = 0.0

        if (canvas_width * image_height) > (image_width * canvas_height):

            scale = canvas_height / image_height

            offsetx = (canvas_width - image_width * scale) / 2
        else:

            scale = canvas_width / image_width

            offsety = (canvas_height - image_height * scale) / 2

        self.scale(scale)

        self.translate(offsetx, offsety)

    def to_image_point(self, x, y):
        if self.pil_image == None:
            return []

        mat_inv = np.linalg.inv(self.mat_affine)
        image_point = np.dot(mat_inv, (x, y, 1.0))
        if (
            image_point[0] < 0
            or image_point[1] < 0
            or image_point[0] > self.pil_image.width
            or image_point[1] > self.pil_image.height
        ):
            return []

        return image_point

    def draw_image(self, pil_image):

        if pil_image == None:
            return

        self.pil_image = pil_image

        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()

        mat_inv = np.linalg.inv(self.mat_affine)

        affine_inv = (
            mat_inv[0, 0],
            mat_inv[0, 1],
            mat_inv[0, 2],
            mat_inv[1, 0],
            mat_inv[1, 1],
            mat_inv[1, 2],
        )

        dst = self.pil_image.transform(
            (canvas_width, canvas_height), Image.AFFINE, affine_inv, Image.NEAREST
        )

        im = ImageTk.PhotoImage(image=dst)

        item = self.canvas.create_image(0, 0, anchor="nw", image=im)

        self.image = im

    def redraw_image(self):
        if self.pil_image == None:
            return
        self.draw_image(self.pil_image)


def start_app(images):
    root = tk.Tk()
    app = Application(master=root, images=images)  # Assuming Application is your Tkinter app class
    app.mainloop()

if __name__ == "__main__":
    # Create processes for two instances
    process1 = Process(target=start_app, args=(images,))
    process2 = Process(target=start_app, args=(images,))

    # Start both processes
    process1.start()
    process2.start()

    # Wait for both processes to finish
    process1.join()
    process2.join()
