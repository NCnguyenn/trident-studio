# StPageFlip / page-flip 2.0.7

- Official documentation: https://nodlik.github.io/StPageFlip/
- Upstream repository: https://github.com/Nodlik/StPageFlip
- Download: https://registry.npmjs.org/page-flip/-/page-flip-2.0.7.tgz
- Registry `latest` verified as 2.0.7 on 2026-11-04; package license: MIT.
- npm tarball integrity: `sha512-96lQFUUz7r/LZzEUZJ3yBIMEKU9+m8HMFDzTvTdD6P7Ag/wXINjp9n0W7b4wanwnDbQETo4uNUoL3zMqpFxwGA==`
- `page-flip.browser.js` SHA-256: `bbaca0bbef57a22bb66a3fc69d67baf9a17fb9a9c89ec9ed35e2b91abe4bd1e7`
- Browser bundle copied byte-for-byte from `package/dist/js/page-flip.browser.js`; LICENSE copied from `package/LICENSE`. No build, installation, or runtime network dependency.
- HTML soft-page mode uses the upstream browser global `St.PageFlip`. The app resets the odd final page's density to soft via the library API because upstream defaults an unpaired final page to hard.
