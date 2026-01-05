---
description: Development and testing workflow - all commands auto-run
---

// turbo-all

# Development Commands

## Backend
1. Start backend dev server: `npm run dev` (in backend folder)
2. Run backend tests: `npm test` (in backend folder)
3. Install backend dependencies: `npm install` (in backend folder)

## Frontend
4. Start frontend dev server: `npm run dev` (in frontend folder)
5. Run frontend build: `npm run build` (in frontend folder)
6. Run frontend tests: `npm test` (in frontend folder)
7. Install frontend dependencies: `npm install` (in frontend folder)
8. Run linting: `npm run lint` (in frontend folder)

## Database
9. Run migrations: Any SQL or migration commands

## Git
10. Git status: `git status`
11. Git pull: `git pull`
12. Git add: `git add .`
13. Git log: `git log -n 10`

## Process Management
14. Kill node processes: `Get-Process -Name node | Stop-Process`
15. Check running ports: `netstat -ano | findstr :3000`

## General
16. List directory: `ls`, `dir`, `Get-ChildItem`
17. View file contents: `cat`, `type`, `Get-Content`
18. Create directories: `mkdir`
19. Remove files/folders: `rm`, `Remove-Item`
