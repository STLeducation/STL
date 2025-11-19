from DataCollection import data_collection
import pickle
from keras.models import load_model
from ModelDevelopment import open_data, unpack_data,pad_data
import numpy as np

data_collection(data_dir=r'.\test',testing=True)

modelo_carregado = load_model('ModelY2.0.keras')

with open(r"Encoder.p",'rb') as f:
    encoder = pickle.load(f)

data_file_path = r'.\test\teste\0.p'
data = open_data(data_file_path)
local_movement, global_movement= unpack_data(data,True)

local_movement_padded, global_movement_padded = pad_data(local_movement, global_movement)

local_movement_padded = local_movement_padded.reshape(-1,60,63) 

result = modelo_carregado.predict([local_movement_padded,global_movement_padded])

result = np.argmax(result)

predicted_word = encoder.inverse_transform([result])

print(predicted_word)