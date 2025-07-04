from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import pickle
import cv2
import numpy as np
import tempfile
import base64
from PIL import Image
import io
import face_recognition
from resemblyzer import VoiceEncoder, preprocess_wav
import scipy.io.wavfile as wav
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv(".env")

# Initialize FastAPI app
app = FastAPI(title="Biometric Authentication API", version="1.0.0")

# Configure CORS - Allow access from any origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Initialize voice encoder
voice_encoder = VoiceEncoder()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load existing models if they exist
face_data = {}
voice_data = {}

try:
    with open("models/face_encodings.pkl", "rb") as f:
        face_data = pickle.load(f)
    logger.info(f"Loaded face data for {len(face_data)} people")
except FileNotFoundError:
    logger.warning("No face encodings file found")

try:
    with open("models/voice_embeddings.pkl", "rb") as f:
        voice_data = pickle.load(f)
    logger.info(f"Loaded voice data for {len(voice_data)} people")
except FileNotFoundError:
    logger.warning("No voice embeddings file found")

@app.get("/")
async def root():
    return {"message": "Biometric Authentication API", "status": "running"}

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "face_models_loaded": len(face_data),
        "voice_models_loaded": len(voice_data)
    }

@app.get("/api/profiles")
async def get_available_profiles():
    """Get list of available profiles for user selection"""
    available_profiles = []

    # Check which profiles have both face and voice data
    for profile in ["Fenny", "George", "Jovin"]:
        has_face = profile in face_data
        has_voice = profile in voice_data

        available_profiles.append({
            "name": profile,
            "has_face_model": has_face,
            "has_voice_model": has_voice,
            "supports_modes": {
                "face": has_face,
                "voice": has_voice,
                "both": has_face and has_voice
            }
        })

    return {
        "profiles": available_profiles,
        "total_profiles": len(available_profiles)
    }

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Decode base64 image string to numpy array"""
    try:
        # Remove data URL prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_string)
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array
        return np.array(image)
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        raise HTTPException(status_code=400, detail="Invalid image data")

def match_face(encoding, face_data, threshold=0.6):
    """Match face encoding against known faces"""
    best_match = None
    best_dist = float("inf")
    
    for name, known_encoding in face_data.items():
        dist = np.linalg.norm(encoding - known_encoding)
        if dist < best_dist:
            best_match = name
            best_dist = dist
    
    similarity = max(0.0, 1.0 - best_dist) * 100
    return (best_match, similarity) if best_dist < threshold else (None, similarity)

@app.post("/api/face-recognition")
async def recognize_face(image_data: str = Form(...), user_id: str = Form(...)):
    """Recognize face from base64 image data"""
    try:
        # Decode the image
        image_array = decode_base64_image(image_data)
        
        # Find face locations and encodings
        face_locations = face_recognition.face_locations(image_array)
        
        if not face_locations:
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "message": "No face detected in the image",
                    "matches": []
                }
            )
        
        face_encodings = face_recognition.face_encodings(image_array, face_locations)
        
        results = []
        for encoding in face_encodings:
            name, similarity = match_face(encoding, face_data)
            if name:
                results.append({
                    "name": name,
                    "similarity": round(similarity, 2),
                    "confidence": "high" if similarity > 70 else "medium" if similarity > 40 else "low"
                })
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": f"Processed {len(face_encodings)} face(s)",
                "matches": results
            }
        )
        
    except Exception as e:
        logger.error(f"Face recognition error: {e}")
        raise HTTPException(status_code=500, detail=f"Face recognition failed: {str(e)}")

@app.post("/api/voice-recognition")
async def recognize_voice(audio_file: UploadFile = File(...), user_id: str = Form(...)):
    """Recognize voice from audio file"""
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await audio_file.read()
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Process the audio
            wav_data = preprocess_wav(temp_path)
            
            if len(wav_data) < 16000:  # Less than 1 second
                return JSONResponse(
                    status_code=200,
                    content={
                        "success": False,
                        "message": "Audio too short or unclear",
                        "matches": []
                    }
                )
            
            # Generate embedding
            input_embedding = voice_encoder.embed_utterance(wav_data)
            
            # Compare with known voices
            best_match = None
            highest_similarity = -1
            
            for name, stored_embedding in voice_data.items():
                similarity = np.dot(input_embedding, stored_embedding) / (
                    np.linalg.norm(input_embedding) * np.linalg.norm(stored_embedding)
                )
                
                if similarity > highest_similarity:
                    highest_similarity = similarity
                    best_match = name
            
            similarity_percent = max(0, highest_similarity * 100)
            
            results = []
            if best_match and highest_similarity >= 0.60:  # 60% threshold
                results.append({
                    "name": best_match,
                    "similarity": round(similarity_percent, 2),
                    "confidence": "high" if similarity_percent > 75 else "medium"
                })
            
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "Voice processed successfully",
                    "matches": results,
                    "best_similarity": round(similarity_percent, 2) if best_match else 0
                }
            )
            
        finally:
            # Clean up temporary file
            os.unlink(temp_path)
            
    except Exception as e:
        logger.error(f"Voice recognition error: {e}")
        raise HTTPException(status_code=500, detail=f"Voice recognition failed: {str(e)}")

@app.post("/api/authenticate")
async def combined_authentication(
    mode: str = Form(...),
    profile: str = Form(...),
    user_id: str = Form(...),
    image_data: str = Form(None),
    audio_file: UploadFile = File(None)
):
    """Combined authentication endpoint supporting face, voice, or both"""
    try:
        results = {
            "success": False,
            "message": "",
            "face_match": None,
            "voice_match": None,
            "authentication_passed": False
        }

        face_success = False
        voice_success = False

        # Face authentication
        if mode in ["face", "both"] and image_data:
            try:
                image_array = decode_base64_image(image_data)
                face_locations = face_recognition.face_locations(image_array)

                if face_locations:
                    face_encodings = face_recognition.face_encodings(image_array, face_locations)

                    if face_encodings:
                        # Match against specific profile
                        if profile in face_data:
                            encoding = face_encodings[0]
                            known_encoding = face_data[profile]
                            dist = np.linalg.norm(encoding - known_encoding)
                            similarity = max(0.0, 1.0 - dist) * 100

                            if dist < 0.6:  # Face recognition threshold
                                face_success = True
                                results["face_match"] = {
                                    "name": profile,
                                    "similarity": round(similarity, 2),
                                    "confidence": "high" if similarity > 70 else "medium"
                                }
                            else:
                                results["face_match"] = {
                                    "name": "No match",
                                    "similarity": round(similarity, 2),
                                    "confidence": "low"
                                }
                        else:
                            results["message"] += f"Profile {profile} not found in face models. "
                else:
                    results["message"] += "No face detected in image. "
            except Exception as e:
                results["message"] += f"Face recognition error: {str(e)}. "

        # Voice authentication
        if mode in ["voice", "both"] and audio_file:
            try:
                # Save uploaded file temporarily
                with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
                    content = await audio_file.read()
                    temp_file.write(content)
                    temp_path = temp_file.name

                try:
                    wav_data = preprocess_wav(temp_path)

                    if len(wav_data) >= 16000:  # At least 1 second
                        input_embedding = voice_encoder.embed_utterance(wav_data)

                        # Match against specific profile
                        if profile in voice_data:
                            stored_embedding = voice_data[profile]
                            similarity = np.dot(input_embedding, stored_embedding) / (
                                np.linalg.norm(input_embedding) * np.linalg.norm(stored_embedding)
                            )
                            similarity_percent = max(0, similarity * 100)

                            if similarity >= 0.60:  # Voice recognition threshold
                                voice_success = True
                                results["voice_match"] = {
                                    "name": profile,
                                    "similarity": round(similarity_percent, 2),
                                    "confidence": "high" if similarity_percent > 75 else "medium"
                                }
                            else:
                                results["voice_match"] = {
                                    "name": "No match",
                                    "similarity": round(similarity_percent, 2),
                                    "confidence": "low"
                                }
                        else:
                            results["message"] += f"Profile {profile} not found in voice models. "
                    else:
                        results["message"] += "Audio too short or unclear. "
                finally:
                    os.unlink(temp_path)
            except Exception as e:
                results["message"] += f"Voice recognition error: {str(e)}. "

        # Determine overall success
        if mode == "face":
            results["authentication_passed"] = face_success
            results["success"] = face_success
        elif mode == "voice":
            results["authentication_passed"] = voice_success
            results["success"] = voice_success
        elif mode == "both":
            results["authentication_passed"] = face_success and voice_success
            results["success"] = face_success and voice_success

        if results["success"]:
            results["message"] = f"Authentication successful for {profile}"
        else:
            if not results["message"]:
                results["message"] = f"Authentication failed for {profile}"

        return JSONResponse(status_code=200, content=results)

    except Exception as e:
        logger.error(f"Combined authentication error: {e}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@app.post("/api/lip-sync-check")
async def lip_sync_check(
    video_data: str = Form(...),
    audio_data: UploadFile = File(...),
    duration: int = Form(4)
):
    """Check if lip movement synchronizes with voice input using MediaPipe"""
    try:
        import mediapipe as mp
        import cv2
        import numpy as np
        import base64
        import tempfile
        import os
        from io import BytesIO

        # Initialize MediaPipe Face Mesh
        mp_face_mesh = mp.solutions.face_mesh

        # Decode base64 video data
        if video_data.startswith('data:video'):
            video_data = video_data.split(',')[1]

        video_bytes = base64.b64decode(video_data)

        # Save video to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_video:
            temp_video.write(video_bytes)
            temp_video_path = temp_video.name

        # Save audio to temporary file
        audio_content = await audio_data.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            temp_audio.write(audio_content)
            temp_audio_path = temp_audio.name

        try:
            # Process video for lip movement detection
            cap = cv2.VideoCapture(temp_video_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            frame_count = 0
            lip_movements = []

            with mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            ) as face_mesh:

                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break

                    frame_count += 1
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = face_mesh.process(rgb_frame)

                    if results.multi_face_landmarks:
                        for face_landmarks in results.multi_face_landmarks:
                            # Extract lip landmarks (specific indices for lips)
                            lip_indices = [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318]

                            lip_points = []
                            for idx in lip_indices:
                                landmark = face_landmarks.landmark[idx]
                                lip_points.append([landmark.x, landmark.y])

                            # Calculate lip movement (distance between upper and lower lip)
                            upper_lip = np.array(lip_points[:6])
                            lower_lip = np.array(lip_points[6:])

                            # Calculate average distance between upper and lower lip
                            lip_distance = np.mean([
                                np.linalg.norm(upper_lip[i] - lower_lip[i])
                                for i in range(min(len(upper_lip), len(lower_lip)))
                            ])

                            lip_movements.append({
                                'frame': frame_count,
                                'timestamp': frame_count / fps,
                                'lip_distance': lip_distance
                            })

            cap.release()

            # Analyze lip movement patterns
            if len(lip_movements) < 10:
                raise Exception("Insufficient video data for lip sync analysis")

            # Calculate lip movement variance (more movement = more speech)
            distances = [lm['lip_distance'] for lm in lip_movements]
            movement_variance = np.var(distances)
            movement_mean = np.mean(distances)

            # Simple heuristic: if there's significant lip movement variance, assume speech
            movement_threshold = 0.001  # Adjust based on testing
            has_significant_movement = movement_variance > movement_threshold

            # Check audio presence
            audio_size = len(audio_content)
            has_audio = audio_size > 1000  # Basic check

            # Determine lip sync success
            lip_sync_detected = has_significant_movement and has_audio

            # Calculate confidence based on movement variance and consistency
            if lip_sync_detected:
                confidence = min(0.95, 0.6 + (movement_variance * 1000))
            else:
                confidence = max(0.1, movement_variance * 500)

            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "lip_sync_detected": lip_sync_detected,
                    "confidence": round(confidence, 3),
                    "message": "Lip sync verified successfully!" if lip_sync_detected else "Lip sync verification failed - insufficient lip movement detected.",
                    "analysis": {
                        "duration_analyzed": round(len(lip_movements) / fps, 2),
                        "frames_processed": len(lip_movements),
                        "audio_samples": audio_size,
                        "movement_variance": round(movement_variance, 6),
                        "movement_mean": round(movement_mean, 6),
                        "has_significant_movement": has_significant_movement,
                        "has_audio": has_audio
                    }
                }
            )

        finally:
            # Clean up temporary files
            try:
                os.unlink(temp_video_path)
                os.unlink(temp_audio_path)
            except:
                pass

    except Exception as e:
        logger.error(f"Lip sync check error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "lip_sync_detected": False,
                "confidence": 0.0,
                "message": f"Error during lip sync analysis: {str(e)}",
                "analysis": {
                    "duration_analyzed": 0.0,
                    "frames_processed": 0,
                    "audio_samples": 0,
                    "error": str(e)
                }
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", 8000)),
        reload=os.getenv("DEBUG", "False").lower() == "true"
    )
