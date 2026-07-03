import cv2
import numpy as np
import io
import matplotlib
matplotlib.use("Agg")  # non-GUI backend, required for server-side rendering
import matplotlib.pyplot as plt


# ============================================
# Image Info
# ============================================
def get_image_info(img: np.ndarray, file_size_bytes: int) -> dict:
    height, width = img.shape[:2]
    channels = img.shape[2] if len(img.shape) == 3 else 1

    return {
        "width": width,
        "height": height,
        "resolution": f"{width} x {height}",
        "file_size_kb": round(file_size_bytes / 1024, 2),
        "channels": channels,
    }


# ============================================
# Grayscale
# ============================================
def to_grayscale(img: np.ndarray) -> np.ndarray:
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


# ============================================
# Edge Detection
# ============================================
def apply_canny(img: np.ndarray, threshold1: int = 100, threshold2: int = 200) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, threshold1, threshold2)
    return edges


# ============================================
# Blur Filters
# ============================================
def apply_gaussian_blur(img: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    if kernel_size % 2 == 0:
        kernel_size += 1
    return cv2.GaussianBlur(img, (kernel_size, kernel_size), 0)


def apply_median_blur(img: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    if kernel_size % 2 == 0:
        kernel_size += 1
    return cv2.medianBlur(img, kernel_size)


# ============================================
# Thresholding
# ============================================
def apply_binary_threshold(img: np.ndarray, thresh_value: int = 127) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, result = cv2.threshold(gray, thresh_value, 255, cv2.THRESH_BINARY)
    return result


def apply_adaptive_threshold(img: np.ndarray, block_size: int = 11, c: int = 2) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if block_size % 2 == 0:
        block_size += 1
    if block_size < 3:
        block_size = 3

    result = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size, c
    )
    return result


# ============================================
# Drawing Functions
# ============================================
def hex_to_bgr(hex_color: str):
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        hex_color = "00ff00"  # fallback to green on bad input
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return (b, g, r)


def draw_rectangle(img: np.ndarray, x1: int, y1: int, x2: int, y2: int,
                    color=(0, 255, 0), thickness: int = 2) -> np.ndarray:
    result = img.copy()
    cv2.rectangle(result, (x1, y1), (x2, y2), color, thickness)
    return result


def draw_circle(img: np.ndarray, cx: int, cy: int, radius: int,
                 color=(0, 255, 0), thickness: int = 2) -> np.ndarray:
    result = img.copy()
    cv2.circle(result, (cx, cy), max(1, radius), color, thickness)
    return result


def draw_line(img: np.ndarray, x1: int, y1: int, x2: int, y2: int,
              color=(0, 255, 0), thickness: int = 2) -> np.ndarray:
    result = img.copy()
    cv2.line(result, (x1, y1), (x2, y2), color, thickness)
    return result


def draw_text(img: np.ndarray, text: str, x: int, y: int,
              color=(0, 255, 0), font_scale: float = 1.0, thickness: int = 2) -> np.ndarray:
    result = img.copy()
    cv2.putText(result, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX,
                font_scale, color, thickness)
    return result


# ============================================
# Brightness / Contrast
# ============================================
def adjust_brightness_contrast(img: np.ndarray, brightness: int = 0, contrast: int = 0) -> np.ndarray:
    brightness = max(-100, min(100, brightness))
    contrast = max(-100, min(100, contrast))

    f = (259 * (contrast + 255)) / (255 * (259 - contrast))

    result = img.astype(np.float32)
    result = f * (result - 128) + 128 + brightness
    result = np.clip(result, 0, 255).astype(np.uint8)

    return result


# ============================================
# Rotate / Resize
# ============================================
def rotate_image(img: np.ndarray, angle: float) -> np.ndarray:
    height, width = img.shape[:2]
    center = (width // 2, height // 2)

    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)

    cos = abs(matrix[0, 0])
    sin = abs(matrix[0, 1])
    new_width = int((height * sin) + (width * cos))
    new_height = int((height * cos) + (width * sin))

    matrix[0, 2] += (new_width / 2) - center[0]
    matrix[1, 2] += (new_height / 2) - center[1]

    result = cv2.warpAffine(img, matrix, (new_width, new_height))
    return result


def resize_image(img: np.ndarray, width: int = None, height: int = None, scale_percent: float = None) -> np.ndarray:
    h, w = img.shape[:2]

    if scale_percent is not None:
        new_w = int(w * scale_percent / 100)
        new_h = int(h * scale_percent / 100)
    elif width is not None and height is not None:
        new_w, new_h = width, height
    else:
        return img

    new_w = max(1, new_w)
    new_h = max(1, new_h)

    result = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return result


# ============================================
# Cropping
# ============================================
def crop_image(img: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> np.ndarray:
    h, w = img.shape[:2]

    x1, x2 = sorted([max(0, min(x1, w)), max(0, min(x2, w))])
    y1, y2 = sorted([max(0, min(y1, h)), max(0, min(y2, h))])

    if x2 - x1 < 1 or y2 - y1 < 1:
        return img  # invalid/too-small selection, return unchanged

    return img[y1:y2, x1:x2]


# ============================================
# Histogram
# ============================================
def generate_histogram(img: np.ndarray) -> bytes:
    is_gray = len(img.shape) == 2

    fig, ax = plt.subplots(figsize=(5, 3.5))

    if is_gray:
        hist = cv2.calcHist([img], [0], None, [256], [0, 256])
        ax.plot(hist, color="black")
        ax.set_title("Grayscale Histogram")
    else:
        colors = ("b", "g", "r")
        labels = ("Blue", "Green", "Red")
        for i, (color, label) in enumerate(zip(colors, labels)):
            hist = cv2.calcHist([img], [i], None, [256], [0, 256])
            ax.plot(hist, color=color, label=label)
        ax.legend()
        ax.set_title("Color Histogram")

    ax.set_xlabel("Pixel Intensity")
    ax.set_ylabel("Frequency")
    ax.set_xlim([0, 256])
    fig.tight_layout()

    buf = io.BytesIO()
    fig.savefig(buf, format="png")
    plt.close(fig)
    buf.seek(0)

    return buf.getvalue()