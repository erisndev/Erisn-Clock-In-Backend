# Erisn Clock-In Frontend Integration Guide

Complete guide for integrating the frontend with the Erisn Clock-In backend API.

## Table of Contents
1. [Setup](#setup)
2. [Authentication Flow](#authentication-flow)
3. [Attendance System](#attendance-system)
4. [Weekly Reports](#weekly-reports)
5. [Notifications](#notifications)
6. [User Settings](#user-settings)
7. [Admin Features](#admin-features)
8. [API Reference](#api-reference)

---

## Setup

### 1. Copy API Client

Copy `api.js` to your frontend project:
```
src/
  services/
    api.js
```

### 2. Configure Environment

Create `.env` file:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Import and Use

```javascript
import api from './services/api';

// Example: Login
const { user, token } = await api.auth.login({ email, password });
```

---

## Authentication Flow

### Registration Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────���──┐
│  Register   │ ──► │  Verify OTP │ ──► │    Login    │ ──► │  Dashboard  │
│    Form     │     │    Page     │     │    Page     │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

#### Register Page

```jsx
import { useState } from 'react';
import api from '../services/api';

function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    cellNumber: '',
    department: '',
    province: '',
    role: 'graduate'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await api.auth.register(formData);
      // Redirect to OTP verification
      navigate('/verify-otp', { state: { email: formData.email } });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Full Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="email"
        placeholder="Email (@erisn domain)"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <input
        type="password"
        placeholder="Password (min 6 chars, include number)"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        required
      />
      <input
        type="tel"
        placeholder="Cell Number"
        value={formData.cellNumber}
        onChange={(e) => setFormData({ ...formData, cellNumber: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Department"
        value={formData.department}
        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        required
      />
      <select
        value={formData.province}
        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
        required
      >
        <option value="">Select Province</option>
        <option value="Gauteng">Gauteng</option>
        <option value="Western Cape">Western Cape</option>
        <option value="KwaZulu-Natal">KwaZulu-Natal</option>
        <option value="Eastern Cape">Eastern Cape</option>
        <option value="Free State">Free State</option>
        <option value="Limpopo">Limpopo</option>
        <option value="Mpumalanga">Mpumalanga</option>
        <option value="North West">North West</option>
        <option value="Northern Cape">Northern Cape</option>
      </select>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

#### OTP Verification Page

```jsx
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';

function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await api.auth.verifyOtp({ email, otp });
      toast.success('Email verified! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendDisabled(true);
    try {
      await api.auth.resendOtp({ email });
      toast.success('New OTP sent to your email');
      // Re-enable after 60 seconds
      setTimeout(() => setResendDisabled(false), 60000);
    } catch (error) {
      toast.error(error.message);
      setResendDisabled(false);
    }
  };

  return (
    <div>
      <h2>Verify Your Email</h2>
      <p>Enter the 6-digit code sent to {email}</p>
      
      <form onSubmit={handleVerify}>
        <input
          type="text"
          maxLength={6}
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          required
        />
        <button type="submit" disabled={isLoading || otp.length !== 6}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </button>
      </form>
      
      <button onClick={handleResend} disabled={resendDisabled}>
        {resendDisabled ? 'Wait 60s...' : 'Resend OTP'}
      </button>
    </div>
  );
}
```

#### Login Page

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { user, token } = await api.auth.login({ email, password });
      setUser(user);
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
      <a href="/forgot-password">Forgot Password?</a>
    </form>
  );
}
```

#### Password Reset Flow

```jsx
// ForgotPasswordPage.jsx
function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.auth.forgotPassword({ email });
      setSent(true);
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (sent) {
    return <p>Check your email for the reset link.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit">Send Reset Link</button>
    </form>
  );
}

// ResetPasswordPage.jsx
function ResetPasswordPage() {
  const { token } = useParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await api.auth.resetPassword(token, { password });
      toast.success('Password reset successful');
      navigate('/login');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="New Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
      />
      <button type="submit">Reset Password</button>
    </form>
  );
}
```

---

## Attendance System

### Business Rules

| Rule | Description |
|------|-------------|
| One clock-in per day | Users can only clock in once per day |
| Before 17:00 only | Cannot clock in after business hours |
| Workdays only | Cannot clock in on weekends or holidays |
| Default absent | Users are marked absent until they clock in |
| Auto clock-out | System clocks out at 23:59 if forgotten |
| One break per day | Users can take one break per session |

### Day Types

| Type | Description | Can Clock In? |
|------|-------------|---------------|
| `workday` | Monday-Friday (non-holiday) | ✅ Yes |
| `weekend` | Saturday or Sunday | ❌ No |
| `holiday` | Public holiday | ❌ No |

### Attendance Statuses

| Status | Description | Color |
|--------|-------------|-------|
| `present` | Clocked in on workday | 🟢 Green |
| `absent` | Did not clock in on workday | 🔴 Red |
| `weekend` | Weekend day | 🔵 Blue |
| `holiday` | Public holiday | 🟣 Purple |

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
    // Check time before API call
    const hour = new Date().getHours();
    if (hour >= 17) {
      toast.error('Cannot clock in after 17:00');
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

  const handleClockOut = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.attendance.clockOut({ notes: note });
      setClockStatus('clocked-out');
      setStartTime(null);
      setBreakStartTime(null);
      setNote('');
      toast.success(`Clocked out! Work time: ${data.durationFormatted}`);
    } catch (error) {
      toast.error(error.message);
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
      toast.success('Break started');
    } catch (error) {
      toast.error(error.message);
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
      toast.success(`Break ended: ${data.breakDurationFormatted}`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Format elapsed time
  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Render weekend/holiday message
  if (dayType === 'weekend') {
    return (
      <div className="clock-widget weekend">
        <div className="status-indicator blue" />
        <h3>It's the Weekend!</h3>
        <p>Enjoy your time off. See you on Monday!</p>
      </div>
    );
  }

  if (dayType === 'holiday') {
    return (
      <div className="clock-widget holiday">
        <div className="status-indicator purple" />
        <h3>Happy {holidayName}!</h3>
        <p>Today is a public holiday. Enjoy!</p>
      </div>
    );
  }

  // Render workday clock
  return (
    <div className="clock-widget">
      {/* Status Indicator */}
      <div className={`status-indicator ${clockStatus}`}>
        <span className={`dot ${clockStatus === 'clocked-in' ? 'green pulse' : clockStatus === 'on-break' ? 'amber pulse' : 'gray'}`} />
        <span className="label">
          {clockStatus === 'clocked-out' && 'Clocked Out'}
          {clockStatus === 'clocked-in' && 'Clocked In'}
          {clockStatus === 'on-break' && 'On Break'}
        </span>
      </div>

      {/* Attendance Status */}
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

      {/* Action Buttons */}
      <div className="actions">
        {clockStatus === 'clocked-out' && (
          <button 
            onClick={handleClockIn} 
            disabled={isLoading}
            className="btn-primary"
          >
            Clock In
          </button>
        )}

        {clockStatus === 'clocked-in' && (
          <>
            <button 
              onClick={handleClockOut} 
              disabled={isLoading}
              className="btn-secondary"
            >
              Clock Out
            </button>
            <button 
              onClick={handleBreakIn} 
              disabled={isLoading || breakTaken}
              className="btn-warning"
            >
              {breakTaken ? 'Break Taken' : 'Start Break'}
            </button>
          </>
        )}

        {clockStatus === 'on-break' && (
          <>
            <button 
              onClick={handleBreakOut} 
              disabled={isLoading}
              className="btn-info"
            >
              End Break
            </button>
            <button 
              onClick={handleClockOut} 
              disabled={isLoading}
              className="btn-secondary"
            >
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
  const [pagination, setPagination] = useState({ page: 1, pages: 1 });
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
      const params = {
        page: pagination.page,
        limit: 10,
        ...filters
      };
      // Remove empty filters
      Object.keys(params).forEach(key => !params[key] && delete params[key]);
      
      const response = await api.attendance.getHistory(params);
      setRecords(response.data);
      setPagination(response.pagination);
    } catch (error) {
      toast.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      weekend: 'bg-blue-100 text-blue-800',
      holiday: 'bg-purple-100 text-purple-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
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
          placeholder="Start Date"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          placeholder="End Date"
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
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Duration</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record._id}>
              <td>{record.date}</td>
              <td>
                <span className={`badge ${getStatusBadge(record.attendanceStatus)}`}>
                  {record.attendanceStatus}
                  {record.holidayName && ` (${record.holidayName})`}
                </span>
              </td>
              <td>{record.clockInFormatted || '-'}</td>
              <td>
                {record.clockOutFormatted || '-'}
                {record.autoClockOut && (
                  <span className="text-orange-500 text-xs"> (auto)</span>
                )}
              </td>
              <td>{record.durationFormatted || '-'}</td>
              <td>{record.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button
          onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
          disabled={pagination.page === 1}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.pages}</span>
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

## Weekly Reports

### Report Statuses

| Status | Description | User Can Edit? |
|--------|-------------|----------------|
| `Draft` | Not yet submitted | ✅ Yes |
| `Submitted` | Awaiting review | ❌ No |
| `Reviewed` | Admin has reviewed | ❌ No |
| `Approved` | Admin approved | ❌ No |
| `Rejected` | Needs revision | ✅ Yes |

### Submit Report Component

```jsx
import { useState } from 'react';
import api from '../services/api';

function SubmitReport() {
  const [formData, setFormData] = useState({
    weekStart: '',
    weekEnd: '',
    summary: '',
    challenges: '',
    learnings: '',
    nextWeek: '',
    goals: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  // Auto-calculate week dates
  const setCurrentWeek = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    
    setFormData({
      ...formData,
      weekStart: monday.toISOString().split('T')[0],
      weekEnd: friday.toISOString().split('T')[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await api.reports.submit({
        ...formData,
        status: 'Submitted'
      });
      toast.success('Report submitted successfully');
      navigate('/reports');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Submit Weekly Report</h2>
      
      <div className="date-range">
        <div>
          <label>Week Start</label>
          <input
            type="date"
            value={formData.weekStart}
            onChange={(e) => setFormData({ ...formData, weekStart: e.target.value })}
            required
          />
        </div>
        <div>
          <label>Week End</label>
          <input
            type="date"
            value={formData.weekEnd}
            onChange={(e) => setFormData({ ...formData, weekEnd: e.target.value })}
            required
          />
        </div>
        <button type="button" onClick={setCurrentWeek}>
          This Week
        </button>
      </div>

      <div>
        <label>Summary *</label>
        <textarea
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          placeholder="What did you accomplish this week?"
          required
          rows={5}
        />
      </div>

      <div>
        <label>Challenges</label>
        <textarea
          value={formData.challenges}
          onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
          placeholder="What challenges did you face?"
          rows={3}
        />
      </div>

      <div>
        <label>Learnings</label>
        <textarea
          value={formData.learnings}
          onChange={(e) => setFormData({ ...formData, learnings: e.target.value })}
          placeholder="What did you learn?"
          rows={3}
        />
      </div>

      <div>
        <label>Next Week Goals</label>
        <textarea
          value={formData.nextWeek}
          onChange={(e) => setFormData({ ...formData, nextWeek: e.target.value })}
          placeholder="What do you plan to do next week?"
          rows={3}
        />
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  );
}
```

### Reports List Component

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function ReportsList() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.reports.getMyReports();
      setReports(response.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      Draft: 'bg-gray-100 text-gray-800',
      Submitted: 'bg-blue-100 text-blue-800',
      Reviewed: 'bg-yellow-100 text-yellow-800',
      Approved: 'bg-green-100 text-green-800',
      Rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100';
  };

  return (
    <div>
      <div className="header">
        <h2>My Reports</h2>
        <a href="/reports/new" className="btn-primary">New Report</a>
      </div>

      <div className="reports-grid">
        {reports.map((report) => (
          <div key={report._id} className="report-card">
            <div className="report-header">
              <span className="week">
                {report.weekStart} - {report.weekEnd}
              </span>
              <span className={`badge ${getStatusColor(report.status)}`}>
                {report.status}
              </span>
            </div>
            
            <p className="summary">{report.summary.substring(0, 150)}...</p>
            
            {report.reviewComment && (
              <div className="review-comment">
                <strong>Reviewer Comment:</strong>
                <p>{report.reviewComment}</p>
              </div>
            )}
            
            <div className="actions">
              <a href={`/reports/${report._id}`}>View</a>
              {(report.status === 'Draft' || report.status === 'Rejected') && (
                <a href={`/reports/${report._id}/edit`}>Edit</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Notifications

### Notification Bell Component

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const { unreadCount } = await api.notifications.getUnreadCount();
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.notifications.getAll({ limit: 10 });
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications');
    }
  };

  const handleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(notifications.map(n => 
        n._id === id ? { ...n, read: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read');
    }
  };

  return (
    <div className="notification-bell">
      <button onClick={handleOpen} className="bell-button">
        🔔
        {unreadCount > 0 && (
          <span className="badge">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="dropdown">
          <div className="header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead}>Mark all read</button>
            )}
          </div>
          
          <div className="list">
            {notifications.length === 0 ? (
              <p className="empty">No notifications</p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                >
                  <p className="title">{notification.title}</p>
                  <p className="message">{notification.message}</p>
                  <span className="time">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
          
          <a href="/notifications" className="view-all">View All</a>
        </div>
      )}
    </div>
  );
}
```

---

## User Settings

### Profile Settings Component

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function ProfileSettings() {
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    cellNumber: '',
    department: '',
    province: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const user = await api.user.getProfile();
      setProfile(user);
    } catch (error) {
      toast.error('Failed to load profile');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.user.updateProfile(profile);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Profile Settings</h2>
      
      <div>
        <label>Name</label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
        />
      </div>
      
      <div>
        <label>Email</label>
        <input type="email" value={profile.email} disabled />
      </div>
      
      <div>
        <label>Cell Number</label>
        <input
          type="tel"
          value={profile.cellNumber}
          onChange={(e) => setProfile({ ...profile, cellNumber: e.target.value })}
        />
      </div>
      
      <div>
        <label>Department</label>
        <input
          type="text"
          value={profile.department}
          onChange={(e) => setProfile({ ...profile, department: e.target.value })}
        />
      </div>
      
      <div>
        <label>Province</label>
        <input
          type="text"
          value={profile.province}
          onChange={(e) => setProfile({ ...profile, province: e.target.value })}
        />
      </div>
      
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
```

---

## Admin Features

### Admin Dashboard

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function AdminDashboard() {
  const [summary, setSummary] = useState({
    present: 0,
    absent: 0,
    weekend: 0,
    holiday: 0,
    total: 0
  });
  const [recentAttendance, setRecentAttendance] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get today's summary
      const today = new Date().toISOString().split('T')[0];
      const summaryData = await api.attendance.getSummary({
        startDate: today,
        endDate: today
      });
      setSummary(summaryData.data);

      // Get recent attendance
      const attendance = await api.attendance.getAll({ limit: 10 });
      setRecentAttendance(attendance.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data');
    }
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card green">
          <h3>Present Today</h3>
          <span className="count">{summary.present}</span>
        </div>
        <div className="card red">
          <h3>Absent Today</h3>
          <span className="count">{summary.absent}</span>
        </div>
        <div className="card blue">
          <h3>Total Users</h3>
          <span className="count">{summary.total}</span>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="recent-attendance">
        <h2>Recent Attendance</h2>
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Date</th>
              <th>Status</th>
              <th>Clock In</th>
              <th>Clock Out</th>
            </tr>
          </thead>
          <tbody>
            {recentAttendance.map((record) => (
              <tr key={record._id}>
                <td>{record.user?.name}</td>
                <td>{record.date}</td>
                <td>{record.attendanceStatus}</td>
                <td>{record.clockInFormatted || '-'}</td>
                <td>{record.clockOutFormatted || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### Admin Reports Review

```jsx
import { useState, useEffect } from 'react';
import api from '../services/api';

function AdminReportsReview() {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const response = await api.admin.getReports({ status: 'Submitted' });
      setReports(response.data);
    } catch (error) {
      toast.error('Failed to load reports');
    }
  };

  const handleApprove = async (id) => {
    try {
      await api.admin.approveReport(id, { reviewComment });
      toast.success('Report approved');
      fetchReports();
      setSelectedReport(null);
      setReviewComment('');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReject = async (id) => {
    if (!reviewComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      await api.admin.rejectReport(id, { reviewComment });
      toast.success('Report rejected');
      fetchReports();
      setSelectedReport(null);
      setReviewComment('');
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="admin-reports">
      <h1>Reports Review</h1>

      <div className="reports-list">
        {reports.map((report) => (
          <div key={report._id} className="report-item">
            <div className="info">
              <strong>{report.userId?.name}</strong>
              <span>{report.weekStart} - {report.weekEnd}</span>
            </div>
            <button onClick={() => setSelectedReport(report)}>
              Review
            </button>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {selectedReport && (
        <div className="modal">
          <div className="modal-content">
            <h2>Review Report</h2>
            <p><strong>User:</strong> {selectedReport.userId?.name}</p>
            <p><strong>Week:</strong> {selectedReport.weekStart} - {selectedReport.weekEnd}</p>
            
            <div className="section">
              <h4>Summary</h4>
              <p>{selectedReport.summary}</p>
            </div>
            
            {selectedReport.challenges && (
              <div className="section">
                <h4>Challenges</h4>
                <p>{selectedReport.challenges}</p>
              </div>
            )}
            
            {selectedReport.learnings && (
              <div className="section">
                <h4>Learnings</h4>
                <p>{selectedReport.learnings}</p>
              </div>
            )}

            <div className="review-form">
              <label>Review Comment</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Add a comment (required for rejection)"
              />
            </div>

            <div className="actions">
              <button 
                onClick={() => handleApprove(selectedReport._id)}
                className="btn-success"
              >
                Approve
              </button>
              <button 
                onClick={() => handleReject(selectedReport._id)}
                className="btn-danger"
              >
                Reject
              </button>
              <button 
                onClick={() => setSelectedReport(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/verify-email-otp` | Verify email with OTP |
| POST | `/auth/resend-otp` | Resend OTP |
| POST | `/auth/login` | Login |
| GET | `/auth/logout` | Logout |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password/:token` | Reset password |

### User

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/profile` | Get profile |
| PUT | `/users/profile` | Update profile |
| DELETE | `/users/profile` | Delete account |
| GET | `/users/preferences` | Get preferences |
| PUT | `/users/preferences` | Update preferences |

### Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/attendance/status` | Get current status |
| GET | `/attendance/today` | Get today's record |
| POST | `/attendance/clock-in` | Clock in |
| POST | `/attendance/clock-out` | Clock out |
| POST | `/attendance/break-in` | Start break |
| POST | `/attendance/break-out` | End break |
| GET | `/attendance/history` | Get history |
| GET | `/attendance/all` | Admin: Get all |
| GET | `/attendance/summary` | Admin: Get summary |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/reports` | Submit report |
| GET | `/reports` | Get my reports |
| GET | `/reports/:id` | Get report by ID |
| PUT | `/reports/:id` | Update report |

### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/reports` | Get all reports |
| POST | `/admin/reports/:id/approve` | Approve report |
| POST | `/admin/reports/:id/reject` | Reject report |
| GET | `/admin/users` | Get all users |

### Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | Get notifications |
| GET | `/notifications/unread-count` | Get unread count |
| PATCH | `/notifications/:id/read` | Mark as read |
| PATCH | `/notifications/mark-all-read` | Mark all read |

---

## Folder Structure

Recommended frontend folder structure:

```
src/
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   └── Toast.jsx
│   ├── attendance/
│   │   ├── ClockWidget.jsx
│   │   ├── AttendanceHistory.jsx
│   │   └── Timer.jsx
│   ├── reports/
│   │   ├── ReportForm.jsx
│   │   ├── ReportCard.jsx
│   │   └── ReportsList.jsx
│   ├── notifications/
│   │   ├── NotificationBell.jsx
│   │   └── NotificationsList.jsx
│   └── layout/
│       ├── Header.jsx
│       ├── Sidebar.jsx
│       └── Layout.jsx
├── pages/
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── VerifyOtpPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   └── ResetPasswordPage.jsx
│   ├── dashboard/
│   │   └── DashboardPage.jsx
│   ├── attendance/
│   │   └── AttendancePage.jsx
│   ├── reports/
│   │   ├── ReportsPage.jsx
│   │   ├── NewReportPage.jsx
│   │   └── EditReportPage.jsx
│   ├── settings/
│   │   └── SettingsPage.jsx
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── AdminAttendance.jsx
│       ├── AdminReports.jsx
│       └── AdminUsers.jsx
├── context/
│   └── AuthContext.jsx
├── services/
│   └── api.js
├── hooks/
│   ├── useAuth.js
│   └── useAttendance.js
├── utils/
│   ├── formatters.js
│   └── validators.js
└── App.jsx
```
