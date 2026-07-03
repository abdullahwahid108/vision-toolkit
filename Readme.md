# Vision Toolkit 🎛️

A full-stack image processing web app built with **FastAPI + OpenCV** on the backend and vanilla **HTML/CSS/JavaScript** on the frontend. Upload an image and apply a chain of computer vision operations — grayscale, edge detection, blurring, thresholding, drawing, and more — with full undo/reset history.

![status](https://img.shields.io/badge/status-complete-brightgreen)

## Features

**Core**
- Image upload with live preview
- Image info (width, height, resolution, file size, channels)
- Grayscale conversion
- Canny edge detection with adjustable thresholds
- Gaussian & Median blur with adjustable kernel size
- Binary & Adaptive thresholding
- Drawing tools: rectangle, circle, line, text (click/drag directly on the image)
- Save/download the processed result

**Bonus**
- Histogram visualization (per-channel)
- Brightness & contrast adjustment with live preview
- Rotation
- Resize
- Cropping (click & drag selection)
- Webcam capture

**Architecture**
- Connected processing pipeline — each operation applies to the *result* of the previous one, not the original upload
- Undo / Reset history stack
- Clean error handling on every endpoint (invalid files, corrupted images, oversized uploads)
- Loading indicator during processing
- Responsive 3-column layout with a sticky image preview

## Tech Stack

- **Backend:** Python, FastAPI, OpenCV (`opencv-python-headless`), NumPy, Matplotlib (histograms)
- **Frontend:** HTML5, CSS3, vanilla JavaScript (Canvas API for drawing/cropping, MediaDevices API for webcam)
- **Server:** Uvicorn (ASGI)

## Project Structure

```
vision-toolkit/
│
├── backend/
│   ├── main.py           # FastAPI app & routes
│   ├── cv_utils.py        # All OpenCV processing functions
│   ├── run.py              # Launcher (starts server + opens browser)
│   └── requirements.txt
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── README.md
```

## Running Locally

1. Clone the repo and set up a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate        # Windows
   source venv/bin/activate     # Mac/Linux
   ```

2. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Launch:
   ```bash
   cd backend
   python run.py
   ```

   Your browser will open automatically to `http://127.0.0.1:8000`.

## API Overview

All processing endpoints accept a `multipart/form-data` image upload and return a PNG. Parameters are passed as query strings.

| Endpoint | Description |
|---|---|
| `POST /image-info` | Returns JSON metadata |
| `POST /grayscale` | Grayscale conversion |
| `POST /edge-detection` | Canny edge detection (`threshold1`, `threshold2`) |
| `POST /blur/gaussian`, `/blur/median` | Blur filters (`kernel_size`) |
| `POST /threshold/binary`, `/threshold/adaptive` | Thresholding |
| `POST /draw/rectangle`, `/circle`, `/line`, `/text` | Drawing tools |
| `POST /adjust` | Brightness/contrast (`brightness`, `contrast`) |
| `POST /rotate` | Rotation (`angle`) |
| `POST /resize` | Resize (`scale_percent`) |
| `POST /crop` | Cropping (`x1`, `y1`, `x2`, `y2`) |
| `POST /histogram` | Returns a rendered histogram chart |

Interactive API docs available at `/docs` when the server is running.

## Notes

- Uses `opencv-python-headless` rather than `opencv-python`, since this app never displays images in a native GUI window — only processes and returns them over HTTP.
- Webcam capture requires `localhost` or HTTPS — browsers block camera access on plain HTTP for any other host.
- Uploads are capped at 15MB by default (adjustable in `main.py`).

## License

Personal / educational project.