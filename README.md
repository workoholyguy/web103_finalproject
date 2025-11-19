# [Job Ledger]

CodePath WEB103 Final Project

Designed and developed by: [Omar Madjiov, Ricardo Ortega, Muhammed Abdulbasit]

🔗 Link to deployed app:

## About

### Description and Purpose

[Job Ledger is a full-stack web application that helps users track their job applications in one organized place. It allows users to log positions, monitor application status, record interview details, and analyze progress toward their career goals. The purpose of Job Ledger is to streamline the job-search process by centralizing all applications, deadlines, and follow-ups in a single dashboard. It promotes accountability, organization, and insight for users pursuing internships or full-time roles.]

### Inspiration

[The idea for Job Ledger came from the challenges many students and professionals face when juggling multiple job applications across platforms like LinkedIn, Indeed, and company portals. We wanted to build a simple yet powerful tool that brings clarity to the process—helping users stay organized, motivated, and confident as they navigate their career journey.]

## Tech Stack

Frontend: React, Vite

Backend: Express.Js, Node.Js, PostgreSQL,

## Features ✅

### [Application Tracker]

[Users can log and manage all their job applications in one place — including company name, position, application date, and status.]
- [X] Create Job Application (POST) — Add a new application (company, role, date, status) via Postman → show DB update.  
- [x] Read Applications (GET) — Retrieve all applications for a user → show JSON response or table in UI.  
- [x] Update Application (PUT/PATCH) — Edit an application’s status or details → show updated field in UI.  
- [x] Delete Application (DELETE) — Remove an application entry → show deletion reflected in DB/UI.  
- [ ] Link Application to User (FK) — Ensure every job record is tied to a `user_id`.  
- [x] Frontend Form Submission — Build a simple “Add Job” form → show live form submission.  
- [x] Display Application List — Render list of user’s applications in the front end.  
- [x] Show Confirmation Toasts — Success/failure notifications after CRUD operations. 

[https://imgur.com/a/waJjEZg.gif]

### [✅ Status Dashboard]

[A clean dashboard summarizes the user’s overall progress — showing totals for “Applied,” “Interviewing,” “Offers,” and “Rejected.”
It helps visualize where the user stands in the application pipeline.]
- [x] Compute Status Counts (SQL or JS aggregation) — Count applications by status (`applied`, `interviewing`, etc.).  
- [x] Backend Endpoint for Stats (GET `/applications/stats`) — Return JSON summary.  
- [x] Frontend Visualization Component — Display totals using cards or bar charts.  
- [x] Dynamic Update on Change — Automatically refresh dashboard after CRUD events.  

[https://imgur.com/a/waJjEZg.gif]

### [✅ Integrated Job Feed (API)]

[The app pulls real-time job listings from external APIs such as LinkedIn, Greenhouse, or Indeed. Users can explore job openings directly in the app and add interesting ones to their tracker with a single click.]
- [x] Select Job API (e.g., Greenhouse or Indeed) — Test connection with Postman.  
- [x] Build External API Fetch Endpoint (GET `/jobs/feed`) — Proxy call through backend to avoid CORS.  
- [x] Map External Fields — Normalize fields (title, company, location, URL).  
- [x] Render Job Feed in UI — Display fetched jobs with pagination.  

[gif goes here]
![Job feed demo](https://imgur.com/a/XOZWpV8)

### [ADDITIONAL FEATURES GO HERE - ADD ALL FEATURES HERE IN THE FORMAT ABOVE; you will check these off and add gifs as you complete them]

### [Account & Authentication]

[Secure user authentication allows individuals to create accounts, save their job data, and access it from any device.
It keeps personal information safe while providing a seamless login experience.]

- [ ] User Signup (POST `/auth/signup`) — Test via Postman.  
- [ ] User Login (POST `/auth/login`) — Return JWT or Supabase session.  
- [ ] Protected Routes — Verify only logged-in users can access `/applications`.  
- [ ] Logout Functionality — Clear tokens/session.  
- [ ] Session Persistence — Maintain state on refresh (localStorage or Supabase).  


[gif goes here]

### [Notes & Follow-Ups]

[Each job entry includes a personal notes section for interview prep, recruiter details, or reminders to follow up.
This ensures no opportunity slips through the cracks.]

- [x] Add Notes Column — Extend `applications` table (`notes TEXT`).  
- [x] Update Notes (PUT) — Endpoint for modifying notes.  
- [x] Frontend Note Editor (Textarea) — Inline editing component.  
- [x] Auto-Save Notes — Save changes on blur or button click.  
- [ ] Reminder Date (Optional) — Add `follow_up_date` and highlight overdue ones.  


[https://imgur.com/a/waJjEZg.gif]

### [✅ Search & Filter]

[Users can search their saved applications or filter by company, role, or status.This makes it easy to find specific opportunities or check progress on recent submissions.]
- [x] Search Endpoint (GET `/applications?query=`) — Filter by company or role.  
- [x] Frontend Search Bar — Debounced search input.  
- [x] Filter Dropdowns — Status or Date filters.  
- [x] Combine Filters — e.g., status + keyword search.  


[https://imgur.com/a/waJjEZg.gif]

## Installation Instructions

[instructions go here]
