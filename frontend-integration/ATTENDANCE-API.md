# Attendance API Documentation

This document describes the backend attendance API endpoints that support the frontend clock-in system.

## Table of Contents
1. [Overview](#overview)
2. [Business Rules](#business-rules)
3. [Attendance Types & Statuses](#attendance-types--statuses)
4. [Endpoints](#endpoints)
5. [Automated Jobs](#automated-jobs)
6. [Frontend Integration](#frontend-integration)

---

## Overview

The attendance system tracks employee work hours with the following features:
- ✅ One clock-in per day
- ✅ Automatic absent marking at 17:00 if not clocked in
- ✅ Automatic clock-out at 23:59 if forgot to clock out
- ✅ Weekend and holiday handling (not counted as absent)
- ✅ Break tracking (one break per session)
- ✅ Work duration calculation (excludes break time)

---

## Business Rules

### Clock-In Rules
| Rule | Description |
|------|-------------|
| One per day | Users can only clock in once per day |
| Before 17:00 | Cannot clock in after business hours end (17:00) |
| Workdays only | Cannot clock in on weekends or holidays |
| Default absent | Users are marked absent until they clock in |

### Automatic Actions
| Time | Action | Description |
|------|--------|-------------|
| 00:01 | Day Init | Creates weekend/holiday records for all users |
| 17:00 | Mark Absent | Marks users who haven't clocked in as absent |
| 23:59 | Auto Clock-Out | Clocks out users who forgot to clock out |

### Break Rules
- One break per day
- Break pauses work timer
- Break is automatically ended if user clocks out while on break

---

## Attendance Types & Statuses

### Day Types (`type`)
| Type | Description |
|------|-------------|
| `workday` | Regular working day (Monday-Friday, non-holiday) |
| `weekend` | Saturday or Sunday |
| `holiday` | Public holiday |

### Attendance Status (`attendanceStatus`)
| Status | Description |
|--------|-------------|
| `absent` | User did not clock in on a workday |
| `present` | User clocked in on a workday |
| `weekend` | Weekend day (not counted as absent/present) |
| `holiday` | Holiday (not counted as absent/present) |

### Clock Status (`clockStatus`)
| Status | Description |
|--------|-------------|
| `clocked-out` | User is not currently working |
| `clocked-in` | User is actively working |
| `on-break` | User is on break |

---

## Endpoints

### 1. Get Current Status

```
GET /api/attendance/status
Authorization: Bearer <token>
```

**Response (Workday - Not Clocked In):**
```json
{
  "success": true,
  "status": "clocked-out",
  "attendanceStatus": "absent",
  "type": "workday",
  "data": null
}
```

**Response (Workday - Clocked In):**
```json
{
  "success": true,
  "status": "clocked-in",
  "attendanceStatus": "present",
  "type": "workday",
  "data": {
    "_id": "...",
    "clockIn": "2024-01-15T08:00:00.000Z",
    "clockInFormatted": "2024/01/15, 10:00:00",
    "clockOut": null,
    "breakTaken": false,
    "duration": 14400000,
    "durationFormatted": "4h 0m 0s",
    "status": "clocked-in",
    "autoClockOut": false
  }
}
```

**Response (Weekend):**
```json
{
  "success": true,
  "status": "clocked-out",
  "attendanceStatus": "weekend",
  "type": "weekend",
  "data": null,
  "message": "It's the weekend!"
}
```

**Response (Holiday):**
```json
{
  "success": true,
  "status": "clocked-out",
  "attendanceStatus": "holiday",
  "type": "holiday",
  "holidayName": "Christmas Day",
  "data": null,
  "message": "Today is Christmas Day"
}
```

---

### 2. Clock In

```
POST /api/attendance/clock-in
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Starting work" // optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Clocked in successfully",
  "data": {
    "_id": "...",
    "clockIn": "2024-01-15T08:00:00.000Z",
    "clockInFormatted": "2024/01/15, 10:00:00",
    "status": "clocked-in",
    "attendanceStatus": "present",
    "breakTaken": false,
    "duration": 0,
    "durationFormatted": "0h 0m 0s"
  }
}
```

**Error Responses:**
```json
// Already clocked in
{ "success": false, "message": "You have already clocked in today. Only one clock-in per day is allowed." }

// After business hours
{ "success": false, "message": "Cannot clock in after 17:00. Business hours have ended." }

// Weekend
{ "success": false, "message": "Cannot clock in on weekends" }

// Holiday
{ "success": false, "message": "Cannot clock in on Christmas Day" }
```

---

### 3. Clock Out

```
POST /api/attendance/clock-out
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Finished work" // optional
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Clocked out successfully",
  "data": {
    "_id": "...",
    "clockIn": "2024-01-15T08:00:00.000Z",
    "clockInFormatted": "2024/01/15, 10:00:00",
    "clockOut": "2024-01-15T17:00:00.000Z",
    "clockOutFormatted": "2024/01/15, 19:00:00",
    "breakDuration": 5400000,
    "breakDurationFormatted": "1h 30m",
    "duration": 27000000,
    "durationFormatted": "7h 30m 0s",
    "status": "clocked-out",
    "attendanceStatus": "present"
  }
}
```

---

### 4. Start Break

```
POST /api/attendance/break-in
Authorization: Bearer <token>
```

**Success Response:**
```json
{
  "success": true,
  "message": "Break started",
  "data": {
    "breakIn": "2024-01-15T12:00:00.000Z",
    "breakInFormatted": "2024/01/15, 14:00:00",
    "status": "on-break",
    "workTimeBeforeBreak": 14400000,
    "workTimeBeforeBreakFormatted": "4h 0m 0s"
  }
}
```

**Error Responses:**
```json
// Not clocked in
{ "success": false, "message": "You must be clocked in to take a break" }

// Already took break
{ "success": false, "message": "You have already taken your break for today" }
```

---

### 5. End Break

```
POST /api/attendance/break-out
Authorization: Bearer <token>
```

**Success Response:**
```json
{
  "success": true,
  "message": "Break ended",
  "data": {
    "breakIn": "2024-01-15T12:00:00.000Z",
    "breakOut": "2024-01-15T13:30:00.000Z",
    "breakDuration": 5400000,
    "breakDurationFormatted": "1h 30m",
    "status": "clocked-in",
    "breakTaken": true
  }
}
```

---

### 6. Get Today's Attendance

```
GET /api/attendance/today
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "status": "clocked-in",
  "data": {
    "_id": "...",
    "date": "2024-01-15",
    "type": "workday",
    "attendanceStatus": "present",
    "clockIn": "2024-01-15T08:00:00.000Z",
    "clockInFormatted": "2024/01/15, 10:00:00",
    "clockOut": null,
    "breakTaken": false,
    "duration": 14400000,
    "durationFormatted": "4h 0m 0s",
    "clockStatus": "clocked-in",
    "isClosed": false,
    "autoClockOut": false,
    "autoMarkedAbsent": false
  }
}
```

---

### 7. Get Attendance History

```
GET /api/attendance/history?page=1&limit=10&startDate=2024-01-01&endDate=2024-01-31&type=workday&attendanceStatus=present
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| page | number | Page number (default: 1) |
| limit | number | Records per page (default: 10) |
| startDate | string | Filter start date (YYYY-MM-DD) |
| endDate | string | Filter end date (YYYY-MM-DD) |
| type | string | Filter by type: workday, weekend, holiday |
| attendanceStatus | string | Filter by status: absent, present, weekend, holiday |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "date": "2024-01-15",
      "type": "workday",
      "attendanceStatus": "present",
      "clockIn": "2024-01-15T08:00:00.000Z",
      "clockInFormatted": "2024/01/15, 10:00:00",
      "clockOut": "2024-01-15T17:00:00.000Z",
      "clockOutFormatted": "2024/01/15, 19:00:00",
      "duration": 27000000,
      "durationFormatted": "7h 30m",
      "clockStatus": "clocked-out",
      "isClosed": true,
      "autoClockOut": false,
      "autoMarkedAbsent": false
    },
    {
      "_id": "...",
      "date": "2024-01-14",
      "type": "weekend",
      "attendanceStatus": "weekend",
      "clockIn": null,
      "clockOut": null,
      "duration": 0,
      "durationFormatted": "0h 0m"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

### 8. Get All Attendance (Admin)

```
GET /api/attendance/all?page=1&limit=10&userId=xxx&attendanceStatus=absent
Authorization: Bearer <token>
```

**Additional Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| userId | string | Filter by user ID |
| userName | string | Search by user name |

---

### 9. Get Attendance Summary (Admin)

```
GET /api/attendance/summary?startDate=2024-01-01&endDate=2024-01-31&userId=xxx
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "present": 18,
    "absent": 2,
    "weekend": 8,
    "holiday": 2,
    "total": 30
  }
}
```

---

## Automated Jobs

### 1. Day Init Job (00:01 daily)
- Creates attendance records for weekends and holidays
- Sets `type` to 'weekend' or 'holiday'
- Sets `attendanceStatus` to 'weekend' or 'holiday'
- Records are pre-created so they appear in history

### 2. Mark Absent Job (17:00 weekdays)
- Runs Monday-Friday at 17:00
- Finds users without clock-in for today
- Creates/updates attendance record with:
  - `attendanceStatus`: 'absent'
  - `autoMarkedAbsent`: true
  - `isClosed`: true

### 3. Auto Clock-Out Job (23:59 daily)
- Finds users still clocked in
- Automatically clocks them out with:
  - `autoClockOut`: true
  - `clockOutNotes`: 'Auto clocked out by system at end of day'
- Calculates final work duration

---

## Frontend Integration

### Initialize on Page Load

```javascript
const initializeClock = async () => {
  try {
    const response = await api.attendance.getStatus();
    
    // Check day type first
    if (response.type === 'weekend') {
      setDayType('weekend');
      setMessage("It's the weekend! Enjoy your time off.");
      return;
    }
    
    if (response.type === 'holiday') {
      setDayType('holiday');
      setMessage(`Today is ${response.holidayName}. Enjoy your holiday!`);
      return;
    }
    
    // Workday logic
    setDayType('workday');
    
    if (response.status === 'clocked-out' && !response.data) {
      // Not clocked in yet
      setClockStatus('clocked-out');
      setAttendanceStatus('absent'); // Will change to 'present' on clock-in
    } else if (response.status === 'clocked-in') {
      setClockStatus('clocked-in');
      setAttendanceStatus('present');
      setStartTime(new Date(response.data.clockIn).getTime());
      setBreakTaken(response.data.breakTaken);
    } else if (response.status === 'on-break') {
      setClockStatus('on-break');
      setAttendanceStatus('present');
      setBreakStartTime(new Date(response.data.breakIn).getTime());
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
};
```

### Handle Clock-In with Business Rules

```javascript
const handleClockIn = async () => {
  // Check current time
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 17) {
    toast.error('Cannot clock in after 17:00. Business hours have ended.');
    return;
  }
  
  setIsLoading(true);
  try {
    const { data } = await api.attendance.clockIn({ notes: note });
    
    setClockStatus('clocked-in');
    setAttendanceStatus('present');
    setStartTime(new Date(data.clockIn).getTime());
    setNote('');
    
    toast.success('Clocked in successfully');
  } catch (error) {
    toast.error(error.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Display Attendance History with Status Colors

```jsx
const getStatusColor = (attendanceStatus) => {
  switch (attendanceStatus) {
    case 'present': return 'bg-green-100 text-green-800';
    case 'absent': return 'bg-red-100 text-red-800';
    case 'weekend': return 'bg-blue-100 text-blue-800';
    case 'holiday': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const AttendanceHistory = () => {
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Status</th>
          <th>Clock In</th>
          <th>Clock Out</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>
        {records.map(record => (
          <tr key={record._id}>
            <td>{record.date}</td>
            <td>
              <span className={`badge ${getStatusColor(record.attendanceStatus)}`}>
                {record.attendanceStatus}
                {record.holidayName && ` (${record.holidayName})`}
              </span>
            </td>
            <td>{record.clockInFormatted || '-'}</td>
            <td>
              {record.clockOutFormatted || '-'}
              {record.autoClockOut && <span className="text-xs text-orange-500"> (auto)</span>}
            </td>
            <td>{record.durationFormatted}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

---

## South African Public Holidays

The system includes the following South African public holidays:

| Date | Holiday |
|------|---------|
| January 1 | New Year's Day |
| March 21 | Human Rights Day |
| Good Friday | (varies) |
| Family Day | (varies) |
| April 27 | Freedom Day |
| May 1 | Workers' Day |
| June 16 | Youth Day |
| August 9 | National Women's Day |
| September 24 | Heritage Day |
| December 16 | Day of Reconciliation |
| December 25 | Christmas Day |
| December 26 | Day of Goodwill |

---

## Data Model

```typescript
interface AttendanceRecord {
  _id: string;
  userId: string;
  date: string;                    // YYYY-MM-DD
  
  // Day classification
  type: 'workday' | 'weekend' | 'holiday';
  attendanceStatus: 'absent' | 'present' | 'weekend' | 'holiday';
  holidayName: string;             // Name of holiday if applicable
  
  // Clock times
  clockIn: Date | null;
  clockOut: Date | null;
  clockInFormatted: string | null;
  clockOutFormatted: string | null;
  
  // Break tracking
  breakIn: Date | null;
  breakOut: Date | null;
  breakDuration: number;           // milliseconds
  breakTaken: boolean;
  
  // Duration (work time excluding breaks)
  duration: number;                // milliseconds
  durationFormatted: string;
  
  // Status
  clockStatus: 'clocked-out' | 'clocked-in' | 'on-break';
  isClosed: boolean;
  
  // Auto actions
  autoClockOut: boolean;           // System auto clocked out at 23:59
  autoMarkedAbsent: boolean;       // System marked absent at 17:00
  
  // Notes
  notes: string;
}
```
