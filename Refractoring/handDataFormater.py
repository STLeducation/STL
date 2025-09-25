import pickle
import os

data_dir = r'.\data'
all_dataset = []

for label in os.listdir(data_dir):
    label_dir_path = os.path.join(data_dir,label)
    all_videos_data = []
    
    for video in os.listdir(label_dir_path):
        video_path = os.path.join(label_dir_path,video)
        
        if video.endswith('.p'):
            with open(video_path, 'rb') as video_file:
                video_data = pickle.load(video_file)
                all_videos_data.append(video_data)
         
    label_output_data = {'data': all_videos_data, 'label': label}
    all_dataset.append(label_output_data)

output_file_path = os.path.join(data_dir, 'combined_data.p')
with open(output_file_path, 'wb') as output_file:
    pickle.dump(all_dataset, output_file)