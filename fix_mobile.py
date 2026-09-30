
import os, re

files_to_fix = ["analytics.html", "ai.html", "financial.html", "recent.html", "timeline.html"]
base_dir = r"C:\Users\Pongo\bizlens"

css_to_add = """
  .menu-btn { display: none !important; }
  @media (max-width: 1024px) {
    .menu-btn { display: flex !important; flex: none; }
    .side { display: none !important; }
    .side.is-open { display: flex !important; position: fixed !important; left: 0 !important; top: 0 !important; bottom: 0 !important; width: 260px !important; z-index: 999 !important; background: rgba(255,255,255,0.95) !important; backdrop-filter: blur(16px) !important; border-radius: 0 24px 24px 0 !important; box-shadow: 4px 0 24px rgba(0,0,0,0.1) !important; padding: 24px !important; }
    html[data-theme="dark"] .side.is-open { background: rgba(15,23,42,0.95) !important; }
    .side-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 998; backdrop-filter: blur(2px); }
    .side-overlay.is-open { display: block; }
    .main { padding-left: 0 !important; padding-right: 0 !important; }
    .topbar { margin: 16px !important; padding: 12px 16px !important; flex-wrap: wrap; gap: 12px !important; border-radius: 20px !important; }
    .search { width: 100% !important; order: 3; flex: 1 1 100% !important; margin-top: 4px; padding: 10px 16px !important; }
    .content { margin: 16px !important; padding: 20px !important; border-radius: 24px !important; }
  }
  @media (max-width: 600px) {
    .topbar { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; padding: 16px !important; }
    .topbar__title { align-items: center !important; justify-content: flex-start !important; width: 100%; }
    .topbar__tools { flex-wrap: wrap !important; justify-content: flex-start !important; }
    .search { width: 100% !important; order: unset; }
    .content { padding: 16px !important; border-radius: 20px !important; margin: 12px !important; }
  }
  html, body { max-width: 100vw; overflow-x: hidden; }
</style>"""

js_to_add = """
<script>
  document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const side = document.getElementById("side");
    const sideOverlay = document.getElementById("sideOverlay");
    if(menuToggle && side && sideOverlay) {
      menuToggle.addEventListener("click", () => {
        side.classList.add("is-open");
        sideOverlay.classList.add("is-open");
      });
      sideOverlay.addEventListener("click", () => {
        side.classList.remove("is-open");
        sideOverlay.classList.remove("is-open");
      });
    }
  });
</script>
</body>"""

for f_name in files_to_fix:
    f_path = os.path.join(base_dir, f_name)
    if not os.path.exists(f_path):
        continue
    with open(f_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Add CSS
    if ".menu-btn { display: none !important; }" not in content:
        content = re.sub(r"</style>\s*</head>", css_to_add + "\n</head>", content, count=1)
    
    # Add overlay
    if "side-overlay" not in content:
        content = re.sub(r"(<aside class=\"side[^\"]*\" id=\"side\"[^>]*>.*?</aside>)", r"\1\n  <div class=\"side-overlay\" id=\"sideOverlay\"></div>", content, flags=re.DOTALL)
        content = re.sub(r"(<aside class=\"side[^\"]*\" id=\"side\"[^>]*>)", r"\1</aside>\n  <div class=\"side-overlay\" id=\"sideOverlay\"></div>", content) # in case it was empty
        # Wait, the first regex might match too much. Lets just replace `<aside ...></aside>` if it is on one line, or just insert it after the aside tag if empty.
        # Actually in these files it is: `<aside class="side glass" id="side" data-page="..."></aside>`

    # Add button
    if "id=\"menuToggle\"" not in content:
        content = re.sub(
            r"<div class=\"topbar__title\">\s*(<p class=\"crumb\">.*?<h1>.*?</h1>)\s*</div>",
            "<div class=\"topbar__title\" style=\"display: flex; align-items: center; gap: 12px;\">\n        <button class=\"icon-btn glass menu-btn\" id=\"menuToggle\" aria-label=\"Menu\" type=\"button\"><i data-lucide=\"menu\"></i></button>\n        <div>\n          \\1\n        </div>\n      </div>",
            content, flags=re.DOTALL
        )

    # Add JS
    if "menuToggle.addEventListener" not in content:
        content = content.replace("</body>", js_to_add)

    with open(f_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Done fixing files!")

