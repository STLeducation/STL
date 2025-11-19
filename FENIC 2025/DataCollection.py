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

class NormalizedLandmarkResult:
    def __init__(self, normalized_landmarks_right, normalized_landmarks_left, wrist_right, wrist_left):
        self.normalized_landmarks_right = normalized_landmarks_right
        self.normalized_landmarks_left = normalized_landmarks_left
        self.wrist_right = wrist_right
        self.wrist_left = wrist_left

    def __repr__(self):
        return f"""
        (
            normalized_landmarks_right = {self.normalized_landmarks_right!r}
            normalized_landmarks_left = {self.normalized_landmarks_left!r}
            wrist_right = {self.wrist_right!r}
            wrist_left = {self.wrist_left!r}
        )
        """

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
        num_hands=2
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
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image)

    results = hand_detector.detect(mp_image)

    os.remove(image_path)

    return results

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
    
    handedness = results.handedness
    brute_landmarks = results.hand_landmarks

    if brute_landmarks:
        coords_right = [(0.0,0.0,0.0)]*21
        coords_left = [(0.0,0.0,0.0)]*21

        for index in range(len(brute_landmarks)):
            result = brute_landmarks[index]
            if handedness[index][0].category_name == 'Right':
                for landmark_index in range(len(result)):
                    landmark=result[landmark_index]
                    coords_right[landmark_index] = (landmark.x,landmark.y,landmark.z)
            else:
                for landmark_index in range(len(result)):
                    landmark=result[landmark_index]
                    coords_left[landmark_index] = (landmark.x,landmark.y,landmark.z)

        return coords_right, coords_left
    else:
        return None, None

def normalize_video_landmarks(landmarks):
    """
    takes brute landmark points and normalizes based dx between 2 consecutive frames

    Args:
        all_frame_coords(list): list of all list of landmarks in processed image

    Output:
        normalized_coords(list): list of all list of normalized landmarks in processed image
    """
    _x = []
    _y = []
    _z = []

    for coord in landmarks:
        _x.append(coord[0])
        _y.append(coord[1])
        _z.append(coord[2])
    
    wrist_abs = landmarks[0]
    wrist_x, wrist_y, wrist_z = wrist_abs
    
    x_distance_normalizer = abs(max(_x) - min(_x))
    y_distance_normalizer = abs(max(_y) - min(_y))
    z_distance_normalizer = abs(max(_z) - min(_z))

    normalized_landmarks = []
    for x, y, z in landmarks:
        norm_x = (x - wrist_x)/x_distance_normalizer
        norm_y = (y - wrist_y)/y_distance_normalizer
        norm_z = (z - wrist_z)/z_distance_normalizer
        normalized_landmarks.append((norm_x, norm_y, norm_z))
        
    return normalized_landmarks, wrist_abs

def normalize_wrist_coords(wrist_coord_list):
    wrist_x = []
    wrist_y = []
    wrist_z = []

    for wrist_coord in wrist_coord_list:
        if wrist_coord[0] is not None:
            wrist_x.append(wrist_coord[0])
        else:
            wrist_x.append(None)
        
        if wrist_coord[1] is not None:
            wrist_y.append(wrist_coord[1])
        else:
            wrist_y.append(None)

        if wrist_coord[2] is not None:
            wrist_z.append(wrist_coord[2])
        else:
            wrist_z.append(None)

    wrist_reference_x = wrist_x[0]
    wrist_reference_y = wrist_y[0]
    wrist_reference_z = wrist_z[0]

    x_distance_normalizer = abs(max(wrist_x) - min(wrist_x))
    y_distance_normalizer = abs(max(wrist_y) - min(wrist_y))
    z_distance_normalizer = abs(max(wrist_z) - min(wrist_z))

    normalized_wrist_coords = []

    for wrist_coord in wrist_coord_list:
        brute_x = wrist_coord[0]
        brute_y = wrist_coord[1]
        brute_z = wrist_coord[2]
        
        norm_x = (brute_x - wrist_reference_x)/x_distance_normalizer
        norm_y = (brute_y - wrist_reference_y)/y_distance_normalizer
        norm_z = (brute_z - wrist_reference_z)/z_distance_normalizer

        normalized_wrist = (norm_x,norm_y,norm_z)

        normalized_wrist_coords.append(normalized_wrist)
    
    return normalized_wrist_coords

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
    
    Normalized_hand_landmark_right = []
    Normalized_hand_landmark_left = []
    all_wrist_abs_right = []
    all_wrist_abs_left = []
    for image in images:
        coords_right, coords_left = get_landmarks_of_frame(sign_dir, image, hand_detector)
        if (coords_right is not None) or (coords_right[0] != (0.0,0.0,0.0)):
            normalized_coords, wrist_abs = normalize_video_landmarks(coords_right)
        
            Normalized_hand_landmark_right.append(normalized_coords)
            all_wrist_abs_right.append(wrist_abs)
        else:
            Normalized_hand_landmark_right.append([(0.0,0.0,0.0)]*21)
            all_wrist_abs_right.append(None)


        if (coords_left is not None) or (coords_left[0] != (0.0,0.0,0.0)):
            normalized_coords, wrist_abs = normalize_video_landmarks(coords_left)
        
            Normalized_hand_landmark_left.append(normalized_coords)
            all_wrist_abs_left.append(wrist_abs)
        else:
            Normalized_hand_landmark_left.append([(0.0,0.0,0.0)]*21)
            all_wrist_abs_left.append(None)

    if all_wrist_abs_right:
        norm_wrist_coords_right = normalize_wrist_coords(all_wrist_abs_right)
    else:
        norm_wrist_coords_right = None
    
    if all_wrist_abs_left:
        norm_wrist_coords_left = normalize_wrist_coords(all_wrist_abs_left)
    else:
        norm_wrist_coords_left = None

    normalized_hand = NormalizedLandmarkResult(
                            normalized_landmarks_right= Normalized_hand_landmark_right,
                            normalized_landmarks_left= Normalized_hand_landmark_left,
                            wrist_right= norm_wrist_coords_right,
                            wrist_left= norm_wrist_coords_left
                            )
    
    return normalized_hand

def data_collection(cam_id = 0, hand_model_path = r'.\hand_landmarker.task', data_dir = r'.\data', testing = False):
    if testing:
        sign_to_collect = "teste"
        dataset_size = 1
    else:
        sign_to_collect = input("Qual palavra será coletada? ")
        dataset_size = int(input("Quantos videos serão gravados? "))
    window_name = "Capturing Data"

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

            cap_device.release()

    cv2.destroyAllWindows()