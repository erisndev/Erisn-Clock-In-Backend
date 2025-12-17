# Erisn Clock-In Frontend Flow Guide

This document describes the recommended user flows and page structure for the frontend application.

## Table of Contents

1. [Setup](#setup)
2. [Authentication Flow](#authentication-flow)
3. [Dashboard Flow](#dashboard-flow)
4. [Attendance Flow](#attendance-flow)
5. [Weekly Reports Flow](#weekly-reports-flow)
6. [Notifications Flow](#notifications-flow)
7. [User Settings Flow](#user-settings-flow)
8. [Admin Flow](#admin-flow)
9. [Component Structure](#component-structure)
10. [State Management](#state-management)

---

## Setup

### 1. Install the API client

Copy `api.js` to your frontend project (e.g., `src/services/api.js`)

### 2. Configure environment

Create `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Import and use

```javascript
import api from './services/api';

// Example: Login
const handleLogin = async (email, password) => {
  try {
    const { user, token } = await api.auth.login({ email, password });
    // Token is automatically stored
    // Redirect to dashboard
  } catch (error) {
    // Handle error (show toast, etc.)
  }
};
```

---

## Authentication Flow

### Pages Required

- `/login` - Login page
- `/register` - Registration page
- `/verify-otp` - OTP verification page
- `/forgot-password` - Request password reset
- `/reset-password/:token` - Reset password form

### Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Register  │ ──▶ │  Verify OTP  │ ──▶ │    Login    │
└─────────────┘     └──────────────┘     └─────────────┘
                           │                    │
                           │ (resend)           │
                           ▼                    ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Resend OTP  │     │  Dashboard  │
                    └──────────────┘     └─────────────┘
```

### Registration Flow

```javascript
// 1. Register
const handleRegister = async (formData) => {
  try {
    await api.auth.register({
      name: formData.name,
      email: formData.email,      // Must be @erisn*.com
      email: formData.cellNumber Must be @erisn*.com
      email: formData.department,      // Must be @erisn*.com
      password: formData.password, // Min 6 chars, must contain number
    });

    // Store email for OTP page
    sessionStorage.setItem('pendingEmail', formData.email);

    // Redirect to OTP verification
    navigate('/verify-otp');
  } catch (error) {
    if (error.data?.errors) {
      // Validation errors
      setErrors(error.data.errors);
    } else {
      toast.error(error.message);
    }
  }
};

// 2. Verify OTP
const handleVerifyOtp = async (otp) => {
  const email = sessionStorage.getItem('pendingEmail');

  try {
    await api.auth.verifyOtp({ email, otp });
    sessionStorage.removeItem('pendingEmail');
    toast.success('Email verified! Please login.');
    navigate('/login');
  } catch (error) {
    toast.error(error.message);
  }
};

// 3. Resend OTP (if expired)
const handleResendOtp = async () => {
  const email = sessionStorage.getItem('pendingEmail');

  try {
    await api.auth.resendOtp({ email });
    toast.success('New OTP sent to your email');
  } catch (error) {
    // Rate limited: "Too many OTP requests. Please wait 10 minutes."
    toast.error(error.message);
  }
};
```

### Login Flow

```javascript
const handleLogin = async (email, password) => {
  try {
    const { user, token } = await api.auth.login({ email, password });

    // Store user in state/context
    setUser(user);

    // Redirect based on role
    if (user.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/dashboard');
    }
  } catch (error) {
    // Handle specific errors
    if (error.status === 403) {
      // Email not verified
      sessionStorage.setItem('pendingEmail', email);
      navigate('/verify-otp');
    } else {
      toast.error(error.message);
    }
  }
};
```

### Password Reset Flow

```javascript
// 1. Request reset
const handleForgotPassword = async (email) => {
  try {
    await api.auth.forgotPassword({ email });
    toast.success('Reset link sent to your email');
  } catch (error) {
    toast.error(error.message);
  }
};

// 2. Reset password (from email link)
const handleResetPassword = async (token, newPassword) => {
  try {
    await api.auth.resetPassword(token, { password: newPassword });
    toast.success('Password reset successful');
    navigate('/login');
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

## Dashboard Flow

### Graduate Dashboard

```
┌────────────────────────────────────────────────────────┐
│  Header: Logo | Notifications Bell | Profile Menu     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────┐  ┌─────────────────┐             │
│  │  Clock Status   │  │  Today's Hours  │             │
│  │  [Clock In/Out] │  │     8h 30m      │             │
│  └─────────────────┘  └─────────────────┘             │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  This Week's Attendance                          │  │
│  │  Mon ✓ | Tue ✓ | Wed ✓ | Thu ○ | Fri ○          │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌──────────────���──────────────────────────────────┐  │
│  │  Weekly Report Status                            │  │
│  │  [Submit Report] or [View Submitted]             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Dashboard Data Loading

```javascript
const Dashboard = () => {
  const [clockStatus, setClockStatus] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [reports, setReports] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        // Load all data in parallel
        const [attendanceData, reportsData, notifData] = await Promise.all([
          api.attendance.getHistory({ limit: 7 }),
          api.reports.getMyReports(),
          api.notifications.getUnreadCount(),
        ]);

        setAttendance(attendanceData);
        setReports(reportsData.data);
        setUnreadCount(notifData.unreadCount);

        // Check if clocked in today
        const today = new Date().toISOString().split('T')[0];
        const todayRecord = attendanceData.find(a =>
          a.date?.startsWith(today) || a.clockIn?.startsWith(today)
        );
        setClockStatus(todayRecord);
      } catch (error) {
        toast.error('Failed to load dashboard');
      }
    };

    loadDashboard();
  }, []);

  return (/* JSX */);
};
```

---

## Attendance Flow

### Clock In/Out Component

```javascript
const ClockInOut = ({ status, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const handleClockIn = async () => {
    setLoading(true);
    try {
      const record = await api.attendance.clockIn({
        notes: "Started work",
      });
      onUpdate(record);
      toast.success("Clocked in successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    try {
      const record = await api.attendance.clockOut({
        notes: "Finished work",
      });
      onUpdate(record);
      toast.success("Clocked out successfully");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const isClockedIn = status && !status.clockOut;

  return (
    <div className="clock-widget">
      {isClockedIn ? (
        <button onClick={handleClockOut} disabled={loading}>
          Clock Out
        </button>
      ) : (
        <button onClick={handleClockIn} disabled={loading}>
          Clock In
        </button>
      )}

      {status && (
        <div className="status">
          Clocked in at: {new Date(status.clockIn).toLocaleTimeString()}
          {status.clockOut && (
            <span>
              Clocked out at: {new Date(status.clockOut).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
```

### Attendance History Page

```javascript
const AttendanceHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  });

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.attendance.getHistory(filters);
      setRecords(data);
    } catch (error) {
      toast.error('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [filters]);

  return (
    <div>
      <h1>Attendance History</h1>

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
      </div>

      {/* Table */}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Clock In</th>
            <th>Clock Out</th>
            <th>Duration</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record._id}>
              <td>{new Date(record.clockIn).toLocaleDateString()}</td>
              <td>{new Date(record.clockIn).toLocaleTimeString()}</td>
              <td>{record.clockOut ? new Date(record.clockOut).toLocaleTimeString() : '-'}</td>
              <td>{record.duration || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## Weekly Reports Flow

### Report Status States

```
Draft → Submitted → Reviewed → Approved
                          ↘ Rejected (can resubmit)
```

### Submit Report Page

```javascript
const SubmitReport = () => {
  const [formData, setFormData] = useState({
    weekStart: getMonday(new Date()).toISOString().split('T')[0],
    weekEnd: getSunday(new Date()).toISOString().split('T')[0],
    summary: '',
    challenges: '',
    learnings: '',
    nextWeek: '',
    goals: '',
    status: 'Submitted', // or 'Draft' to save without submitting
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const { data } = await api.reports.submit(formData);
      toast.success('Report submitted successfully');
      navigate('/reports');
    } catch (error) {
      if (error.data?.errors) {
        // Validation errors
        const errorMap = {};
        error.data.errors.forEach(err => {
          errorMap[err.field] = err.message;
        });
        setErrors(errorMap);
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    setFormData({ ...formData, status: 'Draft' });
    // Then submit
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Submit Weekly Report</h1>

      <div className="form-group">
        <label>Week Start</label>
        <input
          type="date"
          value={formData.weekStart}
          onChange={(e) => setFormData({ ...formData, weekStart: e.target.value })}
        />
        {errors.weekStart && <span className="error">{errors.weekStart}</span>}
      </div>

      <div className="form-group">
        <label>Week End</label>
        <input
          type="date"
          value={formData.weekEnd}
          onChange={(e) => setFormData({ ...formData, weekEnd: e.target.value })}
        />
        {errors.weekEnd && <span className="error">{errors.weekEnd}</span>}
      </div>

      <div className="form-group">
        <label>Summary *</label>
        <textarea
          value={formData.summary}
          onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
          placeholder="What did you accomplish this week?"
          rows={4}
        />
        {errors.summary && <span className="error">{errors.summary}</span>}
      </div>

      <div className="form-group">
        <label>Challenges</label>
        <textarea
          value={formData.challenges}
          onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
          placeholder="What challenges did you face?"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Learnings</label>
        <textarea
          value={formData.learnings}
          onChange={(e) => setFormData({ ...formData, learnings: e.target.value })}
          placeholder="What did you learn?"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Goals for Next Week</label>
        <textarea
          value={formData.nextWeek}
          onChange={(e) => setFormData({ ...formData, nextWeek: e.target.value })}
          placeholder="What do you plan to accomplish next week?"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Action Items / Targets</label>
        <textarea
          value={formData.goals}
          onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
          placeholder="Specific targets or action items"
          rows={3}
        />
      </div>

      <div className="actions">
        <button type="button" onClick={handleSaveDraft} disabled={loading}>
          Save as Draft
        </button>
        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
      </div>
    </form>
  );
};
```

### My Reports List

```javascript
const MyReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const { data } = await api.reports.getMyReports();
        setReports(data);
      } catch (error) {
        toast.error("Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  const getStatusBadge = (status) => {
    const colors = {
      Draft: "gray",
      Submitted: "blue",
      Reviewed: "yellow",
      Approved: "green",
      Rejected: "red",
    };
    return <span className={`badge badge-${colors[status]}`}>{status}</span>;
  };

  return (
    <div>
      <div className="header">
        <h1>My Reports</h1>
        <button onClick={() => navigate("/reports/new")}>New Report</button>
      </div>

      <div className="reports-list">
        {reports.map((report) => (
          <div key={report._id} className="report-card">
            <div className="report-header">
              <span className="date-range">
                {new Date(report.weekStart).toLocaleDateString()} -
                {new Date(report.weekEnd).toLocaleDateString()}
              </span>
              {getStatusBadge(report.status)}
            </div>

            <p className="summary">{report.summary.substring(0, 150)}...</p>

            {report.reviewComment && (
              <div className="review-comment">
                <strong>Reviewer Comment:</strong> {report.reviewComment}
              </div>
            )}

            <div className="actions">
              <button onClick={() => navigate(`/reports/${report._id}`)}>
                View
              </button>
              {["Draft", "Rejected"].includes(report.status) && (
                <button onClick={() => navigate(`/reports/${report._id}/edit`)}>
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## Notifications Flow

### Notification Bell Component

```javascript
const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadUnread = async () => {
      try {
        const { unreadCount } = await api.notifications.getUnreadCount();
        setUnreadCount(unreadCount);
      } catch (error) {
        console.error('Failed to load notifications');
      }
    };

    loadUnread();

    // Poll every 30 seconds
    const interval = setInterval(loadUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = async () => {
    setIsOpen(true);
    try {
      const { notifications } = await api.notifications.getAll({ limit: 10 });
      setNotifications(notifications);
    } catch (error) {
      toast.error('Failed to load notifications');
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.notifications.markAsRead(id);
      setNotifications(notifications.map(n =>
        n._id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <div className="notification-bell">
      <button onClick={handleOpen}>
        🔔
        {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="dropdown">
          <div className="header">
            <h3>Notifications</h3>
            <button onClick={handleMarkAllRead}>Mark all read</button>
          </div>

          <div className="list">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`item ${notif.isRead ? 'read' : 'unread'}`}
                onClick={() => handleMarkAsRead(notif._id)}
              >
                <strong>{notif.title}</strong>
                <p>{notif.message}</p>
                <span className="time">
                  {new Date(notif.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <button onClick={() => navigate('/notifications')}>
            View All
          </button>
        </div>
      )}
    </div>
  );
};
```

### Notifications Page (Full List)

```javascript
const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);

  const loadNotifications = async (loadMore = false) => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (loadMore && cursor) {
        params.cursor = cursor;
      }

      const data = await api.notifications.getAll(params);

      if (loadMore) {
        setNotifications([...notifications, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }

      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (error) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div>
      <h1>Notifications</h1>

      <div className="notifications-list">
        {notifications.map((notif) => (
          <div
            key={notif._id}
            className={`notification ${notif.isRead ? "" : "unread"}`}
          >
            <h3>{notif.title}</h3>
            <p>{notif.message}</p>
            <span>{new Date(notif.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>

      {hasMore && (
        <button onClick={() => loadNotifications(true)} disabled={loading}>
          {loading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
};
```

---

## User Settings Flow

### Settings Page

```javascript
const SettingsPage = () => {
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [profileData, prefsData] = await Promise.all([
          api.user.getProfile(),
          api.user.getPreferences(),
        ]);
        setProfile(profileData);
        setPreferences(prefsData.preferences);
      } catch (error) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleUpdateProfile = async (data) => {
    try {
      const updated = await api.user.updateProfile(data);
      setProfile(updated);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleUpdatePreferences = async (data) => {
    try {
      const { preferences } = await api.user.updatePreferences(data);
      setPreferences(preferences);
      toast.success('Preferences updated');
    } catch (error) {
      toast.error(error.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="settings-page">
      <h1>Settings</h1>

      {/* Profile Section */}
      <section>
        <h2>Profile</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdateProfile({
            name: e.target.name.value,
            phone: e.target.phone.value,
          });
        }}>
          <input name="name" defaultValue={profile.name} placeholder="Name" />
          <input name="email" value={profile.email} disabled />
          <input name="phone" defaultValue={profile.phone} placeholder="Phone" />
          <button type="submit">Update Profile</button>
        </form>
      </section>

      {/* Preferences Section */}
      <section>
        <h2>Preferences</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdatePreferences({
            timezone: e.target.timezone.value,
            notificationChannels: Array.from(e.target.channels)
              .filter(c => c.checked)
              .map(c => c.value),
            emailFrequency: e.target.emailFrequency.value,
          });
        }}>
          <div>
            <label>Timezone</label>
            <select name="timezone" defaultValue={preferences.timezone}>
              <option value="UTC">UTC</option>
              <option value="Africa/Lagos">Africa/Lagos</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg</option>
              {/* Add more timezones */}
            </select>
          </div>

          <div>
            <label>Notification Channels</label>
            <label>
              <input
                type="checkbox"
                name="channels"
                value="email"
                defaultChecked={preferences.notificationChannels.includes('email')}
              />
              Email
            </label>
            <label>
              <input
                type="checkbox"
                name="channels"
                value="webpush"
                defaultChecked={preferences.notificationChannels.includes('webpush')}
              />
              Push Notifications
            </label>
          </div>

          <div>
            <label>Email Frequency</label>
            <select name="emailFrequency" defaultValue={preferences.emailFrequency}>
              <option value="immediate">Immediate</option>
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Digest</option>
            </select>
          </div>

          <button type="submit">Save Preferences</button>
        </form>
      </section>

      {/* Change Password Section */}
      <section>
        <h2>Change Password</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          handleUpdateProfile({ password: e.target.password.value });
        }}>
          <input
            type="password"
            name="password"
            placeholder="New Password"
            minLength={6}
          />
          <button type="submit">Change Password</button>
        </form>
      </section>
    </div>
  );
};
```

---

## Admin Flow

### Admin Dashboard

```
┌────────────────────────────────────────────────────────┐
│  Admin Header: Logo | Notifications | Profile Menu    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │ Total Users │ │  Pending    │ │  Approved   │      │
│  │     45      │ │  Reports: 8 │ │  Today: 12  │      │
│  └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                        │
│  Sidebar:                                              │
│  - Dashboard                                           │
│  - Users                                               │
│  - Reports                                             │
│  - Attendance                                          │
│  - Export                                              │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Admin Reports Review Page

```javascript
const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    status: 'Submitted',
    page: 1,
    limit: 20,
  });
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await api.admin.getReports(filters);
      setReports(data.data);
      setPagination({
        page: data.page,
        totalPages: data.totalPages,
        total: data.total,
      });
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filters]);

  const handleApprove = async (id) => {
    try {
      await api.admin.approveReport(id, { reviewComment: 'Good work!' });
      toast.success('Report approved');
      loadReports();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleReject = async (id) => {
    const comment = prompt('Please provide a reason for rejection:');
    if (!comment) return;

    try {
      await api.admin.rejectReport(id, { reviewComment: comment });
      toast.success('Report rejected');
      loadReports();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div>
      <h1>Review Reports</h1>

      {/* Filters */}
      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
        >
          <option value="">All Status</option>
          <option value="Submitted">Submitted</option>
          <option value="Reviewed">Reviewed</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Reports Table */}
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Week</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report._id}>
              <td>{report.userId?.name}</td>
              <td>
                {new Date(report.weekStart).toLocaleDateString()} -
                {new Date(report.weekEnd).toLocaleDateString()}
              </td>
              <td>{report.status}</td>
              <td>{new Date(report.createdAt).toLocaleDateString()}</td>
              <td>
                <button onClick={() => navigate(`/admin/reports/${report._id}`)}>
                  View
                </button>
                {report.status === 'Submitted' && (
                  <>
                    <button onClick={() => handleApprove(report._id)}>
                      Approve
                    </button>
                    <button onClick={() => handleReject(report._id)}>
                      Reject
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="pagination">
        <button
          disabled={filters.page === 1}
          onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
        >
          Previous
        </button>
        <span>Page {pagination.page} of {pagination.totalPages}</span>
        <button
          disabled={filters.page >= pagination.totalPages}
          onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
        >
          Next
        </button>
      </div>
    </div>
  );
};
```

### Admin Export Page

```javascript
const AdminExport = () => {
  const [dateRange, setDateRange] = useState({
    weekStart: '',
    weekEnd: '',
  });
  const [loading, setLoading] = useState(false);

  const handleExport = async (type) => {
    if (!dateRange.weekStart || !dateRange.weekEnd) {
      toast.error('Please select date range');
      return;
    }

    setLoading(true);
    try {
      const response = await api.admin.exportReports({
        ...dateRange,
        type,
      });

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reports.${type}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Export Reports</h1>

      <div className="form">
        <div>
          <label>Start Date</label>
          <input
            type="date"
            value={dateRange.weekStart}
            onChange={(e) => setDateRange({ ...dateRange, weekStart: e.target.value })}
          />
        </div>
        <div>
          <label>End Date</label>
          <input
            type="date"
            value={dateRange.weekEnd}
            onChange={(e) => setDateRange({ ...dateRange, weekEnd: e.target.value })}
          />
        </div>
      </div>

      <div className="actions">
        <button onClick={() => handleExport('csv')} disabled={loading}>
          Export CSV
        </button>
        <button onClick={() => handleExport('pdf')} disabled={loading}>
          Export PDF
        </button>
      </div>
    </div>
  );
};
```

---

## Component Structure

### Recommended Folder Structure

```
src/
├── components/
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── Toast.jsx
│   │   └── Loading.jsx
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Footer.jsx
│   │   └── Layout.jsx
│   ├── auth/
│   │   ├── LoginForm.jsx
│   │   ├── RegisterForm.jsx
│   ���   ├── OtpForm.jsx
│   │   └── PasswordResetForm.jsx
│   ├── attendance/
│   │   ├── ClockWidget.jsx
│   │   ├── AttendanceTable.jsx
│   │   └── WeeklyCalendar.jsx
│   ├── reports/
│   │   ├── ReportForm.jsx
│   │   ├── ReportCard.jsx
│   │   ├── ReportList.jsx
│   │   └── StatusBadge.jsx
│   └── notifications/
│       ├── NotificationBell.jsx
│       ├── NotificationItem.jsx
│       └── NotificationList.jsx
├── pages/
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── VerifyOtp.jsx
│   │   ├── ForgotPassword.jsx
│   │   └── ResetPassword.jsx
│   ├── dashboard/
│   │   └── Dashboard.jsx
│   ├── attendance/
│   │   └── AttendanceHistory.jsx
│   ├── reports/
│   │   ├── MyReports.jsx
│   │   ├── SubmitReport.jsx
│   │   ├── EditReport.jsx
│   │   └── ViewReport.jsx
│   ├── notifications/
│   │   └── Notifications.jsx
│   ├── settings/
│   │   └── Settings.jsx
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── AdminUsers.jsx
│       ├── AdminReports.jsx
│       ├── AdminReportDetail.jsx
│       └── AdminExport.jsx
├── services/
│   └── api.js
├── hooks/
│   ├── useAuth.js
│   ├── useNotifications.js
│   └── useAttendance.js
├── context/
│   ├── AuthContext.jsx
│   └── NotificationContext.jsx
├── utils/
│   ├── dates.js
│   └── helpers.js
└── App.jsx
```

---

## State Management

### Auth Context

```javascript
// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const userData = await api.user.getProfile();
          setUser(userData);
        } catch (error) {
          api.clearToken();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    const { user, token } = await api.auth.login({ email, password });
    setUser(user);
    return user;
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### Protected Route

```javascript
// components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
```

### App Routes

```javascript
// App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOtp from './pages/auth/VerifyOtp';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import AttendanceHistory from './pages/attendance/AttendanceHistory';
import MyReports from './pages/reports/MyReports';
import SubmitReport from './pages/reports/SubmitReport';
import Settings from './pages/settings/Settings';
import Notifications from './pages/notifications/Notifications';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReports from './pages/admin/AdminReports';
import AdminUsers from './pages/admin/AdminUsers';
import AdminExport from './pages/admin/AdminExport';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/attendance" element={
            <ProtectedRoute><AttendanceHistory /></ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute><MyReports /></ProtectedRoute>
          } />
          <Route path="/reports/new" element={
            <ProtectedRoute><SubmitReport /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><Settings /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><Notifications /></ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>
          } />
          <Route path="/admin/export" element={
            <ProtectedRoute adminOnly><AdminExport /></ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
```

---

## Quick Reference

### API Endpoints Summary

| Method | Endpoint                     | Description        | Auth  |
| ------ | ---------------------------- | ------------------ | ----- |
| POST   | /auth/register               | Register new user  | No    |
| POST   | /auth/verify-email-otp       | Verify OTP         | No    |
| POST   | /auth/resend-otp             | Resend OTP         | No    |
| POST   | /auth/login                  | Login              | No    |
| GET    | /auth/logout                 | Logout             | Yes   |
| POST   | /auth/forgot-password        | Request reset      | No    |
| POST   | /auth/reset-password/:token  | Reset password     | No    |
| GET    | /users/profile               | Get profile        | Yes   |
| PUT    | /users/profile               | Update profile     | Yes   |
| GET    | /users/preferences           | Get preferences    | Yes   |
| PUT    | /users/preferences           | Update preferences | Yes   |
| POST   | /attendance/clock-in         | Clock in           | Yes   |
| POST   | /attendance/clock-out        | Clock out          | Yes   |
| GET    | /attendance/history          | Get history        | Yes   |
| GET    | /attendance/all              | Get all (admin)    | Admin |
| POST   | /reports                     | Submit report      | Yes   |
| PUT    | /reports/:id                 | Update report      | Yes   |
| GET    | /reports                     | Get my reports     | Yes   |
| GET    | /reports/:id                 | Get report         | Yes   |
| GET    | /notifications               | Get notifications  | Yes   |
| GET    | /notifications/unread-count  | Get unread count   | Yes   |
| PATCH  | /notifications/:id/read      | Mark as read       | Yes   |
| PATCH  | /notifications/mark-all-read | Mark all read      | Yes   |
| GET    | /admin/reports               | Get all reports    | Admin |
| POST   | /admin/reports/:id/approve   | Approve report     | Admin |
| POST   | /admin/reports/:id/reject    | Reject report      | Admin |
| GET    | /admin/users                 | Get all users      | Admin |
| GET    | /admin/reports/export        | Export reports     | Admin |

---

This guide provides a complete blueprint for building the frontend. Copy the `api.js` file to your frontend project and follow the flow patterns described above.
