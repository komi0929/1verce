import urllib.request
from PIL import Image
import io

headers = {'User-Agent': 'Mozilla/5.0'}
url = "https://tcj-image-production.s3-ap-northeast-1.amazonaws.com/u57741/a256174/itc55651.jpg"
req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as resp:
    im = Image.open(io.BytesIO(resp.read()))
    print("itc55651.jpg size:", im.size)
    # Save original
    im.save('itc_hidaddy_orig.jpg')
