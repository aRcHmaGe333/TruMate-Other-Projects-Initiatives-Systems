const Joi = require('joi');
const { RecipeValidationError } = require('./errorHandler');

// Ingredient validation schema
const ingredientSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  amount: Joi.number().positive().required(),
  unit: Joi.string().required().valid(
    'g', 'kg', 'ml', 'l', 'cup', 'cups', 'tbsp', 'tsp', 'oz', 'lb',
    'piece', 'pieces', 'slice', 'slices', 'clove', 'cloves',
    'large', 'medium', 'small', 'whole', 'half', 'quarter'
  ),
  type: Joi.string().optional().valid(
    'protein', 'vegetable', 'fruit', 'grain', 'dairy', 'spice', 'herb',
    'oil', 'sauce', 'condiment', 'pasta', 'meat', 'seafood', 'nuts',
    'seeds', 'legumes', 'other'
  ),
  optional: Joi.boolean().default(false),
  substitutes: Joi.array().items(Joi.string()).optional()
});

// Instruction validation schema
const instructionSchema = Joi.object({
  step: Joi.string().required().min(5).max(500),
  timing: Joi.number().positive().optional(), // minutes
  temperature: Joi.number().min(-20).max(300).optional(), // Celsius
  action: Joi.string().optional().valid(
    'prep', 'chop', 'dice', 'slice', 'mince', 'grate', 'mix', 'stir',
    'whisk', 'beat', 'fold', 'knead', 'roll', 'cut', 'season',
    'heat', 'boil', 'simmer', 'fry', 'saute', 'roast', 'bake',
    'grill', 'steam', 'poach', 'braise', 'stew', 'marinate',
    'rest', 'cool', 'chill', 'freeze', 'serve', 'garnish',
    'combine', 'separate', 'strain', 'blend', 'puree', 'emulsify'
  ),
  equipment: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().max(200).optional(),
  automatable: Joi.boolean().default(false),
  safetyNotes: Joi.string().max(200).optional()
});

// Equipment validation schema
const equipmentSchema = Joi.array().items(
  Joi.string().valid(
    'knife', 'cutting_board', 'mixing_bowl', 'whisk', 'spatula',
    'wooden_spoon', 'measuring_cups', 'measuring_spoons',
    'large_pot', 'medium_pot', 'small_pot', 'frying_pan', 'saute_pan',
    'baking_sheet', 'baking_dish', 'roasting_pan', 'casserole_dish',
    'blender', 'food_processor', 'mixer', 'grater', 'peeler',
    'can_opener', 'colander', 'strainer', 'tongs', 'ladle',
    'oven', 'stovetop', 'microwave', 'grill', 'steamer',
    'thermometer', 'timer', 'scale', 'mortar_pestle'
  )
);

// Nutrition validation schema
const nutritionSchema = Joi.object({
  calories: Joi.number().min(0).default(0),
  protein: Joi.number().min(0).default(0), // grams
  carbohydrates: Joi.number().min(0).default(0), // grams
  fat: Joi.number().min(0).default(0), // grams
  fiber: Joi.number().min(0).default(0), // grams
  sugar: Joi.number().min(0).default(0), // grams
  sodium: Joi.number().min(0).default(0), // mg
  cholesterol: Joi.number().min(0).optional(), // mg
  saturatedFat: Joi.number().min(0).optional(), // grams
  transFat: Joi.number().min(0).optional(), // grams
  vitaminA: Joi.number().min(0).optional(), // IU
  vitaminC: Joi.number().min(0).optional(), // mg
  calcium: Joi.number().min(0).optional(), // mg
  iron: Joi.number().min(0).optional() // mg
});

// Main recipe validation schema
const recipeSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().max(500).default(''),
  category: Joi.string().valid(
    'appetizer', 'soup', 'salad', 'main_course', 'side_dish',
    'dessert', 'beverage', 'breakfast', 'lunch', 'dinner',
    'snack', 'pasta', 'pizza', 'sandwich', 'stir_fry',
    'curry', 'stew', 'casserole', 'baking', 'grilling',
    'vegetarian', 'vegan', 'gluten_free', 'dairy_free',
    'low_carb', 'keto', 'paleo', 'general'
  ).default('general'),
  cuisine: Joi.string().valid(
    'american', 'italian', 'french', 'spanish', 'mexican',
    'chinese', 'japanese', 'korean', 'thai', 'indian',
    'middle_eastern', 'greek', 'mediterranean', 'german',
    'british', 'russian', 'brazilian', 'african',
    'fusion', 'international'
  ).default('international'),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').default('medium'),
  servings: Joi.number().integer().min(1).max(50).required(),
  prepTime: Joi.number().integer().min(0).max(480).default(0), // max 8 hours
  cookTime: Joi.number().integer().min(0).max(720).default(0), // max 12 hours
  totalTime: Joi.number().integer().min(0).optional(),
  ingredients: Joi.array().items(ingredientSchema).min(1).required(),
  instructions: Joi.array().items(instructionSchema).min(1).required(),
  equipment: equipmentSchema.default([]),
  nutrition: nutritionSchema.optional(),
  tags: Joi.array().items(Joi.string().max(30)).max(20).default([]),
  source: Joi.string().max(100).default('user'),
  notes: Joi.string().max(1000).optional(),
  allergens: Joi.array().items(
    Joi.string().valid(
      'dairy', 'eggs', 'fish', 'shellfish', 'tree_nuts',
      'peanuts', 'wheat', 'soy', 'sesame'
    )
  ).optional(),
  dietaryRestrictions: Joi.array().items(
    Joi.string().valid(
      'vegetarian', 'vegan', 'gluten_free', 'dairy_free',
      'nut_free', 'egg_free', 'soy_free', 'low_sodium',
      'low_fat', 'low_carb', 'keto', 'paleo', 'halal', 'kosher'
    )
  ).optional()
});

// Recipe update schema (all fields optional except id)
const recipeUpdateSchema = recipeSchema.fork(
  ['name', 'servings', 'ingredients', 'instructions'],
  (schema) => schema.optional()
);

// Cooking session validation schema
const cookingSessionSchema = Joi.object({
  recipeId: Joi.string().required(),
  servings: Joi.number().integer().min(1).max(50).optional(),
  modifications: Joi.object({
    ingredientSubstitutions: Joi.array().items(
      Joi.object({
        original: Joi.string().required(),
        substitute: Joi.string().required(),
        reason: Joi.string().optional()
      })
    ).optional(),
    instructionModifications: Joi.array().items(
      Joi.object({
        stepIndex: Joi.number().integer().min(0).required(),
        modification: Joi.string().required(),
        reason: Joi.string().optional()
      })
    ).optional(),
    timingAdjustments: Joi.object().pattern(
      Joi.number().integer().min(0),
      Joi.number().integer().min(0)
    ).optional()
  }).optional(),
  automationLevel: Joi.string().valid(
    'manual', 'assisted', 'semi_automated', 'fully_automated'
  ).default('manual'),
  notes: Joi.string().max(500).optional()
});

// Optimization criteria schema
const optimizationSchema = Joi.object({
  nutrition: Joi.object({
    targetCalories: Joi.number().min(0).optional(),
    maxSodium: Joi.number().min(0).optional(),
    minProtein: Joi.number().min(0).optional(),
    maxFat: Joi.number().min(0).optional(),
    maxCarbs: Joi.number().min(0).optional(),
    minFiber: Joi.number().min(0).optional()
  }).optional(),
  cost: Joi.object({
    maxBudget: Joi.number().min(0).optional(),
    preferCheaper: Joi.boolean().default(false)
  }).optional(),
  time: Joi.object({
    maxTotalTime: Joi.number().min(0).optional(),
    maxPrepTime: Joi.number().min(0).optional(),
    maxCookTime: Joi.number().min(0).optional()
  }).optional(),
  wasteReduction: Joi.object({
    minimizeLeftovers: Joi.boolean().default(false),
    useCommonIngredients: Joi.boolean().default(false),
    preferShelfStable: Joi.boolean().default(false)
  }).optional(),
  dietary: Joi.object({
    restrictions: Joi.array().items(Joi.string()).optional(),
    preferences: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// Validation middleware functions
const validateRecipe = (req, res, next) => {
  const { error, value } = recipeSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new RecipeValidationError('Recipe validation failed', details);
  }

  // Calculate total time if not provided
  if (!value.totalTime) {
    value.totalTime = (value.prepTime || 0) + (value.cookTime || 0);
  }

  req.body = value;
  next();
};

const validateRecipeUpdate = (req, res, next) => {
  const { error, value } = recipeUpdateSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new RecipeValidationError('Recipe update validation failed', details);
  }

  req.body = value;
  next();
};

const validateCookingSession = (req, res, next) => {
  const { error, value } = cookingSessionSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new RecipeValidationError('Cooking session validation failed', details);
  }

  req.body = value;
  next();
};

const validateOptimization = (req, res, next) => {
  const { error, value } = optimizationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    throw new RecipeValidationError('Optimization criteria validation failed', details);
  }

  req.body = value;
  next();
};

// Query parameter validation
const validateQueryParams = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return res.status(400).json({
      error: 'Query Parameter Validation Error',
      message: 'Invalid query parameters',
      details
    });
  }

  req.query = value;
  next();
};

// Common query schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

const recipeFilterSchema = paginationSchema.keys({
  category: Joi.string().optional(),
  cuisine: Joi.string().optional(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').optional(),
  maxTime: Joi.number().integer().min(0).optional(),
  search: Joi.string().max(100).optional(),
  tags: Joi.string().optional() // comma-separated tags
});

module.exports = {
  validateRecipe,
  validateRecipeUpdate,
  validateCookingSession,
  validateOptimization,
  validateQueryParams,
  paginationSchema,
  recipeFilterSchema,
  recipeSchema,
  ingredientSchema,
  instructionSchema,
  nutritionSchema
};
