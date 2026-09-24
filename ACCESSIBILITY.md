# Accessibility review — 24 September 2026

Scope: public homepage, shared styles, theme selection, inquiry dialogs and contact verification integration. This is a source and targeted automated review, not a complete WCAG conformance audit.

## Improvements

- Added an accessible light/dark appearance button with an action-specific name, native keyboard activation, 44px target and visible focus. Uses the device preference initially and saves only an explicit appearance choice. Storage failures do not break the control.
- Added light surfaces and readable text for cards, itinerary, forms, dialogs and verification. The photographic hero remains dark for readability.
- Darkened primary CTA gradients and increased contrast for footer text, notes, placeholders and vehicle captions. Selected contrast pairs range from 5.80:1 to 8.50:1; these results do not describe every rendered pixel or image background.
- Increased small icon controls to 44px and enlarged link targets. Adjusted navigation breakpoints and narrow-screen layout to accommodate the theme control.
- Made the skip-link destination programmatically focusable and identified the required name field visibly.
- Preserved native dialog keyboard dismissal/focus return, field labels, image alternatives, live verification status, reduced-motion behavior and pause controls for rotating offers.
- reCAPTCHA uses the active appearance when initially rendered. An already active Google widget retains its appearance so changing themes does not discard a completed verification.

## Verification

- `node scripts/check-theme.cjs`: device defaults, saved preference, blocked storage, toggle labels, system changes, cross-tab updates and selected contrast pairs.
- `npm run check`: existing site, content, contact and OAuth checks.
- Standard HTML parser check: image alt attributes, button names, enclosing form labels, named dialogs, one main landmark and focusable skip destination.

## Remaining manual checks

The plain static/Worker project has no compatible managed browser preview. Keyboard traversal, actual layout at 200%/400% zoom, screen-reader announcements, rendered contrast over photography, and Google's external challenge were not tested in a browser during this review. Test both themes at narrow mobile and desktop widths, navigate all menus/dialogs using keyboard only, and verify the complete inquiry flow with a screen reader before claiming WCAG conformance. Logo artwork is preserved as supplied, with an accessible home-link name.

## Light-mode follow-up

Fixed the hero eyebrow inheriting a dark accent over photography and pale legal dialog paragraphs on white. Added a dark hero scrim with a 72% opacity floor, opaque-backed photo captions, darker brand rendering on light surfaces, clearer interactive card edges, and distinct focus treatments for light surfaces versus dark photography. Input focus now overrides the legacy pale-pink outline. Inline privacy links keep underlines; high-contrast system colors are respected.

Expanded contrast tests cover legal copy, hero text against the worst-case white image under the new scrim, light/dark-area focus indicators and interactive borders. These are targeted contrast and source checks; the previously documented browser/screen-reader limitations still apply.
