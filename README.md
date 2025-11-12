## Practical Prompt Engineering Course
This is a companion repository for the [Practical Prompt Engineering](https://frontendmasters.com/courses/prompt-engineering/) course on Frontend Masters.
[![Frontend Masters](https://static.frontendmasters.com/assets/brand/logos/full.png)](https://frontendmasters.com/courses/prompt-engineering/)

### About this Repo

This repo contains the final code for the **Prompt Library** application build in the course. The `reference-project` branch is the application demonstrated at the beginning of the course. The commits on the `main` branch are the progress checks while for the application build during the course.

---

## Prompt Library (Local Version)

This project provides a lightweight, client‑side prompt manager. You can create, search, copy, export, import, and delete prompts — all stored in your browser's `localStorage` (no backend required).

### Features
* Create a prompt with a title and content
* Automatic persistence in `localStorage`
* View all saved prompts (newest first)
* Search/filter by title or content
* Copy prompt content to clipboard
* Delete individual prompts
* Export all prompts as a JSON file
* Import prompts from a previously exported JSON file (merges without duplicates)
* Accessible status notifications (screen‑reader friendly)
* Light/Dark theme toggle (persists your choice)

### File Structure
```
index.html      # Main HTML page
style.css       # Styling (responsive, dark theme)
script.js       # Application logic (CRUD, render, import/export, search)
README.md       # Documentation
```

### Getting Started (VS Code Live Server)
1. Install the "Live Server" extension in VS Code (Ritwick Dey).
2. Open this folder in VS Code.
3. Right‑click `index.html` and choose "Open with Live Server" OR click "Go Live" in the status bar.
4. Your browser will open (typically http://127.0.0.1:5500/) with the app running.

### Usage
1. Enter a Title and Content for your prompt; the Save button enables when both fields have text.
2. Click "Save Prompt" — it appears immediately in the list.
3. Use the Search box to filter prompts dynamically.
4. Click "Copy" to copy the full content to your clipboard.
5. Click "Delete" (and confirm) to remove a prompt.
6. "Export" downloads a JSON backup of all prompts.
7. "Import" lets you select a previously exported JSON; new prompts are merged (existing IDs preserved).
8. Use the "Switch to Light/Dark Theme" button to toggle appearance; preference is remembered.

### Data Persistence
All data is stored under the `localStorage` key:
```
promptLibrary.prompts
```
Clearing site data or using another browser/device will result in an empty library unless you re‑import a backup.

### JSON Export Format (Example)
```json
[
	{
		"id": "lmb3x0n8-3fa29c1e",
		"title": "Blog Outline Generator",
		"content": "You are an expert editor...",
		"createdAt": 1731499200000,
		"updatedAt": 1731499200000
	}
]
```

### Accessibility Notes
* Live region announces actions (saved, deleted, copied, etc.).
* Buttons have `aria-label`s where needed.
* Keyboard focus styles preserved.

### Customization Ideas (Optional Next Steps)
* Tagging & categories
* Favorite/star prompts
* Light theme toggle
* Bulk delete or multi‑select
* Prompt version history

### Theme Notes
The theme selection is stored in `localStorage` under the key `promptLibrary.theme`. Remove that key or clear site data to reset to system preference.

### Troubleshooting
| Issue | Resolution |
|-------|------------|
| Save button stays disabled | Ensure both Title and Content have non‑whitespace characters. |
| Import fails | Validate that the file is valid JSON and an array of objects with `title` & `content`. |
| Nothing appears after import | File may contain duplicates only; new IDs are skipped. |
| Prompts lost | Browser storage cleared; re‑import your last export file. |

### Privacy
Everything stays in your browser. No network calls are made by the app.

### License
This educational project follows the course context; adapt as needed.

---