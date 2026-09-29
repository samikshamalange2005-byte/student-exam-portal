# 🎓 College Exam Timetable & Room Management System
## Complete Project Documentation & Viva / Presentation Guide

---

## 📌 1. Project Title & Executive Summary
- **Project Title**: College Examination Timetable & Venue Management Web Application
- **Domain**: Educational Web Applications / Examination Management Systems
- **Tech Stack**: Node.js, Express.js, MongoDB (Mongoose), HTML5, CSS3, JavaScript (ES6+), JWT, BcryptJS.
- **Repository**: [https://github.com/samikshamalange2005-byte/student-exam-portal](https://github.com/samikshamalange2005-byte/student-exam-portal)

### Short Summary (How to introduce the project in 30 seconds):
> *"This project is a full-stack, role-based Examination Timetable and Room Management portal for colleges. It provides two separate user flows: an **Admin Portal** for examination cell faculty to create exam schedules, manage hall capacities, and prevent venue booking clashes; and a **Student Portal** where students securely log in and automatically see only the exams scheduled specifically for their enrolled academic year and class section."*

---

## 🎯 2. Problem Statement & Objectives

### The Problems in Traditional College Exam Scheduling:
1. **Notice Board Confusion & Clutter**: Traditional colleges post single master PDFs or paper sheets containing hundreds of subjects across all departments, making it hard for students to find their relevant papers.
2. **Room Double-Booking (Venue Clashes)**: When multiple faculty members or departments schedule exams manually, the same hall or auditorium is often accidentally booked for two different exams at the same time.
3. **Room Overcapacity**: Exam rooms are assigned without strictly verifying whether the seating capacity can accommodate all registered students in that class.

### Key Objectives Achieved:
1. **Role-Based Separation**: Dedicated portals and dashboards for Admin (Faculty) and Students.
2. **Class-Specific Filtering**: A 2nd-year Section A student sees **only** 2nd-year Section A exams.
3. **Automated Room Capacity Enforcement**: Prevents assigning more students than the room can hold.
4. **Booking Clash Prevention**: Mathematically detects and blocks overlapping exam timings in the same hall.
5. **Printable Exam Slips**: One-click print-optimized timetable for students.

---

## 🏗️ 3. System Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────┐
   │                     Client Tier                        │
   │  Responsive Web UI (HTML5, Modern CSS3, JavaScript ES6)│
   │  - Admin Dashboard          - Student Dashboard        │
   │  - Role-Switch Login        - Class-Aware Timetable    │
   └───────────────────────────┬────────────────────────────┘
                               │ HTTP / REST API (JSON)
                               │ Authorization: Bearer <JWT>
   ┌───────────────────────────▼────────────────────────────┐
   │                 Backend Application Tier               │
   │               Node.js + Express.js Server              │
   │                                                        │
   │  [Auth Controller]   [Exam Controller] [Room Controller]│
   │  - bcryptjs hashing  - Class filtering - CRUD rooms    │
   │  - JWT signing/guard - Clash detector  - Capacity check│
   └───────────────────────────┬────────────────────────────┘
                               │ Mongoose ODM
   ┌───────────────────────────▼────────────────────────────┐
   │                     Database Tier                      │
   │                    MongoDB (NoSQL)                     │
   │      [Users]           [Rooms]           [Exams]       │
   └────────────────────────────────────────────────────────┘
```

### Why this Tech Stack?
- **Node.js & Express.js**: Fast, asynchronous event-driven architecture suitable for concurrent requests.
- **MongoDB & Mongoose**: Flexible document model allowing schema validation, direct embedding of room metadata, and rapid queries.
- **JWT (JSON Web Tokens)**: Stateless and scalable authentication. The user's role, year, and section are securely verified on every request.
- **Vanilla JS & Modern CSS**: Zero build overhead, fast loading times, no bloated bundle files, and instant browser compatibility.

---

## 🗄️ 4. Database Schema & Data Models

### 1. User Schema (`models/User.js`)
Stores both Administrators and Students with role differentiation.
```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed with bcryptjs (salt factor 10)
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  rollNo: { type: String, default: '' },      // e.g. "24CS001"
  department: { type: String, default: 'General' },
  year: { type: String, default: '1st Year' },// e.g. "1st Year", "2nd Year", "3rd Year", "4th Year"
  section: { type: String, default: 'A' },    // e.g. "A", "B", "C"
  createdAt: { type: Date, default: Date.now }
}
```

### 2. Room Schema (`models/Room.js`)
Stores examination halls and their maximum seating capacities.
```javascript
{
  name: { type: String, required: true, unique: true }, // e.g. "Hall 101", "Main Auditorium"
  capacity: { type: Number, required: true, min: 1 },    // e.g. 60 seats, 250 seats
  createdAt: { type: Date, default: Date.now }
}
```

### 3. Exam Schema (`models/Exam.js`)
Stores examination schedules linked to classes and assigned rooms.
```javascript
{
  subjectName: { type: String, required: true },
  subjectCode: { type: String, required: true, uppercase: true }, // e.g. "CS201"
  examDate: { type: String, required: true },                    // Stored as YYYY-MM-DD
  startTime: { type: String, required: true },                   // e.g. "10:00 AM"
  endTime: { type: String, required: true },                     // e.g. "01:00 PM"
  department: { type: String, default: 'Computer Science' },
  year: { type: String, required: true },                        // Target Year
  section: { type: String, required: true },                     // Target Section ('A', 'B', 'All')
  room: { type: String, default: 'Examination Hall' },           // Room Name
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
  roomCapacity: { type: Number, default: 50 },
  studentCount: { type: Number, default: 30 },                   // Assigned students
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
}
```

---

## ⚙️ 5. Key Algorithms & Business Logic (Crucial for Viva)

### Algorithm 1: Strict Class-Specific Timetable Filtering
*How does the system ensure students only see their own class exams?*
1. When a student logs in, their JWT token contains their `id` and `role`.
2. The authentication middleware fetches the student's profile: `req.user.year` and `req.user.section`.
3. In `routes/examRoutes.js`:
   ```javascript
   if (req.user.role === 'student') {
     query.year = req.user.year;
     query.$or = [
       { section: req.user.section },
       { section: 'All' }
     ];
   }
   ```
4. Even if a student manually queries the API, the backend enforces this filter at the database level. Students from Year 2 Section A can never see Year 3 Section B exams.

---

### Algorithm 2: Room Capacity Validation
*How does the system prevent room overcrowding?*
1. When an exam is created, the admin provides or the system calculates `studentCount` (matching registered students).
2. The system looks up the target room's `capacity`.
3. Condition checked:
   ```javascript
   if (assignedStudents > targetRoom.capacity) {
     return res.status(400).json({
       message: `Room capacity exceeded! Room "${targetRoom.name}" has a seating capacity of ${targetRoom.capacity}, but ${assignedStudents} students are assigned.`
     });
   }
   ```
4. If exceeded, the database insert is cancelled and the admin is informed immediately.

---

### Algorithm 3: Overlapping Booking Conflict Prevention
*How does the system detect if two exams clash in the same room?*
1. Time strings like `"10:00 AM"` and `"01:00 PM"` are converted into **minutes from midnight**:
   - `10:00 AM` = $10 \times 60 = 600$ minutes.
   - `01:00 PM` = $(1 + 12) \times 60 = 780$ minutes.
2. Two time intervals $[S_1, E_1]$ and $[S_2, E_2]$ **overlap if and only if**:
   $$\max(S_1, S_2) < \min(E_1, E_2)$$
3. Before saving any exam, the system queries all exams already scheduled in that room on that date:
   ```javascript
   const clashingExams = await Exam.find({
     examDate: examDate,
     $or: [{ roomId: targetRoom._id }, { room: targetRoom.name }]
   });

   for (const existing of clashingExams) {
     if (doTimesOverlap(startTime, endTime, existing.startTime, existing.endTime)) {
       return res.status(400).json({
         message: `Booking Conflict! Room "${targetRoom.name}" is already assigned to "${existing.subjectName}" on ${examDate} from ${existing.startTime} to ${existing.endTime}.`
       });
     }
   }
   ```
4. Non-overlapping slots (e.g. 10:00 AM–01:00 PM and 02:00 PM–05:00 PM) on the same date and room are accepted without conflict.

---

## 📡 6. REST API Endpoints Reference

| Method | Endpoint | Access Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register Student or Admin (requires admin key `ADMIN2026`) |
| `POST` | `/api/auth/login` | Public | Authenticates user; returns JWT token and profile |
| `GET` | `/api/auth/me` | Authenticated | Gets currently logged in user profile |
| `GET` | `/api/rooms` | Authenticated | Fetches all available rooms and capacities |
| `POST` | `/api/rooms` | Admin only | Creates a new room with capacity |
| `DELETE`| `/api/rooms/:id` | Admin only | Deletes a room (prevented if assigned to active exams) |
| `GET` | `/api/exams` | Authenticated | Students: gets class-filtered timetable. Admin: gets all |
| `POST` | `/api/exams` | Admin only | Creates exam with room capacity & clash check |
| `DELETE`| `/api/exams/:id` | Admin only | Deletes an exam schedule |
| `GET` | `/api/exams/stats` | Admin only | Overview stats (Total exams, rooms, students) |

---

## 🎬 7. Step-by-Step Presentation / Viva Demonstration Script

When presenting this project to an examiner or teacher, follow these sequential steps:

### Step 1: Open Home Page (`http://localhost:5000`)
- *"Here is the landing page. It clearly presents two entry points: the **Admin Portal** and the **Student Portal**."*

### Step 2: Demonstrate Admin Flow (`admin@college.edu` / `admin123`)
1. Log in as **Admin**.
2. Point out the **Dashboard KPI Cards**: Total scheduled exams, enrolled students, available exam rooms, upcoming papers.
3. Show the **Room Management Panel**:
   - Add a new room, e.g. `Physics Lab 1` with capacity `40`. Show it appear in the table instantly.
4. Demonstrate **Room Capacity Validation**:
   - Try to schedule an exam in `Physics Lab 1` with `50` students.
   - Show the error alert: *"Room capacity exceeded! Room only has 40 seats."*
5. Demonstrate **Booking Clash Prevention**:
   - Schedule an exam in `Hall 101` on tomorrow's date from `10:00 AM` to `01:00 PM`. (Succeeds)
   - Try to schedule another exam in `Hall 101` on the same date from `11:30 AM` to `02:30 PM`.
   - Show the error alert: *"Booking Conflict! Room Hall 101 is already booked."*
   - Change the timing to `02:00 PM` to `05:00 PM` and submit -> Succeeds!

### Step 3: Demonstrate Student Flow (`alice@college.edu` / `student123`)
1. Log out and sign in as **Alice Johnson** (2nd Year, Section A).
2. Point out the **Class Verification Notice**:
   - *"Notice that Alice only sees exams scheduled for 2nd Year, Section A."*
3. Point out the **Exam Cards**:
   - Displays Subject Name, Code, Date, Timings, Assigned Room, Room Capacity, and dynamic status badges (*Today*, *In 3 days*).
4. Click **Print Timetable**:
   - Shows the clean, print-formatted admit slip / exam pass ready for printing or PDF export.

### Step 4: Contrast with Another Student (`bob@college.edu` / `student123`)
1. Sign in as **Bob Smith** (3rd Year, Section B).
2. Show that Bob's timetable is completely different and only contains 3rd Year Section B exams.

---

## 💻 8. Installation, Running & Testing Instructions

### Prerequisites
- Node.js installed (v18+)
- MongoDB running locally on `localhost:27017`

### Setup & Run
```bash
# Clone the repository
git clone https://github.com/samikshamalange2005-byte/student-exam-portal.git
cd student-exam-portal

# Install dependencies
npm install

# Seed demo data (creates demo accounts, rooms, and sample exams)
node seed.js

# Start the web server
npm start
```
Access at: **`http://localhost:5000`**

### Running Automated Test Verification
```bash
# Tests room capacity checks and booking clash prevention
node test-rooms-clash.js

# Tests authentication, roles, and class-specific timetable filtering
node test-api.js
```

---

## ❓ 9. Frequently Asked Questions in Viva / Interviews

**Q1: How do you prevent SQL injection or database attacks?**
> *Answer: We use Mongoose with strict schema definitions and MongoDB parameterized queries. Mongoose models automatically cast and sanitize inputs, preventing NoSQL injection.*

**Q2: How do you secure student passwords?**
> *Answer: Passwords are never stored in plain text. We use `bcryptjs` with a salt factor of 10 to generate one-way cryptographic hashes before persisting to MongoDB.*

**Q3: How does the application scale if thousands of students log in during exam season?**
> *Answer: The backend uses stateless JWT authentication. Because the server does not hold session state in memory, multiple Express server instances can run behind a load balancer (like NGINX) connected to a MongoDB cluster.*

**Q4: Can an admin accidentally assign an exam to a deleted room?**
> *Answer: No. The API prevents deletion of any room that is currently assigned to upcoming scheduled exams, ensuring relational integrity.*
