"""Regenera las fuentes web a partir de los TTF suministrados (fonttools y brotli)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.subset import Options, Subsetter

directorio = Path(__file__).resolve().parents[1] / "packages/portal/public/fonts"
caracteres = set(range(0x250)) | set(range(0x1E00, 0x1F00)) | set(range(0x2000, 0x2070)) | set(range(0x20A0, 0x20D0))
for peso, estilo in [(400, "Regular"), (500, "Medium"), (600, "SemiBold")]:
    fuente = TTFont(directorio / f"poppins-{peso}.ttf")
    opciones = Options()
    opciones.name_IDs = ["*"]
    subconjunto = Subsetter(options=opciones)
    subconjunto.populate(unicodes=caracteres)
    subconjunto.subset(fuente)
    for registro in fuente["name"].names:
        nuevos = {1: "SIMCE Sans", 4: f"SIMCE Sans {estilo}", 6: f"SIMCESans-{estilo}", 16: "SIMCE Sans"}
        if registro.nameID in nuevos:
            registro.string = nuevos[registro.nameID].encode(registro.getEncoding())
    fuente.flavor = "woff2"
    destino = directorio / f"simce-sans-{peso}.woff2"
    fuente.save(destino)
    print(f"{destino.name}: {destino.stat().st_size} bytes")
