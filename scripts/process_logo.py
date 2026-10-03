from collections import deque

from PIL import Image, ImageFilter
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "public", "ar_group_logo_source.png")
FULL_OUT = os.path.join(ROOT, "public", "ar_group_logo.png")
MARK_OUT = os.path.join(ROOT, "public", "ar_group_logo_mark.png")


def is_background_pixel(r: int, g: int, b: int) -> bool:
    brightness = (r + g + b) / 3

    if r > 238 and g > 238 and b > 238:
        return True
    if brightness > 248:
        return True

    if r > 225 and g > 225 and b > 225 and abs(r - g) < 12 and abs(g - b) < 12:
        return True

    if r < 28 and g < 28 and b < 28:
        return True
    if brightness < 20:
        return True

    return False


def flood_remove_background(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    seen = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()

    def push(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h:
            return
        idx = y * w + x
        if seen[idx]:
            return
        r, g, b, _ = pixels[x, y]
        if not is_background_pixel(r, g, b):
            return
        seen[idx] = 1
        queue.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while queue:
        x, y = queue.popleft()
        r, g, b, _ = pixels[x, y]
        pixels[x, y] = (r, g, b, 0)
        push(x + 1, y)
        push(x - 1, y)
        push(x, y + 1)
        push(x, y - 1)

    return img


def trim_transparent(img: Image.Image, pad: int = 8) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    return img.crop((
        max(0, left - pad),
        max(0, top - pad),
        min(img.width, right + pad),
        min(img.height, bottom + pad),
    ))


def crop_mark(img: Image.Image) -> Image.Image:
    w, h = img.size
    cropped = img.crop((int(w * 0.06), int(h * 0.01), int(w * 0.94), int(h * 0.50)))
    return trim_transparent(cropped, pad=4)


def upscale_2x(img: Image.Image) -> Image.Image:
    return img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)


def sharpen_slightly(img: Image.Image) -> Image.Image:
    return img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=110, threshold=2))


def main():
    src = Image.open(SRC)
    full = flood_remove_background(src)
    full = trim_transparent(full, pad=12)
    full = upscale_2x(full)
    full = sharpen_slightly(full)
    full.save(FULL_OUT, "PNG", optimize=False)

    mark = crop_mark(full)
    mark = sharpen_slightly(mark)
    mark.save(MARK_OUT, "PNG", optimize=False)

    print(f"Saved {FULL_OUT} ({full.size[0]}x{full.size[1]})")
    print(f"Saved {MARK_OUT} ({mark.size[0]}x{mark.size[1]})")


if __name__ == "__main__":
    main()
