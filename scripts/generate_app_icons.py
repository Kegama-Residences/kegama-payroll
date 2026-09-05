import os
import subprocess
from PIL import Image, ImageDraw

# 1. Prepare SVG
with open('/home/ubuntu/kegama/user_logo.svg') as f:
    svg_content = f.read()

white_svg = svg_content.replace('fill="#000000"', 'fill="#ffffff"')
with open('/tmp/white_logo.svg', 'w') as f:
    f.write(white_svg)

# Render high-res 2048x2048
subprocess.run(['rsvg-convert', '-w', '2048', '-h', '2048', '/tmp/white_logo.svg', '-o', '/tmp/logo_white_2048.png'], check=True)

img = Image.open('/tmp/logo_white_2048.png')
bbox = img.getbbox()
cropped = img.crop(bbox)
c_w, c_h = cropped.size

ORANGE = (234, 88, 12, 255) # #EA580C
ORANGE_RGB = (234, 88, 12)

def make_foreground(size, safe_factor=0.60):
    # Transparent canvas
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    target_w = int(size * safe_factor)
    target_h = int(target_w * (c_h / c_w))
    if target_h > int(size * safe_factor):
        target_h = int(size * safe_factor)
        target_w = int(target_h * (c_w / c_h))
    
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas

def make_square_icon(size, factor=0.72):
    canvas = Image.new('RGBA', (size, size), ORANGE)
    target_w = int(size * factor)
    target_h = int(target_w * (c_h / c_w))
    if target_h > int(size * factor):
        target_h = int(size * factor)
        target_w = int(target_h * (c_w / c_h))
    
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas

def make_round_icon(size, factor=0.66):
    # Square with round mask
    base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    draw.ellipse([(0, 0), (size - 1, size - 1)], fill=ORANGE)
    
    target_w = int(size * factor)
    target_h = int(target_w * (c_h / c_w))
    if target_h > int(size * factor):
        target_h = int(size * factor)
        target_w = int(target_h * (c_w / c_h))
    
    resized = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    base.paste(resized, (x, y), resized)
    return base

# Android sizes:
android_res = '/home/ubuntu/kegama/android/app/src/main/res'
densities = {
    'mipmap-mdpi': {'launcher': 48, 'foreground': 108},
    'mipmap-hdpi': {'launcher': 72, 'foreground': 162},
    'mipmap-xhdpi': {'launcher': 96, 'foreground': 216},
    'mipmap-xxhdpi': {'launcher': 144, 'foreground': 324},
    'mipmap-xxxhdpi': {'launcher': 192, 'foreground': 432},
}

for folder, dim in densities.items():
    folder_path = os.path.join(android_res, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # foreground
    fg = make_foreground(dim['foreground'])
    fg.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')
    
    # legacy square launcher
    sq = make_square_icon(dim['launcher'])
    sq.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
    
    # legacy round launcher
    rd = make_round_icon(dim['launcher'])
    rd.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')
    print(f'Generated Android icons for {folder}')

# Update ic_launcher_background.xml
bg_xml_path = os.path.join(android_res, 'values', 'ic_launcher_background.xml')
with open(bg_xml_path, 'w') as f:
    f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#EA580C</color>
</resources>
''')
print('Updated ic_launcher_background.xml to #EA580C')

# iOS AppIcon: 1024x1024 RGB (no alpha)
ios_path = '/home/ubuntu/kegama/ios/App/App/Assets.xcassets/AppIcon.appiconset'
os.makedirs(ios_path, exist_ok=True)
ios_icon = Image.new('RGB', (1024, 1024), ORANGE_RGB)
target_w = int(1024 * 0.65)
target_h = int(target_w * (c_h / c_w))
resized_ios = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)
x = (1024 - target_w) // 2
y = (1024 - target_h) // 2
ios_icon.paste(resized_ios, (x, y), resized_ios)
ios_icon.save(os.path.join(ios_path, 'AppIcon-512@2x.png'), 'PNG')
print('Generated iOS AppIcon-512@2x.png (1024x1024 RGB)')

# Web & PWA icons in public/
public_path = '/home/ubuntu/kegama/public'
os.makedirs(public_path, exist_ok=True)

# 192x192 web icon
pwa_192 = make_square_icon(192)
pwa_192.save(os.path.join(public_path, 'icon-192.png'), 'PNG')

# 512x512 web icon
pwa_512 = make_square_icon(512)
pwa_512.save(os.path.join(public_path, 'icon-512.png'), 'PNG')

# apple-touch-icon 180x180
apple_touch = make_square_icon(180)
apple_touch.save(os.path.join(public_path, 'apple-touch-icon.png'), 'PNG')

# favicon 32x32
fav_32 = make_square_icon(32)
fav_32.save(os.path.join(public_path, 'favicon-32x32.png'), 'PNG')
print('Generated web/PWA icons in public/')
