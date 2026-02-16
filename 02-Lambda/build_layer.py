"""
PyMySQL Lambda Layer készítő
Működik: Windows, Mac, Linux

Használat:
    python build_layer.py

Eredmény:
    pymysql-layer.zip (feltölthető Lambda Layer-ként)
"""

import subprocess
import sys
import zipfile
import os
import shutil


def main():
    layer_dir = "python"
    zip_name = "pymysql-layer.zip"

    # Tisztítás
    if os.path.exists(layer_dir):
        shutil.rmtree(layer_dir)
    if os.path.exists(zip_name):
        os.remove(zip_name)

    # pymysql telepítése a python/ mappába
    print("PyMySQL telepítése...")
    subprocess.check_call([
        sys.executable, "-m", "pip", "install",
        "pymysql", "-t", layer_dir, "--quiet"
    ])

    # Zip készítése
    print("📁 ZIP készítése...")
    with zipfile.ZipFile(zip_name, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(layer_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, ".")
                zf.write(file_path, arcname)

    # Tisztítás
    shutil.rmtree(layer_dir)

    size = os.path.getsize(zip_name) / 1024
    print(f"✅ Kész: {zip_name} ({size:.0f} KB)")
    print("   → Lambda → Layers → Create layer → Upload this file")


if __name__ == "__main__":
    main()
