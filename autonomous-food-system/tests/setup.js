/**
 * Jest test setup file
 * Configures global test environment and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.JWT_SECRET = 'test_jwt_secret_key';
process.env.LOG_LEVEL = 'error'; // Reduce logging noise in tests

// Global test utilities
global.testUtils = {
  // Create a sample recipe for testing
  createSampleRecipe: (overrides = {}) => ({
    name: 'Test Recipe',
    description: 'A recipe for testing',
    category: 'main_course',
    cuisine: 'international',
    difficulty: 'medium',
    servings: 4,
    prepTime: 15,
    cookTime: 30,
    ingredients: [
      { name: 'ingredient1', amount: 100, unit: 'g', type: 'vegetable' },
      { name: 'ingredient2', amount: 200, unit: 'ml', type: 'liquid' }
    ],
    instructions: [
      { step: 'Prepare ingredients', timing: 5, action: 'prep' },
      { step: 'Cook ingredients', timing: 20, action: 'cook' },
      { step: 'Serve', timing: 2, action: 'serve' }
    ],
    equipment: ['knife', 'pan', 'plate'],
    tags: ['test', 'sample'],
    ...overrides
  }),

  // Create a sample ingredient for testing
  createSampleIngredient: (overrides = {}) => ({
    name: 'Test Ingredient',
    category: 'vegetable',
    commonUnits: ['g', 'cup'],
    nutritionPer100g: {
      calories: 25,
      protein: 2,
      carbohydrates: 5,
      fat: 0.1,
      fiber: 2,
      sugar: 3,
      sodium: 10
    },
    averageCost: 0.50,
    shelfLife: 7,
    storageConditions: 'refrigerated',
    allergens: [],
    substitutes: ['substitute1', 'substitute2'],
    seasonality: ['summer'],
    sustainability: {
      carbonFootprint: 0.5,
      waterUsage: 100,
      localAvailability: true
    },
    automationData: {
      prepComplexity: 'easy',
      requiredEquipment: ['knife'],
      processingTime: 2
    },
    ...overrides
  }),

  // Create a sample cooking session for testing
  createSampleCookingSession: (overrides = {}) => ({
    recipeId: 'test_recipe_id',
    recipe: global.testUtils.createSampleRecipe(),
    servings: 4,
    modifications: {},
    automationLevel: 'manual',
    notes: 'Test cooking session',
    ...overrides
  }),

  // Wait for a specified amount of time
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate a random string
  randomString: (length = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  // Generate a random number within range
  randomNumber: (min = 0, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Create mock request object
  createMockReq: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    get: jest.fn(),
    ...overrides
  }),

  // Create mock response object
  createMockRes: () => {
    const res = {
      status: jest.fn(),
      json: jest.fn(),
      send: jest.fn(),
      set: jest.fn(),
      cookie: jest.fn(),
      clearCookie: jest.fn()
    };
    
    // Chain methods
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    res.send.mockReturnValue(res);
    res.set.mockReturnValue(res);
    
    return res;
  },

  // Create mock next function
  createMockNext: () => jest.fn(),

  // Validate recipe structure
  validateRecipeStructure: (recipe) => {
    expect(recipe).toHaveProperty('id');
    expect(recipe).toHaveProperty('name');
    expect(recipe).toHaveProperty('ingredients');
    expect(recipe).toHaveProperty('instructions');
    expect(recipe).toHaveProperty('servings');
    expect(recipe.ingredients).toBeInstanceOf(Array);
    expect(recipe.instructions).toBeInstanceOf(Array);
    expect(typeof recipe.servings).toBe('number');
  },

  // Validate ingredient structure
  validateIngredientStructure: (ingredient) => {
    expect(ingredient).toHaveProperty('id');
    expect(ingredient).toHaveProperty('name');
    expect(ingredient).toHaveProperty('category');
    expect(ingredient).toHaveProperty('nutritionPer100g');
    expect(ingredient.nutritionPer100g).toBeInstanceOf(Object);
  },

  // Validate cooking session structure
  validateCookingSessionStructure: (session) => {
    expect(session).toHaveProperty('id');
    expect(session).toHaveProperty('recipeId');
    expect(session).toHaveProperty('status');
    expect(session).toHaveProperty('currentStep');
    expect(typeof session.currentStep).toBe('number');
  },

  // Assert error response structure
  assertErrorResponse: (response, expectedStatus, expectedMessage) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('error');
    if (expectedMessage) {
      expect(response.body.error.message || response.body.message).toContain(expectedMessage);
    }
  },

  // Assert success response structure
  assertSuccessResponse: (response, expectedStatus = 200) => {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toBeDefined();
  }
};

// Global test hooks
beforeAll(async () => {
  // Global setup before all tests
  console.log('🧪 Starting TruMate test suite...');
});

afterAll(async () => {
  // Global cleanup after all tests
  console.log('✅ TruMate test suite completed');
});

beforeEach(() => {
  // Reset any global state before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
  jest.restoreAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in tests, just log the error
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Restore console for specific tests if needed
global.restoreConsole = () => {
  global.console = originalConsole;
};

// Mock Date.now for consistent testing
const mockDate = new Date('2024-01-01T00:00:00.000Z');
global.mockCurrentDate = (date = mockDate) => {
  jest.spyOn(Date, 'now').mockReturnValue(date.getTime());
  jest.spyOn(global, 'Date').mockImplementation(() => date);
};

global.restoreDate = () => {
  jest.restoreAllMocks();
};
