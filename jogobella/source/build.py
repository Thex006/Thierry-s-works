import json, base64, io, os, sys
from PIL import Image
import numpy as np

J = '/root/jb'
FR = f'{J}/real'
OUTD = sys.argv[1] if len(sys.argv) > 1 else f'{J}/out'
os.makedirs(OUTD, exist_ok=True)

def trim(im, pad=4):
    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 6)
    return im.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad + 1, im.width), min(ys.max() + pad + 1, im.height)))

def bottle(name):
    p = f'{J}/up/{name}.png'
    if not os.path.exists(p): p = f'{J}/cut/{name}.png'
    im = Image.open(p).convert('RGBA')
    # keep largest blob only (cleans stray edge pixels)
    a = np.array(im)[:, :, 3]
    cols = np.where((a > 40).sum(0) > a.shape[0] * 0.05)[0]
    im = im.crop((cols.min(), 0, cols.max() + 1, im.height))
    return trim(im)

# Sheet layout: bottle on the left column (0..700 x 0..2048), fruit in three 660 cells on the right.
CELLS = [(700, 10, 664, 664), (1374, 10, 664, 664), (700, 694, 664, 664), (1374, 694, 664, 664)]

def sheet(name, fruits):
    S = Image.new('RGBA', (2048, 2048), (0, 0, 0, 0))
    b = bottle(name)
    sc = min(680 / b.width, 2020 / b.height)
    b = b.resize((round(b.width * sc), round(b.height * sc)), Image.LANCZOS)
    S.alpha_composite(b, (10, 10))
    boxes = [[10, 10, b.width, b.height]]
    for (cx, cy, cw, ch), fn in zip(CELLS, fruits):
        p = f'{FR}/{fn}.png'
        if not os.path.exists(p): p = f'{FR}/{fruits[0]}.png'
        im = trim(Image.open(p).convert('RGBA'))
        s = min(cw / im.width, ch / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
        S.alpha_composite(im, (cx, cy))
        boxes.append([cx, cy, im.width, im.height])
    buf = io.BytesIO(); S.save(buf, 'WEBP', quality=86, method=6)
    S.save(f'{OUTD}/sheet-{name}.webp', 'WEBP', quality=86, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode(), boxes

# piece rows: [item, x, y, w, rot, mirror, layer]
F = [
  dict(key='cherry', word='Cherry', color='#F1D48C', fruits=['cherry_stem', 'cherry_c', 'cherry_c'],
       pieces=[[1, 400, 160, 150, 0, 0, 'fruit'], [2, 880, 205, 150, 0, 0, 'fruit'], [3, 318, 470, 128, -10, 0, 'fruit'],
               [1, 1180, 420, 150, 15, 1, 'fruit'], [3, 900, 580, 118, 25, 1, 'fruit'],
               [2, -15, 560, 250, 0, 0, 'corner'], [1, 1282, 40, 170, 0, 0, 'corner']]),
  dict(key='strawberry', word='Strawberry', color='#F2AFC0', fruits=['straw_b', 'straw_l', 'straw_r'],
       pieces=[[1, 420, 160, 120, 0, 0, 'fruit'], [2, 875, 220, 117, 20, 0, 'fruit'], [3, 300, 455, 140, -10, 0, 'fruit'],
               [3, 1190, 432, 135, 15, 0, 'fruit'], [2, 900, 560, 140, -15, 0, 'fruit'],
               [1, -10, 555, 245, 0, 0, 'corner'], [1, 1285, 35, 190, 20, 0, 'corner']]),
  dict(key='raspberry', word='Raspberry', tab='Raspberry', color='#C2B0DC', fruits=['rasp_b', 'lime_half', 'rasp_hull'],
       pieces=[[1, 430, 185, 100, 0, 0, 'fruit'], [2, 880, 225, 150, 0, 0, 'fruit'], [1, 310, 478, 125, -8, 0, 'fruit'],
               [3, 1190, 455, 150, 15, 0, 'fruit'], [1, 905, 590, 110, 30, 0, 'fruit'],
               [2, -15, 590, 255, 0, 0, 'corner'], [1, 1282, 40, 190, 0, 0, 'corner']]),
  dict(key='peach', word='Peach', color='#F6BE9A', fruits=['peach_half', 'passion_half', 'peach_whole', 'passion_whole'],
       pieces=[[2, 425, 175, 120, 0, 0, 'fruit'], [1, 875, 220, 150, -10, 1, 'fruit'], [3, 300, 470, 155, 10, 0, 'fruit'],
               [4, 1195, 462, 135, 20, 0, 'fruit'], [1, 895, 582, 145, -12, 0, 'fruit'],
               [1, -10, 575, 255, 0, 0, 'corner'], [4, 1280, 30, 190, 0, 0, 'corner']]),
  dict(key='apricot', word='Apricot', color='#8FD3CC', fruits=['apri_whole', 'apri_half', 'apri_whole'],
       pieces=[[1, 430, 170, 112, 0, 0, 'fruit'], [2, 880, 220, 150, 10, 0, 'fruit'], [2, 300, 470, 148, -15, 1, 'fruit'],
               [1, 1195, 455, 130, 15, 0, 'fruit'], [1, 905, 585, 120, -20, 0, 'fruit'],
               [2, -10, 575, 250, 0, 0, 'corner'], [1, 1285, 30, 180, 0, 0, 'corner']]),
  dict(key='watermelon', word='Watermelon', color='#B4D58A', fruits=['melon_a', 'melon_b', 'melon_a'],
       pieces=[[2, 430, 180, 104, 10, 0, 'fruit'], [1, 875, 215, 160, 15, 0, 'fruit'], [3, 300, 460, 160, -10, 0, 'fruit'],
               [2, 1200, 462, 112, -15, 1, 'fruit'], [1, 900, 590, 150, 20, 1, 'fruit'],
               [1, -10, 560, 265, 0, 0, 'corner'], [2, 1290, 40, 165, 0, 0, 'corner']]),
]
# bottle placement: height 600 design px, bottom at 712, centred on x 720
data = []
for f in F:
    uri, boxes = sheet(f['key'], f['fruits'])
    bw, bh = boxes[0][2], boxes[0][3]
    H = 600; W = H * bw / bh
    f2 = dict(word=f['word'], tab=f.get('tab', f['word']), color=f['color'], sheet=uri, boxes=boxes,
              cup=dict(x=round(720 - W / 2, 1), y=712 - H, w=round(W, 1)), pieces=f['pieces'])
    data.append(f2)

def font(n):
    return 'data:font/woff2;base64,' + base64.b64encode(open(f'{J}/fonts/{n}.woff2', 'rb').read()).decode()

html = open(f'{J}/template.html').read()
html = html.replace('/*DATA*/', json.dumps(data, separators=(',', ':')))
for k in ['P500', 'P600', 'P700', 'B800']:
    html = html.replace(f'@@{k}@@', font(k.lower()))
html = html.replace('@@BG0@@', F[0]['color'])
open(f'{OUTD}/index.html', 'w').write(html)
print('wrote', f'{OUTD}/index.html', round(len(html) / 1e6, 2), 'MB')
