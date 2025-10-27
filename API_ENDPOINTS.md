# Civic Pulse API Endpoints

## Base URL
**Deployed Service**: `https://svc-01k8kf2fkj3423r7zpm53cfkgz.01k66gywmx8x4r0w31fdjjfekf.lmapp.run`
**Version**: 01k8kf2b3gre3k5my2x4mnrn58 (Sandbox)
**Service Name**: civic-pulse

**Status**: ✅ Running with Regular SQL database (migrated from SmartSQL)

**Database**: `civic-db` (Regular SQL - SQLite)
**Last Updated**: 2025-10-27T18:43:17.551Z
**Modules Converged**: 3/3 ✅
  - ✅ web (01k8kf2qmefsa0fcr1zhnx6z68) - Converged at 2025-10-27T18:43:22.267Z
  - ✅ civic-db (01k8kf2fkj3423r7zpm53cfkh8) - Converged at 2025-10-27T18:43:17.551Z
  - ✅ podcast-audio (01k8kf2fkj3423r7zpm53cfkh7) - Converged at 2025-10-27T18:43:17.551Z

**Service URL Discovery**: Use `raindrop build find` to get service URLs

**Geocodio Integration**: ✅ Active - Representatives populated from Geocodio API

---

## Health Check

### GET /api/health
Check service status and version.

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-10-26T10:00:00.000Z",
  "service": "civic-pulse",
  "version": "0.1.0"
}
```

---

## User Management

### POST /api/users
Create a new user.

**Request Body**:
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "zipCode": "12345",
  "interests": ["healthcare", "education"],
  "emailNotifications": true,
  "audioEnabled": true,
  "audioFrequencies": ["daily", "weekly"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "User created successfully"
}
```

### GET /api/users?email={email}
Get user by email address.

**Query Parameters**:
- `email` (required): User email address

**Response**:
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "name": "John Doe",
  "zip_code": "12345",
  "interests": "[\"healthcare\",\"education\"]",
  "created_at": "2025-10-26T10:00:00.000Z"
}
```

### PUT /api/users/preferences
Update user preferences.

**Request Body**:
```json
{
  "userId": "user_123",
  "interests": ["healthcare", "education", "environment"],
  "emailNotifications": false,
  "audioEnabled": true,
  "audioFrequencies": ["weekly"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

---

## Bills Management

### POST /api/bills
Create a new bill record.

**Request Body**:
```json
{
  "id": "bill_hr1234",
  "congress": 118,
  "billType": "hr",
  "billNumber": 1234,
  "title": "Healthcare Reform Act",
  "summary": "A bill to reform healthcare...",
  "fullText": "Full bill text...",
  "sponsorBioguideId": "S000001",
  "sponsorName": "Sen. John Smith",
  "introducedDate": "2025-01-15",
  "latestActionDate": "2025-10-20",
  "latestActionText": "Referred to committee",
  "status": "introduced",
  "issueCategories": ["healthcare", "social-services"],
  "impactScore": 85,
  "congressGovUrl": "https://congress.gov/bill/118/hr/1234"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Bill created successfully"
}
```

### GET /api/bills?category={category}&limit={limit}
Get recent bills, optionally filtered by category.

**Query Parameters**:
- `category` (optional): Filter by issue category
- `limit` (optional): Number of results (default: 50)

**Response**:
```json
[
  {
    "id": "bill_hr1234",
    "congress": 118,
    "bill_type": "hr",
    "bill_number": 1234,
    "title": "Healthcare Reform Act",
    "issueCategories": ["healthcare", "social-services"],
    "latest_action_date": "2025-10-20"
  }
]
```

---

## Representatives Management

### POST /api/representatives
Create a new representative record.

**Request Body**:
```json
{
  "bioguideId": "S000001",
  "name": "Sen. John Smith",
  "party": "Democratic",
  "chamber": "senate",
  "state": "CA",
  "district": null,
  "imageUrl": "https://example.com/photo.jpg",
  "officeAddress": "123 Capitol Hill, Washington, DC",
  "phone": "202-555-0100",
  "websiteUrl": "https://smith.senate.gov",
  "twitterHandle": "@SenSmith",
  "committees": ["Armed Services", "Finance"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Representative created successfully"
}
```

### GET /api/representatives?state={state}&district={district}
Get representatives by state and district.

**Query Parameters**:
- `state` (required): Two-letter state code (e.g., "CA")
- `district` (optional): District number (for House members)

**Response**:
```json
[
  {
    "bioguide_id": "S000001",
    "name": "Sen. John Smith",
    "party": "Democratic",
    "chamber": "senate",
    "state": "CA",
    "committees": ["Armed Services", "Finance"]
  }
]
```

---

## RSS Articles

### POST /api/rss
Save an RSS article.

**Request Body**:
```json
{
  "id": "article_123",
  "feedId": "the-hill",
  "title": "Congress Passes New Bill",
  "description": "Article summary...",
  "url": "https://thehill.com/article-123",
  "author": "Jane Reporter",
  "publishedAt": "2025-10-26T10:00:00.000Z",
  "imageUrl": "https://example.com/image.jpg",
  "categories": ["politics", "congress"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "RSS article saved successfully"
}
```

### GET /api/rss?feedId={feedId}&limit={limit}
Get RSS articles by feed ID.

**Query Parameters**:
- `feedId` (required): Feed identifier
- `limit` (optional): Number of results (default: 20)

**Response**:
```json
[
  {
    "id": "article_123",
    "feed_id": "the-hill",
    "title": "Congress Passes New Bill",
    "url": "https://thehill.com/article-123",
    "published_at": "2025-10-26T10:00:00.000Z"
  }
]
```

---

## Admin Endpoints

### POST /api/admin/query
Execute a query on a database table (admin only).

**Request Body**:
```json
{
  "table": "users",
  "query": "SELECT * FROM users ORDER BY created_at DESC LIMIT 100"
}
```

**Valid Tables**: users, bills, representatives, user_bills, podcasts, rss_articles, vote_records

**Response**:
```json
{
  "rows": [
    {
      "id": "user_123",
      "email": "user@example.com",
      "created_at": "2025-10-26T10:00:00.000Z"
    }
  ]
}
```

### POST /api/admin/count
Get count of records in a table.

**Request Body**:
```json
{
  "table": "users",
  "query": "SELECT COUNT(*) as count FROM users"
}
```

**Response**:
```json
{
  "count": 42
}
```

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request**:
```json
{
  "error": "Invalid input",
  "message": "Email parameter required"
}
```

**404 Not Found**:
```json
{
  "error": "Not Found",
  "path": "/api/invalid",
  "method": "GET"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal Server Error",
  "message": "Database connection failed"
}
```

---

## Database Schema

### Tables
1. **users** - User profiles and preferences
2. **bills** - Congressional legislation
3. **representatives** - Senators and House members
4. **user_bills** - User bill tracking (many-to-many)
5. **podcasts** - Generated audio briefings
6. **rss_articles** - Cached news articles
7. **vote_records** - Representative voting history

---

## CORS Support

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

---

## Testing

Test the health endpoint:
```bash
curl http://svc-web.01k8ghwja5k2hc91w7k3vheszz.lmapp.run/api/health
```

Create a test user:
```bash
curl -X POST http://svc-web.01k8ghwja5k2hc91w7k3vheszz.lmapp.run/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_user_1",
    "email": "test@example.com",
    "name": "Test User",
    "zipCode": "12345"
  }'
```
