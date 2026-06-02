---
name: run-locally
description: Run this personal website locally and take a screenshot to verify the current state. Use this skill whenever the user wants to run the site, preview it, see what it looks like, verify a change visually, or check the local dev server. Trigger on phrases like "run it locally", "let's see it", "show me how it looks", "start the dev server", "preview it", or after making visual changes when the user wants to verify them.
---

# Run Locally

Start the dev server and take a screenshot so you and the user can see the current state of the site.

## Steps

1. **Start the server** using `preview_start` with name `"dev"`. The launch config is at `.claude/launch.json`. This tool handles the case where the server is already running — it will reuse the existing instance.

2. **Take a screenshot** using `preview_screenshot` with the `serverId` returned from step 1.

3. **Report what you see** — describe the page layout, colors, any visible issues. If the user just made a change, confirm whether the change is visible and looks correct.

## Notes

- The dev server runs on port 3000.
- If the screenshot shows the wrong route, use `preview_navigate` to go to the relevant page before screenshotting.
- If dark mode needs to be checked, use `preview_click` to click the "Dark" button in the header before taking the screenshot.
