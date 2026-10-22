from pathlib import Path
import zipfile
import re
root=Path(__file__).resolve().parents[1]
dist=root/'dist'
(root/'build').mkdir(exist_ok=True)
html=(dist/'index.html').read_text(encoding='utf-8')
for p in dist.glob('*.js'):
    html=re.sub(r'<script src="'+re.escape(p.name)+r'(?:\?[^"<>]*)?"></script>',lambda _: '<script>'+p.read_text(encoding='utf-8')+'</script>',html)
for p in dist.glob('*.css'):
    html=re.sub(r'<link rel="stylesheet" href="'+re.escape(p.name)+r'(?:\?[^"<>]*)?">',lambda _: '<style>'+p.read_text(encoding='utf-8')+'</style>',html)
(root/'build/安吉旅游工作台.html').write_text(html,encoding='utf-8')
with zipfile.ZipFile(root/'build/安吉旅游工作台_源文件.zip','w',zipfile.ZIP_DEFLATED) as z:
    for p in dist.iterdir():
        if p.is_file():z.write(p,'dist/'+p.name)
print('Standalone HTML and editable source ZIP updated.')
