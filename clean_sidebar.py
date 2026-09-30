# -*- coding: utf-8 -*-
import os
import re

html_files = [f for f in os.listdir('.') if f.endswith('.html')]
for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content, num_subs = re.subn(r'<aside class="side[^>]*id="side"[^>]*>.*?</aside>', '', content, flags=re.DOTALL)
    
    new_content, subs2 = re.subn(r'<div class="side-overlay" id="sideOverlay"></div>', '', new_content)
    
    # Let's also remove the duplicate event listener for menuToggle inside the html file
    # It looks like: const menuToggle = document.getElementById('menuToggle'); ... if(menuToggle && side && sideOverlay) { ... }
    # Because 'side' is gone, we can just remove the whole block.
    
    if num_subs > 0 or subs2 > 0:
        with open(file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Cleaned {file}: removed {num_subs} aside, {subs2} overlay")
