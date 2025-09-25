import cv2
import os
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import pickle

class CameraIdNotValidError(Exception):
    pass

class CameraNotLoadedError(Exception):
    pass

def load_hand_model(hand_model_path):
    """
    loads mediapipe landmark detection task

    Args:
        hand_model_path(str): path to the model

    Output:
        hand_detector object to get hand landmarks
    """
    base_options = python.BaseOptions(model_asset_path=hand_model_path)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1
    )

    hand_detector = vision.HandLandmarker.create_from_options(options)
    return hand_detector

def load_cam(cam_id):
    """
    loads camera

    Args:
        cam_id(int): id of the desired connected camera

    Output:
        capture_device(VideoCapture)
    Raises:
        CameraIdNotValidError when cam_id isn't a int
    """
    try:
        capture_device = cv2.VideoCapture(int(cam_id))
        return capture_device
    except:
        raise CameraIdNotValidError

def load_video_recorder(video_path):
    """
    iniciate video recorder

    Args:
        video_path (str): path to save video
    
    Output:
        out variable with video configuration
    """
    fourcc = cv2.VideoWriter.fourcc(*"XVID")
    out = cv2.VideoWriter(video_path, fourcc, 20.0, (640, 480))
    return out

def ensure_data_directories(data_dir_path, sign_to_colect):
    """
    Makes sure the data directories are created, if not creates them

    Args:
        data_dir_path (str): path to parent data folder
        sign_to_colect (str): name of the sign to colect

    Output:
        sign_dir_path(str) path to the sign to colect
    """
    if not os.path.isdir(data_dir_path):
        os.mkdir(data_dir_path)
    
    sign_dir_path = os.path.join(data_dir_path,sign_to_colect)
    if not os.path.isdir(sign_dir_path):
        os.mkdir(sign_dir_path)

    return sign_dir_path

def read_camera(capture_device, already_processed = False):
    """
    reads cameras and flips it

    Args:
        capture_device(VideoCapture): instance of camera
        already_processed(bool): has already been flip
    
    Output:
        image of camera

    Raises:
        CameraNotLoadedError if camera doesn't display images
    """
    is_working,frame = capture_device.read()
    if is_working:
        if not already_processed:
            frame = cv2.flip(frame, 1)
        return frame
    else:
        raise CameraNotLoadedError

def save_images(cap_device,sign_dir):
    """
    saves images from pre saved video capture device to enumerated png's

    Args:
        capture_device(VideoCapture): instance of video
        sign_dir(str): path to the sign to colect
    """
    for i in range(int(cap_device.get(cv2.CAP_PROP_FRAME_COUNT))):
        image = read_camera(cap_device, True)
        cv2.imwrite(os.path.join(sign_dir,f"{i}.jpg"),image)

def record_video(capture_device,video_path,window_name):
    """
    records and saves video

    Args:
        capture_device(VideoCapture): instance of camera
        video_path (str): path to save video
        window_name(str): name of the displayed window
    """
    out = load_video_recorder(video_path)
    while True:
        frame = read_camera(capture_device)

        out.write(frame)

        cv2.imshow(window_name,frame)
        if cv2.waitKey(1) & 0xFF == ord('s'):
            out.release()
            break

def extract_brute_landmarks(hand_detector, image_path):
    """
    extracts brute landmark from single image

    Args:
        hand_detector(mp): object to get hand landmarks
        image_path(str): path of video to be processed

    Output:
        results.hand_landmarks(list): list of landmark
    """
    image = cv2.imread(image_path)
    image = cv2.flip(image,1)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)

    results = hand_detector.detect(mp_image)

    return results.hand_landmarks

def get_landmarks_of_frame(sign_dir,image,hand_detector):
    """
    extracts brute landmark from single image and formats it

    Args:
        sign_dir(str): path to the sign to colect
        hand_detector(mp): object to get hand landmarks
        image(str): name of the file to be processed

    Output:
        coords(list): returns list of tuples (x,y,z) for each landmark
    """
    results = extract_brute_landmarks(hand_detector,os.path.join(sign_dir,image))

    x=[]
    y=[]
    z=[]

    for result in results:
        for landmark in result:
            x.append(landmark.x)
            y.append(landmark.y)
            z.append(landmark.z)
        
    coords = []

    for point in range(len(x)):
        coords.append((x[point],y[point],z[point]))

    return coords

def normalize_video_landmarks(landmarks):
    """
    takes brute landmark points and normalizes based dx between 2 consecutive frames

    Args:
        all_frame_coords(list): list of all list of landmarks in processed image

    Output:
        normalized_coords(list): list of all list of normalized landmarks in processed image
    """
    if not landmarks or landmarks[0][0] is None:
        return [(None, None, None)] * 21, (None, None, None)
    
    wrist_abs = landmarks[0]
    wrist_x, wrist_y, wrist_z = wrist_abs
    
    normalized_landmarks = []
    for x, y, z in landmarks:
        norm_x = x - wrist_x
        norm_y = y - wrist_y
        norm_z = z - wrist_z
        normalized_landmarks.append((norm_x, norm_y, norm_z))
        
    return normalized_landmarks, wrist_abs

#TO-DO normalize wrist coords

def get_landmarks_per_video(sign_dir,hand_detector):
    """
    extracts normalized landmarks in processed video

    Args:
        sign_dir(str): path to the sign to colect
        hand_detector(mp): object to get hand landmarks

    Output:
        normalized_coords(list): list of all list of normalized landmarks in processed image
    """
    images = sorted([img for img in os.listdir(sign_dir) if img.endswith('.jpg')], 
                    key=lambda x: int(os.path.splitext(x)[0]))
    
    all_combined_coords = []
    for image in images:
        frame_coords = get_landmarks_of_frame(sign_dir, image, hand_detector)
        normalized_coords, wrist_abs = normalize_video_landmarks(frame_coords)
        
        combined_vector = [val for sublist in normalized_coords for val in sublist]
        if wrist_abs[0] is not None:
            combined_vector.extend(wrist_abs)
        else:
            combined_vector.extend([None, None, None])
            
        all_combined_coords.append(combined_vector)
        os.remove(os.path.join(sign_dir, image))
        
    return all_combined_coords

cam_id = 0
dataset_size = 10
hand_model_path = r'.\hand_landmarker.task'
window_name = "Capturing Data"
data_dir = r'.\data'
sign_to_collect = input()

hand_detector = load_hand_model(hand_model_path)

sign_dir = ensure_data_directories(data_dir,sign_to_collect)

cap_device = load_cam(cam_id)

cv2.namedWindow(window_name)

while cap_device.isOpened():
    frame = read_camera(cap_device)
    cv2.imshow(window_name, frame)
    key_press = cv2.waitKey(1)
    if key_press & 0xFF == ord('r'):
        for i in range(dataset_size):
            video_path = os.path.join(sign_dir,f"{i}.avi")
            
            record_video(cap_device,video_path,window_name)
            
            video_player = cv2.VideoCapture(video_path)
            save_images(video_player,sign_dir)
            video_player.release()
            
            os.remove(video_path)
            
            normalized_landmarks = get_landmarks_per_video(sign_dir,hand_detector)
            
            data_file_path = os.path.join(sign_dir,f"{i}.p")
            
            with open(data_file_path, 'wb') as data_file:
                pickle.dump(normalized_landmarks, data_file)
                
            key_press = cv2.waitKey(1)
            if key_press & 0xFF == ord('r'):
                pass
    
        print("Done")

    if key_press == 27:
        cap_device.release()

cv2.destroyAllWindows()
