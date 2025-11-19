from DataCollection import data_collection
from DataFormater import data_format
from ModelDevelopment import train_model

while True:
    print("""
    O que você quer fazer?
    1: Coleta de dados
    2: Junção de dados
    3: Treinar Modelo
    4: Fechar
    """)

    query = int(input())

    if query == 1:
        data_collection(cam_id=1)
    elif query == 2:
        data_format()
    elif query == 3:
        train_model()
    elif query == 4:
        break