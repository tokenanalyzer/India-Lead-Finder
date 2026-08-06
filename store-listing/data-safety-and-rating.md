# Play Console: Data Safety & Content Rating Answers

## Data Safety form

**Does your app collect or share any of the required user data types?**
→ No — nothing is collected by the developer. All data (leads, notes,
settings, your API key) is stored only on the user's device.

**Is all user data encrypted in transit?**
→ N/A / not applicable in the sense Play means it (no data is transmitted to
us). The app's own network calls (device → Google Places API) use HTTPS.

**Do you provide a way for users to request data deletion?**
→ Not applicable — we never receive or store user data on any server.
Users delete their own data locally (per-lead delete, or uninstalling the
app removes everything).

**Data types collected** — for each category, select "Data isn't collected":
- Location: not collected *by us*. (The app reads device GPS locally, on
  device, only to bias a search — coordinates are sent directly from the
  user's device to Google's Places API, never to us. If Play Console forces
  a location disclosure because the app requests the permission, disclose:
  "Approximate or precise location — collected but not shared with us;
  sent directly to Google Maps Platform for search purposes; not stored.")
- Personal info, Financial info, Messages, Photos/videos, Audio, Files/docs,
  Calendar, Contacts, App activity, Web browsing, App info/performance,
  Device/other IDs: not collected.

**Third-party data sharing**
→ Declare Google Maps Platform (Places API) as a service the app connects
to, for search functionality. The app itself does not share data with any
other third party; it doesn't have accounts, ads SDKs, or analytics SDKs.

## Content rating questionnaire

Answer honestly per the actual app — expected outcome:

- Violence: None
- Sexual content: None
- Profanity: None
- Controlled substances (alcohol/drugs/tobacco): None
- Gambling: None
- User-generated content shared with other users: None (single-user,
  on-device only, no sharing/social features)
- Location sharing: App can access device location (for the "near me"
  search feature) but does not share it with other users or the developer.

Expected rating: **Everyone** / **PEGI 3**.

## Target audience & content

- Target age group: Adults / general business audience — not designed for
  or directed at children.
- Ads: No ads.
- In-app purchases: None.

## Government / news / COVID app declarations
- Not a government app.
- Not a news app.
- Not a COVID-19 contact tracing/status app.
