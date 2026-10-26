from PIL import Image
w=Image.open('/Users/khorengrigoryan/shorts/channel-branding/final/watermark.png')
sheet=Image.new('RGB',(760,170),(255,255,255))
bgs=[(250,250,250),(20,20,20),(120,160,90),(200,170,120),(60,90,140),(230,220,195)]
for i,c in enumerate(bgs):
  bg=Image.new('RGBA',(300,300),c+(255,)); bg.alpha_composite(w)
  if i<2: sheet.paste(bg.convert('RGB').resize((150,150)),(i*160,0))
  sm=Image.new('RGBA',(60,60),c+(255,)); s=w.resize((60,60),Image.LANCZOS); sm.alpha_composite(s); sheet.paste(sm.convert('RGB'),(340+i*70,40))
sheet.save('/Users/khorengrigoryan/shorts/channel-branding/final/work/wm_test.png')
