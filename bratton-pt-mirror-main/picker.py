#!/usr/bin/env python3
"""Bratton PT -- Image Picker (Tkinter GUI)
   python picker.py"""
import tkinter as tk
from tkinter import ttk, messagebox
import urllib.request, urllib.parse
import io, re, webbrowser, sys
from pathlib import Path

try:
    from PIL import Image, ImageTk
except ImportError:
    print("Need Pillow: pip install pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent

SERVICES = [
    ("patient-education", "Patient Education"),
    ("therapeutic-exercise", "Therapeutic Exercise"),
    ("strength-conditioning", "Strength & Conditioning"),
    ("dry-needling", "Dry Needling Certified"),
    ("blood-flow-restriction", "Blood Flow Restriction"),
    ("mckenzie-method", "McKenzie Method"),
    ("mulligan-technique", "Mulligan Technique"),
    ("cupping", "Cupping"),
    ("gait-balance", "Gait / Balance"),
    ("moist-heat-ice", "Moist Heat / Ice"),
    ("electrical-stimulation", "Electrical Stimulation"),
    ("workers-compensation", "Workers Compensation"),
]

# All verified Unsplash photo IDs (loaded from images.unsplash.com CDN)
POOL = [
    "photo-1576091160550-2173dba999ef",  # stethoscope/doctor
    "photo-1571019614242-c5c5dee9f50b",  # stretching
    "photo-1534438327276-14e5300c3a48",  # gym/weights
    "photo-1588776814546-1ffcf47267a5",  # dry needling
    "photo-1571019613454-1cb2f99b2d8b",  # exercise bands (currently BFR + Gait)
    "photo-1544367567-0f2fcb009e0b",     # yoga pose (currently McKenzie)
    "photo-1598256989800-fe5f95da9787",  # manual therapy
    "photo-1519823551278-64ac92734fb1",  # cupping
    "photo-1512069772995-ec65ed528483",  # heat/ice pack
    "photo-1581093588401-fbb62a02f120",  # electrical stim
    "photo-1582213782179-e0d53f98f2ca",  # workers comp / office
    "photo-1597452485669-2c7bb5fef90d",  # recovery/sports
]

SERVICE_HREFS = {
    "patient-education": "/desktop/services/patient-education/",
    "therapeutic-exercise": "/desktop/services/therapeutic-exercise/",
    "strength-conditioning": "/desktop/services/strength-conditioning/",
    "dry-needling": "/desktop/services/dry-needling-certified/",
    "blood-flow-restriction": "/desktop/services/blood-flow-restriction-therapy/",
    "mckenzie-method": "/desktop/services/mckenzie-method/",
    "mulligan-technique": "/desktop/services/mulligan-technique/",
    "cupping": "/desktop/services/cupping/",
    "gait-balance": "/desktop/services/gait-balance-training/",
    "moist-heat-ice": "/desktop/services/moist-heat-ice/",
    "electrical-stimulation": "/desktop/services/electrical-stimulation/",
    "workers-compensation": "/desktop/services/workers-compensation-physical-therapy-slidell-la/",
}

SERVICE_DIRS = {
    "patient-education": "patient-education",
    "therapeutic-exercise": "therapeutic-exercise",
    "strength-conditioning": "strength-conditioning",
    "dry-needling": "dry-needling-certified",
    "blood-flow-restriction": "blood-flow-restriction-therapy",
    "mckenzie-method": "mckenzie-method",
    "mulligan-technique": "mulligan-technique",
    "cupping": "cupping",
    "gait-balance": "gait-balance-training",
    "moist-heat-ice": "moist-heat-ice",
    "electrical-stimulation": "electrical-stimulation",
    "workers-compensation": "workers-compensation-physical-therapy-slidell-la",
}

SLIDER_FILES = ["desktop/index.html", "mobile/index.html",
                "desktop/services/index.html", "mobile/services/index.html"]

IMG_W, IMG_H = 360, 234
THUMB_W, THUMB_H = 360, 234


def get_current_url(svc_id):
    fp = ROOT / "desktop" / "index.html"
    if not fp.exists():
        return None
    html = fp.read_text(encoding="utf-8")
    href = SERVICE_HREFS.get(svc_id, "")
    pat = re.compile(r"<a\s+href='" + re.escape(href) + r"'[^>]*>.*?<img\s+src='([^']+)'", re.DOTALL)
    m = pat.search(html)
    if m:
        return m.group(1)
    pat2 = re.compile(r'<a\s+href="' + re.escape(href) + r'"[^>]*>.*?<img\s+src="([^"]+)"', re.DOTALL)
    m2 = pat2.search(html)
    if m2:
        return m2.group(1)
    return None


def fetch_photo(photo_id, size=(THUMB_W, THUMB_H)):
    url = f"https://images.unsplash.com/{photo_id}?w={size[0]}&h={size[1]}&fit=crop"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "BrattonPT/1.0"})
        data = urllib.request.urlopen(req, timeout=12).read()
        img = Image.open(io.BytesIO(data))
        img = img.resize(size, Image.LANCZOS)
        return ImageTk.PhotoImage(img), url
    except Exception:
        return None, None


def apply_changes(selections):
    total_rep, total_files = 0, 0
    for svc_id, new_url in selections.items():
        href = SERVICE_HREFS.get(svc_id, "")
        for rel in SLIDER_FILES:
            fp = ROOT / rel
            if not fp.exists():
                continue
            html = fp.read_text(encoding="utf-8")
            escaped = re.escape(href)
            pat = re.compile(
                r"(<a\s+href='" + escaped + r"'[^>]*>.*?<img\s+src=')(https://images\.unsplash\.com/photo-[^']+)(')",
                re.DOTALL
            )
            m = pat.search(html)
            if m and m.group(2).split("?")[0] != new_url.split("?")[0]:
                html = pat.sub(r"\1" + new_url + r"\3", html)
                fp.write_text(html, encoding="utf-8")
                total_rep += 1
            total_files += 1

        d = SERVICE_DIRS.get(svc_id, "")
        if d:
            for pre in ["desktop", "mobile"]:
                dp = ROOT / pre / "services" / d / "index.html"
                if dp.exists():
                    html = dp.read_text(encoding="utf-8")
                    ch = False
                    og_pat = re.compile(r'(<meta\s+property="og:image"\s+content=")([^"]*images\.unsplash\.com[^"]*)(")')
                    om = og_pat.search(html)
                    if om:
                        html = og_pat.sub(r"\1" + new_url + r"\3", html)
                        ch = True
                    img_pat = re.compile(r"(<img[^>]*src=')(https://images\.unsplash\.com/photo-[^']+)(\?w=\d+&h=\d+&fit=crop[^']*')")
                    for im in img_pat.finditer(html):
                        html = img_pat.sub(r"\1" + new_url + r"\3", html, count=1)
                        ch = True
                        break
                    if ch:
                        dp.write_text(html, encoding="utf-8")
                        total_rep += 1
                    total_files += 1
    return total_rep, total_files


class App:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Bratton PT -- Image Picker")
        self.root.geometry("1280x900")
        self.root.configure(bg="#f4f6f9")
        self.selections = {}
        self.photos_cache = {}
        self.build_ui()
        self.preload_photos()

    def build_ui(self):
        top = tk.Frame(self.root, bg="#2257a6", padx=16, pady=12)
        top.pack(fill=tk.X)
        tk.Label(top, text="Bratton PT -- Service Image Picker",
                 font=("Segoe UI", 14, "bold"), fg="white", bg="#2257a6").pack(side=tk.LEFT)
        self.status_lbl = tk.Label(top, text="0/12 changed", font=("Segoe UI", 11),
                                    fg="#f86f26", bg="#2257a6")
        self.status_lbl.pack(side=tk.RIGHT, padx=8)
        tk.Button(top, text="Apply All to Website", command=self.apply_all,
                  bg="#28a745", fg="white", font=("Segoe UI", 11, "bold"),
                  padx=20, pady=8, bd=0, cursor="hand2").pack(side=tk.RIGHT, padx=12)

        help_f = tk.Frame(self.root, bg="#e7f0ff", padx=16, pady=6)
        help_f.pack(fill=tk.X)
        tk.Label(help_f, text="CLICK any photo to SELECT it for that service. Green border = selected. 'Apply All' writes to website.",
                 font=("Segoe UI", 9), fg="#2257a6", bg="#e7f0ff").pack(side=tk.LEFT)

        canvas_frame = tk.Frame(self.root, bg="#f4f6f9")
        canvas_frame.pack(fill=tk.BOTH, expand=True)

        self.canvas = tk.Canvas(canvas_frame, bg="#f4f6f9", highlightthickness=0)
        scrollbar = tk.Scrollbar(canvas_frame, orient=tk.VERTICAL, command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=scrollbar.set)

        self.inner = tk.Frame(self.canvas, bg="#f4f6f9")
        self.inner.bind("<Configure>", lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.canvas.bind_all("<MouseWheel>", lambda e: self.canvas.yview_scroll(int(-1*(e.delta/120)), "units"))

        self.rows = {}
        for svc_id, name in SERVICES:
            self.rows[svc_id] = self._build_row(svc_id, name)

    def _build_row(self, svc_id, name):
        frame = tk.Frame(self.inner, bg="white", bd=1, relief=tk.SOLID, padx=10, pady=10)
        frame.pack(fill=tk.X, padx=12, pady=6)

        hdr = tk.Frame(frame, bg="white")
        hdr.pack(fill=tk.X)
        tk.Label(hdr, text=name, font=("Segoe UI", 11, "bold"), fg="#2257a6", bg="white").pack(side=tk.LEFT)
        status_lbl = tk.Label(hdr, text="No change", font=("Segoe UI", 9), fg="#856404", bg="white")
        status_lbl.pack(side=tk.RIGHT, padx=4)
        current_url = get_current_url(svc_id)
        cur_text = current_url.split("/")[-1].split("?")[0] if current_url else "N/A"
        tk.Label(hdr, text=f"Current: {cur_text}", font=("Segoe UI", 8), fg="#888", bg="white").pack(side=tk.RIGHT, padx=10)

        # Scrollable photo strip
        strip_frame = tk.Frame(frame, bg="white")
        strip_frame.pack(fill=tk.X, pady=(6, 0))

        strip_canvas = tk.Canvas(strip_frame, bg="white", height=THUMB_H + 10, highlightthickness=0)
        strip_scroll = tk.Scrollbar(strip_frame, orient=tk.HORIZONTAL, command=strip_canvas.xview)
        strip_canvas.configure(xscrollcommand=strip_scroll.set)

        photo_inner = tk.Frame(strip_canvas, bg="white")
        strip_canvas.create_window((0, 0), window=photo_inner, anchor="nw")

        # Custom entry for pasting Unsplash URL
        entry_frame = tk.Frame(frame, bg="white")
        entry_frame.pack(fill=tk.X, pady=(4, 0))
        url_var = tk.StringVar()
        url_entry = tk.Entry(entry_frame, textvariable=url_var, width=50, font=("Consolas", 9))
        url_entry.pack(side=tk.LEFT, padx=(0, 6))
        tk.Label(entry_frame, text="Or paste Unsplash URL:", font=("Segoe UI", 8), fg="#888", bg="white").pack(side=tk.LEFT, padx=(0, 4))
        tk.Button(entry_frame, text="Use", font=("Segoe UI", 8), bg="#28a745", fg="white", bd=0,
                  command=lambda s=svc_id, v=url_var: self.use_pasted(s, v.get())).pack(side=tk.LEFT, padx=2)
        tk.Button(entry_frame, text="Search", font=("Segoe UI", 8), bg="#e7f0ff", fg="#2257a6", bd=0,
                  command=lambda s=svc_id,n=name: webbrowser.open(f"https://unsplash.com/s/photos/{urllib.parse.quote(n.lower().replace(' ','-'))}")).pack(side=tk.LEFT, padx=2)

        strip_canvas.pack(side=tk.TOP, fill=tk.X)
        strip_scroll.pack(side=tk.TOP, fill=tk.X)

        frame.strip_canvas = strip_canvas
        frame.photo_inner = photo_inner
        frame.status_lbl = status_lbl
        frame.svc_id = svc_id
        frame.photo_labels = []
        frame.url_var = url_var
        return frame

    def preload_photos(self):
        for photo_id in POOL:
            photo, url = fetch_photo(photo_id)
            if photo:
                self.photos_cache[photo_id] = (photo, url)
        for svc_id, name in SERVICES:
            self._populate_strip(svc_id)

    def _populate_strip(self, svc_id):
        row = self.rows[svc_id]
        inner = row.photo_inner
        for w in inner.winfo_children():
            w.destroy()
        row.photo_labels = []

        for i, photo_id in enumerate(POOL):
            if photo_id in self.photos_cache:
                photo, url = self.photos_cache[photo_id]
                card = tk.Frame(inner, bg="#dee2e6", bd=0, padx=2, pady=2)
                card.grid(row=0, column=i, padx=4)
                lbl = tk.Label(card, image=photo, bg="#dee2e6", cursor="hand2")
                lbl.image = photo
                lbl.pack()
                lbl.bind("<Button-1>", lambda e, sid=svc_id, u=url, c=card: self.select_photo(sid, u, c))
                card.photo_label = lbl
                row.photo_labels.append((card, url))

        inner.update_idletasks()
        row.strip_canvas.configure(scrollregion=row.strip_canvas.bbox("all"))

    def select_photo(self, svc_id, url, clicked_card):
        row = self.rows[svc_id]
        # Clear previous selections
        for card, _ in row.photo_labels:
            card.configure(bg="#dee2e6")
        # Mark selected
        clicked_card.configure(bg="#28a745")
        self.selections[svc_id] = url
        row.status_lbl.configure(text="CHANGED", fg="#155724")
        self._update_status()

    def use_pasted(self, svc_id, raw):
        raw = raw.strip()
        if not raw:
            return
        m = re.match(r'(?:https?://(?:www\.)?unsplash\.com/photos/)?(photo-\d+-[a-f0-9]+)', raw)
        if not m:
            messagebox.showwarning("Invalid", "Could not find a photo ID in your input.")
            return
        photo_id = m.group(1)
        new_url = f"https://images.unsplash.com/{photo_id}?w=400&h=260&fit=crop"
        # Try to fetch and add to pool
        photo, _ = fetch_photo(photo_id)
        if photo:
            if photo_id not in POOL:
                POOL.append(photo_id)
                self.photos_cache[photo_id] = (photo, new_url)
                self._populate_strip(svc_id)
            self.selections[svc_id] = new_url
            self.rows[svc_id].status_lbl.configure(text="CHANGED", fg="#155724")
            self._update_status()
        else:
            messagebox.showwarning("Failed", "Could not load that photo. Invalid ID?")

    def _update_status(self):
        n = len(self.selections)
        self.status_lbl.configure(text=f"{n}/12 changed")

    def apply_all(self):
        if not self.selections:
            messagebox.showinfo("Nothing", "Click photos to select new images first.")
            return
        confirm = f"Apply {len(self.selections)} changes to all website files?"
        if not messagebox.askyesno("Confirm", confirm):
            return
        rep, files = apply_changes(self.selections)
        names = [dict(SERVICES)[sid] for sid in self.selections]
        msg = f"Done! {rep} replacements across {files} files.\n\nChanged:\n" + "\n".join(f"  - {n}" for n in names)
        messagebox.showinfo("Applied", msg)
        self.selections = {}
        for svc_id, _ in SERVICES:
            self.rows[svc_id].status_lbl.configure(text="Applied!", fg="#155724")
            for card, _ in self.rows[svc_id].photo_labels:
                card.configure(bg="#dee2e6")
        self._update_status()


if __name__ == "__main__":
    App().root.mainloop()
