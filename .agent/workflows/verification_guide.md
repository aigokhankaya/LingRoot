---
description: Guide for Interactive Screen Testing & Verification
---

# Interactive Verification Guide

This workflow guides the agent and user through the mandatory interactive testing process after development changes.

## 1. Identify Changes
- List specific components, screens, or flows that were modified.
- Determine what visual state proves the change works.

## 2. User Instructions
- Provide clear, step-by-step navigation instructions to the user.
- **Example:** "Please open the mobile app, navigate to Profile > Settings, and tap 'Sync'."

## 3. Evidence Request
- **Screenshots:** Ask for a screenshot of the specific final state.
- **Actions:** Ask the user to perform the action that triggers the logic (e.g., "Click the 'Generate' button").

## 4. Log Verification
- usage: `read_terminal` or `grep_search` on log files.
- Verify that backend/frontend logs confirm the action (e.g., "API 200 OK", "Worker started").

## 5. Confirmation
- If visual and log evidence match, mark the task as VERIFIED.
- If not, document the discrepancy and return to EXECUTION.
