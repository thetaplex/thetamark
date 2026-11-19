## Purpose

Render the active document's Markdown live, next to the editor, according to a selectable flavor, without letting document content run code.

## ADDED Requirements

### Requirement: Live preview
The preview SHALL update to reflect the editor text shortly after the user stops typing.

#### Scenario: Typing updates preview
- **WHEN** the user types `# Hello`
- **THEN** the preview shows a level-1 heading "Hello"

### Requirement: Flavor selection
A dropdown SHALL select CommonMark, GFM or Extended; GFM is the default and the last choice is remembered.

#### Scenario: CommonMark ignores tables
- **WHEN** the flavor is CommonMark and the text contains a pipe table
- **THEN** the table renders as a plain paragraph

#### Scenario: GFM features
- **WHEN** the flavor is GFM
- **THEN** tables, task lists, strikethrough, autolinks and footnotes render

#### Scenario: Extended features
- **WHEN** the flavor is Extended
- **THEN** `$…$` / `$$…$$` math, `mermaid` code blocks as diagrams render and YAML front matter is hidden

### Requirement: Code highlighting
Fenced code blocks with a known language SHALL be syntax highlighted in every flavor; unknown languages render as plain code.

#### Scenario: Unknown language
- **WHEN** a fenced block uses language `nosuchlang`
- **THEN** it renders as plain code without error

### Requirement: Safe rendering
The preview SHALL NOT execute scripts or event handlers from the document, SHALL drop `javascript:` links, and SHALL open http, https and mailto links in the system browser.

#### Scenario: Script stripped
- **WHEN** the document contains `<script>alert(1)</script>`
- **THEN** no script runs and none appears in the preview

#### Scenario: External link
- **WHEN** the user clicks an https link in the preview
- **THEN** it opens in the default browser and the app window does not navigate

### Requirement: Relative images
Images with relative paths SHALL resolve against the open file's directory.

#### Scenario: Sibling image
- **WHEN** `notes.md` contains `![x](img/a.png)` and `img/a.png` exists beside it
- **THEN** the image shows in the preview
