# Customer Authentication API

## Overview

This document describes how to implement user authentication in external applications (mobile apps, third-party integrations) that need to create **customer accounts** in the L4YERCAK3 platform.

## Key Concepts

### Platform Users vs Customer Users

| Type | Table | Purpose | Created By |
|------|-------|---------|------------|
| **Platform User** | `users` | Staff, admins, organization owners | `/api/v1/auth/sign-up` |
| **Customer User** | `objects` (frontend_user) | End customers of your apps | `/api/v1/auth/customer/*` |

**Important:** External apps should use the **Customer Auth API** (`/api/v1/auth/customer/*`), NOT the platform auth endpoints.

### What Happens When a Customer Signs Up

1. **frontend_user** created in `objects` table (customer authentication account)
2. **crm_contact** created/updated (CRM record for sales & support)
3. **objectLinks** created to link them together
4. **frontendSession** created (30-day session)

All records are created under **your organization** (determined by API key).

---

## Authentication

### API Key Required

All customer auth endpoints require an API key in the Authorization header:

```
Authorization: Bearer sk_live_YOUR_API_KEY
```

The API key determines which organization the customer belongs to.

### Getting an API Key

1. Log into the L4YERCAK3 platform
2. Go to **Settings > API Keys**
3. Create a new API key with appropriate scopes
4. Store securely in your app (use environment variables, not hardcoded)

---

## Endpoints

### Base URL
```
https://agreeable-lion-828.convex.site
```

### POST /api/v1/auth/customer/sign-up

Create a new customer account with email/password.

**Request:**
```bash
curl -X POST "https://agreeable-lion-828.convex.site/api/v1/auth/customer/sign-up" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \
  -d '{
    "email": "customer@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "frontendUserId": "jh7ab38bqp4vnea07997qcv91t9803xyz",
  "contactId": "mh7b38bqp4vnea07997qcv91t9803abc",
  "email": "customer@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "organizationId": "ks79br83wjtkexcmzgmntp67gs803djt",
  "expiresAt": 1737123456789,
  "isNewUser": true,
  "user": {
    "id": "jh7ab38bqp4vnea07997qcv91t9803xyz",
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "displayName": "John Doe",
    "isPasswordSet": true,
    "status": "active",
    "contactId": "mh7b38bqp4vnea07997qcv91t9803abc"
  }
}
```

**Error Responses:**
- `400` - Invalid input (missing fields, weak password)
- `401` - Invalid/missing API key
- `409` - Account already exists with this email

**Password Requirements:**
- Minimum 8 characters
- Maximum 128 characters
- Must contain at least one letter
- Must contain at least one number

---

### POST /api/v1/auth/customer/sign-in

Log in an existing customer.

**Request:**
```bash
curl -X POST "https://agreeable-lion-828.convex.site/api/v1/auth/customer/sign-in" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \
  -d '{
    "email": "customer@example.com",
    "password": "SecurePass123"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "frontendUserId": "jh7ab38bqp4vnea07997qcv91t9803xyz",
  "contactId": "mh7b38bqp4vnea07997qcv91t9803abc",
  "email": "customer@example.com",
  "organizationId": "ks79br83wjtkexcmzgmntp67gs803djt",
  "expiresAt": 1737123456789,
  "isNewUser": false,
  "user": { ... }
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials or account uses social login

---

### POST /api/v1/auth/customer/sign-out

Log out a customer (invalidate session).

**Request:**
```bash
curl -X POST "https://agreeable-lion-828.convex.site/api/v1/auth/customer/sign-out" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \
  -d '{
    "sessionId": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Response (200 OK):**
```json
{
  "success": true
}
```

---

### POST /api/v1/auth/customer/oauth

Authenticate via Google or Apple OAuth (for native mobile apps).

**Request:**
```bash
curl -X POST "https://agreeable-lion-828.convex.site/api/v1/auth/customer/oauth" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_live_YOUR_API_KEY" \
  -d '{
    "provider": "google",
    "email": "customer@gmail.com",
    "name": "John Doe",
    "providerUserId": "google-unique-id-12345",
    "idToken": "eyJhbGciOiJSUzI1NiIs..."
  }'
```

**Parameters:**
| Field | Required | Description |
|-------|----------|-------------|
| `provider` | Yes | `"google"` or `"apple"` |
| `email` | Yes | User's email from OAuth provider |
| `providerUserId` | Yes | Unique ID from OAuth provider |
| `name` | No | User's display name |
| `idToken` | Recommended | ID token for server-side verification |

**Response (200 OK for existing, 201 Created for new):**
```json
{
  "success": true,
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "frontendUserId": "jh7ab38bqp4vnea07997qcv91t9803xyz",
  "contactId": "mh7b38bqp4vnea07997qcv91t9803abc",
  "email": "customer@gmail.com",
  "firstName": "John",
  "lastName": "Doe",
  "organizationId": "ks79br83wjtkexcmzgmntp67gs803djt",
  "expiresAt": 1737123456789,
  "isNewUser": true,
  "user": { ... }
}
```

---

## iOS Implementation (Swift)

### AuthService.swift

```swift
import Foundation

class AuthService {
    static let shared = AuthService()

    private let baseURL = "https://agreeable-lion-828.convex.site"
    private let apiKey = ProcessInfo.processInfo.environment["L4YERCAK3_API_KEY"] ?? ""

    // MARK: - Sign Up

    func signUp(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/api/v1/auth/customer/sign-up")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "email": email,
            "password": password,
            "firstName": firstName,
            "lastName": lastName
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AuthError.invalidResponse
        }

        let decoded = try JSONDecoder().decode(AuthResponse.self, from: data)

        if !decoded.success {
            throw AuthError.serverError(decoded.error ?? "Unknown error")
        }

        // Store session
        UserDefaults.standard.set(decoded.sessionId, forKey: "sessionId")
        UserDefaults.standard.set(decoded.frontendUserId, forKey: "frontendUserId")

        return decoded
    }

    // MARK: - Sign In

    func signIn(email: String, password: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/api/v1/auth/customer/sign-in")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "email": email,
            "password": password
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let decoded = try JSONDecoder().decode(AuthResponse.self, from: data)

        if !decoded.success {
            throw AuthError.serverError(decoded.error ?? "Invalid credentials")
        }

        // Store session
        UserDefaults.standard.set(decoded.sessionId, forKey: "sessionId")
        UserDefaults.standard.set(decoded.frontendUserId, forKey: "frontendUserId")

        return decoded
    }

    // MARK: - Sign Out

    func signOut() async throws {
        guard let sessionId = UserDefaults.standard.string(forKey: "sessionId") else {
            return
        }

        let url = URL(string: "\(baseURL)/api/v1/auth/customer/sign-out")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        let body = ["sessionId": sessionId]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        _ = try await URLSession.shared.data(for: request)

        // Clear local session
        UserDefaults.standard.removeObject(forKey: "sessionId")
        UserDefaults.standard.removeObject(forKey: "frontendUserId")
    }

    // MARK: - Google Sign In

    func signInWithGoogle(idToken: String, email: String, name: String, userId: String) async throws -> AuthResponse {
        let url = URL(string: "\(baseURL)/api/v1/auth/customer/oauth")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "provider": "google",
            "email": email,
            "name": name,
            "providerUserId": userId,
            "idToken": idToken
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, _) = try await URLSession.shared.data(for: request)
        let decoded = try JSONDecoder().decode(AuthResponse.self, from: data)

        if !decoded.success {
            throw AuthError.serverError(decoded.error ?? "OAuth failed")
        }

        UserDefaults.standard.set(decoded.sessionId, forKey: "sessionId")
        UserDefaults.standard.set(decoded.frontendUserId, forKey: "frontendUserId")

        return decoded
    }
}

// MARK: - Models

struct AuthResponse: Codable {
    let success: Bool
    let sessionId: String?
    let frontendUserId: String?
    let contactId: String?
    let email: String?
    let firstName: String?
    let lastName: String?
    let organizationId: String?
    let expiresAt: Int?
    let isNewUser: Bool?
    let error: String?
}

enum AuthError: Error {
    case invalidResponse
    case serverError(String)
}
```

---

## Android Implementation (Kotlin)

```kotlin
class AuthService(private val apiKey: String) {
    private val baseUrl = "https://agreeable-lion-828.convex.site"
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun signUp(
        email: String,
        password: String,
        firstName: String,
        lastName: String
    ): AuthResponse {
        val body = buildJsonObject {
            put("email", email)
            put("password", password)
            put("firstName", firstName)
            put("lastName", lastName)
        }

        return post("/api/v1/auth/customer/sign-up", body)
    }

    suspend fun signIn(email: String, password: String): AuthResponse {
        val body = buildJsonObject {
            put("email", email)
            put("password", password)
        }

        return post("/api/v1/auth/customer/sign-in", body)
    }

    suspend fun signInWithOAuth(
        provider: String,
        email: String,
        name: String,
        providerUserId: String,
        idToken: String?
    ): AuthResponse {
        val body = buildJsonObject {
            put("provider", provider)
            put("email", email)
            put("name", name)
            put("providerUserId", providerUserId)
            idToken?.let { put("idToken", it) }
        }

        return post("/api/v1/auth/customer/oauth", body)
    }

    private suspend fun post(path: String, body: JsonObject): AuthResponse {
        val request = Request.Builder()
            .url("$baseUrl$path")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
            .header("Authorization", "Bearer $apiKey")
            .build()

        return withContext(Dispatchers.IO) {
            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string() ?: throw Exception("Empty response")
                json.decodeFromString<AuthResponse>(responseBody)
            }
        }
    }
}

@Serializable
data class AuthResponse(
    val success: Boolean,
    val sessionId: String? = null,
    val frontendUserId: String? = null,
    val contactId: String? = null,
    val email: String? = null,
    val error: String? = null
)
```

---

## Session Management

### Session Duration
- Sessions expire after **30 days**
- The `expiresAt` field in the response indicates expiration timestamp

### Refreshing Sessions
Currently, sessions cannot be refreshed. When a session expires, the user must sign in again.

### Validating Sessions
To check if a session is still valid, attempt an authenticated API call. If you receive a 401, prompt for re-authentication.

---

## CRM Integration

When a customer signs up:

1. **CRM Contact** is automatically created with:
   - Email, first name, last name
   - `source: "atheon_app"`
   - `tags: ["atheon", "mobile-signup"]`
   - `subtype: "lead"`

2. **Contact is linked** to the frontend_user via `authenticates_as` relationship

3. **Contact ID** is returned in the response (`contactId` field)

This means all your mobile app users automatically appear in your CRM for follow-up, sales, and support.

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Human-readable error message"
}
```

### Common Errors

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "Email is required" | Missing email field |
| 400 | "Password must be at least 8 characters" | Weak password |
| 401 | "Missing Authorization header" | No API key provided |
| 401 | "Invalid API key" | Wrong or revoked API key |
| 401 | "Invalid email or password" | Wrong credentials |
| 409 | "An account with this email already exists" | Duplicate signup |

---

## Security Best Practices

1. **Never hardcode API keys** - Use environment variables or secure storage
2. **Use HTTPS only** - All endpoints require HTTPS
3. **Store sessions securely** - Use Keychain (iOS) or EncryptedSharedPreferences (Android)
4. **Validate ID tokens** - Always pass `idToken` for OAuth to enable server-side verification
5. **Handle token expiration** - Check `expiresAt` and prompt re-auth when needed

---

## Migration from Platform Auth

If your app was previously using `/api/v1/auth/sign-up` or `/api/v1/auth/mobile-oauth`:

1. Update endpoint URLs to `/api/v1/auth/customer/*`
2. Add API key to Authorization header
3. Update response handling for new fields (`frontendUserId`, `contactId`)
4. Existing platform users created during testing can be ignored or deleted from dashboard

---

## Support

For questions or issues:
- Check the API response error messages
- Review Convex dashboard logs
- Contact the platform team
