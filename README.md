# 🔗 Biometric Authentication Setup Guide

This guide explains how to run your integrated biometric authentication system with React frontend and Python backend.

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher)
- **pip** (Python package manager)
- **npm** or **bun** (Node.js package manager)

## 🚀 Setup Instructions

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Configuration

Your environment file is already configured:

- **Single Environment File**: `.env` (contains both frontend and backend configuration)

### 4. Prepare Biometric Models

Before running the system, you need to train the face and voice recognition models:

```bash
# Train face recognition model
python face_recog/train_face.py

# Train voice recognition model  
python voice_recog/train_voice.py
```

**Note**: Make sure you have sample data in:
- `face_recog/face_dataset/` (folders with person names containing face images)
- `voice_recog/voice_dataset/` (folders with person names containing voice recordings)

## 🏃‍♂️ Running the Application

### Terminal 1: Start Backend Server

```bash
python app.py
```

The backend will start on `http://localhost:8000`

### Terminal 2: Start Frontend Development Server

```bash
npm run dev
# or
bun dev
```

The frontend will start on `http://localhost:5173`

## 🆕 New Features

### Enhanced Authentication System

This system now includes comprehensive biometric authentication with the following new features:

#### **Authentication Modes**
- **Face Authentication**: Live camera capture OR image upload
- **Voice Authentication**: Real-time voice recording with phrase verification
- **Combined Authentication**: Both face and voice for maximum security

#### **User Registration Flow**
1. **Step 1**: Enter credentials (username, password, email)
2. **Step 2**: Select profile (Fenny, George, or Jovin)
3. **Step 3**: Choose authentication mode (Face, Voice, or Both)

#### **Profile-Based Authentication**
- Users select from predefined profiles during signup
- Each profile corresponds to trained models in the system
- Authentication matches against specific profile's biometric data

#### **Security Features**
- **Live Face Synchronization**: Lip movement detection during voice authentication
- **Image Upload Option**: Alternative to live camera for face authentication
- **Profile-Specific Matching**: Enhanced accuracy through targeted model matching
- **Confidence Scoring**: Detailed similarity percentages for authentication results

## 🔄 How It Works

### Enhanced Data Flow

1. **User Registration**: Multi-step signup with profile and mode selection
2. **Authentication Mode Selection**: Choose Face, Voice, or Combined authentication
3. **Biometric Capture**:
   - Face: Live camera or image upload
   - Voice: Real-time recording with lip sync verification
   - Combined: Both modalities for maximum security
4. **Profile-Based Processing**: Backend matches against user's selected profile
5. **Results**: Detailed authentication results with confidence scores

### API Endpoints

#### Authentication
- `GET /api/health` - Check backend status and loaded models
- `GET /api/profiles` - List available profiles and their capabilities
- `POST /api/authenticate` - Combined authentication endpoint (supports face, voice, or both)
- `POST /api/face-recognition` - Face-only authentication (legacy)
- `POST /api/voice-recognition` - Voice-only authentication (legacy)

#### Security Features
- `POST /api/lip-sync-check` - Live face synchronization verification

## 👤 User Experience Flow

### New User Registration
1. Navigate to signup page
2. **Step 1 - Credentials**: Enter username, password, and optional email
3. **Step 2 - Profile Selection**: Choose from available profiles (Fenny, George, Jovin)
4. **Step 3 - Authentication Mode**: Select Face, Voice, or Combined authentication
5. Account creation with preferences saved to Supabase

### Authentication Process
1. **Login**: Enter credentials
2. **Mode Selection**: Choose authentication method (if not set during signup)
3. **Biometric Authentication**:
   - **Face Mode**: Use camera or upload image → facial recognition
   - **Voice Mode**: Record voice phrase → voice recognition + lip sync check
   - **Combined Mode**: Complete both face and voice authentication
4. **Success**: Access granted with detailed authentication results

# 3-Step Biometric Verification System

## Overview

This project now includes an enhanced biometric verification system with simultaneous camera/microphone capture, real-time face detection with bounding boxes, and comprehensive 3-step verification process.

## New Features

### 🎥 Simultaneous Capture
- **Real-time video and audio capture** using a single MediaStream
- **Continuous face detection** with live bounding box overlay
- **Automatic permission handling** for camera and microphone access

### 📦 Bounding Box Visualization
- **Real-time face detection** using face-api.js
- **Color-coded bounding boxes** based on confidence levels:
   - 🟢 Green: High confidence (>80%)
   - 🟡 Yellow: Medium confidence (60-80%)
   - 🔴 Red: Low confidence (<60%)
- **Live confidence scores** displayed on screen
- **Profile name display** when face is detected

### 🔄 3-Step Verification Process

#### Step 1: Face Verification
- Captures high-quality image from video stream
- Performs face recognition against selected profile
- Shows real-time bounding boxes during capture
- Validates face detection confidence before proceeding

#### Step 2: Voice Verification
- Records 5-second audio sample
- Processes voice recognition against profile
- Maintains video stream for visual feedback
- Auto-stops recording after timeout

#### Step 3: Lip Sync Verification
- Records 4-second video with synchronized audio
- Uses **MediaPipe** for real lip movement analysis
- Analyzes lip landmark movements and audio correlation
- Provides detailed analysis metrics

## Technical Implementation

### Frontend Components

#### `SimultaneousCapture.tsx`
- Main component handling all three verification steps
- Integrates face-api.js for real-time face detection
- Manages MediaRecorder for audio/video capture
- Provides visual feedback with bounding boxes

#### `ThreeStepVerification.tsx`
- Wrapper component for the verification flow
- Progress tracking and step management
- Results display and retry functionality
- Integration with signup process

### Backend Enhancements

#### Enhanced Lip Sync Endpoint (`/api/lip-sync-check`)
- **MediaPipe integration** for facial landmark detection
- **Real video processing** instead of simulation
- **Lip movement analysis** using landmark coordinates
- **Audio-visual correlation** analysis
- **Detailed metrics** including:
   - Duration analyzed
   - Frames processed
   - Movement variance
   - Audio presence detection

### Dependencies Added

#### Frontend
```bash
npm install face-api.js @tensorflow/tfjs
```

#### Backend
```bash
pip install mediapipe opencv-python-headless
```

### Face-API Models
Pre-trained models are automatically downloaded to `public/models/`:
- Tiny Face Detector
- Face Landmark 68-point
- Face Recognition
- Face Expression

## Data Flow

### 1. Face Verification
```
Video Stream → Canvas Capture → Base64 Image → Backend API → Face Recognition → Result
```

### 2. Voice Verification
```
Audio Stream → MediaRecorder → Blob → Backend API → Voice Recognition → Result
```

### 3. Lip Sync Verification
```
Video + Audio → MediaRecorder → Base64 Video + Audio Blob → MediaPipe Analysis → Result
```

## API Endpoints

### Enhanced `/api/lip-sync-check`
**Input:**
- `video_data`: Base64 encoded video
- `audio_data`: Audio file (WAV/WebM)
- `duration`: Recording duration (default: 4 seconds)

**Output:**
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

## Signup Flow Integration

### Updated Process
1. **Credentials Entry** (Step 1 of 3)
2. **Profile Selection** (Step 2 of 3)
3. **Biometric Verification** (Step 3 of 3)
   - Face verification with bounding boxes
   - Voice verification with audio recording
   - Lip sync verification with video analysis

### User Experience
- **Simultaneous permissions** requested at start
- **Real-time feedback** with bounding boxes
- **Progressive verification** with clear step indicators
- **Retry functionality** for failed steps
- **Detailed results** with confidence scores

## Configuration

### Camera Settings
- Resolution: 640x480 (ideal)
- Facing mode: User (front camera)
- Frame rate: 30 FPS

### Audio Settings
- Sample rate: 44.1 kHz
- Echo cancellation: Enabled
- Noise suppression: Enabled

### Face Detection Settings
- Max faces: 1
- Detection confidence: 0.5
- Tracking confidence: 0.5
- Landmark refinement: Enabled

## Security Features

- **Real-time validation** prevents spoofing
- **Multi-modal verification** (face + voice + lip sync)
- **Confidence thresholds** ensure quality
- **Temporary file cleanup** on backend
- **Base64 encoding** for secure data transfer

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Limited MediaRecorder support
- **Mobile browsers**: Varies by device

## Performance Considerations

- **Face detection**: ~10ms per frame
- **Video processing**: Depends on duration
- **Memory usage**: Temporary files cleaned automatically
- **Network**: Base64 encoding increases payload size

## Troubleshooting

### Common Issues

1. **Camera/Mic permissions denied**
   - Check browser permissions
   - Ensure HTTPS in production

2. **Face detection not working**
   - Verify models downloaded to `public/models/`
   - Check lighting conditions
   - Ensure face is clearly visible

3. **Lip sync analysis fails**
   - Verify MediaPipe installation
   - Check video format compatibility
   - Ensure sufficient lip movement

### Debug Information

Enable debug logging by checking browser console for:
- Face detection results
- MediaRecorder status
- API response details
- Error messages with stack traces


### Available Routes
- `/login` - User login
- `/signup` - Multi-step user registration
- `/auth-mode-selection` - Choose authentication method
- `/face-auth` - Face authentication page
- `/voice-auth` - Voice authentication page
- `/combined-auth` - Combined face + voice authentication
- `/dashboard` - Protected dashboard (after successful authentication)

## 🛠️ Development Workflow

### Adding New People to Recognition System

1. **Face Recognition**:
    - Add person's folder to `face_recog/face_dataset/`
    - Add face images to the folder
    - Run `python face_recog/train_face.py`

2. **Voice Recognition**:
    - Add person's folder to `voice_recog/voice_dataset/`
    - Add voice recordings (.wav files) to the folder
    - Run `python voice_recog/train_voice.py`

3. **Restart Backend**: Restart `python app.py` to load new models

### Testing the Integration

1. **Backend Health Check**:
   ```bash
   curl http://localhost:8000/api/health
   ```

2. **Frontend Connection**:
    - Open browser to `http://localhost:5173`
    - Check browser console for any API connection errors

## 🐛 Troubleshooting

### Common Issues

1. **Backend not starting**:
    - Check if all Python dependencies are installed
    - Verify port 8000 is not in use
    - Check `.env` file exists

2. **Frontend can't connect to backend**:
    - Ensure backend is running on port 8000
    - Check CORS settings in `app.py`
    - Verify `.env` has correct `VITE_API_BASE_URL`

3. **Recognition not working**:
    - Ensure models are trained (`face_encodings.pkl` and `voice_embeddings.pkl` exist)
    - Check if sample data exists in dataset folders
    - Verify file permissions on model files

### Logs and Debugging

- **Backend logs**: Check terminal running `python app.py`
- **Frontend logs**: Check browser developer console
- **API requests**: Use browser Network tab to inspect API calls

## 📁 Project Structure

```
biometric-auth/
├── src/
│   ├── components/auth/       # Face & Voice auth components
│   ├── lib/api.ts            # Backend API integration
│   └── ...
├── face_recog/               # Face recognition modules
├── voice_recog/              # Voice recognition modules
├── models/                   # Trained model files
├── app.py                    # FastAPI server
├── .env                      # Environment configuration
├── package.json              # Frontend dependencies
├── requirements.txt          # Backend dependencies
└── INTEGRATION_GUIDE.md
```

## 🔐 Security Notes

- Biometric data is stored in Supabase with encryption
- API endpoints include basic validation
- CORS is configured for development (update for production)
- Consider adding authentication middleware for production use

## 🚀 Production Deployment

For production deployment:

1. Update CORS origins in `app.py`
2. Set proper environment variables
3. Use production WSGI server (gunicorn, uvicorn)
4. Configure HTTPS for both frontend and backend
5. Set up proper database backups for Supabase
