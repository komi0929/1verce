from PIL import Image

# From dk_thumb.jpg
im = Image.open('dk_thumb.jpg')
# DK is around left: 210, top: 400, right: 380, bottom: 620
dk_crop = im.crop((220, 390, 380, 550)).resize((500, 500), Image.Resampling.LANCZOS)
dk_crop.save('dk_crop1.jpg')

# From dk_cand_1.jpg
im2 = Image.open('dk_cand_1.jpg')
# DK face is in upper center
dk2 = im2.crop((120, 0, 240, 120)).resize((500, 500), Image.Resampling.LANCZOS)
dk2.save('dk_crop2.jpg')

print("Cropped both candidates!")
