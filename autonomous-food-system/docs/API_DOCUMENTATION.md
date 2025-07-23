# TruMate Automation API Documentation

## Overview

The TruMate Automation API provides endpoints for managing recipes, ingredients, cooking sessions, and analytics. This RESTful API is designed to support the autonomous recipe management system with features for automation assessment, optimization, and real-time cooking coordination.

**Base URL:** `http://localhost:3000/api`

**Version:** 0.1.0

## Authentication

Currently, the API does not require authentication. Authentication will be added in future versions.

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "type": "error_type",
    "details": [...],
    "timestamp": "2024-01-01T00:00:00.000Z",
    "requestId": "unique_request_id"
  }
}
```

## Rate Limiting

The API implements rate limiting with the following limits:
- General endpoints: 100 requests per 15 minutes
- Recipe creation: 50 requests per hour
- Cooking processes: 10 requests per 5 minutes
- Search endpoints: 30 requests per minute
- Resource-intensive operations: 20 requests per 15 minutes

Rate limit headers are included in responses:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Remaining requests in current window
- `RateLimit-Reset`: Unix timestamp when the rate limit resets

## Endpoints

### Health Check

#### GET /health
Check API health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "0.1.0",
  "environment": "development"
}
```

### Recipes

#### GET /api/recipes
List all recipes with filtering and pagination.

**Query Parameters:**
- `page` (integer, default: 1): Page number
- `limit` (integer, default: 20, max: 100): Items per page
- `category` (string): Filter by recipe category
- `cuisine` (string): Filter by cuisine type
- `difficulty` (string): Filter by difficulty (easy, medium, hard)
- `maxTime` (integer): Maximum total time in minutes
- `search` (string): Search in name, description, and tags
- `sortBy` (string, default: 'name'): Sort field
- `sortOrder` (string, default: 'asc'): Sort order (asc, desc)

**Response:**
```json
{
  "recipes": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  },
  "filters": { ... }
}
```

#### GET /api/recipes/:id
Get a specific recipe by ID.

**Response:**
```json
{
  "id": "recipe_123",
  "name": "Pasta Carbonara",
  "description": "Classic Italian pasta dish",
  "category": "pasta",
  "cuisine": "italian",
  "difficulty": "medium",
  "servings": 4,
  "prepTime": 10,
  "cookTime": 15,
  "totalTime": 25,
  "ingredients": [...],
  "instructions": [...],
  "equipment": [...],
  "nutrition": { ... },
  "automation": { ... },
  "analytics": { ... },
  "tags": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### POST /api/recipes
Create a new recipe.

**Request Body:**
```json
{
  "name": "Recipe Name",
  "description": "Recipe description",
  "category": "main_course",
  "cuisine": "italian",
  "difficulty": "medium",
  "servings": 4,
  "prepTime": 15,
  "cookTime": 30,
  "ingredients": [
    {
      "name": "pasta",
      "amount": 400,
      "unit": "g",
      "type": "grain"
    }
  ],
  "instructions": [
    {
      "step": "Boil water",
      "timing": 5,
      "temperature": 100,
      "action": "boil"
    }
  ],
  "equipment": ["large_pot"],
  "tags": ["quick", "easy"]
}
```

#### PUT /api/recipes/:id
Update an existing recipe.

#### DELETE /api/recipes/:id
Delete a recipe.

#### POST /api/recipes/:id/scale
Scale recipe servings.

**Request Body:**
```json
{
  "servings": 8
}
```

#### POST /api/recipes/:id/optimize
Optimize recipe based on criteria.

**Request Body:**
```json
{
  "nutrition": {
    "targetCalories": 500,
    "maxSodium": 1000
  },
  "cost": {
    "maxBudget": 10.00
  },
  "time": {
    "maxTotalTime": 30
  },
  "wasteReduction": {
    "minimizeLeftovers": true
  }
}
```

#### GET /api/recipes/:id/automation
Get automation assessment for a recipe.

### Ingredients

#### GET /api/ingredients
List all ingredients with filtering.

**Query Parameters:**
- `page`, `limit`: Pagination
- `category` (string): Filter by ingredient category
- `search` (string): Search ingredient names
- `allergenFree` (string): Comma-separated list of allergens to exclude
- `sortBy`, `sortOrder`: Sorting options

#### GET /api/ingredients/:id
Get specific ingredient details.

#### POST /api/ingredients/:id/nutrition
Calculate nutrition for specific amount.

**Request Body:**
```json
{
  "amount": 100,
  "unit": "g"
}
```

#### GET /api/ingredients/:id/substitutes
Get ingredient substitutes.

**Query Parameters:**
- `allergenFree` (string): Comma-separated allergens to avoid

#### GET /api/ingredients/meta/categories
Get all ingredient categories.

#### GET /api/ingredients/search/advanced
Advanced ingredient search with multiple filters.

### Cooking Sessions

#### GET /api/cooking/sessions
List all cooking sessions.

#### POST /api/cooking/start
Start a new cooking session.

**Request Body:**
```json
{
  "recipeId": "recipe_123",
  "servings": 4,
  "modifications": {
    "ingredientSubstitutions": [...],
    "instructionModifications": [...],
    "timingAdjustments": { ... }
  },
  "automationLevel": "semi_automated",
  "notes": "Session notes"
}
```

#### GET /api/cooking/:sessionId
Get cooking session status.

#### POST /api/cooking/:sessionId/next
Advance to next cooking step.

#### POST /api/cooking/:sessionId/pause
Pause cooking session.

#### POST /api/cooking/:sessionId/resume
Resume paused cooking session.

#### POST /api/cooking/:sessionId/abort
Abort cooking session.

**Request Body:**
```json
{
  "reason": "User cancelled"
}
```

#### POST /api/cooking/:sessionId/sensor
Add sensor data to cooking session.

**Request Body:**
```json
{
  "sensorType": "temperature",
  "value": 75.5
}
```

### Analytics

#### GET /api/analytics/dashboard
Get main analytics dashboard data.

#### GET /api/analytics/recipes
Get recipe analytics.

**Query Parameters:**
- `recipeId` (string): Get analytics for specific recipe
- `limit` (integer): Limit number of results
- `sortBy` (string): Sort field

#### GET /api/analytics/system
Get system performance metrics.

**Query Parameters:**
- `metric` (string): Filter by specific metric
- `days` (integer, default: 7): Number of days to include

#### GET /api/analytics/automation
Get automation performance analytics.

#### POST /api/analytics/record
Record custom analytics event.

**Request Body:**
```json
{
  "type": "recipe_usage",
  "data": {
    "recipeId": "recipe_123",
    "recipeName": "Test Recipe",
    "sessionData": { ... }
  }
}
```

#### GET /api/analytics/trends
Get trend analysis.

**Query Parameters:**
- `period` (string, default: 'week'): Analysis period
- `metric` (string, default: 'usage'): Metric to analyze

## Error Codes

| Code | Description |
|------|-------------|
| `BAD_REQUEST` | Invalid request data |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Access denied |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource conflict |
| `UNPROCESSABLE_ENTITY` | Validation failed |
| `TOO_MANY_REQUESTS` | Rate limit exceeded |
| `INTERNAL_SERVER_ERROR` | Server error |

## Data Models

### Recipe
- `id` (string): Unique identifier
- `name` (string): Recipe name
- `description` (string): Recipe description
- `category` (string): Recipe category
- `cuisine` (string): Cuisine type
- `difficulty` (string): Difficulty level
- `servings` (number): Number of servings
- `prepTime` (number): Preparation time in minutes
- `cookTime` (number): Cooking time in minutes
- `totalTime` (number): Total time in minutes
- `ingredients` (array): List of ingredients
- `instructions` (array): Cooking instructions
- `equipment` (array): Required equipment
- `nutrition` (object): Nutritional information
- `automation` (object): Automation assessment
- `analytics` (object): Usage analytics
- `tags` (array): Recipe tags

### Ingredient
- `id` (string): Unique identifier
- `name` (string): Ingredient name
- `category` (string): Ingredient category
- `commonUnits` (array): Common measurement units
- `nutritionPer100g` (object): Nutrition per 100g
- `averageCost` (number): Average cost per 100g
- `shelfLife` (number): Shelf life in days
- `allergens` (array): Associated allergens
- `substitutes` (array): Possible substitutes
- `sustainability` (object): Environmental impact data

### Cooking Session
- `id` (string): Unique session identifier
- `recipeId` (string): Associated recipe ID
- `status` (string): Session status
- `currentStep` (number): Current instruction step
- `startTime` (datetime): Session start time
- `endTime` (datetime): Session end time
- `stepTimings` (array): Timing data for each step
- `sensorData` (array): Collected sensor readings
- `qualityMetrics` (object): Quality measurements

## SDK and Client Libraries

Client libraries will be available for:
- JavaScript/Node.js
- Python
- React/Frontend integration

## Changelog

### Version 0.1.0
- Initial API release
- Recipe management endpoints
- Ingredient database
- Cooking session management
- Basic analytics
- Automation assessment
