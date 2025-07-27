import os
from pygrabber.dshow_graph import FilterGraph

def find_video(user_query = str):
    """
    Checks if search has a corresponding file to be displayed

    Args:
        user_query (str): search input
    
    Returns:
        word path if it has a result, None if no result is found
    """
    user_query = user_query.lower()
    word_path = os.path.join(".\palavras",f"{user_query}.mp4")
    if os.path.exists(word_path):
        return word_path
    else:
        return None

def get_available_cameras() :
    """
    Gets all cameras in device

    Returns:
        Dictionary of camera name and coresponding index
    """
    devices = FilterGraph().get_input_devices()

    available_cameras = {}

    for device_index, device_name in enumerate(devices):
        available_cameras[device_name] = device_index

    return available_cameras
