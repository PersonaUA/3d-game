"""
Конвертация FBX анимаций Mixamo → GLB для BabylonJS.

Запуск:
  blender --background --python tools/fbx_to_glb.py

Blender должен быть в PATH. Скрипт берёт все .fbx из assets/animations/
и кладёт .glb рядом с ними.
"""

import bpy
import os
import sys

ANIM_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'animations')
ANIM_DIR = os.path.realpath(ANIM_DIR)


def convert(fbx_path: str) -> str:
    glb_path = fbx_path.replace('.fbx', '.glb').replace('.FBX', '.glb')

    # Очищаем сцену
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Импортируем FBX
    bpy.ops.import_scene.fbx(
        filepath=fbx_path,
        use_anim=True,
        automatic_bone_orientation=True,
    )

    # Выбираем все объекты
    bpy.ops.object.select_all(action='SELECT')

    # Экспортируем GLB — только анимация, без меша (если только анимация)
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_animations=True,
        export_nla_strips=False,
        export_force_sampling=True,
        export_optimize_animation_size=True,
        export_anim_single_armature=True,
        use_selection=True,
    )

    return glb_path


def main():
    if not os.path.isdir(ANIM_DIR):
        print(f'[fbx_to_glb] Directory not found: {ANIM_DIR}')
        sys.exit(1)

    fbx_files = [f for f in os.listdir(ANIM_DIR) if f.lower().endswith('.fbx')]

    if not fbx_files:
        print('[fbx_to_glb] No .fbx files found in', ANIM_DIR)
        sys.exit(0)

    for fname in fbx_files:
        src = os.path.join(ANIM_DIR, fname)
        print(f'[fbx_to_glb] Converting: {fname} ...')
        try:
            out = convert(src)
            print(f'[fbx_to_glb] ✓ → {os.path.basename(out)}')
        except Exception as e:
            print(f'[fbx_to_glb] ✗ Error: {e}')


main()
