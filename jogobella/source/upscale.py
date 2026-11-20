import torch, numpy as np, os
from PIL import Image
from spandrel import ModelLoader
torch.set_num_threads(2)
m = ModelLoader().load_from_file('/root/jb/x4.pth').model.eval()
os.makedirs('/root/jb/up', exist_ok=True)
for n in ['cherry', 'strawberry', 'raspberry', 'peach', 'apricot', 'watermelon']:
    im = Image.open(f'/root/jb/cut/{n}.png').convert('RGBA')
    if im.height >= 900:
        im.save(f'/root/jb/up/{n}.png'); print('kept', n, flush=True); continue
    rgb = np.array(im.convert('RGB')).astype(np.float32) / 255
    # fill transparent area with white so edges stay clean
    a = np.array(im)[:, :, 3:4].astype(np.float32) / 255
    rgb = rgb * a + (1 - a)
    t = torch.from_numpy(rgb).permute(2, 0, 1)[None]
    with torch.no_grad():
        o = m(t).clamp(0, 1)[0].permute(1, 2, 0).numpy()
    up = Image.fromarray((o * 255).round().astype(np.uint8))
    al = im.split()[3].resize(up.size, Image.LANCZOS)
    up.putalpha(al)
    up.save(f'/root/jb/up/{n}.png'); print('up', n, up.size, flush=True)
