import sys
from PIL import Image, ImageDraw, ImageFont

def create_icon(size, filename):
    # Create an image with green background
    img = Image.new('RGB', (size, size), color = '#5d9474')
    d = ImageDraw.Draw(img)
    # Draw some text or a simple gear
    # We will just draw a white circle and an 'A'
    d.ellipse([size*0.1, size*0.1, size*0.9, size*0.9], fill='#416b59')
    # Save the image
    img.save(filename)

create_icon(192, 'icons/icon-192.png')
create_icon(512, 'icons/icon-512.png')
print("Icons generated.")
