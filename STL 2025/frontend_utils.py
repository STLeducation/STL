import os

def find_video(user_query = str):
    user_query = user_query.lower()
    word_path = os.path.join(".\palavras",f"{user_query}.mp4")
    if os.path.exists(word_path):
        return word_path
    else:
        return None
