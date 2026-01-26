# Holidays Calendar Application - Specifications

## 1. Overview

The Holidays Calendar Application is a comprehensive system designed to manage employee holidays and leave requests within business units. The application follows a decoupled architecture with a React frontend and FastAPI backend, supporting Microsoft 365 authentication and PostgreSQL database storage.

### 1.1 Architecture
- **Frontend**: React (Vite) with dynamic CSS variable-based theming
- **Backend**: FastAPI (Python) with SQLModel/SQLAlchemy ORM
- **Database**: PostgreSQL (Production) / SQLite (Development)
- **Authentication**: Microsoft 365 (Azure AD) via MSAL
- **Calendar Integration**: FullCalendar for visualization

## 2. User Roles and Permissions

The application implements a role-based access control system with three distinct user roles:

### 2.1 Administrator Role
- **Role Identifier**: `admin`
- **Permissions**:
  - Create, read, update, and delete all users
  - Create, read, update, and delete all business units
  - Create, read, update, and delete all holidays
  - Assign managers to business units
  - Access to all business units and their data
  - Approve/reject any holiday request regardless of business unit
  - Manage system-wide settings and configurations

### 2.2 Business Unit Manager Role
- **Role Identifier**: `bu_manager`
- **Permissions**:
  - View and manage holidays within their assigned business units
  - Approve/reject holiday requests from employees in their business units
  - Request changes to holiday requests
  - Update business unit details (name, description, branding)
  - Create employees within their business units
  - View all employees in their business units

### 2.3 Employee Role
- **Role Identifier**: `employee`
- **Permissions**:
  - Submit holiday requests for their own account
  - View their own holiday history
  - Update their own profile information
  - Cancel their own pending holiday requests
  - View holidays of colleagues within their business unit (with status indicators)

## 3. Holiday Management Workflow

### 3.1 Holiday Request Submission
1. **Employee Action**: Employee submits a holiday request specifying:
   - Title and description
   - Start and end dates
   - Holiday type (Vacation, Sick Leave, Personal, Parental, Other)
   - Half-day option (Morning or Afternoon)
   - Business unit assignment

2. **System Validation**:
   - Validates that end date is after or equal to start date
   - Verifies user is a member of the selected business unit
   - Checks for overlapping holidays within the same business unit
   - Automatically flags potential overlaps and stores overlapping user IDs

3. **Status Assignment**: Holiday request is initially set to `PENDING` status

### 3.2 Holiday Approval Process
1. **Manager Notification**: Business unit managers receive notifications of pending requests
2. **Review Options**:
   - **Approve**: Sets status to `APPROVED`, adds manager notes if provided
   - **Reject**: Sets status to `REJECTED`, adds manager notes if provided
   - **Request Change**: Sets status to `CHANGE_REQUESTED`, requires manager notes explaining requested changes

3. **Employee Response**: For change requests, employee must update the request which resets status to `PENDING`

### 3.3 Holiday Status Lifecycle
- `PENDING`: Submitted but not yet reviewed
- `APPROVED`: Approved by manager
- `REJECTED`: Rejected by manager
- `CHANGE_REQUESTED`: Manager requested modifications
- `CANCELLED`: Employee cancelled an approved request

## 4. Business Unit Management

### 4.1 Business Unit Structure
Each business unit contains:
- Name and description
- Branding elements (primary, secondary, accent colors, logo URL)
- Manager assignment (optional)
- Member list
- Associated holidays and events

### 4.2 Business Unit Operations
- **Creation**: Admins can create new business units with initial settings
- **Management**: Managers can update business unit details and branding
- **Membership**: Admins manage user memberships in business units
- **Deletion**: Admins can deactivate business units (soft delete)

### 4.3 Manager Assignment
- Admins assign managers to business units
- Managers can be employees who also belong to the business unit
- Multiple users can have manager rights within the same business unit

## 5. Holiday Types

The system supports multiple types of leave requests:
- **Vacation**: Standard vacation time
- **Sick Leave**: Medical-related absences
- **Personal**: Personal matters requiring time off
- **Parental**: Maternity/paternity leave
- **Other**: Miscellaneous leave types

## 6. Overlap Detection System

### 6.1 Automatic Detection
- System automatically detects overlapping holidays within the same business unit
- Overlap detection occurs during creation and updates of holiday requests
- Overlapping holidays are flagged with `has_overlap` boolean and stored user IDs

### 6.2 Visual Indicators
- Calendar displays overlapping holidays with distinct visual indicators
- Users can see which colleagues have overlapping holidays
- Different colors represent different statuses (Pending, Approved, Rejected, Change Requested)

## 7. Calendar Visualization

### 7.1 FullCalendar Integration
- Interactive calendar view showing holidays for selected business units
- Date range selection for viewing specific periods
- Color-coded events based on status and business unit branding
- User avatars and names displayed with holiday events

### 7.2 Filtering Capabilities
- Filter by business unit
- Filter by date range
- Filter by holiday status
- Filter by user within business unit

## 8. API Endpoints

### 8.1 Authentication Endpoints
- `/api/auth/login` - Microsoft 365 login
- `/api/auth/logout` - Logout functionality
- `/api/auth/me` - Get current user info

### 8.2 User Management Endpoints
- `/api/users` - List, create, update, delete users (Admin only)
- `/api/users/{id}` - Get specific user
- `/api/users/{user_id}/business-units/{bu_id}` - Add/remove user from business unit

### 8.3 Business Unit Endpoints
- `/api/business-units` - Manage business units
- `/api/business-units/{id}` - Get/update specific business unit
- `/api/business-units/{id}/members` - Get members of business unit
- `/api/business-units/{bu_id}/manager/{manager_id}` - Set business unit manager

### 8.4 Holiday Management Endpoints
- `/api/holidays` - Create/list holiday requests
- `/api/holidays/{id}` - Get/update/delete specific holiday
- `/api/holidays/pending` - Get pending approvals (Managers only)
- `/api/holidays/calendar` - Get calendar events
- `/api/holidays/overlaps` - Check for overlapping holidays
- `/api/holidays/{id}/approve` - Approve holiday (Managers only)
- `/api/holidays/{id}/reject` - Reject holiday (Managers only)
- `/api/holidays/{id}/request-change` - Request changes (Managers only)

## 9. Security Features

### 9.1 Authentication
- Microsoft 365 Azure AD integration
- JWT token-based authentication
- Session management with automatic expiration

### 9.2 Authorization
- Role-based access control
- Business unit-based access restrictions
- Data isolation between business units
- Audit trail for manager actions

## 10. Technical Implementation Details

### 10.1 Database Schema
- SQLModel-based models with inheritance
- UUID primary keys for all entities
- Proper foreign key relationships
- JSON fields for storing arrays (e.g., overlap_user_ids)

### 10.2 Frontend Architecture
- React functional components with hooks
- Context API for theme management
- Service layer for API calls with Axios interceptors
- Reusable UI components
- Dynamic CSS variables for theming

### 10.3 Backend Architecture
- FastAPI with dependency injection
- Service layer pattern for business logic
- Proper validation with Pydantic schemas
- Comprehensive error handling
- Database session management

## 11. Special Features

### 11.1 Dynamic Theming
- Business units can customize their color schemes
- Theme context dynamically loads branding configuration
- CSS variables ensure consistent theming across application

### 11.2 Audit Trail
- All manager actions are logged with timestamps
- Reviewed-by tracking for accountability
- Status change history maintained

### 11.3 Flexible Holiday Types
- Support for multiple leave categories
- Half-day options for greater flexibility
- Detailed duration calculation including half-days

## 12. Error Handling and Validation

### 12.1 Input Validation
- Date validation (end date after start date)
- Business unit membership validation
- User role validation for operations
- Required field validation

### 12.2 Access Control Validation
- Business unit access verification
- Role-based permission checks
- Self vs. others data access validation
- Manager authority verification for approvals

This specification provides a comprehensive overview of the Holidays Calendar Application's functionality, architecture, and operational procedures.