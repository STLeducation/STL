import pickle

# Load data from the pickle file
try:
    with open('combined_data.p', 'rb') as f:
        data = pickle.load(f)
except FileNotFoundError:
    print("Error: 'my_data.pickle' not found.")
    exit()
except Exception as e:
    print(f"Error loading pickle file: {e}")
    exit()

# Convert the data to a string representation
# This part might need adjustment depending on the structure of 'data'
text_representation = str(data) 

# Write the string to a text file
try:
    with open('output.txt', 'w') as f:
        f.write(text_representation)
    print("Data successfully written to 'output.txt'")
except Exception as e:
    print(f"Error writing to text file: {e}")