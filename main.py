import sys
import os
import pickle
import cv2
import time
import mediapipe as mp
from resemblyzer import VoiceEncoder, preprocess_wav
import sounddevice as sd
import numpy as np
import tempfile
import scipy.io.wavfile as wav
import face_recognition

VOICE_STRICT_THRESHOLD = 0.65
VOICE_SOFT_THRESHOLD = 0.60


# === 🧠 Load face data
with open("models/face_encodings.pkl", "rb") as f:
    face_data = pickle.load(f)

# === 🎤 Load voice data
with open("models/voice_embeddings.pkl", "rb") as f:
    voice_data = pickle.load(f)


# === 👄 Lip Movement Detection
def detect_lip_movement(duration=4, threshold=3.0):
    mp_face_mesh = mp.solutions.face_mesh
    face_mesh = mp_face_mesh.FaceMesh(refine_landmarks=True)
    cap = cv2.VideoCapture(0)

    print("🎥 Detecting lip movement during voice input...")
    start_time = time.time()
    mouth_movements = []

    while time.time() - start_time < duration:
        ret, frame = cap.read()
        if not ret:
            continue

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)

        if results.multi_face_landmarks:
            for face in results.multi_face_landmarks:
                upper = face.landmark[13]
                lower = face.landmark[14]
                dy = abs(upper.y - lower.y)
                mouth_movements.append(dy * 100)

        cv2.imshow("Lip Movement", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    avg_movement = sum(mouth_movements) / len(mouth_movements) if mouth_movements else 0
    print(f"👄 Avg Lip Movement: {avg_movement:.2f}")

    return avg_movement >= threshold


# === 📸 Face Recognition (Camera)
def recognize_from_camera(face_data):
    cap = cv2.VideoCapture(0)
    print("[INFO] Press Q to quit after detection.")

    results = []

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        encodings = face_recognition.face_encodings(rgb_frame, face_locations)

        for (top, right, bottom, left), encoding in zip(face_locations, encodings):
            name, sim = match_face(encoding, face_data)
            color = (0, 255, 0) if sim > 70 else (0, 255, 255) if sim > 40 else (0, 0, 255)
            label = f"{name or 'Unknown'} ({sim:.2f}%)"
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.putText(frame, label, (left, top - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

            if name:
                results.append((name, sim))

        cv2.imshow("Face Recognition", frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    return results


# === 🧍 Face Matching Logic
def match_face(encoding, face_data, threshold=0.6):
    best_match = None
    best_dist = float("inf")
    for name, known_encoding in face_data.items():
        dist = np.linalg.norm(encoding - known_encoding)
        if dist < best_dist:
            best_match = name
            best_dist = dist
    similarity = max(0.0, 1.0 - best_dist) * 100
    return (best_match, similarity) if best_dist < threshold else (None, similarity)


# === 🎙️ Voice Recognition
def recognize_from_microphone(voice_data, threshold=0.65):
    encoder = VoiceEncoder()
    path = record_audio()
    wav_data = preprocess_wav(path)
    input_embedding = encoder.embed_utterance(wav_data)

    best_match = None
    highest_similarity = -1

    for name, emb in voice_data.items():
        sim = np.dot(input_embedding, emb) / (np.linalg.norm(input_embedding) * np.linalg.norm(emb))
        print(f"🔎 {name}: {sim:.3f}")
        if sim > highest_similarity:
            highest_similarity = sim
            best_match = name

    similarity_percent = highest_similarity * 100
    if highest_similarity >= threshold:
        print(f"✅ Voice match: {best_match} ({similarity_percent:.2f}%)")
        return best_match, similarity_percent
    else:
        print(f"⚠️ No strong match (Best: {best_match}, Similarity: {similarity_percent:.2f}%)")
        return None, similarity_percent


# 🎤 Record Audio
def record_audio(duration=4, sample_rate=16000):
    print("🎤 Recording...")
    audio = sd.rec(int(duration * sample_rate), samplerate=sample_rate, channels=1)
    sd.wait()
    path = tempfile.gettempdir() + "/temp_voice.wav"
    wav.write(path, sample_rate, audio)
    return path


# === 💻 MAIN EXECUTION ===
print("==== TEAMMATE RECOGNITION SYSTEM ====")
mode = input("Select mode (face / voice / both): ").strip().lower()

face_result = []
voice_result = None
voice_sim = 0

if mode in ["face", "both"]:
    face_input = input("Face input type? (image/camera): ").strip().lower()
    if face_input == "camera":
        face_result = recognize_from_camera(face_data)
    else:
        print("[❌] Only camera mode is supported in this combined version.")

if mode in ["voice", "both"]:
    lip_ok = detect_lip_movement()
    voice_result, voice_sim = recognize_from_microphone(voice_data)

# === 💡 FINAL OUTPUT ===
print("\n=== FINAL RESULT ===")

if mode == "face":
    if face_result:
        print("\n🎥 Faces recognized:")
        for name, sim in face_result:
            print(f"  - {name} (Similarity: {sim:.2f}%)")
    else:
        print("❌ No faces recognized.")

elif mode == "voice":
    if voice_result:
        print(f"🎙️ Voice recognized as: {voice_result} (Similarity: {voice_sim:.2f}%)")
    else:
        print("❌ No voice recognized.")

elif mode == "both":
    top_face = max(face_result, key=lambda x: x[1], default=(None, 0))
    face_name, face_sim = top_face

    if not face_name and not voice_result:
        print("❌ Neither face nor voice could be recognized.")
    elif not face_name:
        print(f"⚠️ Voice matched: {voice_result} ({voice_sim:.2f}%)\n❌ No face recognized.")
    elif not voice_result:
        if voice_sim >= VOICE_SOFT_THRESHOLD:
            print(f"✅ Face matched: {face_name} ({face_sim:.2f}%)")
            print(f"💬 Voice almost matched: {voice_sim:.2f}% — accepted based on face 🥰")
        else:
            print(f"⚠️ Face matched: {face_name} ({face_sim:.2f}%)\n❌ No voice recognized.")
    elif face_name != voice_result:
        if voice_sim >= VOICE_SOFT_THRESHOLD:
            print(f"💡 Possible identity: Face = {face_name}, Voice = {voice_result}")
            print(f"🤔 Voice might've been off — but your face is speaking loud and clear 🥰")
        else:
            print(f"❌ Mismatch Detected!")
            print(f"   - Face: {face_name or 'None'} ({face_sim:.2f}%)")
            print(f"   - Voice: {voice_result or 'None'} ({voice_sim:.2f}%)")
    else:
        print(f"✅ Identity VERIFIED: {face_name}")
        print(f"   - Face Similarity: {face_sim:.2f}%\n   - Voice Similarity: {voice_sim:.2f}%")
        if lip_ok is not None:
            if not lip_ok:
                print("⚠️ Lip movement not detected! Speaker may not match face.")
            else:
                print("👄 Lip movement confirmed during voice input.")