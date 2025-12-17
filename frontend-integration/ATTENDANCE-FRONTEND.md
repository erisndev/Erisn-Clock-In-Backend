# Attendance System - Frontend Integration Guide

Complete guide for integrating the attendance/clock-in system in your frontend.

---

## Business Rules

| Rule | Description |
|------|-------------|
| **One clock-in per day** | Users can only clock in once per day |
| **Before 17:00 only** | Cannot clock in after business hours end |
| **Workdays only** | Cannot clock in on weekends or holidays |
| **Default absent** | Users are marked absent until they clock in |
| **Auto clock-out at 23:59** | System clocks out users who forgot |
| **Auto absent at 17:00** | System marks users absent if not clocked in |
| **One break per day** | Users can take one break per session |

---

## Day Types & Statuses

### Day Types (`type`)

| Type | Description | Can Clock In? |
|------|-------------|---------------|
| `workday` | Monday-Friday (non-holiday) | ✅ Yes |
| `weekend` | Saturday or Sunday | ❌ No |
| `holiday` | Public holiday | ❌ No |

### Attendance Status (`attendanceStatus`)

| Status | Description | Color Suggestion |
|--------|-------------|------------------|
| `present` | Clocked in on workday | 🟢 Green |
| `absent` | Did not clock in on workday | 🔴 Red |
| `weekend` | Weekend day | 🔵 Blue |
| `holiday` | Public holiday | 🟣 Purple |

### Clock Status (`clockStatus`)

| Status | Description |
|--------|-------------|
| `clocked-out` | Not currently working |
| `clocked-in` | Actively working |
| `on-break` | On break (timer paused) |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/attendance/status` | Get current clock status |
| GET | `/attendance/today` | Get today's attendance record |
| POST | `/attendance/clock-in` | Clock in |
| POST | `/attendance/clock-out` | Clock out |
| POST | `/attendance/break-in` | Start break |
| POST | `/attendance/break-out` | End break |
| GET | `/attendance/history` | Get attendance history |
| GET | `/attendance/all` | Admin: Get all attendance |
| GET | `/attendance/summary` | Admin: Get attendance summary |

---

## API Response Examples

### GET /attendance/status

**Workday - Not Clocked In:**
```json
{
  "success": true,
  "status": "clocked-out",
  "attendanceStatus": "absent",
  "type": "workday",
  "data": null
}
```

**Workday - Clocked In:**
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

**Weekend:**
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

**Holiday:**
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

### POST /attendance/clock-in

**Request:**
```json
{
  "notes": "Starting work"
}
```

**Success Response:**
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
{ "success": false, "message": "You have already clocked in today. Only one clock-in per day is allowed." }
{ "success": false, "message": "Cannot clock in after 17:00. Business hours have ended." }
{ "success": false, "message": "Cannot clock in on weekends" }
{ "success": false, "message": "Cannot clock in on Christmas Day" }
```

### POST /attendance/clock-out

**Success Response:**
```json
{
  "success": true,
  "message": "Clocked out successfully",
  "data": {
    "clockIn": "2024-01-15T08:00:00.000Z",
    "clockOut": "2024-01-15T17:00:00.000Z",
    "breakDuration": 5400000,
    "breakDurationFormatted": "1h 30m",
    "duration": 27000000,
    "durationFormatted": "7h 30m 0s",
    "status": "clocked-out",
    "attendanceStatus": "present"
  }
}
```

### POST /attendance/break-in

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

### POST /attendance/break-out

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

### GET /attendance/history

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 10)
- `startDate` - Filter start (YYYY-MM-DD)
- `endDate` - Filter end (YYYY-MM-DD)
- `type` - Filter: workday, weekend, holiday
- `attendanceStatus` - Filter: present, absent, weekend, holiday

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

## Frontend Components

### Clock Widget Component

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function ClockWidget() {
  // State
  const [dayType, setDayType] = useState('workday');
  const [clockStatus, setClockStatus] = useState('clocked-out');
  const [attendanceStatus, setAttendanceStatus] = useState('absent');
  const [startTime, setStartTime] = useState(null);
  const [breakStartTime, setBreakStartTime] = useState(null);
  const [breakTaken, setBreakTaken] = useState(false);
  const [note, setNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  // Initialize on mount
  useEffect(() => {
    initializeClock();
  }, []);

  // Timer effect
  useEffect(() => {
    let interval;
    if (clockStatus === 'clocked-in' && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [clockStatus, startTime]);

  const initializeClock = async () => {
    try {
      const response = await api.attendance.getStatus();
      
      setDayType(response.type);
      setAttendanceStatus(response.attendanceStatus);
      
      if (response.type === 'holiday') {
        setHolidayName(response.holidayName);
      }
      
      if (response.data) {
        setClockStatus(response.status);
        if (response.data.clockIn) {
          setStartTime(new Date(response.data.clockIn).getTime());
        }
        if (response.data.breakIn && response.status === 'on-break') {
          setBreakStartTime(new Date(response.data.breakIn).getTime());
        }
        setBreakTaken(response.data.breakTaken || false);
      }
    } catch (error) {
      console.error('Failed to initialize clock:', error);
    }
  };

  const handleClockIn = async () => {
    const hour = new Date().getHours();
    if (hour >= 17) {
      alert('Cannot clock in after 17:00');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await api.attendance.clockIn({ notes: note });
      setClockStatus('clocked-in');
      setAttendanceStatus('present');
      setStartTime(new Date(data.clockIn).getTime());
      setNote('');
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClockOut = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.attendance.clockOut({ notes: note });
      setClockStatus('clocked-out');
      setStartTime(null);
      setBreakStartTime(null);
      setNote('');
      alert(`Clocked out! Work time: ${data.durationFormatted}`);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreakIn = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.attendance.breakIn();
      setClockStatus('on-break');
      setBreakStartTime(new Date(data.breakIn).getTime());
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBreakOut = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.attendance.breakOut();
      setClockStatus('clocked-in');
      setBreakStartTime(null);
      setBreakTaken(true);
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Weekend view
  if (dayType === 'weekend') {
    return (
      <div className="clock-widget weekend">
        <div className="status-dot blue" />
        <h3>It's the Weekend!</h3>
        <p>Enjoy your time off. See you on Monday!</p>
      </div>
    );
  }

  // Holiday view
  if (dayType === 'holiday') {
    return (
      <div className="clock-widget holiday">
        <div className="status-dot purple" />
        <h3>Happy {holidayName}!</h3>
        <p>Today is a public holiday. Enjoy!</p>
      </div>
    );
  }

  // Workday view
  return (
    <div className="clock-widget">
      {/* Status Indicator */}
      <div className="status-row">
        <span className={`status-dot ${
          clockStatus === 'clocked-in' ? 'green pulse' : 
          clockStatus === 'on-break' ? 'amber pulse' : 'gray'
        }`} />
        <span className="status-label">
          {clockStatus === 'clocked-out' && 'Clocked Out'}
          {clockStatus === 'clocked-in' && 'Clocked In'}
          {clockStatus === 'on-break' && 'On Break'}
        </span>
      </div>

      {/* Attendance Badge */}
      <div className={`attendance-badge ${attendanceStatus}`}>
        {attendanceStatus === 'present' ? '✓ Present' : '○ Absent'}
      </div>

      {/* Timer */}
      {clockStatus !== 'clocked-out' && (
        <div className="timer">
          <span className="time">{formatTime(elapsedTime)}</span>
          {clockStatus === 'on-break' && <span className="paused">(Paused)</span>}
        </div>
      )}

      {/* Buttons */}
      <div className="actions">
        {clockStatus === 'clocked-out' && (
          <button onClick={handleClockIn} disabled={isLoading} className="btn-clock-in">
            Clock In
          </button>
        )}

        {clockStatus === 'clocked-in' && (
          <>
            <button onClick={handleClockOut} disabled={isLoading} className="btn-clock-out">
              Clock Out
            </button>
            <button onClick={handleBreakIn} disabled={isLoading || breakTaken} className="btn-break">
              {breakTaken ? 'Break Taken' : 'Start Break'}
            </button>
          </>
        )}

        {clockStatus === 'on-break' && (
          <>
            <button onClick={handleBreakOut} disabled={isLoading} className="btn-break-end">
              End Break
            </button>
            <button onClick={handleClockOut} disabled={isLoading} className="btn-clock-out">
              Clock Out
            </button>
          </>
        )}
      </div>

      {/* Note Input */}
      {clockStatus === 'clocked-out' && (
        <input
          type="text"
          placeholder="Add a note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="note-input"
        />
      )}
    </div>
  );
}

export default ClockWidget;
```

### Attendance History Component

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function AttendanceHistory() {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    attendanceStatus: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [pagination.page, filters]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const params = { page: pagination.page, limit: 10 };
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.attendanceStatus) params.attendanceStatus = filters.attendanceStatus;
      
      const response = await api.attendance.getHistory(params);
      setRecords(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    const styles = {
      present: { bg: '#dcfce7', color: '#166534' },
      absent: { bg: '#fee2e2', color: '#991b1b' },
      weekend: { bg: '#dbeafe', color: '#1e40af' },
      holiday: { bg: '#f3e8ff', color: '#7c3aed' }
    };
    return styles[status] || { bg: '#f3f4f6', color: '#374151' };
  };

  return (
    <div className="attendance-history">
      <h2>Attendance History</h2>

      {/* Filters */}
      <div className="filters">
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
        <select
          value={filters.attendanceStatus}
          onChange={(e) => setFilters({ ...filters, attendanceStatus: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="weekend">Weekend</option>
          <option value="holiday">Holiday</option>
        </select>
        <button onClick={() => { setPagination({ ...pagination, page: 1 }); fetchHistory(); }}>
          Apply
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p>Loading...</p>
      ) : (
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
            {records.map((record) => {
              const style = getStatusStyle(record.attendanceStatus);
              return (
                <tr key={record._id}>
                  <td>{record.date}</td>
                  <td>
                    <span style={{ 
                      backgroundColor: style.bg, 
                      color: style.color,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {record.attendanceStatus}
                      {record.holidayName && ` (${record.holidayName})`}
                    </span>
                  </td>
                  <td>{record.clockInFormatted || '-'}</td>
                  <td>
                    {record.clockOutFormatted || '-'}
                    {record.autoClockOut && (
                      <span style={{ color: '#f97316', fontSize: '10px' }}> (auto)</span>
                    )}
                  </td>
                  <td>{record.durationFormatted || '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          disabled={pagination.page === 1}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.pages} ({pagination.total} records)</span>
        <button
          onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
          disabled={pagination.page === pagination.pages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default AttendanceHistory;
```

---

## CSS Styles (Optional)

```css
/* Clock Widget */
.clock-widget {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  margin: 0 auto;
}

.clock-widget.weekend,
.clock-widget.holiday {
  text-align: center;
  padding: 40px 24px;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.status-dot.gray { background: #9ca3af; }
.status-dot.green { background: #10b981; }
.status-dot.amber { background: #f59e0b; }
.status-dot.blue { background: #3b82f6; }
.status-dot.purple { background: #8b5cf6; }

.status-dot.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.attendance-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 16px;
}

.attendance-badge.present {
  background: #dcfce7;
  color: #166534;
}

.attendance-badge.absent {
  background: #fee2e2;
  color: #991b1b;
}

.timer {
  text-align: center;
  margin: 24px 0;
}

.timer .time {
  font-size: 48px;
  font-weight: 700;
  font-family: monospace;
  color: #111827;
}

.timer .paused {
  display: block;
  font-size: 14px;
  color: #f59e0b;
  margin-top: 4px;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.actions button {
  flex: 1;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-clock-in {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.btn-clock-out {
  background: #6b7280;
  color: white;
}

.btn-break {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.btn-break-end {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

.note-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 14px;
}

/* Attendance History */
.attendance-history {
  background: white;
  border-radius: 12px;
  padding: 24px;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filters input,
.filters select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.filters button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

th {
  font-weight: 600;
  color: #374151;
  background: #f9fafb;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}

.pagination button {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

---

## State Flow Diagram

```
                         ┌─────────────────────────────────────┐
                         │           PAGE LOAD                 │
                         │      api.attendance.getStatus()     │
                         └──────────────┬──────────────────────┘
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              │                         │                         │
              ▼                         ▼                         ▼
     ┌────────────────┐       ┌────────────────┐       ┌────────────────┐
     │    WEEKEND     │       │    HOLIDAY     │       │    WORKDAY     │
     │                │       │                │       │                │
     │ Show weekend   │       │ Show holiday   │       │ Check status   │
     │ message        │       │ name & message │       │                │
     └────────────────┘       └────────────────┘       └───────┬────────┘
                                                               │
                              ┌────────────────────────────────┼────────────────────────────────┐
                              │                                │                                │
                              ▼                                ▼                                ▼
                    ┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
                    │   CLOCKED OUT   │              │   CLOCKED IN    │              │    ON BREAK     │
                    │                 │              │                 │              │                 │
                    │ attendanceStatus│              │ attendanceStatus│              │ attendanceStatus│
                    │ = "absent"      │              │ = "present"     │              │ = "present"     │
                    │                 │              │                 │              │                 │
                    │ Show:           │              │ Show:           │              │ Show:           │
                    │ - Clock In btn  │              │ - Timer running │              │ - Timer paused  │
                    │ - Note input    │              │ - Clock Out btn │              │ - End Break btn │
                    │                 │              │ - Break In btn  │              │ - Clock Out btn │
                    └────────┬────────┘              └────────┬────────┘              └────────┬────────┘
                             │                                │                                │
                             │ [Clock In]                     │ [Break In]                     │ [Break Out]
                             │                                │                                │
                             └───────────────►┌───────────────┴────────────────►┌──────────────┘
                                              │                                 │
                                              │ [Clock Out]                     │ [Clock Out]
                                              │                                 │
                                              └─────────────────────────────────┘
                                                              │
                                                              ▼
                                                    ┌─────────────────┐
                                                    │   CLOCKED OUT   │
                                                    │   (Day Done)    │
                                                    │                 │
                                                    │ isClosed = true │
                                                    └─────────────────┘
```

---

## Important Notes

### Time Restrictions
- Clock-in is only allowed **before 17:00**
- Check the hour before calling the API to provide immediate feedback

### Break Rules
- Only **one break per day** is allowed
- Once `breakTaken` is `true`, disable the Break button
- Break is automatically ended if user clocks out while on break

### Auto Actions (Backend Cron Jobs)
| Time | Action |
|------|--------|
| 00:01 | Creates weekend/holiday records |
| 17:00 | Marks users without clock-in as absent |
| 23:59 | Auto clocks out users who forgot |

### Flags to Check
- `autoClockOut: true` - System auto clocked out at 23:59
- `autoMarkedAbsent: true` - System marked absent at 17:00

### South African Public Holidays
The backend includes these holidays:
- New Year's Day (Jan 1)
- Human Rights Day (Mar 21)
- Good Friday (varies)
- Family Day (varies)
- Freedom Day (Apr 27)
- Workers' Day (May 1)
- Youth Day (Jun 16)
- National Women's Day (Aug 9)
- Heritage Day (Sep 24)
- Day of Reconciliation (Dec 16)
- Christmas Day (Dec 25)
- Day of Goodwill (Dec 26)
