"""Build the repeat-y background tiles bg-dark.jpg and bg-light.jpg.

The *-background.jpg images are two near-identical halves stacked (made with
copy_image.py). The page tiles one period vertically at full width, so cut a
period from the middle and cross-fade its bottom band into the rows that
precede its top: the last row then flows into the first when repeated.
"""
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).parent
WIDTH, FULL_H = 1922, 7712
PERIOD, START, BLEND = FULL_H // 2, FULL_H // 4, 200

for theme in ("dark", "light"):
    full = np.asarray(
        Image.open(HERE / f"{theme}-background.jpg").convert("RGB").resize((WIDTH, FULL_H), Image.LANCZOS),
        dtype=np.float32,
    )
    tile = full[START:START + PERIOD].copy()
    lead_in = full[START - BLEND:START]  # what should sit just above the tile's top row
    alpha = np.linspace(0, 1, BLEND, dtype=np.float32)[:, None, None]
    tile[-BLEND:] = tile[-BLEND:] * (1 - alpha) + lead_in * alpha
    Image.fromarray(tile.round().astype(np.uint8)).save(HERE / f"bg-{theme}.jpg", quality=60, optimize=True)
