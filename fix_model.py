# fix_model.py
import pickle
import numpy as np
from keras.models import load_model, Model
from keras.layers import Dense
from keras.optimizers import Adam

print("🔧 CORRIGINDO ARQUITETURA DO MODELO...")

# Carregar modelo original
try:
    model = load_model('ModelY2.0.keras')
    print("✅ Modelo original carregado")
except Exception as e:
    print(f"❌ Erro ao carregar modelo: {e}")
    exit()

# Obter número de classes do encoder
try:
    with open('Encoder.p', 'rb') as f:
        encoder = pickle.load(f)
    num_classes = len(encoder.classes_)
    print(f"✅ Encoder carregado - {num_classes} classes: {list(encoder.classes_)}")
except Exception as e:
    print(f"❌ Erro ao carregar encoder: {e}")
    exit()

print("\n📊 Arquitetura original:")
model.summary()

# Reconstruir modelo com arquitetura correta
input_local_right = model.get_layer(index=0).input
input_local_left = model.get_layer(index=1).input  
input_global_right = model.get_layer(index=2).input
input_global_left = model.get_layer(index=3).input

# Obter a penúltima camada (Dropout)
penultimate_layer = model.get_layer(index=-2).output

# Corrigir a última camada: num_classes neurônios com softmax
correct_output = Dense(num_classes, activation='softmax', name='corrected_output')(penultimate_layer)

# Criar novo modelo
corrected_model = Model(
    inputs=[input_local_right, input_local_left, input_global_right, input_global_left],
    outputs=correct_output
)

# Compilar
corrected_model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)

print("\n📊 Nova arquitetura corrigida:")
corrected_model.summary()

# Salvar modelo corrigido
corrected_model.save('ModelY2.0_corrected.keras')
print("\n✅ Modelo corrigido salvo como 'ModelY2.0_corrected.keras'!")