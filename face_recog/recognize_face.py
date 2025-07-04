import face_recognition
import cv2
import numpy as np
import os

def recognize_from_image(face_data, image_path):
    """
    Recognize a face from a static image.
    Returns: (matched_name, similarity_percent)
    """
    image = face_recognition.load_image_file(image_path)
    encodings = face_recognition.face_encodings(image)

    if not encodings:
        print("[ERROR] No face in image.")
        return None, None

    return match_face(encodings[0], face_data)


def recognize_from_camera(face_data):
    """
    Recognize faces from live webcam feed.
    Returns: list of (matched_name, similarity_percent)
    """
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    print("[INFO] Press Q to quit after detection.")

    recognized_faces = {}  # name -> list of similarities
    frame_count = 0
    last_boxes = []
    last_labels = []

    while True:
        ret, frame = cap.read()
        if not ret:
            continue

        # Process every 10 frame for performance
        if frame_count % 10 == 0:
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

            face_locations = face_recognition.face_locations(rgb_small)
            encodings = face_recognition.face_encodings(rgb_small, face_locations)

            last_boxes = []
            last_labels = []

            for (top, right, bottom, left), encoding in zip(face_locations, encodings):
                name, sim = match_face(encoding, face_data)

                # Scale back up the coordinates
                top *= 4
                right *= 4
                bottom *= 4
                left *= 4

                # Box color by similarity
                if sim > 70:
                    color = (0, 255, 0)
                elif sim > 40:
                    color = (0, 255, 255)
                else:
                    color = (0, 0, 255)

                label = f"{name or 'Unknown'} ({sim:.1f}%)"
                last_boxes.append((top, right, bottom, left, color))
                last_labels.append(label)

                # Store recognized names with similarity
                if name:
                    recognized_faces.setdefault(name, []).append(sim)

        # Draw boxes and labels from last detection
        for ((top, right, bottom, left, color), label) in zip(last_boxes, last_labels):
            cv2.rectangle(frame, (left, top), (right, bottom), color, 2)
            cv2.putText(frame, label, (left, top - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        cv2.imshow("Camera", frame)
        frame_count += 1

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

    # Aggregate and return average similarity for each name
    final_results = []
    for name, sims in recognized_faces.items():
        avg_sim = sum(sims) / len(sims)
        final_results.append((name, avg_sim))

    return final_results


def match_face(encoding, face_data, threshold=0.6):
    """
    Compare input encoding to known faces.
    Returns: (best_match_name, similarity_percent)
    """
    best_match = None
    best_dist = float("inf")

    for name, known_encoding in face_data.items():
        dist = np.linalg.norm(encoding - known_encoding)
        if dist < best_dist:
            best_match = name
            best_dist = dist

    similarity = max(0.0, 1.0 - best_dist) * 100  # approx. similarity %

    if best_dist < threshold:
        print(f"✅ Face matched: {best_match} (distance: {best_dist:.2f}, similarity: {similarity:.2f}%)")
        return best_match, similarity
    else:
        print("[INFO] No confident face match.")
        return None, similarity
