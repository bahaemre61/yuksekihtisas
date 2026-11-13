#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Offline vesikalik (pasaport) fotograf kirpma araci.

A4 kagida basilmis / A4 uzerine yerlestirilmis vesikalik fotografin kamera ile
cekilmis halini alir; yuzu yerel olarak tespit eder, goz hizasina gore duzler,
yuzu merkeze alacak sekilde tam 4:5 (vars. 800x1000) oraninda kirpar.

Gereksinimler (tamami yerel, internet / bulut AI yok):
  - opencv-python  (Haar cascade'ler paketle gelir)
  - mediapipe      (yerel .tflite / .task model dosyasi ile)
  - numpy
  - Pillow         (opsiyonel: EXIF yonunu duzeltmek icin)

Model arama sirasi:
  1. FACE_DETECTOR_MODEL ortam degiskeni
  2. tools/models/face_detector.tflite  (depoda gelir)
  3. tools/models/face_detector.task
  4. tools/face_detector.task

Kullanim:
  python tools/vesikalik.py <girdi> [cikti] [--width W] [--height H]
                           [--quality Q] [--debug] [--no-align] [--no-paper]

  <girdi>  Bir dosya yolu ya da bir klasor yolu olabilir.
           Klasor verilirse icindeki tum gorseller islenir.
  [cikti]  Dosya icin: kaydedilecek dosya yolu (varsayilan: <ad>_vesikalik.jpg)
           Klasor icin: cikti klasoru (varsayilan: <girdi>_vesikalik/)

Ornek:
  python tools/vesikalik.py "Bos ornek/ogrenci" output_images
"""

import argparse
import math
import os
import sys
from pathlib import Path

import cv2
import numpy as np

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".webp", ".tif", ".tiff"}
DEFAULT_RATIO = 0.8  # 4:5

# ---------------------------------------------------------------------------
# Yerel yuz tespiti (MediaPipe tasks + Haar cascade fallback)
# ---------------------------------------------------------------------------
try:
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python.vision import FaceDetector, FaceDetectorOptions

    HAVE_MP = True
except Exception:  # mediapipe yoksa yalnizca OpenCV kullanilir
    HAVE_MP = False

_HERE = Path(__file__).resolve().parent
MODEL_CANDIDATES = [
    os.environ.get("FACE_DETECTOR_MODEL"),
    _HERE / "models" / "face_detector.tflite",
    _HERE / "models" / "face_detector.task",
    _HERE / "face_detector.task",
    _HERE / "face_detector.tflite",
]

_DETECTOR = None


def find_model_path():
    for candidate in MODEL_CANDIDATES:
        if candidate and Path(candidate).is_file():
            return Path(candidate)
    return None


def get_detector():
    """MediaPipe FaceDetector'i tek sefer olusturup tekrar kullanir."""
    global _DETECTOR
    if not HAVE_MP:
        return None
    if _DETECTOR is not None:
        return _DETECTOR
    model = find_model_path()
    if model is None:
        return None
    try:
        options = FaceDetectorOptions(
            base_options=BaseOptions(model_asset_path=str(model)),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            min_detection_confidence=0.3,
        )
        _DETECTOR = FaceDetector.create_from_options(options)
        print(f"  i Yerel model: {model.name}")
        return _DETECTOR
    except Exception as exc:
        print(f"  ! MediaPipe model yuklenemedi: {exc}")
        return None


def detect_faces_mediapipe(img_bgr, label=""):
    detector = get_detector()
    if detector is None:
        return []
    try:
        h, w = img_bgr.shape[:2]
        rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        result = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        detections = []
        for det in result.detections or []:
            bb = det.bounding_box
            keypoints = [(float(k.x) * w, float(k.y) * h) for k in (det.keypoints or [])]
            score = float(det.categories[0].score) if det.categories else 0.0
            detections.append(
                {
                    "box": (
                        int(bb.origin_x),
                        int(bb.origin_y),
                        int(bb.width),
                        int(bb.height),
                    ),
                    "keypoints": keypoints,
                    "score": score,
                    "source": "mediapipe",
                }
            )
        if label:
            print(f"    [{label}] MediaPipe: {len(detections)} yuz tespit edildi")
            for d in detections:
                print(f"      box={d['box']}, score={d['score']:.2f}, kp={len(d['keypoints'])}")
        return detections
    except Exception as exc:
        print(f"  ! MediaPipe hatasi: {exc}")
        return []


def detect_faces_haar(img_bgr):
    """OpenCV ile gelen Haar cascade'ler (paket icinde, indirme yok)."""
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    cascade_files = [
        "haarcascade_frontalface_default.xml",
        "haarcascade_frontalface_alt2.xml",
        "haarcascade_frontalface_alt.xml",
        "haarcascade_profileface.xml",
    ]
    for name in cascade_files:
        path = os.path.join(cv2.data.haarcascades, name)
        cascade = cv2.CascadeClassifier(path)
        if cascade.empty():
            continue
        found = cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE,
        )
        if len(found):
            return [
                {
                    "box": (int(x), int(y), int(w), int(h)),
                    "keypoints": [],
                    "score": 0.5,
                    "source": "haar",
                }
                for (x, y, w, h) in sorted(found, key=lambda b: b[2] * b[3], reverse=True)
            ]
    return []


def _scale_detections(detections, factor):
    scaled = []
    for det in detections:
        x, y, w, h = det["box"]
        scaled.append(
            {
                "box": (int(x / factor), int(y / factor), int(w / factor), int(h / factor)),
                "keypoints": [(px / factor, py / factor) for px, py in det.get("keypoints", [])],
                "score": det.get("score", 0.0),
                "source": det.get("source", "?"),
            }
        )
    return scaled


def refine_with_mediapipe(img_bgr, det, target=640, min_conf=0.2):
    """Haar'in buldugu yuzun cevresini buyutup MediaPipe'a verir.

    BlazeFace modeli goruntuyu sabit kucuk bir giris boyutuna olceklendirdigi
    icin A4 sayfasi uzerindeki kucuk vesikalik fotograflari tam karede
    yakalayamaz. Yuzun etrafindaki bolge kirpilip buyutulunce model hem yuzu
    hem de goz anahtar noktalarini dondurur (duz hizalama icin gerekli).
    """
    x, y, w, h = det["box"]
    pad = 1.5  # yuzun her yanina %150 pay (daha bolge)
    x0 = max(0, int(x - pad * w))
    y0 = max(0, int(y - pad * h))
    x1 = min(img_bgr.shape[1], int(x + w + pad * w))
    y1 = min(img_bgr.shape[0], int(y + h + pad * h))
    if x1 - x0 < 24 or y1 - y0 < 24:
        return None

    region = img_bgr[y0:y1, x0:x1]
    scale = max(1.0, target / float(max(region.shape[:2])))
    if scale > 1.01:
        region = cv2.resize(
            region, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC
        )
    found = detect_faces_mediapipe_lowconf(region, min_conf=min_conf)
    if not found:
        return None

    best = pick_best_face(found, region.shape[1], region.shape[0])
    if best is None:
        return None

    bx, by, bw, bh = best["box"]
    return {
        "box": (
            int(x0 + bx / scale),
            int(y0 + by / scale),
            max(1, int(bw / scale)),
            max(1, int(bh / scale)),
        ),
        "keypoints": [
            (x0 + px / scale, y0 + py / scale) for px, py in best.get("keypoints", [])
        ],
        "score": best.get("score", 0.0),
        "source": "mediapipe (yakinlastirma)",
    }


def detect_faces_mediapipe_lowconf(img_bgr, min_conf=0.2):
    """MediaPipe dusuk guven esigiyle (kucuk yuzler icin)."""
    detector = get_detector()
    if detector is None:
        return []
    try:
        h, w = img_bgr.shape[:2]
        rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        result = detector.detect(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb))
        detections = []
        for det in result.detections or []:
            score = float(det.categories[0].score) if det.categories else 0.0
            if score < min_conf:
                continue
            bb = det.bounding_box
            keypoints = [(float(k.x) * w, float(k.y) * h) for k in (det.keypoints or [])]
            detections.append(
                {
                    "box": (
                        int(bb.origin_x),
                        int(bb.origin_y),
                        int(bb.width),
                        int(bb.height),
                    ),
                    "keypoints": keypoints,
                    "score": score,
                    "source": "mediapipe",
                }
            )
        return detections
    except Exception as exc:
        return []


def detect_faces(img_bgr, verbose=False):
    """Once MediaPipe; olmazsa Haar + yakinlastirmali MediaPipe; en son Haar."""
    detections = detect_faces_mediapipe(img_bgr, "orijinal" if verbose else "")
    if not detections:
        haar_faces = detect_faces_haar(img_bgr)
        if verbose and haar_faces:
            print(f"    Haar: {len(haar_faces)} aday bulundu")
        if haar_faces:
            refined = []
            for face in sorted(
                haar_faces, key=lambda d: d["box"][2] * d["box"][3], reverse=True
            )[:3]:
                better = refine_with_mediapipe(img_bgr, face)
                if better is not None:
                    refined.append(better)
            detections = refined or haar_faces
    if verbose and detections:
        best = pick_best_face(detections, img_bgr.shape[1], img_bgr.shape[0])
        if best:
            print(f"    Secilen yuz: box={best['box']}, source={best['source']}, score={best.get('score',0):.2f}")

    # Yuz cok kucukse goruntuyu buyutup tekrar dene (buyuk goruntulerde de gecerli)
    img_h2, img_w2 = img_bgr.shape[:2]
    best_face = pick_best_face(detections, img_w2, img_h2) if detections else None
    need_upscale = (
        not detections
        or (best_face is not None and best_face["box"][2] * best_face["box"][3] < 0.01 * img_w2 * img_h2)
    )
    if need_upscale and max(img_bgr.shape[:2]) >= 600:
        factor = 2.0
        upscaled = cv2.resize(
            img_bgr, None, fx=factor, fy=factor, interpolation=cv2.INTER_CUBIC
        )
        up_detections = detect_faces_mediapipe(upscaled, "buyuklestirildi" if verbose else "") or detect_faces_haar(upscaled)
        if up_detections:
            up_detections = _scale_detections(up_detections, factor)
            if verbose:
                up_best = pick_best_face(up_detections, upscaled.shape[1], upscaled.shape[0])
                if up_best:
                    print(f"    Buyuklestirilmis tespit: box={up_best['box']}, source={up_best['source']}, score={up_best.get('score',0):.2f}")
            detections = up_detections

    return detections


def pick_best_face(detections, img_w, img_h):
    if not detections:
        return None

    def rank(det):
        x, y, w, h = det["box"]
        area_ratio = (w * h) / float(img_w * img_h)
        cx = (x + w / 2.0) / img_w
        cy = (y + h / 2.0) / img_h
        center_bonus = 1.0 - min(1.0, math.hypot(cx - 0.5, cy - 0.45))
        return area_ratio * (0.6 + 0.4 * det.get("score", 0.5)) * (0.75 + 0.25 * center_bonus)

    return max(detections, key=rank)


# ---------------------------------------------------------------------------
# A4 kagidi tespiti + perspektif duzeltme
# ---------------------------------------------------------------------------
def order_points(points):
    pts = np.array(points, dtype=np.float32)
    s = pts.sum(axis=1)
    diff = np.diff(pts, axis=1)
    return np.array(
        [
            pts[np.argmin(s)],  # sol ust
            pts[np.argmin(diff)],  # sag ust
            pts[np.argmax(s)],  # sag alt
            pts[np.argmax(diff)],  # sol alt
        ],
        dtype=np.float32,
    )


def _paper_candidate(contour, img_w, img_h):
    """Konturu A4 sayfasi adayi olarak dogrular; uygun degilse None doner."""
    area = cv2.contourArea(contour)
    if area < 0.15 * img_w * img_h or area > 0.94 * img_w * img_h:
        return None
    perimeter = cv2.arcLength(contour, True)
    if perimeter <= 0:
        return None
    approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
    if len(approx) != 4 or not cv2.isContourConvex(approx):
        return None

    pts = order_points(approx.reshape(4, 2))
    # Goruntunun kendi cercevesi de "dortgen" gorunur; onu sayfa sanmayalim.
    margin_x = 0.02 * img_w
    margin_y = 0.02 * img_h
    on_border = sum(
        1
        for px, py in pts
        if px < margin_x
        or py < margin_y
        or px > img_w - margin_x
        or py > img_h - margin_y
    )
    if on_border >= 3:
        return None

    width_a = np.linalg.norm(pts[1] - pts[0])
    width_b = np.linalg.norm(pts[2] - pts[3])
    height_a = np.linalg.norm(pts[3] - pts[0])
    height_b = np.linalg.norm(pts[2] - pts[1])
    ratio = max(width_a, width_b) / max(1.0, max(height_a, height_b))
    if not (0.4 <= ratio <= 2.5):
        return None
    return area, pts


def find_paper_quad(img_bgr):
    """Goruntudeki en buyuk dortgen (A4 sayfasi) adayini bulur."""
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)

    masks = [
        cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
        cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 51, 5
        ),
    ]

    candidates = []
    kernel = np.ones((7, 7), np.uint8)
    for mask in masks:
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:6]:
            candidate = _paper_candidate(contour, w, h)
            if candidate is not None:
                candidates.append(candidate)

    if not candidates:
        return None

    return max(candidates, key=lambda item: item[0])[1]


def warp_paper(img_bgr, quad):
    """A4 dortgenini perspektif duzelterek dikdortgen goruntuye cevirir."""
    tl, tr, br, bl = quad
    width = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    height = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    if width < 50 or height < 50:
        return None
    dst = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype=np.float32,
    )
    matrix = cv2.getPerspectiveTransform(quad.astype(np.float32), dst)
    return cv2.warpPerspective(
        img_bgr, matrix, (width, height), flags=cv2.INTER_CUBIC
    )


# ---------------------------------------------------------------------------
# Hizalama ve kirpma
# ---------------------------------------------------------------------------
def eye_angle(det):
    """Goz cizgisinin yatayla yaptigi aci (derece). 0'a yakin = duz."""
    keypoints = det.get("keypoints") or []
    if len(keypoints) < 2:
        return 0.0
    (x0, y0), (x1, y1) = keypoints[0], keypoints[1]
    if abs(x1 - x0) < 1.0:
        return 0.0
    angle = math.degrees(math.atan2(y1 - y0, x1 - x0))
    return angle if abs(angle) <= 30.0 else 0.0


def rotate_image(img_bgr, angle):
    """Goruntuyu aci kadar dondurur; kenarlar kirpilmasin diye tuval buyutulur."""
    h, w = img_bgr.shape[:2]
    center = (w / 2.0, h / 2.0)
    matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    cos, sin = abs(matrix[0, 0]), abs(matrix[0, 1])
    new_w = int(h * sin + w * cos)
    new_h = int(h * cos + w * sin)
    matrix[0, 2] += new_w / 2.0 - center[0]
    matrix[1, 2] += new_h / 2.0 - center[1]
    return cv2.warpAffine(
        img_bgr,
        matrix,
        (new_w, new_h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE,
    )


def compute_crop(img_w, img_h, det, ratio=DEFAULT_RATIO):
    """Yuzu/omuzlari kadraja sigdiran 4:5 kirpma kutusu."""
    x, y, w, h = det["box"]
    keypoints = det.get("keypoints") or []

    if len(keypoints) >= 2:
        # Goz hizasi: kadrajin ~%40'i. Yatay merkez: iki gozun orta noktasi.
        center_x = (keypoints[0][0] + keypoints[1][0]) / 2.0
        eye_y = (keypoints[0][1] + keypoints[1][1]) / 2.0
    else:
        center_x = x + w / 2.0
        eye_y = y + h * 0.42

    crop_h = h * 2.0
    crop_w = crop_h * ratio

    # Goruntu sinirlarina orani bozmadan sigdir.
    if crop_w > img_w:
        crop_w = float(img_w)
        crop_h = crop_w / ratio
    if crop_h > img_h:
        crop_h = float(img_h)
        crop_w = crop_h * ratio

    crop_top = eye_y - crop_h * 0.40
    crop_left = center_x - crop_w / 2.0

    crop_top = max(0.0, min(img_h - crop_h, crop_top))
    crop_left = max(0.0, min(img_w - crop_w, crop_left))

    return (
        int(round(crop_left)),
        int(round(crop_top)),
        int(round(crop_w)),
        int(round(crop_h)),
    )


def fallback_center_crop(img_w, img_h, ratio=DEFAULT_RATIO):
    """Yuz bulunamadiginda ortadan 4:5 kirpar."""
    crop_h = float(img_h)
    crop_w = crop_h * ratio
    if crop_w > img_w:
        crop_w = float(img_w)
        crop_h = crop_w / ratio
    left = (img_w - crop_w) / 2.0
    top = (img_h - crop_h) / 2.0
    return (int(round(left)), int(round(top)), int(round(crop_w)), int(round(crop_h)))


# ---------------------------------------------------------------------------
# Okuma / yazma (Turkce karakterli yollar dahil)
# ---------------------------------------------------------------------------
def read_image(path):
    # Telefonlarda EXIF yonu sik görülür; Pillow varsa uygula.
    try:
        from PIL import Image, ImageOps

        with Image.open(path) as image:
            image = ImageOps.exif_transpose(image).convert("RGB")
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    except Exception:
        pass
    try:
        data = np.fromfile(str(path), dtype=np.uint8)
        return cv2.imdecode(data, cv2.IMREAD_COLOR)
    except Exception:
        return None


def save_image(path, image, quality=95):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix.lower() == ".png":
        fmt, params = ".png", [cv2.IMWRITE_PNG_COMPRESSION, 3]
    else:
        fmt, params = ".jpg", [cv2.IMWRITE_JPEG_QUALITY, int(quality)]
    ok, buffer = cv2.imencode(fmt, image, params)
    if not ok:
        return False
    buffer.tofile(str(path))
    return True


def write_debug(path, image, det, crop, source_label):
    vis = image.copy()
    if det:
        x, y, w, h = det["box"]
        cv2.rectangle(vis, (x, y), (x + w, y + h), (0, 200, 0), 3)
        for px, py in det.get("keypoints", []):
            cv2.circle(vis, (int(px), int(py)), 5, (0, 255, 0), -1)
    cx, cy, cw, ch = crop
    cv2.rectangle(vis, (cx, cy), (cx + cw, cy + ch), (0, 0, 255), 4)
    cv2.putText(
        vis,
        source_label,
        (12, 34),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.0,
        (0, 0, 255),
        2,
        cv2.LINE_AA,
    )
    debug_path = Path(path)
    save_image(debug_path.with_name(debug_path.stem + "_debug.jpg"), vis, 85)


# ---------------------------------------------------------------------------
# Tek goruntu isleme
# ---------------------------------------------------------------------------
def process_image(in_path, out_path, out_w, out_h, ratio, quality, do_align, do_paper, debug):
    img = read_image(in_path)
    if img is None:
        print(f"  ! Okunamadi: {in_path}")
        return False

    img_h, img_w = img.shape[:2]
    work = img
    face = pick_best_face(detect_faces(work, verbose=debug), img_w, img_h)
    used = "orijinal"

    if debug:
        print(f"  Goruntu boyutu: {img_w}x{img_h}")
        if face:
            print(f"  Ilk tespit: box={face['box']}, source={face['source']}, score={face.get('score',0):.2f}, kp={len(face.get('keypoints',[]))}")
        else:
            print("  Ilk tespit: yuz yok")

    # 1) Yuz yoksa / cok kucukse / guven dusukse A4 sayfasini duzeltip tekrar dene.
    face_area = face["box"][2] * face["box"][3] if face else 0
    min_face_area = 0.03 * img_w * img_h  # %3'dan kucuk yuzlerde A4 denemesi
    if do_paper and (
        face is None
        or face_area < min_face_area
        or face.get("score", 1.0) < 0.5
    ):
        quad = find_paper_quad(img)
        if quad is not None:
            warped = warp_paper(img, quad)
            if warped is not None:
                warped_face = pick_best_face(detect_faces(warped, verbose=debug), warped.shape[1], warped.shape[0])
                if warped_face is not None:
                    work, face = warped, warped_face
                    used = "A4 duzeltmesi"
                    print("  i A4 sayfasi bulundu, perspektif duzeltildi")
                    if debug:
                        print(f"  A4 sonrasi tespit: box={face['box']}, source={face['source']}, kp={len(face.get('keypoints',[]))}")

    # 2) Goz cizgisi egikse goruntuyu hizala ve yeniden tespit et.
    if do_align and face is not None:
        angle = eye_angle(face)
        if abs(angle) >= 2.0:
            rotated = rotate_image(work, -angle)
            rotated_face = pick_best_face(
                detect_faces(rotated, verbose=debug), rotated.shape[1], rotated.shape[0]
            )
            if rotated_face is not None:
                work, face = rotated, rotated_face
                used += f" + {angle:.1f} derece hizalama"

    # 3) Kirp.
    if face is not None:
        crop = compute_crop(work.shape[1], work.shape[0], face, ratio)
        print(
            f"  -> Yuz: {face['box'][2]}x{face['box'][3]} ({face['source']}), "
            f"kirp: x={crop[0]} y={crop[1]} w={crop[2]} h={crop[3]} [{used}]"
        )
        if debug:
            print(f"    Crop oran: {crop[2]/crop[3]:.3f} (hedef {ratio})")
            print(f"    Goz y: {face.get('keypoints',[])[0][1] if face.get('keypoints') else 'N/A'}")
    else:
        crop = fallback_center_crop(work.shape[1], work.shape[0], ratio)
        print("  ! Yuz bulunamadi, merkeze kirpiyorum")

    if debug:
        write_debug(out_path, work, face, crop, used)

    x, y, w, h = crop
    if w <= 1 or h <= 1:
        print("  ! Kirpma alani gecersiz, atlaniyor")
        return False

    cropped = work[y : y + h, x : x + w]
    if cropped.size == 0:
        print("  ! Kirpma bos, atlaniyor")
        return False

    output = cv2.resize(cropped, (out_w, out_h), interpolation=cv2.INTER_LANCZOS4)
    if not save_image(out_path, output, quality):
        print(f"  ! Yazilamadi: {out_path}")
        return False

    label = "Yuz yok (merkez)" if face is None else "Yuz bulundu"
    print(f"  OK -> {out_path} ({out_w}x{out_h}) - {label}")
    return True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Offline vesikalik fotograf kirpma (4:5, tamamen yerel)"
    )
    parser.add_argument("input", help="Girdi dosya veya klasor")
    parser.add_argument(
        "output",
        nargs="?",
        default=None,
        help="Cikti dosya (dosya girdisinde) veya klasor (klasor girdisinde)",
    )
    parser.add_argument("--width", type=int, default=800, help="Cikti genisligi (vars. 800)")
    parser.add_argument("--height", type=int, default=1000, help="Cikti yuksekligi (vars. 1000)")
    parser.add_argument("--quality", type=int, default=95, help="JPEG kalitesi (vars. 95)")
    parser.add_argument("--debug", action="store_true", help="Tespit/kirpma gorseli de kaydet")
    parser.add_argument("--no-align", action="store_true", help="Goz hizasina gore dondurmeyi kapat")
    parser.add_argument("--no-paper", action="store_true", help="A4 perspektif duzeltmesini kapat")
    args = parser.parse_args()

    if args.width <= 0 or args.height <= 0:
        print("HATA: Genislik/yukseklik pozitif olmali.")
        return 1
    if abs(args.width / args.height - DEFAULT_RATIO) > 0.001:
        print(
            f"UYARI: {args.width}x{args.height} tam 4:5 degil. "
            "Vesikalik icin 800x1000 onerilir."
        )

    in_path = Path(args.input)
    if in_path.is_file():
        files = [in_path]
    elif in_path.is_dir():
        files = sorted(
            [p for p in in_path.iterdir() if p.suffix.lower() in IMAGE_EXTS]
        )
    else:
        print(f"HATA: Girdi bulunamadi: {in_path}")
        return 1

    if not files:
        print("HATA: Isleyecek gorsel yok.")
        return 1

    if not HAVE_MP:
        print("i MediaPipe kurulu degil; Haar cascade kullanilacak.")

    if in_path.is_file():
        out_file = Path(args.output) if args.output else in_path.with_name(in_path.stem + "_vesikalik.jpg")
        if out_file.suffix.lower() not in IMAGE_EXTS:
            out_file = out_file.with_suffix(".jpg")
        print(f"\nCikti: {out_file}")
    else:
        out_dir = Path(args.output) if args.output else in_path.parent / (in_path.name + "_vesikalik")
        out_dir.mkdir(parents=True, exist_ok=True)
        print(f"Cikti klasoru: {out_dir} ({len(files)} dosya)")

    ok = fail = 0
    for file in files:
        if in_path.is_file():
            dest = out_file
        else:
            dest = out_dir / (file.stem + "_vesikalik.jpg")
        success = process_image(
            file,
            dest,
            args.width,
            args.height,
            DEFAULT_RATIO,
            args.quality,
            not args.no_align,
            not args.no_paper,
            args.debug,
        )
        if success:
            ok += 1
        else:
            fail += 1

    if _DETECTOR is not None:
        try:
            _DETECTOR.close()
        except Exception:
            pass

    print(f"\nBitti: {ok} basarili, {fail} basarisiz")
    return 0 if fail == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
