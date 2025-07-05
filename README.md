# 🔗 Biometric Authentication Setup Guide

A guide to run the biometric authentication system with a React frontend and Python backend.

## 📋 Prerequisites

- **Node.js** (v16+)
- **Python** (v3.8+)
- **pip**
- **npm** or **bun**

## 🚀 Setup Instructions

### Install Dependencies

```bash
pip install -r requirements.txt
npm install
# or
bun install
```

### Environment Configuration

- Single environment file: `.env` (used by both frontend and backend)

### Train Biometric Models

Prepare sample data:
- Faces: `face_recog/face_dataset/`
- Voices: `voice_recog/voice_dataset/`

Run training scripts:

```bash
python face_recog/train_face.py
python voice_recog/train_voice.py
```

## 🏃‍♂️ Running the Application

### Backend

```bash
python app.py
```

Backend runs on `http://localhost:8000`

### Frontend

```bash
npm run dev
# or
bun dev
```

Frontend runs on `http://localhost:5173`

## 🆕 Key Features

### Authentication Modes

- **Face:** Live camera or image upload
- **Voice:** Real-time recording with phrase verification
- **Combined:** Both face and voice

### Registration Flow

1. Enter credentials
2. Select profile (Fenny, George, Jovin)
3. Choose authentication mode

### Profile-Based Matching

- Each profile is linked to a trained biometric model
- Targeted profile-based verification

### Security Features

- Live lip sync verification
- Profile-specific accuracy tuning
- Confidence scoring on results

## 🔄 Authentication Flow

### Process Overview

1. Registration: Credentials, profile, mode selection
2. Capture: Face and/or voice input
3. Verification: Model-based profile matching
4. Result: Confidence score with success/failure

### API Endpoints

- `GET /api/health` → Backend status
- `GET /api/profiles` → List profiles
- `POST /api/authenticate` → Unified auth endpoint
- `POST /api/face-recognition` → Face-only auth (legacy)
- `POST /api/voice-recognition` → Voice-only auth (legacy)
- `POST /api/lip-sync-check` → Lip sync verification

## 👤 User Experience Flow

### Registration

1. `/signup`: Enter credentials
2. Select a profile
3. Choose an authentication mode
4. Preferences saved in Supabase

### Authentication

1. `/login`: Enter credentials
2. Choose authentication method
3. Perform biometric verification
4. Access granted on success

# 3-Step Biometric Verification System

## Key Improvements

### 🎥 Simultaneous Capture

- Real-time video/audio via MediaStream
- Continuous face detection with bounding boxes

### 📦 Bounding Box Feedback

Confidence-based color codes:
- 🟢 >80% confidence
- 🟡 60-80%
- 🔴 <60%

### 🔄 3-Step Verification

#### Step 1: Face Verification
- Capture face image
- Detect and verify face

#### Step 2: Voice Verification
- Record 5-second voice sample
- Verify against profile

#### Step 3: Lip Sync Verification
- 4-second video/audio capture
- Analyze lip movements using MediaPipe

## 🔧 Technical Components

### Frontend

- `SimultaneousCapture.tsx`: Captures data, runs face-api.js
- `ThreeStepVerification.tsx`: Handles step progression, results, retries

### Backend

- `/api/lip-sync-check`: MediaPipe-powered lip sync analysis

### Dependencies

```bash
# Frontend
npm install face-api.js @tensorflow/tfjs

# Backend
pip install mediapipe opencv-python-headless
```

### Face-API Models (auto-downloaded to `public/models/`)

- Tiny Face Detector
- Face Landmarks
- Face Recognition
- Face Expression

## 🔁 Data Flow Summary

**Face Verification:**
```
Video → Canvas → Base64 → API → Result
```

**Voice Verification:**
```
Audio → MediaRecorder → API → Result
```

**Lip Sync Verification:**
```
Video + Audio → MediaPipe → Result
```

## Example API Response: `/api/lip-sync-check`

```json
{
  "success": true,
  "lip_sync_detected": true,
  "confidence": 0.85,
  "message": "Lip sync verified successfully!",
  "analysis": {
    "duration_analyzed": 3.8,
    "frames_processed": 114,
    "audio_samples": 48000,
    "movement_variance": 0.002341,
    "movement_mean": 0.045123,
    "has_significant_movement": true,
    "has_audio": true
  }
}
```

## 🔑 Signup Flow

1. Credentials
2. Profile selection
3. 3-step biometric verification

Features:
- Simultaneous permission requests
- Real-time bounding boxes
- Retry failed steps
- Confidence score feedback

## ⚙️ Configuration Settings

### Camera
- 640x480 resolution, front camera, 30 FPS

### Audio
- 44.1 kHz, echo cancellation, noise suppression

### Face Detection
- Max faces: 1
- Detection/tracking confidence: 0.5
- Landmark refinement: enabled

## 🔐 Security Features

- Real-time anti-spoofing checks
- Multi-modal verification
- Confidence thresholds for validity
- Temporary file cleanup
- Base64-secured data transfer

## 🌐 Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ⚠️ Limited
- Mobile: Varies

## ⚡ Performance Highlights

- Face detection ~10 ms/frame
- Automatic temp file cleanup
- Base64 increases data size

## 🛠️ Troubleshooting

### Common Problems

- Permission issues → Check browser settings, HTTPS required
- Detection errors → Verify models and lighting
- Lip sync failures → Check MediaPipe and video format

### Debugging Tips

- Backend logs (`python app.py`)
- Frontend console logs
- API request traces in browser dev tools

## 🔗 Available Routes

- `/login`: Login page
- `/signup`: Registration flow
- `/auth-mode-selection`: Choose auth mode
- `/face-auth`, `/voice-auth`, `/combined-auth`: Auth flows
- `/dashboard`: Post-auth landing

## 🛠️ Development Workflow

### Adding New Profiles

1. Add folders to:
   - `face_recog/face_dataset/`
   - `voice_recog/voice_dataset/`
2. Train:
   ```bash
   python face_recog/train_face.py
   python voice_recog/train_voice.py
   ```
3. Restart backend

### Testing

```bash
curl http://localhost:8000/api/health
```
Frontend: Open `http://localhost:5173`

## 📁 Project Structure

```
biometric-auth/
├── src/                   # Frontend components
│   ├── components/auth/   # Face & voice auth components
│   ├── lib/api.ts         # API integrations
├── face_recog/            # Face recognition
├── voice_recog/           # Voice recognition
├── models/                # Trained models
├── app.py                 # FastAPI backend
├── .env                   # Environment variables
├── package.json           # Frontend dependencies
├── requirements.txt       # Backend dependencies
└── INTEGRATION_GUIDE.md
```

## 🔐 Security Notes

- Biometric data encrypted in Supabase
- CORS configured for development (adjust for production)
- Authentication middleware recommended for production

## 🚀 Production Deployment

1. Update CORS settings
2. Set production environment variables
3. Use Gunicorn/Uvicorn in production
4. Configure HTTPS
5. Set up Supabase database backups
