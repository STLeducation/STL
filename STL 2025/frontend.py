import tkinter as tk
import customtkinter as ctk
from PIL import ImageTk
import cv2
from hand_tracker import HandTracker

cap = cv2.VideoCapture(0)
hand_tracker = HandTracker()
image_path = "alfabeto.png"

def close_program(event):
    root.destroy()

def updater():
    img = hand_tracker.track_hand(cap)
    imgtk = ImageTk.PhotoImage(image=img)
    video_label.imgtk = imgtk
    video_label.configure(image=imgtk)
    video_label.after(10, updater)

root = ctk.CTk()
root.title("Hand Tracking with MediaPipe")
root.geometry('960x540')

canvas = tk.Canvas(root, width=960, height=540, bg='#F2F1E7', highlightthickness=0)
canvas.grid(row=0, column=0, rowspan=20, columnspan=20, sticky='nsew')

video_label = tk.Label(root)
video_label.grid(row=1, column=2, padx=10, pady=10)

image = tk.PhotoImage(file=image_path)
image_label = ctk.CTkLabel(root, image=image)
image_label.grid(row=1, column=1, padx=10, pady=10)

root.grid_rowconfigure(0, weight=1)
root.grid_rowconfigure(1, weight=1)
root.grid_rowconfigure(2, weight=1)
root.grid_columnconfigure(0, weight=1)
root.grid_columnconfigure(1, weight=1)
root.grid_columnconfigure(2, weight=1)

root.bind("<Escape>", close_program)

updater()

root.mainloop()

cap.release()
cv2.destroyAllWindows()