# Play Store Listing Assets

Everything needed to fill in the Play Console "Store listing" and
"App content" pages for Data Ai.

- `icon-512.png` — hi-res icon (512×512), for the Store listing page.
  (Separate from the in-app adaptive icon in `artifacts/data-ai/assets/images/`.)
- `feature-graphic.png` — 1024×500 banner shown at the top of the listing.
- `description.md` — short + full listing description copy, and the
  category to select.
- `data-safety-and-rating.md` — answers for the Data Safety form and the
  content rating questionnaire.
- `screenshots/` — six phone screenshots (824×1830), captured from a real
  run of the app against mocked search data:
  1. `01-dashboard.png` — populated dashboard with CRM stats
  2. `02-search-results.png` — search results with No Website badges
  3. `03-leads-list.png` — leads list showing full CRM pipeline variety
  4. `04-lead-detail.png` — lead detail with Call/WhatsApp/Website actions
  5. `05-analytics.png` — pipeline funnel + top cities/categories
  6. `06-settings-templates.png` — WhatsApp message templates

## Before submitting

- Replace `REPLACE_WITH_SUPPORT_EMAIL` and the privacy policy URL in
  `description.md` and in `docs/privacy.html`.
- Upload screenshots in this numeric order — Play Console shows them in
  the order uploaded.
