import pickle

import numpy as np

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from keras.preprocessing.sequence import pad_sequences
from keras.utils import to_categorical
from keras.layers import Input, Conv1D, LSTM, Concatenate, Dense, Dropout
from keras.models import Model
from keras.metrics import Precision, Recall
from keras.callbacks import EarlyStopping

def open_data(data_file_path = r"all_data.p"):
    with open(data_file_path,'rb') as f:
        all_data = pickle.load(f)
    return all_data

def unpack_data(data, testing = False):
    if not testing:
        labels = data.video_label
        dynamic_landmarks = data.video_landmark

        local_movement_right = []
        local_movement_left = []
        global_movement_right = []
        global_movement_left = []
        for landmark in dynamic_landmarks:
            local_movement_right.append(landmark.normalized_landmarks_right)
            local_movement_left.append(landmark.normalized_landmarks_left)
            global_movement_right.append(landmark.wrist_right)
            global_movement_left.append(landmark.wrist_left)
        
        return labels, local_movement_right, local_movement_left, global_movement_right, global_movement_left
    else:
        local_movement_right = []
        local_movement_left = []
        global_movement_right = []
        global_movement_left = []

        local_movement_right.append(data.normalized_landmarks_right)
        local_movement_left.append(data.normalized_landmarks_left)
        global_movement_right.append(data.wrist_right)
        global_movement_left.append(data.wrist_left)

        return local_movement_right, local_movement_left, global_movement_right, global_movement_left

def pad_data(local_movement_right, local_movement_left, global_movement_right, global_movement_left):
    local_movement_right_padded = pad_sequences(local_movement_right,dtype='float32',padding='post',maxlen=60,truncating='post')
    local_movement_left_padded = pad_sequences(local_movement_left,dtype='float32',padding='post',maxlen=60,truncating='post')
    global_movement_right_padded = pad_sequences(global_movement_right,dtype='float32',padding='post',maxlen=60,truncating='post')
    global_movement_left_padded = pad_sequences(global_movement_left,dtype='float32',padding='post',maxlen=60,truncating='post')

    return local_movement_right_padded, local_movement_left_padded, global_movement_right_padded, global_movement_left_padded

def encode_labels(labels_array):
    encoder = LabelEncoder()

    labels_encoded = encoder.fit_transform(labels_array)

    with open(r"Encoder.p",'wb') as f:
        pickle.dump(encoder,f)

    one_hot_labels = to_categorical(labels_encoded)

    return one_hot_labels

def load_data_in_format(data_file_path = r"all_data.p"):
    data = open_data(data_file_path)
    labels, local_movement_right, local_movement_left, global_movement_right, global_movement_left= unpack_data(data)
    
    local_movement_right_padded, local_movement_left_padded, global_movement_right_padded, global_movement_left_padded = pad_data(local_movement_right, local_movement_left, global_movement_right, global_movement_left)

    labels_one_hot = encode_labels(labels)

    local_right_train, local_right_test, local_left_train, local_left_test, global_right_train, global_right_test,global_left_train, global_left_test, labels_train, labels_test = train_test_split(local_movement_right_padded, local_movement_left_padded, global_movement_right_padded, global_movement_left_padded,labels_one_hot,test_size=0.2)

    local_right_train = local_right_train.reshape(-1,60,63) 
    local_right_test = local_right_test.reshape(-1,60,63) 
    local_left_train =local_left_train.reshape(-1,60,63) 
    local_left_test = local_left_test.reshape(-1,60,63) 

    return local_right_train, local_right_test, local_left_train, local_left_test, global_right_train, global_right_test,global_left_train, global_left_test, labels_train, labels_test

def build_model():
    input_local_right = Input(shape=(60,63))
    conv_local_right_output = Conv1D(64,3,activation='relu',)(input_local_right)
    lstm_local_right_output = LSTM(128)(conv_local_right_output)

    input_global_right = Input(shape=(60,3))
    lstm_global_right_output = LSTM(128)(input_global_right)

    input_local_left = Input(shape=(60,63))
    conv_local_left_output = Conv1D(64,3,activation='relu',)(input_local_left)
    lstm_local_left_output = LSTM(128)(conv_local_left_output)

    input_global_left = Input(shape=(60,3))
    lstm_global_left_output = LSTM(128)(input_global_left)

    total_output = Concatenate()([lstm_local_right_output,lstm_local_left_output,lstm_global_right_output,lstm_global_left_output])

    dense1_output = Dense(64,activation='relu')(total_output)
    drop_output = Dropout(0.5)(dense1_output)
    final_output = Dense(3,activation='softmax')(drop_output)

    model = Model((input_local_right,input_local_left,input_global_right,input_global_left),final_output)

    return model

def train_model():
    local_right_train, local_right_test, local_left_train, local_left_test, global_right_train, global_right_test,global_left_train, global_left_test, labels_train, labels_test = load_data_in_format()

    model = build_model()

    precision = Precision()
    recall = Recall()

    early_stopping = EarlyStopping(monitor='val_loss', patience=5)

    model.compile(optimizer='adam',loss='categorical_crossentropy',metrics=['accuracy',precision,recall])

    model.fit([local_right_train, local_left_train,global_right_train,global_left_train], labels_train,epochs=40,callbacks=[early_stopping],validation_data=[[local_right_test, local_left_test,global_right_test,global_left_test], labels_test])

    test_result = model.evaluate([local_right_test, local_left_test,global_right_test,global_left_test], labels_test)

    print(f"Acurácia final no conjunto de teste: {test_result[1]*100:.2f}%")

    predictions = model.predict([local_right_test, local_left_test,global_right_test,global_left_test])

    predicted_labels = np.argmax(predictions,axis=1)

    true_labels = np.argmax(labels_test,axis=1)

    dictionary = ["cima","dia","nome"]

    print(classification_report(true_labels,predicted_labels,target_names=dictionary))

    model.save('ModelY2.0.keras')