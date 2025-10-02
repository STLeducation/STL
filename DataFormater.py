import os
import pickle

class AiFood:
    def __init__(self,video_landmark,video_label):
        self.video_landmark = video_landmark
        self.video_label = video_label

    def __repr__(self):
        return f"""
        (
            video_landmark = {self.video_landmark!r}
            video_label = {self.video_label!r}
        )
        """

class NormalizedLandmarkResult:
    def __init__(self, normalized_landmarks, wrist):
        self.normalized_landmarks = normalized_landmarks
        self.wrist = wrist

    def __repr__(self):
        return f"""
        (
            Normalized_Landmarks = {self.normalized_landmarks!r}
            wrist = {self.wrist!r}
        )
        """

def data_format():
    data_dir = r".\data"

    normalized_landmarks = []
    labels = []

    for label in os.listdir(data_dir):
        for file in os.listdir(os.path.join(data_dir,label)):
            if file.endswith(".p"):
                with open(os.path.join(data_dir,label,file),'rb') as f:
                    normalized_landmark_result = pickle.load(f)

                    normalized_landmarks.append(normalized_landmark_result)
                    labels.append(label)

    all_data = AiFood(normalized_landmarks,labels)

    data_file_path = os.path.join("all_data.p")
                    
    with open(data_file_path, 'wb') as data_file:
        pickle.dump(all_data, data_file)