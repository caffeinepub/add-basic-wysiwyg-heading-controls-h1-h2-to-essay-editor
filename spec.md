# Specification

## Summary
**Goal:** Add basic WYSIWYG heading support (H1/H2) to the Essay editor, including storage, rendering, and export.

**Planned changes:**
- Extend the backend RichText data model to store a heading level for heading blocks (support at least H1 and H2).
- Ensure existing saved essays/pages remain readable by defaulting legacy heading blocks to a sensible heading level when no level is present.
- Update the admin Essay editor toolbar to add H1 and H2 controls alongside existing Bold/Italic, including toggling a heading back to a normal paragraph.
- Update RichText rendering so stored heading blocks render as the correct HTML tags (<h1> vs <h2>), with a consistent default for legacy content.
- Update Markdown export so headings emit the correct number of `#` characters based on stored heading level (H1 -> `#`, H2 -> `##`).
- Add/adjust backend state migration as needed so canister upgrades do not trap and existing content remains accessible.

**User-visible outcome:** Admins can format Essay content with H1 and H2 headings using toolbar controls, and published essays plus markdown exports reflect the correct heading levels without breaking older content.
