from flask import Flask, render_template, Response, jsonify, request
import cv2
import numpy as np
import os
import pickle
from collections import deque
import threading
import time

# Tentar importar mediapipe
try:
    import mediapipe as mp
    from mediapipe.tasks import python
    from mediapipe.tasks.python import vision
    MEDIAPIPE_AVAILABLE = True
    print("✓ MediaPipe carregado com sucesso!")
except ImportError:
    MEDIAPIPE_AVAILABLE = False
    print("⚠ MediaPipe não disponível")

# Tentar importar tensorflow
try:
    from keras.models import load_model
    from keras.preprocessing.sequence import pad_sequences
    TENSORFLOW_AVAILABLE = True
    print("✓ TensorFlow carregado com sucesso!")
except ImportError:
    TENSORFLOW_AVAILABLE = False
    print("⚠ TensorFlow não disponível")

app = Flask(__name__)

# Configurações
MODEL_PATH = 'ModelY2.0.keras'
ENCODER_PATH = 'Encoder.p'
HAND_MODEL_PATH = 'hand_landmarker.task'

# Variáveis globais
camera = None
current_prediction = "Aguardando gravação..."
hand_detector = None
encoder = None
model = None
is_recording = False
recorded_frames = []
recording_thread = None

class NormalizedLandmarkResult:
    def __init__(self, normalized_landmarks_right, normalized_landmarks_left, wrist_right, wrist_left):
        self.normalized_landmarks_right = normalized_landmarks_right
        self.normalized_landmarks_left = normalized_landmarks_left
        self.wrist_right = wrist_right
        self.wrist_left = wrist_left

def load_hand_model(hand_model_path):
    """Carrega o modelo de detecção de mãos do MediaPipe"""
    base_options = python.BaseOptions(model_asset_path=hand_model_path)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2
    )
    return vision.HandLandmarker.create_from_options(options)

def normalize_video_landmarks(landmarks):
    """Normaliza os landmarks baseado na posição do pulso"""
    _x = [coord[0] for coord in landmarks]
    _y = [coord[1] for coord in landmarks]
    _z = [coord[2] for coord in landmarks]

    wrist_abs = landmarks[0]
    wrist_x, wrist_y, wrist_z = wrist_abs

    x_distance_normalizer = abs(max(_x) - min(_x)) if abs(max(_x) - min(_x)) > 0 else 1
    y_distance_normalizer = abs(max(_y) - min(_y)) if abs(max(_y) - min(_y)) > 0 else 1
    z_distance_normalizer = abs(max(_z) - min(_z)) if abs(max(_z) - min(_z)) > 0 else 1

    normalized_landmarks = []
    for x, y, z in landmarks:
        norm_x = (x - wrist_x) / x_distance_normalizer
        norm_y = (y - wrist_y) / y_distance_normalizer
        norm_z = (z - wrist_z) / z_distance_normalizer
        normalized_landmarks.append((norm_x, norm_y, norm_z))
        
    return normalized_landmarks, wrist_abs

def draw_landmarks_on_frame(frame, results):
    """Desenha os landmarks no frame"""
    if not MEDIAPIPE_AVAILABLE or not results.hand_landmarks:
        return frame
    
    # Desenhar manualmente os landmarks
    for hand_landmarks in results.hand_landmarks:
        # Desenhar pontos
        h, w, c = frame.shape
        for landmark in hand_landmarks:
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            cv2.circle(frame, (x, y), 5, (0, 255, 0), -1)
        
        # Desenhar conexões entre os pontos
        connections = [
            (0, 1), (1, 2), (2, 3), (3, 4),  # Polegar
            (0, 5), (5, 6), (6, 7), (7, 8),  # Indicador
            (0, 9), (9, 10), (10, 11), (11, 12),  # Médio
            (0, 13), (13, 14), (14, 15), (15, 16),  # Anelar
            (0, 17), (17, 18), (18, 19), (19, 20),  # Mínimo
            (5, 9), (9, 13), (13, 17)  # Palma
        ]
        
        for connection in connections:
            start_idx, end_idx = connection
            start_point = hand_landmarks[start_idx]
            end_point = hand_landmarks[end_idx]
            
            start_x = int(start_point.x * w)
            start_y = int(start_point.y * h)
            end_x = int(end_point.x * w)
            end_y = int(end_point.y * h)
            
            cv2.line(frame, (start_x, start_y), (end_x, end_y), (255, 0, 0), 2)
    
    return frame

def extract_landmarks_from_frame(frame):
    """Extrai landmarks de um frame - VERSÃO CORRIGIDA COM DEBUG"""
    if not MEDIAPIPE_AVAILABLE or hand_detector is None:
        print("❌ MediaPipe não disponível")
        return [(0.0, 0.0, 0.0)] * 21, [(0.0, 0.0, 0.0)] * 21, None, None
    
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    
    results = hand_detector.detect(mp_image)
    
    coords_right = [(0.0, 0.0, 0.0)] * 21
    coords_left = [(0.0, 0.0, 0.0)] * 21
    wrist_right = None
    wrist_left = None
    
    if results.hand_landmarks:
        handedness = results.handedness
        brute_landmarks = results.hand_landmarks
        
        print(f"   🔍 DEBUG: {len(brute_landmarks)} mão(s) detectada(s)")
        
        for index in range(len(brute_landmarks)):
            result = brute_landmarks[index]
            hand_type = handedness[index][0].category_name
            print(f"   🖐️ DEBUG: Mão {index} = {hand_type}")
            
            coords = []
            for landmark in result:
                coords.append((landmark.x, landmark.y, landmark.z))
            
            if hand_type == 'Right':
                coords_right = coords
                wrist_right = coords[0]  # Pulso é o primeiro landmark
                print(f"   ✅ DEBUG: Mão direita capturada - Pulso: {wrist_right}")
            else:
                coords_left = coords
                wrist_left = coords[0]  # Pulso é o primeiro landmark
                print(f"   ✅ DEBUG: Mão esquerda capturada - Pulso: {wrist_left}")
    
    # DEBUG: Verificar o que está sendo retornado
    right_detected = wrist_right is not None
    left_detected = wrist_left is not None
    print(f"   📊 DEBUG RETORNO: Direita: {right_detected}, Esquerda: {left_detected}")
    
    # Aplicar normalização apenas se mãos foram detectadas
    if right_detected:
        normalized_right, wrist_right = normalize_video_landmarks(coords_right)
    else:
        normalized_right = coords_right
    
    if left_detected:
        normalized_left, wrist_left = normalize_video_landmarks(coords_left)
    else:
        normalized_left = coords_left
    
    # 🔧 CORREÇÃO: Garantir que wrist_right e wrist_left não são None
    if wrist_right is None:
        wrist_right = (0.0, 0.0, 0.0)
    if wrist_left is None:
        wrist_left = (0.0, 0.0, 0.0)
    
    return normalized_right, normalized_left, wrist_right, wrist_left
    """Extrai landmarks de um frame - VERSÃO CORRIGIDA COM DEBUG"""
    if not MEDIAPIPE_AVAILABLE or hand_detector is None:
        print("❌ MediaPipe não disponível")
        return [(0.0, 0.0, 0.0)] * 21, [(0.0, 0.0, 0.0)] * 21, None, None
    
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    
    results = hand_detector.detect(mp_image)
    
    coords_right = [(0.0, 0.0, 0.0)] * 21
    coords_left = [(0.0, 0.0, 0.0)] * 21
    wrist_right = None
    wrist_left = None
    
    if results.hand_landmarks:
        handedness = results.handedness
        brute_landmarks = results.hand_landmarks
        
        print(f"   🔍 DEBUG: {len(brute_landmarks)} mão(s) detectada(s)")
        
        for index in range(len(brute_landmarks)):
            result = brute_landmarks[index]
            hand_type = handedness[index][0].category_name
            print(f"   🖐️ DEBUG: Mão {index} = {hand_type}")
            
            coords = []
            for landmark in result:
                coords.append((landmark.x, landmark.y, landmark.z))
            
            if hand_type == 'Right':
                coords_right = coords
                wrist_right = coords[0]  # Pulso é o primeiro landmark
                print(f"   ✅ DEBUG: Mão direita capturada - Pulso: {wrist_right}")
            else:
                coords_left = coords
                wrist_left = coords[0]  # Pulso é o primeiro landmark
                print(f"   ✅ DEBUG: Mão esquerda capturada - Pulso: {wrist_left}")
    
    # DEBUG: Verificar o que está sendo retornado
    right_detected = wrist_right is not None
    left_detected = wrist_left is not None
    print(f"   📊 DEBUG RETORNO: Direita: {right_detected}, Esquerda: {left_detected}")
    
    # Aplicar normalização apenas se mãos foram detectadas
    if right_detected:
        normalized_right, wrist_right = normalize_video_landmarks(coords_right)
    else:
        normalized_right = coords_right
    
    if left_detected:
        normalized_left, wrist_left = normalize_video_landmarks(coords_left)
    else:
        normalized_left = coords_left
    
    return normalized_right, normalized_left, wrist_right, wrist_left

def normalize_wrist_coords(wrist_coord_list):
    """Normaliza coordenadas do pulso"""
    wrist_x = []
    wrist_y = []
    wrist_z = []
    normalized_wrist_coords = []

    for wrist_coord in wrist_coord_list:
        # 🔧 CORREÇÃO: Ignorar coordenadas zeradas (não detectadas)
        if wrist_coord is not None and wrist_coord != (0.0, 0.0, 0.0):
            wrist_x.append(wrist_coord[0])
            wrist_y.append(wrist_coord[1])
            wrist_z.append(wrist_coord[2])

    if not wrist_x:
        return [(0.0, 0.0, 0.0)] * len(wrist_coord_list)

    wrist_reference_x = wrist_x[0]
    wrist_reference_y = wrist_y[0]
    wrist_reference_z = wrist_z[0]

    x_distance_normalizer = abs(max(wrist_x) - min(wrist_x)) if abs(max(wrist_x) - min(wrist_x)) > 0 else 1
    y_distance_normalizer = abs(max(wrist_y) - min(wrist_y)) if abs(max(wrist_y) - min(wrist_y)) > 0 else 1
    z_distance_normalizer = abs(max(wrist_z) - min(wrist_z)) if abs(max(wrist_z) - min(wrist_z)) > 0 else 1

    for wrist_coord in wrist_coord_list:
        if wrist_coord is not None:
            brute_x, brute_y, brute_z = wrist_coord
            norm_x = (brute_x - wrist_reference_x) / x_distance_normalizer
            norm_y = (brute_y - wrist_reference_y) / y_distance_normalizer
            norm_z = (brute_z - wrist_reference_z) / z_distance_normalizer
            normalized_wrist_coords.append((norm_x, norm_y, norm_z))
        else:
            normalized_wrist_coords.append((0.0, 0.0, 0.0))
    
    return normalized_wrist_coords

def process_recorded_video():
    """Processa o vídeo gravado e faz a predição - VERSÃO CORRIGIDA"""
    global current_prediction, recorded_frames
    
    print(f"\n{'='*60}")
    print(f"🎬 PROCESSANDO VÍDEO GRAVADO - VERSÃO CORRIGIDA")
    print(f"{'='*60}")
    
    if not recorded_frames:
        current_prediction = "Nenhum frame gravado"
        print("❌ Nenhum frame no buffer")
        return
    
    print(f"📊 Total de frames: {len(recorded_frames)}")
    
    if len(recorded_frames) < 10:
        current_prediction = f"Muito curto! Grave mais ({len(recorded_frames)} frames)"
        print(f"⚠️ Vídeo muito curto: {len(recorded_frames)} frames")
        return
    
    current_prediction = "Processando vídeo..."
    
    try:
        # Extrair landmarks de todos os frames
        all_landmarks_right = []
        all_landmarks_left = []
        all_wrist_right = []
        all_wrist_left = []
        
        hands_detected_count = 0
        
        print(f"🔍 Extraindo landmarks de {len(recorded_frames)} frames...")
        
        for i, frame in enumerate(recorded_frames):
            print(f"   🔍 Processando frame {i}...")
            norm_right, norm_left, wrist_right, wrist_left = extract_landmarks_from_frame(frame)
            
            # DEBUG: Verificar detecção CORRIGIDA
            right_detected = wrist_right is not None
            left_detected = wrist_left is not None
            
            if i % 5 == 0:  # Log a cada 5 frames para mais detalhes
                print(f"   📍 Frame {i}: Mão direita: {right_detected}, Mão esquerda: {left_detected}")
                if right_detected:
                    print(f"      📍 Pulso direito: {wrist_right}")
                if left_detected:
                    print(f"      📍 Pulso esquerdo: {wrist_left}")
            
            if right_detected or left_detected:
                hands_detected_count += 1
            
            all_landmarks_right.append(norm_right)
            all_landmarks_left.append(norm_left)
            all_wrist_right.append(wrist_right)
            all_wrist_left.append(wrist_left)
        
        print(f"✓ Mãos detectadas em {hands_detected_count}/{len(recorded_frames)} frames")
        
        if hands_detected_count == 0:
            current_prediction = "❌ Nenhuma mão detectada no vídeo!"
            print("❌ ERRO: Nenhuma mão detectada em nenhum frame!")
            return
        
                # 🔧 CORREÇÃO: Garantir que temos arrays numpy com formato consistente
        print("📦 Convertendo para arrays numpy...")
        
        # Para landmarks: cada frame tem 21 landmarks, cada landmark tem 3 coordenadas
        all_landmarks_right = np.array(all_landmarks_right, dtype='float32')
        all_landmarks_left = np.array(all_landmarks_left, dtype='float32')
        
        # Para pulsos: cada frame tem 3 coordenadas (x, y, z)
        all_wrist_right = np.array(all_wrist_right, dtype='float32')
        all_wrist_left = np.array(all_wrist_left, dtype='float32')
        
        print(f"📊 Shapes após conversão:")
        print(f"   Landmarks Right: {all_landmarks_right.shape}")
        print(f"   Landmarks Left: {all_landmarks_left.shape}")
        print(f"   Wrist Right: {all_wrist_right.shape}")
        print(f"   Wrist Left: {all_wrist_left.shape}")
        
        print("📦 Preparando dados (padding)...")
        # Pad sequences
        local_right_padded = pad_sequences([all_landmarks_right], dtype='float32', padding='post', maxlen=60, truncating='post')
        local_left_padded = pad_sequences([all_landmarks_left], dtype='float32', padding='post', maxlen=60, truncating='post')
        global_right_padded = pad_sequences([all_wrist_right], dtype='float32', padding='post', maxlen=60, truncating='post')
        global_left_padded = pad_sequences([all_wrist_left], dtype='float32', padding='post', maxlen=60, truncating='post')
        
        # Reshape CORRETO
        local_right_padded = local_right_padded.reshape(-1, 60, 63)
        local_left_padded = local_left_padded.reshape(-1, 60, 63)
        global_right_padded = global_right_padded.reshape(-1, 60, 3)
        global_left_padded = global_left_padded.reshape(-1, 60, 3)
        
        print(f"📊 Shapes finais:")
        print(f"   Local Right: {local_right_padded.shape}")
        print(f"   Local Left: {local_left_padded.shape}") 
        print(f"   Global Right: {global_right_padded.shape}")
        print(f"   Global Left: {global_left_padded.shape}")
        
        # Predição
        if model is not None and encoder is not None:
            print("🤖 Fazendo predição...")
            result = model.predict(
                [local_right_padded, local_left_padded, global_right_padded, global_left_padded], 
                verbose=1
            )
            
            print(f"📊 Resultado bruto: {result}")
            print(f"📊 Shape do resultado: {result.shape}")
            
            result_index = np.argmax(result)
            confidence = np.max(result) * 100
            
            print(f"📊 Índice previsto: {result_index}")
            print(f"📊 Confiança: {confidence:.1f}%")
            
            try:
                predicted_word = encoder.inverse_transform([result_index])[0]
                print(f"✓ RESULTADO: {predicted_word} ({confidence:.1f}%)")
                current_prediction = f"✓ Sinal: {predicted_word} ({confidence:.1f}%)"
            except Exception as e:
                print(f"❌ Erro no encoder: {e}")
                current_prediction = f"Erro: Índice {result_index} inválido"
        else:
            current_prediction = "❌ Modelo não carregado"
            print("❌ Modelo ou encoder não disponível")
            
    except Exception as e:
        current_prediction = f"❌ Erro no processamento"
        print(f"❌ ERRO no processamento:")
        print(f"   {e}")
        import traceback
        traceback.print_exc()
    
    print(f"{'='*60}\n")

def generate_frames():
    """Gera frames da webcam"""
    global camera, recorded_frames
    
    camera = cv2.VideoCapture(0)
    
    if not camera.isOpened():
        print("✗ Não foi possível abrir a câmera")
        return
    
    while True:
        success, frame = camera.read()
        if not success:
            break
        
        frame = cv2.flip(frame, 1)
        
        # SE ESTÁ GRAVANDO, ARMAZENA O FRAME ORIGINAL ANTES DE DESENHAR
        if is_recording:
            recorded_frames.append(frame.copy())
        
        # Detectar e desenhar mãos
        if MEDIAPIPE_AVAILABLE and hand_detector:
            try:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
                results = hand_detector.detect(mp_image)
                frame = draw_landmarks_on_frame(frame, results)
            except Exception as e:
                pass  # Ignorar erros silenciosamente
        
        # Indicador de gravação
        if is_recording:
            cv2.circle(frame, (30, 30), 15, (0, 0, 255), -1)
            cv2.putText(frame, "GRAVANDO", (60, 40), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.putText(frame, f"Frames: {len(recorded_frames)}", (60, 70), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        
        # Mostrar predição
        cv2.putText(frame, current_prediction, (10, frame.shape[0] - 20), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
        
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_recording', methods=['POST'])
def start_recording():
    global is_recording, recorded_frames, current_prediction
    
    if not is_recording:
        is_recording = True
        recorded_frames = []
        current_prediction = "Gravando..."
        
        return jsonify({'status': 'recording', 'message': 'Gravação iniciada'})
    
    return jsonify({'status': 'error', 'message': 'Já está gravando'})

@app.route('/stop_recording', methods=['POST'])
def stop_recording():
    global is_recording, current_prediction
    
    if is_recording:
        is_recording = False
        current_prediction = f"Gravação parada. {len(recorded_frames)} frames capturados"
        
        # Processar vídeo em thread separada
        threading.Thread(target=process_recorded_video, daemon=True).start()
        
        return jsonify({'status': 'stopped', 'frames': len(recorded_frames)})
    
    return jsonify({'status': 'error', 'message': 'Não está gravando'})

@app.route('/clear_recording', methods=['POST'])
def clear_recording():
    global recorded_frames, current_prediction
    
    recorded_frames = []
    current_prediction = "Gravação limpa. Pronto para nova gravação"
    
    return jsonify({'status': 'cleared'})

@app.route('/prediction')
def get_prediction():
    return jsonify({
        'prediction': current_prediction,
        'is_recording': is_recording,
        'frames': len(recorded_frames)
    })

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🔍 DIAGNÓSTICO DE INICIALIZAÇÃO")
    print("="*60)
    
    print(f"\n📁 Verificando arquivos:")
    print(f"   hand_landmarker.task: {os.path.exists(HAND_MODEL_PATH)}")
    print(f"   ModelY2.0.keras: {os.path.exists(MODEL_PATH)}")
    print(f"   Encoder.p: {os.path.exists(ENCODER_PATH)}")
    
    if MEDIAPIPE_AVAILABLE and os.path.exists(HAND_MODEL_PATH):
        try:
            hand_detector = load_hand_model(HAND_MODEL_PATH)
            print(f"✓ Hand detector carregado")
        except Exception as e:
            print(f"✗ Erro ao carregar hand detector: {e}")
    
    if TENSORFLOW_AVAILABLE and os.path.exists(MODEL_PATH):
        try:
            model = load_model(MODEL_PATH)
            print(f"✓ Modelo carregado")
        except Exception as e:
            print(f"✗ Erro ao carregar modelo: {e}")
    
    if os.path.exists(ENCODER_PATH):
        try:
            with open(ENCODER_PATH, 'rb') as f:
                encoder = pickle.load(f)
            print(f"✓ Encoder carregado")
            print(f"   Classes: {list(encoder.classes_)}")
        except Exception as e:
            print(f"✗ Erro ao carregar encoder: {e}")
    
    print("\n" + "="*60)
    print("🚀 Servidor Flask iniciado!")
    print("📱 Acesse: http://localhost:5000")
    print("="*60 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False, threaded=True)