# End-to-End Testing Guide

## Overview
The E2E test suite (`tests/e2e.test.ts`) provides comprehensive testing for the entire system including:
- Authentication and password hashing
- Department, Major, Class, and Subject CRUD operations
- User management across all roles
- Schedule management
- Data integrity and referential relationships
- Query performance validation
- System statistics and reporting

## Prerequisites

### 1. Database Connection
The tests require direct MySQL database access. Set the database password as an environment variable:

**PowerShell:**
```powershell
$env:DB_PASSWORD = "Student2Kg@y2001"
npm test
```

**CMD:**
```cmd
set DB_PASSWORD=Student2Kg@y2001
npm test
```

**Bash/Linux:**
```bash
export DB_PASSWORD="Student2Kg@y2001"
npm test
```

### 2. Database State
- Tests create temporary test data with prefix `TEST_`
- All test data is automatically cleaned up after tests complete
- Tests should not interfere with existing data

## Running Tests

### Run All Tests (Unit + E2E)
```bash
npm test
```

### Run Only Unit Tests
```bash
npm test server/routes.test.ts
```

### Run Only E2E Tests
```bash
npm test tests/e2e.test.ts
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with UI
```bash
npm run test:ui
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## Test Structure

### 1. Authentication System (2 tests)
- Password hashing verification
- Invalid password rejection
- Role validation

### 2. Department Management (4 tests)
- Create department
- Retrieve by ID
- Update department
- List all departments

### 3. Major Management (3 tests)
- Create major under department
- Verify department linkage
- List majors by department

### 4. Class Management (3 tests)
- Create class under major
- Verify hierarchy (class → major → department)
- List classes by year/semester

### 5. Subject Management (3 tests)
- Create subject
- Unique code constraint enforcement
- List subjects by department

### 6. User Management (8 tests)
- Create admin user
- Create teacher user with department/class
- Create head user
- Email uniqueness verification
- Retrieve with relationships
- Update user status
- List users by role
- Filter users by department

### 7. Schedule Management (4 tests)
- Create schedule with relationships
- Retrieve complete schedule info
- List schedules by day
- List schedules by teacher
- Update schedule details

### 8. Data Integrity (3 tests)
- User-department referential integrity
- Schedule hierarchy integrity
- Timestamp verification

### 9. Query Performance (4 tests)
- Complex join query performance
- Email format validation
- Time format validation
- Status value validation

### 10. System Statistics (4 tests)
- Count users by role
- Count classes by year
- Generate department summary
- Calculate teacher schedule load

## Test Data

All test data uses the prefix `TEST_` and includes:
- **Departments**: Test Department of Engineering (TENG)
- **Majors**: Bachelor Test Computer Science (BTCS)
- **Classes**: BTCS-2024-A
- **Subjects**: Introduction to Testing (TEST101)
- **Users**: 
  - Test Admin User (test.admin@university.edu)
  - Test Teacher User (test.teacher@university.edu)
  - Test Head User (test.head@university.edu)
- **Schedules**: Monday 09:00-10:30 in Lab-101

## Cleanup

Tests automatically clean up all test data in `afterAll` hook:
```typescript
- Schedules (room = Lab-101/Lab-102)
- Subjects (code = TEST101)
- Classes (name = BTCS-2024-A)
- Majors (short_name = BTCS)
- Departments (short_name = TENG)
- Users (unique_id LIKE 'TEST_%')
```

## Troubleshooting

### Access Denied Error
```
Error: Access denied for user 'root'@'localhost'
```
**Solution**: Set `DB_PASSWORD` environment variable before running tests.

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution**: Ensure MySQL service is running:
```powershell
# Check MySQL service
Get-Service -Name MySQL*

# Start if stopped
Start-Service -Name MySQL80  # Adjust name as needed
```

### Duplicate Entry Errors
```
Error: ER_DUP_ENTRY: Duplicate entry
```
**Solution**: Run cleanup manually:
```sql
DELETE FROM schedules WHERE room IN ('Lab-101', 'Lab-102');
DELETE FROM subjects WHERE code = 'TEST101';
DELETE FROM classes WHERE name = 'BTCS-2024-A';
DELETE FROM majors WHERE short_name = 'BTCS';
DELETE FROM departments WHERE short_name = 'TENG';
DELETE FROM users WHERE unique_id LIKE 'TEST_%';
```

## CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run E2E Tests
  env:
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: npm test
```

## Best Practices

1. **Always run tests before deployment**
2. **Review test output for any skipped tests**
3. **Ensure database is backed up before running**
4. **Don't modify test data constants without updating cleanup**
5. **Add new tests when adding features**

## Test Coverage

Current coverage:
- ✅ All CRUD operations
- ✅ Authentication flows
- ✅ Role-based access scenarios
- ✅ Data relationships and constraints
- ✅ Query performance
- ✅ Data validation

## Future Enhancements

Potential additions:
- [ ] Attendance marking workflows
- [ ] Leave request approval chains
- [ ] API endpoint integration tests
- [ ] File upload/download tests
- [ ] WebSocket real-time updates
- [ ] Performance benchmarking
- [ ] Load testing scenarios
