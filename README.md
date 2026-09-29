# College Exam Timetable Web Application

A full-stack, role-based Examination Timetable web application built for colleges. It provides separate authentication and dedicated dashboards for **Administrators** (exam cell faculty) and **Students**.

---

## 🌟 Key Features

1. **Role-Based Authentication**:
   - Separate forms or role switching for **Admin** and **Student**.
   - Admin registration protected by a college security key (`ADMIN2026`).
   - Student registration captures Name, Email, Password, Roll Number, Department, Enrolled Year (e.g. 1st, 2nd, 3rd, 4th Year), and Section (A, B, C).
   - Secure password hashing with `bcryptjs` and session tokens with `jsonwebtoken` (JWT).

2. **Admin Dashboard**:
   - **Form to Add Exams**:
     - Subject Name & Subject Code
     - Exam Date & Timings (Start Time & End Time)
     - Target Academic Year & Target Section (supports individual sections or "All Sections")
     - Department & Examination Hall / Room allocation
   - **Master Timetable List**:
     - Live overview of all scheduled exams
     - Filter by Year, filter by Section, and live search by subject name / code
     - Delete exam schedule with instant confirmation
   - **Summary Stats**:
     - Total scheduled exams, enrolled students, active departments, and upcoming papers.

3. **Student Dashboard**:
   - **Personalized Timetable**:
     - **Strict Class Filtering**: Students automatically and exclusively see upcoming exams matching their registered Year and Section (along with college-wide "All Sections" exams).
   - **Detailed Exam Cards**:
     - Subject Name, Code, Exam Date with Day of Week, Time Slot, and Venue/Room.
     - Dynamic status badges: *Today*, *Tomorrow*, *In X days*, or *Finished*.
   - **Printable Timetable**:
     - "Print Timetable" button styled with print CSS to produce a clean admit slip / timetable card.

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js (v18+)
- MongoDB (running locally on port 27017)

### 2. Running the Server
```bash
# Start the server
npm start
# Or
node server.js
```
The server will start at **http://localhost:5000**.

### 3. Demo Accounts & Credentials

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@college.edu` | `admin123` | Exam Cell Admin |
| **Student (2nd Year, Sec A)** | `alice@college.edu` | `student123` | Alice Johnson (Roll: `24CS001`) |
| **Student (3rd Year, Sec B)** | `bob@college.edu` | `student123` | Bob Smith (Roll: `23CS042`) |

*Admin Security Key for new Admin registration:* `ADMIN2026`

---

## 📁 Project Structure

```
├── models/
│   ├── User.js              # User schema (Admin & Student with year/section)
│   └── Exam.js              # Exam timetable schema
├── middleware/
│   └── auth.js              # JWT verification & role authorization
├── routes/
│   ├── authRoutes.js        # Register, Login, & Profile endpoints
│   └── examRoutes.js        # Exam CRUD & student class-filtered query
├── public/
│   ├── index.html           # Landing page with role portals
│   ├── login.html           # Student & Admin login with role switch
│   ├── register.html        # Registration with class/admin fields
│   ├── admin-dashboard.html # Admin timetable management & exam creator
│   ├── student-dashboard.html # Student class-specific timetable & print
│   ├── css/style.css        # Responsive styling & print CSS
│   └── js/
│       ├── auth.js          # Client auth helpers & route guards
│       ├── admin.js         # Admin dashboard logic
│       └── student.js       # Student timetable logic
├── test-api.js              # Automated end-to-end verification script
├── seed.js                  # Sample data seeder
├── server.js                # Express app entry point
└── package.json             # Dependencies and scripts
```

---

## 🧪 Verification & Testing
Run the automated end-to-end test suite:
```bash
node test-api.js
```
This tests health check, Admin registration, Student A & B registration, exam scheduling across different classes, strict timetable filtering per student, and exam deletion.
