## Purpose

Export the rendered preview of the active document to a PDF file on disk, matching what the preview shows.

## ADDED Requirements

### Requirement: Export preview to PDF
File ▸ Export PDF SHALL write the rendered preview (not the editor) to a PDF path chosen in a save dialog, without a print dialog.

#### Scenario: Export
- **WHEN** the user exports and picks `notes.pdf`
- **THEN** `notes.pdf` is written and contains the rendered document

### Requirement: Page size
The export SHALL use A4 (ISO 216) by default with Letter selectable; the last choice is remembered.

#### Scenario: Letter
- **WHEN** the user selects Letter and exports
- **THEN** the PDF pages are Letter size

### Requirement: Stale file check before export
Before exporting, the app SHALL check whether the file changed on disk and offer Reload first, Export current text, or Cancel.

#### Scenario: Changed on disk
- **WHEN** the file changed on disk and the user exports
- **THEN** the user is asked to reload first, export the current text, or cancel
