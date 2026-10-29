# Trident Studio

Static frontend website for Trident Studio: Home, Studio, Comics, three artbook readers, and Contact.

## Local preview

Run `python -m http.server 8767` in this directory and open `http://127.0.0.1:8767`.

## Vercel

Import `NCnguyenn/trident-studio` into Vercel with Framework Preset **Other** and Root Directory `.`. Configuration is supplied by `vercel.json`; no install or build is needed.

The contact form composes and copies a message. It does not send or store submissions. All reading assets are local, including the original-resolution artbook pages.
