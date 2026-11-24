# 📸 Mobile Web Photobooth

A modern, responsive, mobile-first Web Photobooth app built with React, Tailwind CSS, Canvas API, and HTML5 MediaRecorder. Designed specifically for smartphones and tablets to create custom collages, record 5-second video clips on every shot, apply real-time vintage and noir filters, customize frames and watermarks, curate sessions, and generate instant shareable links & print-ready photostrips.

---

## ✨ Features

### 📱 1. Mobile-First Camera Experience
- **Front & Back Camera Switching**: Seamlessly toggle between front selfie camera and back ultra-wide/main camera.
- **5-Second Capture Countdown**: Each photo and its video clip use a 5-second countdown with audio beeps and a visual progress ring.
- **Synthesized Audio & Flash Feedback**: Realistic mechanical camera shutter sound, countdown ticks, celebration chimes (powered by Web Audio API without external audio files), and screen flash.
- **One-Touch Sequence Mode**: Automatically records all required shots with posing intervals between shots.

### 🎥 2. 5-Second Video Clip on Every Photo Taken
- **Live Motion Capture**: Each photo automatically records **5 seconds of live video** (`MediaRecorder` API).
- **Interactive Motion Playback**: Toggle motion playback to watch your photostrip come alive with animated motion (Harry Potter / Apple Live Photo style!).
- **Shareable Videos**: Shared session links include motion playback; guests can download each video clip or bundle all clips and collages into a single ZIP file (`JSZip`).

### 🎨 3. Custom Collages & Layout Sizes
- **Classic 4-Cut Strip (2" x 6")**: Iconic Korean & Japanese vertical 4-cut photostrip with bottom brand stamp.
- **Retro 3-Cut Strip (2" x 6")**: 3 large photos with date & event watermark.
- **Square 2x2 Grid (4" x 4")**: Instagram-ready square quad collage.
- **6-Shot Party Postcard (4" x 6")**: 2 columns × 3 rows for large group shots and celebrations.
- **Polaroid Style (3.5" x 4.25")**: Solo hero frame with wide signature bottom border.
- **Double Strip (Print 2-Up on 4" x 6")**: Prints two identical 2" x 6" strips side-by-side with a scissor cut line, ready for standard 4x6 photo printers!

### 🖼️ 4. Editable Designs & Custom Watermarks
- **Custom Event Branding**: Editable title (e.g., *"SARAH'S 21ST BIRTHDAY"*, *"MARRIED 2026"*), subtitle, and date stamp.
- **Font Typography**: Choose between Modern Sans (Montserrat), Classic Serif (Playfair), Retro Script (Pacifico), Handwritten (Caveat), Typewriter, and Bold Impact.
- **Frame Colors & Gradients**: Studio White, Noir Black, Vintage Cream, Pastel Pink, Soft Lilac, Sky Blue, Matcha, Sunset Peach, Holographic Gradient, Sunset Glow, and Hex Color Picker.
- **Border & Spacing**: Sliders for border width, corner roundness, and polka dot patterns.
- **Interactive Stickers & Badges**: Drag-and-drop, resize, and rotate emojis (✨, 💖, 🔥, 🕶️, 👑, 🍾, 💋, 🎀, 🎉) and event badge stamps.

### 🎞️ 5. Real-Time & Post-Capture Filters
- **Natural**: True-to-life vibrant colors.
- **B&W Noir**: High-contrast dramatic black and white.
- **B&W Vintage**: Soft silver monochrome with subtle grain.
- **1970s Sepia**: Warm amber nostalgic tones.
- **Y2K Disposable**: Punchy flash, nostalgic green-tinted shadows.
- **Golden Hour**: Sun-drenched warm glow.
- **Cyber Neon**: Futuristic cyberpunk pop with saturated contrast.
- **Pastel Glamour**: Dreamy beauty bloom and skin glow.
- **Teal & Orange**: Moody cinematic film aesthetic.

### 💾 6. Curated Storage & Instant Shareable Links
- **High-Capacity IndexedDB Persistence**: Saves full-resolution images, collages, and 5-second video clips locally without browser storage limits.
- **Vercel-hosted Share Links**: On a Vercel deployment, sessions and their downloadable packages are stored in Vercel Blob, so a QR link can be opened from another device.
- **Complete Session Download**: Guests can download the photo collage, individual photos, video clips, and a `session.json` metadata export as one ZIP.
- **Curated Event Gallery**:
  - Star / favorite the best shots for the event.
  - Delete test or unwanted poses.
  - **Live Slideshow Mode**: Turn any connected TV, projector, or tablet into a rotating live event slideshow!

Shared links are unlisted, not private: anyone who has a link can view and download that session. Shared sessions are not exposed through a public list endpoint. The QR uses the current site origin, so links made while running on `localhost` only work on that machine/network. Create the link from the deployed Vercel site for guest access.

### 🖨️ 7. 300 DPI Print-Ready Output
- Generates high-resolution images up to 300 DPI (e.g. 1200 x 3600 px for 2x6, 2400 x 3600 px for 4x6).
- One-click native print button with tailored `@media print` CSS rules (removes UI, headers, and buttons, centering only the photo strip on paper).

---

## 🚀 Getting Started

### 1. Start the Development Server
```bash
cd web-photobooth
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Connect Your Phone via Wi-Fi
The Vite server listens on `0.0.0.0`, meaning any smartphone connected to the same Wi-Fi network can open the app directly via:
```
http://<YOUR_LOCAL_IP>:5173
```
*(Example: `http://192.168.1.15:5173`)*

### 3. Optional Local Network Sync Server
To enable cross-device sharing across phones on the local network:
```bash
npm run server
```
This runs the lightweight sync server on port `4000` which persists sessions to `./data/sessions.json`.

### 4. Deploy with Vercel Blob sharing
1. Import this project into Vercel and deploy it using the Vite defaults (`npm run build`, output directory `dist`).
2. In the Vercel project, open **Storage → Create Storage → Blob** and create a **Public** Blob store.
3. Connect the store to the project’s **Production** environment and select **Add a read-write token env var**. The Blob connection must provide `BLOB_READ_WRITE_TOKEN` to the project so the upload function can authorize direct browser uploads. Do not add this secret to a `VITE_` variable or commit it to source control.
4. Redeploy after connecting the store.
5. Capture or open a session on the deployed site and select **Share & QR**. The app uploads the collage and a ZIP package to Blob before showing the link. Guests can scan the QR code, view the still or motion collage, and download the complete package.

Vercel Blob holds the shareable session files and small session manifests. Browser IndexedDB remains a local cache; it is not a centralized database or a backup of all booth devices.
