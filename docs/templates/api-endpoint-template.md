# API Endpoint: [Endpoint Adı]

## [HTTP Method] /api/[endpoint-path]

**Amaç:** [Bu endpoint ne yapar?]  
**Auth:** [Required / Optional / None]  
**Rate Limit:** [örn. 100 requests/minute per user]  
**Minimum Plan:** [Free / Basic / Pro / Enterprise]

---

## Request

### Headers
```http
Authorization: Bearer <token>
Content-Type: application/json
```

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | [Açıklama] |

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Sayfa numarası |
| `limit` | Integer | No | 10 | Sayfa başına kayıt |
| `filter` | String | No | - | Filtreleme kriteri |

### Request Body
```json
{
  "field1": "string",
  "field2": 123,
  "field3": {
    "nestedField": "value"
  },
  "field4": ["array", "values"]
}
```

**Field Descriptions:**
- `field1` (string, required): [Açıklama]
- `field2` (integer, optional): [Açıklama]
- `field3` (object, optional): [Açıklama]
- `field4` (array, optional): [Açıklama]

---

## Response

### Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "field1": "value",
    "field2": 123,
    "createdAt": "2025-12-05T10:00:00Z"
  },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

### Success Response (201 Created)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "message": "Resource created successfully"
  }
}
```

### Success Response (204 No Content)
```
[Empty body]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field1": "Field is required",
      "field2": "Must be a positive integer"
    }
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "You don't have permission to access this resource"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 60
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

---

## Examples

### cURL Example
```bash
curl -X POST https://api.lingroot.com/api/endpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value",
    "field2": 123
  }'
```

### JavaScript (Axios) Example
```javascript
import axios from 'axios';

const response = await axios.post('/api/endpoint', {
  field1: 'value',
  field2: 123
}, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

console.log(response.data);
```

### Python Example
```python
import requests

url = "https://api.lingroot.com/api/endpoint"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
data = {
    "field1": "value",
    "field2": 123
}

response = requests.post(url, json=data, headers=headers)
print(response.json())
```

---

## Implementation Details

### Controller
**File:** `backend/controllers/[controller].js`

```javascript
async function handleEndpoint(req, res) {
  try {
    // Implementation
  } catch (error) {
    // Error handling
  }
}
```

### Route
**File:** `backend/routes/[route].js`

```javascript
router.post('/endpoint', authMiddleware, validate, controller.handleEndpoint);
```

### Validation
**File:** `backend/middleware/validation.js`

```javascript
const schema = Joi.object({
  field1: Joi.string().required(),
  field2: Joi.number().integer().positive()
});
```

---

## Notes

### Performance Considerations
- [Caching stratejisi]
- [Database query optimizasyonu]
- [Rate limiting detayları]

### Security Considerations
- [Input validation]
- [SQL injection önleme]
- [XSS önleme]

### Breaking Changes
- **v2.0.0:** [Değişiklik açıklaması]
- **v1.5.0:** [Değişiklik açıklaması]

---

## Related Endpoints
- `GET /api/related-endpoint` - [Açıklama]
- `PUT /api/related-endpoint/:id` - [Açıklama]

## Related Documentation
- [Feature Documentation](../features/feature-name.md)
- [Database Schema](../database/schema-overview.md)

---

**Last Updated:** [YYYY-MM-DD]  
**Version:** [API version]
