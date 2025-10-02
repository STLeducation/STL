from DataCollection import data_collection
from DataFormater import data_format

print("""
O que você quer fazer?
1: Coleta de dados
2: Junção de dados
3: Ambos
""")

query = int(input())

if query == 1:
    data_collection()
elif query == 2:
    data_format()
elif query == 3:
    data_collection()
    data_format()