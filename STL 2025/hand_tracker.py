import cv2
import mediapipe as mp
import numpy as np
from PIL import Image
import pickle
import logging

logging.basicConfig(level=logging.INFO)

def load_model(model_path="./modelY.p"):
    """
    Loads a trained model from a pickle file.

    Args:
        model_path (str): Path to the model
    """
    try:
        with open(model_path, "rb") as f:
            model_data = pickle.load(f)
        return model_data["model"]
    except FileNotFoundError:
        raise RuntimeError(f"Model file not found at {model_path}")
    except KeyError:
        raise RuntimeError("Model file is corrupted or missing 'model' key")

class HandTracker:
    """
    A class for detecting hand landmarks using MediaPipe, predicting hand configuration,
    and drawing visual feedback on camera frames.
    """

    LABELS = [
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'I',
        'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
        'T', 'U', 'V', 'W', 'X', 'Y'
    ]

    def __init__(self):
        self.model = load_model()
        self.drawing_utils = mp.solutions.drawing_utils
        self.drawing_styles = mp.solutions.drawing_styles
        self.hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            min_detection_confidence=0.3,
            max_num_hands=1
        )

    def process_frame(self, frame):
        """
        Flips and converts frame to RGB for MediaPipe to processes.

        Args:
            self (HandTracker): HandTracker instance
            frame (PCA): Frame to be processed

        Returns:
            Processed frame and result of hand search
        """
        frame = cv2.flip(frame, 1)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.hands.process(frame_rgb)
        return frame_rgb, results

    def extract_landmark_data(self, landmarks):
        """
        Extracts and normalizes hand landmark coordinates.

        Args:
            self (HandTracker): HandTracker instance
            landmarks (): 
        """
        x_coords = [lm.x for lm in landmarks]
        y_coords = [lm.y for lm in landmarks]

        min_x, min_y = min(x_coords), min(y_coords)

        #Normalizing points to avoid outstanding results
        data = [(x - min_x, y - min_y) for x, y in zip(x_coords, y_coords)]
        flat_data = [coord for pair in data for coord in pair]

        return flat_data, (x_coords, y_coords)

    def predict_letter(self, landmark_data):
        """
        Predicts the sign language letter using the pre-trained model.
        """
        try:
            prediction = self.model.predict([np.asarray(landmark_data)])
            label_index = int(prediction[0])
            return self.LABELS[label_index]
        except Exception as e:
            logging.error(f"Prediction failed: {e}")
            return "?"

    def draw_hand_info(self, frame_rgb, hand_landmarks, letter, coords_lists):
        """
        Draws the hand landmarks and predicted label on the image.
        """
        x_coords, y_coords = coords_lists

        H, W, _ = frame_rgb.shape
        x1 = max(int(min(x_coords) * W) - 10, 0)
        y1 = max(int(min(y_coords) * H) - 10, 0)
        x2 = min(int(max(x_coords) * W) + 10, W)
        y2 = min(int(max(y_coords) * H) + 10, H)

        self.drawing_utils.draw_landmarks(
            frame_rgb, hand_landmarks,
            mp.solutions.hands.HAND_CONNECTIONS,
            self.drawing_styles.get_default_hand_landmarks_style(),
            self.drawing_styles.get_default_hand_connections_style()
        )

        cv2.rectangle(frame_rgb, (x1, y1), (x2, y2), (0, 0, 0), 4)
        cv2.putText(
            frame_rgb, letter, (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX, 1.3, (0, 0, 0), 3
        )

    def track_hand(self, cap):
        """
        Captures video frame, processes hand landmarks, predicts the letter,
        and updates the GUI with the new image.
        """
        ret, frame = cap.read()
        if not ret:
            logging.warning("Failed to capture frame from camera.")
            return

        frame_rgb, results = self.process_frame(frame)

        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                data, coords_lists = self.extract_landmark_data(hand_landmarks.landmark)
                letter = self.predict_letter(data)
                self.draw_hand_info(frame_rgb, hand_landmarks, letter, coords_lists)

        img = Image.fromarray(frame_rgb)

        return img