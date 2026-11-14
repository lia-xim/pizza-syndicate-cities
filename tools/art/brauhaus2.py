# Brauhaus 2: Backsteinhaus mit dunklen Läden und Schieferdach (Art des Schumacher)
import sys, os; sys.path.insert(0, os.path.dirname(__file__))
import brauhaus_lib
def build(bpy): brauhaus_lib.build(bpy, wand=(0.72, 0.24, 0.12), laden=(0.08, 0.2, 0.42), dach=(0.2, 0.24, 0.34), sockel=(0.6, 0.55, 0.48))
