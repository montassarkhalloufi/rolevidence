# Design system

## Ownership

The UI uses owned shadcn-style primitives and Tailwind v4. Button retains the attributed shadcn/Radix Slot foundation. Card, Badge, Alert, StatusIcon, Input, Textarea, NativeSelect and CodeBlock are local compositions; they are not presented as unmodified upstream copies.

- Semantic colors and radii: src/client/shared/styles/tokens.css.
- Document defaults only: src/client/styles.css.
- Component variants and native semantics: src/client/shared/ui.
- Feature layout: Tailwind utilities in feature components.

Use Button variant/size for appearance, and className for layout (for example w-full). Avoid restyling shared primitives from global selectors. Use semantic status tones rather than green/amber classes; always retain the written label. Native selects intentionally preserve platform keyboard and mobile behavior.

## States and accessibility

Control styles share focus-visible outlines, invalid states and disabled affordances. Field labels remain connected by HTML IDs. Buttons default to type=button to avoid accidental submissions. Use explicit type=submit for analysis. Loading actions expose aria-busy; reduced-motion users do not receive the loading animation. Fields use 16px text to avoid mobile input zoom; the long document editor is separately styled for reading.

## Verification

Run npm run quality and npm run test:browser. Install Chromium with npx playwright install chromium first, or select locally installed Chrome with PLAYWRIGHT_CHANNEL=chrome. Browser tests use fake API responses and never call OpenAI. Screenshots are ignored under test-results/. CI installs Chromium and runs the browser suite.

The checks are regression guards, not certification of every accessibility requirement. Review actual screenshots and keyboard behavior when adding variants, error states or dense layouts.
