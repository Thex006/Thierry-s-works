import os, numpy as np, torch
from PIL import Image, ImageFilter
from rembg import remove, new_session
from spandrel import ModelLoader
torch.set_num_threads(4)
P = '/root/jb/photos'; O = '/root/jb/real'; os.makedirs(O, exist_ok=True)
sam = new_session('sam'); isn = new_session('isnet-general-use')
esr = ModelLoader().load_from_file('/root/jb/x4.pth').model.eval()

def rect(x0, y0, x1, y1): return {"type": "rectangle", "data": [x0, y0, x1, y1], "label": 1}
def pt(x, y, l=1): return {"type": "point", "data": [x, y], "label": l}

JOBS = {
  'cherry_stem': ('951dde54', [pt(175, 200), pt(105, 135)]),
  'cherry_b':    ('951dde54', [rect(120, 270, 305, 405), pt(215, 335)]),
  'cherry_c':    ('951dde54', [rect(150, 395, 320, 560), pt(240, 470)]),
  'straw_l':     ('d81c9e75', [pt(984, 1435), pt(1350, 900)]),
  'straw_r':     ('d81c9e75', [pt(2296, 1435), pt(2132, 820)]),
  'straw_b':     ('d81c9e75', [pt(1681, 2460), pt(1681, 1865)]),
  'rasp_a':      ('52bc223d', [rect(600, 570, 1010, 950), pt(820, 760)]),
  'rasp_b':      ('52bc223d', [rect(205, 270, 605, 745), pt(400, 500)]),
  'rasp_hull':   ('52bc223d', [pt(1150, 360), pt(1160, 520)]),
  'lime_half':   ('8934b0c6', [pt(262, 787)]),
  'lime_whole':  ('8934b0c6', [pt(562, 760), pt(470, 506), pt(560, 520)]),
  'apri_whole':  ('ecf50a1d', [pt(500, 455)]),
  'apri_half':   ('ecf50a1d', [pt(1150, 455)]),
  'melon_a':     ('4048fdf0', [pt(130, 460), pt(60, 470)]),
  'melon_b':     ('4048fdf0', [pt(370, 420), pt(330, 515)]),
  'melon_c':     ('4048fdf0', [pt(540, 250), pt(560, 340)]),
  'peach_whole': ('peach_whole', None),
  'peach_half':  ('peach_half', None),
  'passion_whole': ('passion_whole', None),
  'passion_half':  ('passion_half', None),
}

def upscale(rgb):
    t = torch.from_numpy(np.asarray(rgb).astype(np.float32) / 255).permute(2, 0, 1)[None]
    with torch.no_grad(): o = esr(t).clamp(0, 1)[0].permute(1, 2, 0).numpy()
    return Image.fromarray((o * 255).round().astype(np.uint8))

import sys
only = sys.argv[1:]
for name, (src, pts) in JOBS.items():
    if only and name not in only: continue
    im = Image.open(f'{P}/{src}.png').convert('RGB')
    o = remove(im, session=sam, sam_prompt=pts) if pts else remove(im, session=isn)
    a = np.array(o)[:, :, 3]
    # keep largest connected region only
    from scipy import ndimage
    lab, n = ndimage.label(a > 128)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        keep = (lab == (1 + int(np.argmax(sizes))))
        keep = ndimage.binary_fill_holes(keep)
        a = np.where(keep, a, 0).astype(np.uint8)
    alpha = Image.fromarray(a)
    bb = alpha.getbbox(); pad = 6
    bb = (max(bb[0] - pad, 0), max(bb[1] - pad, 0), min(bb[2] + pad, im.width), min(bb[3] + pad, im.height))
    rgb = im.crop(bb); al = alpha.crop(bb)
    if max(rgb.size) < 640:
        rgb = upscale(rgb); al = al.resize(rgb.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(6)).point(lambda v: max(0, min(255, (v - 128) * 4 + 128)))
    s = min(1, 760 / max(rgb.size))
    rgb = rgb.resize((round(rgb.width * s), round(rgb.height * s)), Image.LANCZOS)
    al = al.resize(rgb.size, Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.8))
    # erode 1px to drop background fringe
    al = al.filter(ImageFilter.MinFilter(3))
    rgb.putalpha(al)
    rgb.save(f'{O}/{name}.png'); print('ok', name, rgb.size, flush=True)
