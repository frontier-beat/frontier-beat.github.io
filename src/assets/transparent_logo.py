"""Make the logo float: derive alpha from brightness and crop to the ink.

dark-logo.png is white on black, light-logo.png is black on white with a
drop shadow. The ramp (0.2..0.8) keeps anti-aliased edges and drops the
shadow. Writes logo-dark.png and logo-light.png next to this file.
"""
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent


def float_logo(src, dst, ink_is_light):
    rgb = np.asarray(Image.open(HERE / src).convert("RGB"), dtype=np.float32) / 255
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    ink = lum if ink_is_light else 1 - lum
    alpha = np.clip((ink - 0.2) / 0.6, 0, 1)
    out = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    out[..., :3] = 255 if ink_is_light else 0
    out[..., 3] = (alpha * 255).round()
    img = Image.fromarray(out, "RGBA")
    img.crop(img.getbbox()).save(HERE / dst, optimize=True)


if __name__ == "__main__":
    float_logo("dark-logo.png", "logo-dark.png", ink_is_light=True)
    float_logo("light-logo.png", "logo-light.png", ink_is_light=False)
