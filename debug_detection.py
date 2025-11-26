import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

def load_hand_model(hand_model_path):
    base_options = python.BaseOptions(model_asset_path=hand_model_path)
    options = vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=2
    )
    return vision.HandLandmarker.create_from_options(options)

print("🎯 DEBUG DETECÇÃO DE MÃOS...")

hand_detector = load_hand_model('hand_landmarker.task')
camera = cv2.VideoCapture(0)

for i in range(50):  # Testa por 50 frames
    success, frame = camera.read()
    if not success:
        break
    
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    results = hand_detector.detect(mp_image)
    
    if results.hand_landmarks:
        print(f"Frame {i}: ✅ {len(results.hand_landmarks)} mão(s) detectada(s)")
        handedness = results.handedness
        for idx, hand_landmarks in enumerate(results.hand_landmarks):
            hand_type = handedness[idx][0].category_name
            print(f"   Mão {idx}: {hand_type}")
            # Verificar o primeiro landmark
            wrist = hand_landmarks[0]
            print(f"   Pulso - X: {wrist.x:.3f}, Y: {wrist.y:.3f}, Z: {wrist.z:.3f}")
    else:
        print(f"Frame {i}: ❌ Nenhuma mão")

camera.release()
print("🎯 Debug concluído!")