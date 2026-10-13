# Design QA

Source visual truth: /workspace/scratch/smart-reference-dark.jpg (1348 × 926), /workspace/scratch/smart-reference-motion.jpg. Live Dribbble references: shots 27442264 and 27637405.
Implementation evidence: /workspace/scratch/smart-contractor-preview.jpg, cropped /workspace/scratch/smart-contractor-screen.jpg (361 × 782).
Viewport: 1363 × 936. iPhone CSS screen: 393 × 852. Rendered scale: 0.917. Browser screenshot density 1. Source is a multi-phone reference board rather than an exact Smart Contractor mockup. Content and app structure intentionally adapted, not a pixel clone.

Full-view evidence: both source and implementation opened together in one image comparison input. Dark navy hierarchy, glass card borders, cool blue accent and premium architecture photography are retained. Focused regions: title/search/services and photo caption read directly from those images. The exact authors' typeface and motion timing are unavailable; Arial/Helvetica and 220ms screen transitions with spring navigation are intentional implementation choices.

Required surfaces:
- Typography: clear white display heading, muted compact secondary labels; source typography approximated, not asserted identical.
- Spacing/layout: persistent navigation and header, card hierarchy and safe top area verified. Long content scrolls inside MobileScroll.
- Tokens: navy #090e19, glass #141d2b, blue #315bce; light theme checked separately. Source palette inferred visually.
- Images: generated blue-hour home, properly cropped photorealistic asset, no coded imitation of architecture. Original reference images not licensed for redistribution and not included.
- Content: construction workflows replace real-estate search. Every live service boundary explicitly described as preview.

Comparison history:
1. [P1] Header overlapped system bar; [P1] absolute MobileScroll covered header; fixed with 54px safe top padding and relative page host. Revised screenshots show complete header below status bar.
2. [P1] Sheet's MobileScroll collapsed to zero height; fixed scoped fixed-height sheet/content flex layout. Example plan and transfer into create form verified after fix.
3. [P1] Native focus scrolled the phone screen parent, displacing header and system bar. Fixed app-scoped overflow:clip. Light-theme screenshot and DOM showed device-screen.scrollTop=0.
4. [P2] New projects showed completed sample milestones. Now new requests show awaiting scope/estimates; sample milestones limited to existing sample project.

Primary interactions tested in cloud browser: form save (Seattle, $22,000), project survives reload, sample-plan animation and transfer to form, saved idea aria-pressed, local message send, role switching, simulated reservation, dark/light theme, reset preview. Production build and check:runtime passed, 4 sites packaging tests passed. Console checked: no errors matching terminal.local; unrelated browser extension errors recorded.

Open limitation: supported browser controls did not provide an enlarged viewport; required 393 × 852 unscaled capture could not be taken. Current evidence is readable but does not satisfy mandatory 1:1 fidelity acceptance. No exact 99.9% match is claimed.

Implementation checklist:
- Complete unscaled 1:1 design QA before final visual acceptance.
- Integrate verified backend endpoints and real auth separately.
- Connect real AI, messaging and payment flows with server-side permissions.
- Native packaging/accessibility/device testing before production.

final result: blocked
