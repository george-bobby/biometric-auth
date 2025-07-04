import face_recognition
import os
import pickle
import numpy as np

KNOWN_FACES_DIR = "face_recog/face_dataset"
MODEL_PATH = "models/face_encodings.pkl"
encodings = {}

for person in os.listdir(KNOWN_FACES_DIR):
    person_dir = os.path.join(KNOWN_FACES_DIR, person)
    if not os.path.isdir(person_dir):
        continue

    for file in os.listdir(person_dir):
        filepath = os.path.join(person_dir, file)
        image = face_recognition.load_image_file(filepath)
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            print(f"No face found in {file}, skipping.")
            continue

        encoding = face_recognition.face_encodings(image)[0]
        encodings[person] = encoding
        break  # Use only 1 image per person for now

with open(MODEL_PATH, "wb") as f:
    pickle.dump(encodings, f)

print(f"✅ Face encodings saved to {MODEL_PATH}")
