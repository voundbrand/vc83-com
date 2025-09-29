# Cal.com API Location Field Testing

## Problem Statement
Cal.com appears to ignore location selections and always uses the default location configured for the event type. This document tracks our testing to find the correct format.

## Current Behavior
- Default is set to: Zoom
- Any location we send is ignored
- Always creates meetings with the default location

## Test Results

### Test 1: Location in responses as string
```json
{
  "responses": {
    "name": "Test Name",
    "email": "test@example.com",
    "location": "integrations:google:meet"
  }
}
```
**Result**: ❌ Ignored - uses default (Zoom)

### Test 2: Location at top level (legacy)
```json
{
  "location": "integrations:google:meet",
  "responses": {
    "name": "Test Name",
    "email": "test@example.com"
  }
}
```
**Result**: ❌ Error - "Legacy Props: location. They can't be used with `responses`"

### Test 3: Location as object in responses
```json
{
  "responses": {
    "name": "Test Name",
    "email": "test@example.com",
    "location": {
      "value": "integrations:google:meet",
      "optionValue": "integrations:google:meet"
    }
  }
}
```
**Result**: ✅ SUCCESS! This is the correct format!

### Test 4: Different field names
```json
{
  "responses": {
    "name": "Test Name",
    "email": "test@example.com",
    "locationType": "integrations:google:meet"
  }
}
```
**Result**: ❌ [To be tested]

## Cal.com Response Format
When a booking is created, Cal.com returns:
```json
{
  "location": "integrations:zoom",  // Always the default
  "responses": {
    "name": "Test Name",
    "email": "test@example.com",
    "location": {
      "value": "",
      "optionValue": ""
    }
  }
}
```

## Hypothesis
The fact that Cal.com returns an empty location object in responses suggests:
1. We might be sending location in the wrong format
2. Cal.com expects location data but in a different structure
3. The API might require additional fields or authentication for location selection

## Next Steps
1. Check Cal.com's booking form network requests to see exact format
2. Test with different object structures
3. Look for additional fields that might be required
4. Test with event type that has only one location option