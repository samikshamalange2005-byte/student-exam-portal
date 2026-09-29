# College Exam Timetable & Room Management Web Application

A full-stack, role-based Examination Timetable web application built for colleges. It provides separate authentication and dedicated dashboards for **Administrators** (exam cell faculty) and **Students**, featuring **Room Management**, **Capacity Validation**, and **Overlapping Booking Clash Prevention**.

---

## 🌟 Key Features

1. **Role-Based Authentication**:
   - Separate forms and role switching for **Admin** and **Student**.
   - Admin registration protected by a college security key (`ADMIN2026`).
   - Student registration captures Name, Email, Password, Roll Number, Department, Enrolled Year (1st, 2nd, 3rd, 4th Year), and Section (A, B, C).
   - Secure password hashing with `bcryptjs` and session tokens with `jsonwebtoken` (JWT).

2. **Room Management & Capacity Validation**:
   - **Manage Exam Rooms**: Admin adds rooms with custom room name and maximum seating capacity (e.g. Hall 101: 60 seats, Main Auditorium: 250 seats).
   - **Capacity Enforcement**: When scheduling an exam, the system verifies that the number of assigned students does NOT exceed the room's maximum capacity. If it exceeds, the scheduling request is blocked with an explicit error.

3. **Overlapping Booking Conflict Prevention**:
   - **Clash Detection**: Prevents the same room from being assigned to two different exams at overlapping times on the same date.
   - **Time Interval Overlap Checking**: Evaluates start/end times and rejects double-booking attempts while allowing valid back-to-back non-overlapping papers.

4. **Admin Dashboard**:
   - Form to add rooms with name & capacity and view/delete rooms.
   - Form to schedule exams with room assignment and student count.
   - Master Timetable list with live filters (by Year, Section) and real-time search.
   - Instant exam cancellation/deletion with confirmation.
   - KPI counters: Total Scheduled, Enrolled Students, Total Rooms, and Upcoming Papers.

5. **Student Dashboard**:
   - **Class-Specific Filtering**: Students exclusively see upcoming exams matching their registered Year and Section.
   - **Room & Timing Details**: Cards display Subject Name, Code, Exam Date with Day of Week, Time Slot, Assigned Room, and Seating Capacity.
   - **Printable Timetable**: Clean printable admit slip / timetable card (`window.print()`).

---

## 🚀 Quick Start Guide

### 1. Requirements
- Node.js (v18+)
- MongoDB (running locally on port 27017)

### 2. Running the Server
```bash
npm start
# Or
node server.js
```
The server will run at **http://localhost:5000**.

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
│   ├── Exam.js              # Exam timetable schema (with room & capacity)
│   └── Room.js              # Room schema (name and seating capacity)
├── middleware/
│   └── auth.js              # JWT verification & role authorization
├── routes/
│   ├── authRoutes.js        # Register, Login, & Profile endpoints
│   ├── examRoutes.js        # Exam CRUD, capacity check & clash prevention
│   └── roomRoutes.js        # Room CRUD endpoints
├── public/
│   ├── index.html           # Landing page with role portals
│   ├── login.html           # Student & Admin login with role switcher
│   ├── register.html        # Registration with class/admin fields
│   ├── admin-dashboard.html # Exam & Room management control panel
│   ├── student-dashboard.html # Personalized class timetable & print slip
│   ├── css/style.css        # Responsive styling & print rules
│   └── js/
│       ├── auth.js          # Client auth helpers & route guards
│       ├── admin.js         # Admin dashboard logic (rooms + exams)
│       └── student.js       # Student timetable logic
├── test-api.js              # Automated basic & role test suite
├── test-rooms-clash.js      # Automated capacity & clash prevention test suite
├── seed.js                  # Sample data seeder (accounts, rooms, exams)
├── server.js                # Express app entry point
└── package.json             # Dependencies and scripts
```

---

## 🧪 Automated Testing
Run the test suites:
```bash
# Test room capacity & booking clash prevention
node test-rooms-clash.js

# Test auth, class filtering, and CRUD operations
node test-api.js
```
