## Purpose

Open, edit, organise in tabs and save Markdown files on disk without ever losing or corrupting the author's text.

## ADDED Requirements

### Requirement: Open files
The app SHALL open Markdown files chosen in a native dialog, passed on the command line, sent by the OS (Open With), or picked from a recent-files list of up to 10 entries.

#### Scenario: Open from dialog
- **WHEN** the user chooses File ▸ Open and selects `notes.md`
- **THEN** `notes.md` opens in a tab showing its text

#### Scenario: Already open
- **WHEN** the user opens a file that is already open in a tab
- **THEN** that tab is focused and no duplicate tab is created

### Requirement: Tabs
The app SHALL show each open document in its own tab within one window, with a marker on tabs that have unsaved changes.

#### Scenario: Reuse pristine tab
- **WHEN** the active tab is untitled, empty and unmodified and the user opens a file
- **THEN** the file opens in that tab

#### Scenario: Dirty marker
- **WHEN** the user edits a saved document
- **THEN** its tab shows an unsaved marker until it is saved

### Requirement: Save exactly
Saving SHALL write exactly the editor text as UTF-8, preserving the file's original line endings, and SHALL NOT reformat content.

#### Scenario: CRLF preserved
- **WHEN** a file with CRLF line endings is opened, edited and saved
- **THEN** the saved file uses CRLF line endings throughout

### Requirement: No silent data loss
Closing a tab, the window or the app with unsaved changes SHALL prompt the user before discarding them.

#### Scenario: Quit with unsaved tabs
- **WHEN** the user quits while two tabs have unsaved changes
- **THEN** one prompt lists both and the app quits only if the user confirms

### Requirement: External changes
The app SHALL detect when an open file was changed on disk by another program, checked before save, before PDF export and when the window regains focus.

#### Scenario: Save after external change
- **WHEN** the file changed on disk since it was opened and the user saves
- **THEN** the user is asked to Overwrite, Reload or Cancel

#### Scenario: Focus with clean tab
- **WHEN** the window regains focus, the tab has no unsaved changes and its file changed on disk
- **THEN** the tab reloads silently

#### Scenario: Focus with dirty tab
- **WHEN** the window regains focus, the tab has unsaved changes and its file changed on disk
- **THEN** the user is asked whether to reload

### Requirement: Foldable panes
The window SHALL offer editor-only, split and preview-only layouts, and the editor SHALL fold sections by heading.

#### Scenario: Preview only
- **WHEN** the user selects preview-only
- **THEN** the editor pane is hidden and the preview fills the window
