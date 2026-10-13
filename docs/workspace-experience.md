# Document-first workspace

## Primary workflow

Choose a project → enter an update or attach custom data/photos → Build/Update report → click text to edit → save a named snapshot → Share.

- The toolbar shows the current folder/project, real local save state, undo/redo, and Share.
- The sidebar can be collapsed. History is scoped to the active project and supports reviewing saved cards before restoration.
- The composer holds a separate per-project session draft; submitting appends notes to the project's sources. The source-notes button opens the complete editable input history.
- Graph forms live in the Add metric flyout. Photo attachment opens the device picker directly. Multiple reads append atomically through project-scoped callbacks.
- Card text edits are field-level transactions: blur/Enter commits, Escape cancels, and Command/Ctrl+Enter commits multiline text. Pencil opens advanced card details.
- Duplicate inserts immediately below the source card. Alt+Up/Down moves a focused card. Native text undo remains available inside fields.

## Data behavior

Generated cards have stable source keys. Updating refreshes unedited generated cards while retaining manually edited cards, duplicates, and manual cards. Existing drafts remain compatible.

New snapshots capture the entire project state; older card-only snapshots continue to restore their cards. Undo/redo stores complete project states so restoration is reversible.

Custom metrics explicitly choose higher/lower/no judgement. Donuts require positive targets. Signed bar charts use a zero baseline. Graph styles, directions, source keys, and manual edit flags are validated and persisted.

## Verification

Type check, 49 unit tests, production build, and Chromium workflow checks passed. Browser checks covered field editing, preserved updates, duplication, custom metric entry, multiple photos, share dialog Escape handling, 390px layout overflow, print overflow, and runtime errors.

The Share dialog loads on demand. Dialogs trap and restore focus; menus dismiss with Escape; reduced-motion and safe-area styling are supported. A single top notification avoids obscuring the composer on mobile.
