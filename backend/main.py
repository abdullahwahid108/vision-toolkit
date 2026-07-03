from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import io

from cv_utils import (
    to_grayscale, get_image_info, apply_canny,
    apply_gaussian_blur, apply_median_blur,
    apply_binary_threshold, apply_adaptive_threshold,
    draw_rectangle, draw_circle, draw_line, draw_text, hex_to_bgr,
    adjust_brightness_contrast, rotate_image, resize_image,
    generate_histogram, crop_image
)

app = FastAPI(title="Vision Toolkit")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_FILE_SIZE_MB = 15


# ============================================
# Global error handler — catches anything unexpected
# and returns clean JSON instead of a raw traceback
# ============================================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"error": "Something went wrong while processing the image.", "detail": str(exc)},
    )


# ============================================
# Shared helper: safely read + decode an upload
# ============================================
async def load_image(file: UploadFile) -> np.ndarray:
    if file.content_type is None or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a recognized image type.")

    contents = await file.read()

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(contents) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_FILE_SIZE_MB}MB.")

    npimg = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(npimg, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image. The file may be corrupted or an unsupported format.")

    return img, contents


def encode_response(img: np.ndarray) -> StreamingResponse:
    success, encoded = cv2.imencode(".png", img)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to encode processed image.")
    return StreamingResponse(io.BytesIO(encoded.tobytes()), media_type="image/png")


# ============================================
# Image Info
# ============================================
@app.post("/image-info")
async def image_info(file: UploadFile = File(...)):
    img, contents = await load_image(file)
    return get_image_info(img, len(contents))


# ============================================
# Grayscale
# ============================================
@app.post("/grayscale")
async def grayscale(file: UploadFile = File(...)):
    img, _ = await load_image(file)
    result = to_grayscale(img)
    return encode_response(result)


# ============================================
# Edge Detection
# ============================================
@app.post("/edge-detection")
async def edge_detection(file: UploadFile = File(...), threshold1: int = 100, threshold2: int = 200):
    img, _ = await load_image(file)
    result = apply_canny(img, threshold1, threshold2)
    return encode_response(result)


# ============================================
# Blur Filters
# ============================================
@app.post("/blur/gaussian")
async def gaussian_blur(file: UploadFile = File(...), kernel_size: int = 5):
    img, _ = await load_image(file)
    result = apply_gaussian_blur(img, kernel_size)
    return encode_response(result)


@app.post("/blur/median")
async def median_blur(file: UploadFile = File(...), kernel_size: int = 5):
    img, _ = await load_image(file)
    result = apply_median_blur(img, kernel_size)
    return encode_response(result)


# ============================================
# Thresholding
# ============================================
@app.post("/threshold/binary")
async def binary_threshold(file: UploadFile = File(...), thresh_value: int = 127):
    img, _ = await load_image(file)
    result = apply_binary_threshold(img, thresh_value)
    return encode_response(result)


@app.post("/threshold/adaptive")
async def adaptive_threshold(file: UploadFile = File(...), block_size: int = 11, c: int = 2):
    img, _ = await load_image(file)
    result = apply_adaptive_threshold(img, block_size, c)
    return encode_response(result)


# ============================================
# Drawing Functions
# ============================================
@app.post("/draw/rectangle")
async def rectangle_route(
    file: UploadFile = File(...),
    x1: int = 50, y1: int = 50, x2: int = 150, y2: int = 150,
    color: str = "00ff00", thickness: int = 2
):
    img, _ = await load_image(file)
    result = draw_rectangle(img, x1, y1, x2, y2, hex_to_bgr(color), thickness)
    return encode_response(result)


@app.post("/draw/circle")
async def circle_route(
    file: UploadFile = File(...),
    cx: int = 100, cy: int = 100, radius: int = 50,
    color: str = "00ff00", thickness: int = 2
):
    img, _ = await load_image(file)
    result = draw_circle(img, cx, cy, radius, hex_to_bgr(color), thickness)
    return encode_response(result)


@app.post("/draw/line")
async def line_route(
    file: UploadFile = File(...),
    x1: int = 50, y1: int = 50, x2: int = 150, y2: int = 150,
    color: str = "00ff00", thickness: int = 2
):
    img, _ = await load_image(file)
    result = draw_line(img, x1, y1, x2, y2, hex_to_bgr(color), thickness)
    return encode_response(result)


@app.post("/draw/text")
async def text_route(
    file: UploadFile = File(...),
    text: str = "Hello", x: int = 50, y: int = 50,
    color: str = "00ff00", font_scale: float = 1.0, thickness: int = 2
):
    img, _ = await load_image(file)
    result = draw_text(img, text, x, y, hex_to_bgr(color), font_scale, thickness)
    return encode_response(result)


# ============================================
# Brightness / Contrast
# ============================================
@app.post("/adjust")
async def adjust_route(file: UploadFile = File(...), brightness: int = 0, contrast: int = 0):
    img, _ = await load_image(file)
    result = adjust_brightness_contrast(img, brightness, contrast)
    return encode_response(result)


# ============================================
# Rotate / Resize
# ============================================
@app.post("/rotate")
async def rotate_route(file: UploadFile = File(...), angle: float = 0):
    img, _ = await load_image(file)
    result = rotate_image(img, angle)
    return encode_response(result)


@app.post("/resize")
async def resize_route(file: UploadFile = File(...), scale_percent: float = 100):
    if scale_percent <= 0:
        raise HTTPException(status_code=400, detail="scale_percent must be greater than 0.")
    img, _ = await load_image(file)
    result = resize_image(img, scale_percent=scale_percent)
    return encode_response(result)


# ============================================
# Cropping
# ============================================
@app.post("/crop")
async def crop_route(file: UploadFile = File(...), x1: int = 0, y1: int = 0, x2: int = 100, y2: int = 100):
    img, _ = await load_image(file)
    result = crop_image(img, x1, y1, x2, y2)
    return encode_response(result)


# ============================================
# Histogram
# ============================================
@app.post("/histogram")
async def histogram_route(file: UploadFile = File(...)):
    img, _ = await load_image(file)
    chart_bytes = generate_histogram(img)
    return StreamingResponse(io.BytesIO(chart_bytes), media_type="image/png")


# ============================================
# Serve the frontend — MUST be added last, after all API routes
# ============================================
app.mount("/", StaticFiles(directory="../frontend", html=True), name="frontend")