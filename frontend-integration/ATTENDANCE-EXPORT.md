# Attendance Export API Documentation

Export monthly attendance records in CSV or PDF format.

---

## Overview

The attendance export feature allows:
- **Users**: Export their own monthly attendance
- **Admins**: Export all attendance or individual user attendance

### Key Features

✅ **Full Month Export** - Exports ALL days of the month (1st to last day)  
✅ **Upcoming Days** - Future days are marked as "upcoming" with gray styling  
✅ **Weekends & Holidays** - Automatically identified and marked  
✅ **No Records Required** - Works even if user has no attendance records yet  

### Export Formats

| Format | Description | Best For |
|--------|-------------|----------|
| CSV | Comma-separated values | Data analysis, spreadsheets |
| PDF | Formatted document | Printing, sharing, records |

### Day Statuses in Export

| Status | Color | Description |
|--------|-------|-------------|
| present | 🟢 Green | Clocked in on workday |
| absent | 🔴 Red | Did not clock in on workday (past) |
| weekend | 🔵 Blue | Saturday or Sunday |
| holiday | 🟣 Purple | Public holiday |
| upcoming | ⚪ Gray | Future workday (not yet occurred) |

---

## API Endpoints

### 1. Export My Attendance (User)

Export the logged-in user's attendance for a specific month.

```
GET /api/attendance/export/my?year=2024&month=12&type=pdf
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| year | number | ✅ | - | Year (e.g., 2024) |
| month | number | ✅ | - | Month (1-12) |
| type | string | ❌ | pdf | Export format: `csv` or `pdf` |

**Success Response:**
- Returns file download (CSV or PDF)

**Error Responses:**
```json
// Missing parameters
{ "success": false, "message": "Year and month are required" }

// Invalid parameters
{ "success": false, "message": "Invalid year or month" }

// No data
{ "success": false, "message": "No attendance records found for the specified period" }
```

---

### 2. Export Monthly Attendance (Admin)

Export attendance for all users or a specific user for a month.

```
GET /api/attendance/export?year=2024&month=12&type=csv&userId=xxx
Authorization: Bearer <token>
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| year | number | ✅ | - | Year (e.g., 2024) |
| month | number | ✅ | - | Month (1-12) |
| type | string | ❌ | csv | Export format: `csv` or `pdf` |
| userId | string | ❌ | - | Filter by specific user ID |

**Success Response:**
- Returns file download (CSV or PDF)

---

### 3. Export Individual User Attendance (Admin)

Export a specific user's attendance with detailed PDF report.

```
GET /api/attendance/export/:userId?year=2024&month=12&type=pdf
Authorization: Bearer <token>
```

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | string | ✅ | User's MongoDB ID |

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| year | number | ✅ | - | Year (e.g., 2024) |
| month | number | ✅ | - | Month (1-12) |
| type | string | ❌ | pdf | Export format: `csv` or `pdf` |

**Success Response:**
- Returns file download (CSV or PDF)

**Error Responses:**
```json
// User not found
{ "success": false, "message": "User not found" }

// No data
{ "success": false, "message": "No attendance records found for this user in the specified period" }
```

---

## Export File Contents

### CSV Format

The CSV file includes the following columns:

| Column | Description |
|--------|-------------|
| No. | Row number |
| Date | Date (YYYY-MM-DD) |
| Day | Day of week (Monday, Tuesday, etc.) |
| Name | Employee name |
| Email | Employee email |
| Department | Employee department |
| Status | Attendance status (present, absent, weekend, holiday) |
| Type | Day type (workday, weekend, holiday) |
| Clock In | Clock in time (HH:MM) |
| Clock Out | Clock out time (HH:MM) |
| Break Duration | Total break time |
| Work Duration | Total work time (excluding breaks) |
| Auto Clock Out | Yes/No if system auto clocked out |
| Notes | Any notes added |

**Example CSV:**
```csv
No.,Date,Day,Name,Email,Department,Status,Type,Clock In,Clock Out,Break Duration,Work Duration,Auto Clock Out,Notes
1,2024-12-02,Monday,John Doe,john@erisn.com,Engineering,present,workday,08:00,17:00,1h 0m,8h 0m,No,Starting work
2,2024-12-03,Tuesday,John Doe,john@erisn.com,Engineering,present,workday,08:30,17:30,1h 0m,8h 0m,No,-
3,2024-12-04,Wednesday,John Doe,john@erisn.com,Engineering,absent,workday,-,-,0h 0m,0h 0m,No,-
```

---

### PDF Format

#### All Users PDF (Admin Export)

The PDF includes:
- **Header**: "Monthly Attendance Report" with month/year
- **Summary Box**: Present, Absent, Weekend, Holiday counts, Total Hours
- **Table**: All attendance records with color-coded status

#### Individual User PDF

The PDF includes:
- **Header**: "Attendance Report" with month/year
- **Employee Info Box**: Name, Email, Department, Province
- **Monthly Summary**: 
  - Days Present (green)
  - Days Absent (red)
  - Weekends (blue)
  - Holidays (purple)
  - Total Work Time
  - Total Break Time
- **Daily Attendance Table**: Date, Day, Status, Clock In/Out, Work Time, Break

---

## Frontend Integration

### Export Button Component

```jsx
import { useState } from 'react';
import api from '../services/api';

function ExportAttendanceButton({ userId, isAdmin }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [format, setFormat] = useState('pdf');
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      let response;
      
      if (isAdmin && userId) {
        // Admin exporting specific user
        response = await fetch(
          `${API_URL}/attendance/export/${userId}?year=${year}&month=${month}&type=${format}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (isAdmin) {
        // Admin exporting all users
        response = await fetch(
          `${API_URL}/attendance/export?year=${year}&month=${month}&type=${format}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // User exporting own attendance
        response = await fetch(
          `${API_URL}/attendance/export/my?year=${year}&month=${month}&type=${format}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${year}_${month}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export downloaded successfully');
    } catch (error) {
      toast.error(error.message || 'Export failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="export-controls">
      <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
        {[2023, 2024, 2025].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      
      <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {new Date(2024, i).toLocaleString('default', { month: 'long' })}
          </option>
        ))}
      </select>
      
      <select value={format} onChange={(e) => setFormat(e.target.value)}>
        <option value="pdf">PDF</option>
        <option value="csv">CSV</option>
      </select>
      
      <button onClick={handleExport} disabled={isLoading}>
        {isLoading ? 'Exporting...' : 'Export'}
      </button>
    </div>
  );
}
```

### Admin Export Page

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function AdminAttendanceExport() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [format, setFormat] = useState('csv');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.admin.getGraduates();
      setUsers(response);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const handleExport = async () => {
    const params = new URLSearchParams({
      year: year.toString(),
      month: month.toString(),
      type: format
    });

    let url;
    if (selectedUser) {
      url = `/attendance/export/${selectedUser}?${params}`;
    } else {
      url = `/attendance/export?${params}`;
    }

    // Trigger download...
  };

  return (
    <div className="admin-export">
      <h2>Export Attendance</h2>
      
      <div className="filters">
        <div>
          <label>User (optional)</label>
          <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
            <option value="">All Users</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>{user.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label>Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            <option value={2024}>2024</option>
            <option value={2025}>2025</option>
          </select>
        </div>
        
        <div>
          <label>Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            <option value={1}>January</option>
            <option value={2}>February</option>
            <option value={3}>March</option>
            <option value={4}>April</option>
            <option value={5}>May</option>
            <option value={6}>June</option>
            <option value={7}>July</option>
            <option value={8}>August</option>
            <option value={9}>September</option>
            <option value={10}>October</option>
            <option value={11}>November</option>
            <option value={12}>December</option>
          </select>
        </div>
        
        <div>
          <label>Format</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="csv">CSV (Spreadsheet)</option>
            <option value="pdf">PDF (Document)</option>
          </select>
        </div>
      </div>
      
      <button onClick={handleExport} className="btn-primary">
        Export Attendance
      </button>
      
      <p className="hint">
        {selectedUser 
          ? 'Export will include detailed report for selected user'
          : 'Export will include all users attendance for the month'}
      </p>
    </div>
  );
}
```

---

## API Client Methods

Add these methods to your `api.js`:

```javascript
export const attendance = {
  // ... existing methods ...

  /**
   * Export my attendance (user)
   * @param {Object} params - { year, month, type: 'csv'|'pdf' }
   * @returns {Promise<Blob>} - File blob
   */
  exportMy: async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/attendance/export/my?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response.blob();
  },

  /**
   * Export monthly attendance (admin)
   * @param {Object} params - { year, month, type: 'csv'|'pdf', userId? }
   * @returns {Promise<Blob>} - File blob
   */
  exportMonthly: async (params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/attendance/export?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response.blob();
  },

  /**
   * Export individual user attendance (admin)
   * @param {string} userId - User ID
   * @param {Object} params - { year, month, type: 'csv'|'pdf' }
   * @returns {Promise<Blob>} - File blob
   */
  exportUser: async (userId, params) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/attendance/export/${userId}?${query}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response.blob();
  },
};
```

---

## Download Helper Function

```javascript
/**
 * Download a blob as a file
 * @param {Blob} blob - File blob
 * @param {string} filename - Desired filename
 */
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Usage
const blob = await api.attendance.exportMy({ year: 2024, month: 12, type: 'pdf' });
downloadBlob(blob, 'my_attendance_2024_12.pdf');
```

---

## Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/attendance/export/my` | GET | User | Export own attendance |
| `/attendance/export` | GET | Admin | Export all/filtered attendance |
| `/attendance/export/:userId` | GET | Admin | Export specific user attendance |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| year | number | ✅ | Year (e.g., 2024) |
| month | number | ✅ | Month (1-12) |
| type | string | ❌ | `csv` or `pdf` (default varies) |
| userId | string | ❌ | Filter by user (admin only) |
