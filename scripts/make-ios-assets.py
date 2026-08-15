"""Generate the iOS app icon + splash from the Drako sprite.

Pixel art is upscaled with NEAREST so it stays crisp instead of going mushy.
Run:  python3 scripts/make-ios-assets.py   (then: npx @capacitor/assets generate --ios)
"""
from PIL import Image, ImageDraw, ImageFilter
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC  = ROOT / 'public/drako/drako-idle@2x.png'
OUT  = ROOT / 'assets'
OUT.mkdir(exist_ok=True)

NAVY = (15, 18, 25, 255)   # #0f1219  app background_color
CYAN = (0, 188, 212)       # #00BCD4  theme_color

im = Image.open(SRC).convert('RGBA')

# ---------- icon: Drako's head, horns to smile ----------
head = im.crop((52, 0, 228, 146))
head = head.crop(head.split()[3].getbbox())

BASE = 128
canvas = Image.new('RGBA', (BASE, BASE), NAVY)
glow = Image.new('RGBA', (BASE, BASE), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
for i, r in enumerate(range(56, 10, -6)):
    gd.ellipse((BASE/2-r, BASE/2-r+4, BASE/2+r, BASE/2+r+4), fill=CYAN + (10 + i*7,))
canvas = Image.alpha_composite(canvas, glow.filter(ImageFilter.GaussianBlur(9)))

tw = int(BASE * 0.78)
th = max(1, round(head.height * tw / head.width))
canvas.alpha_composite(head.resize((tw, th), Image.NEAREST),
                       ((BASE - tw)//2, (BASE - th)//2 + 2))
canvas.resize((1024, 1024), Image.NEAREST).convert('RGB').save(OUT / 'icon.png')

# ---------- splash: full Drako, centred ----------
body = im.crop(im.split()[3].getbbox())
B = 342
sp = Image.new('RGBA', (B, B), NAVY)
glow = Image.new('RGBA', (B, B), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
for i, r in enumerate(range(120, 20, -10)):
    gd.ellipse((B/2-r, B/2-r, B/2+r, B/2+r), fill=CYAN + (6 + i*3,))
sp = Image.alpha_composite(sp, glow.filter(ImageFilter.GaussianBlur(22)))

th = int(B * 0.26)
tw = max(1, round(body.width * th / body.height))
sp.alpha_composite(body.resize((tw, th), Image.NEAREST), ((B - tw)//2, (B - th)//2))

splash = sp.resize((2732, 2732), Image.NEAREST).convert('RGB')
splash.save(OUT / 'splash.png')
splash.save(OUT / 'splash-dark.png')

print('wrote', OUT / 'icon.png', '+ splash.png / splash-dark.png')
