const Recipe = require('../../src/backend/models/Recipe');

describe('Recipe Model', () => {
  let sampleRecipeData;

  beforeEach(() => {
    sampleRecipeData = {
      name: 'Test Recipe',
      description: 'A test recipe for unit testing',
      category: 'main_course',
      cuisine: 'italian',
      difficulty: 'medium',
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      ingredients: [
        { name: 'pasta', amount: 400, unit: 'g', type: 'grain' },
        { name: 'tomato sauce', amount: 200, unit: 'ml', type: 'sauce' }
      ],
      instructions: [
        { step: 'Boil water', timing: 5, action: 'boil' },
        { step: 'Cook pasta', timing: 10, action: 'cook' },
        { step: 'Add sauce', timing: 2, action: 'mix' }
      ],
      equipment: ['large_pot', 'wooden_spoon'],
      tags: ['quick', 'easy', 'italian']
    };
  });

  describe('Constructor', () => {
    test('should create a recipe with provided data', () => {
      const recipe = new Recipe(sampleRecipeData);
      
      expect(recipe.name).toBe('Test Recipe');
      expect(recipe.servings).toBe(4);
      expect(recipe.ingredients).toHaveLength(2);
      expect(recipe.instructions).toHaveLength(3);
      expect(recipe.totalTime).toBe(45); // prepTime + cookTime
    });

    test('should generate an ID if not provided', () => {
      const recipe = new Recipe(sampleRecipeData);
      
      expect(recipe.id).toBeDefined();
      expect(recipe.id).toMatch(/^recipe_\d+_[a-z0-9]+$/);
    });

    test('should set default values for optional fields', () => {
      const minimalData = {
        name: 'Minimal Recipe',
        servings: 2,
        ingredients: [{ name: 'test', amount: 1, unit: 'cup' }],
        instructions: [{ step: 'test step' }]
      };
      
      const recipe = new Recipe(minimalData);
      
      expect(recipe.category).toBe('general');
      expect(recipe.cuisine).toBe('international');
      expect(recipe.difficulty).toBe('medium');
      expect(recipe.tags).toEqual([]);
      expect(recipe.source).toBe('user');
    });
  });

  describe('Validation', () => {
    test('should validate a correct recipe', () => {
      const recipe = new Recipe(sampleRecipeData);
      const validation = recipe.validate();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should fail validation for missing name', () => {
      const invalidData = { ...sampleRecipeData, name: '' };
      const recipe = new Recipe(invalidData);
      const validation = recipe.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Recipe name is required');
    });

    test('should fail validation for empty ingredients', () => {
      const invalidData = { ...sampleRecipeData, ingredients: [] };
      const recipe = new Recipe(invalidData);
      const validation = recipe.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least one ingredient is required');
    });

    test('should fail validation for empty instructions', () => {
      const invalidData = { ...sampleRecipeData, instructions: [] };
      const recipe = new Recipe(invalidData);
      const validation = recipe.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least one instruction is required');
    });

    test('should fail validation for invalid servings', () => {
      const invalidData = { ...sampleRecipeData, servings: 0 };
      const recipe = new Recipe(invalidData);
      const validation = recipe.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Servings must be greater than 0');
    });

    test('should fail validation for ingredients without required fields', () => {
      const invalidData = {
        ...sampleRecipeData,
        ingredients: [{ name: '', amount: 0, unit: '' }]
      };
      const recipe = new Recipe(invalidData);
      const validation = recipe.validate();
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Ingredient 1 must have a name');
      expect(validation.errors).toContain('Ingredient 1 must have a valid amount');
      expect(validation.errors).toContain('Ingredient 1 must have a unit');
    });
  });

  describe('Scaling', () => {
    test('should scale recipe servings correctly', () => {
      const recipe = new Recipe(sampleRecipeData);
      const originalPastaAmount = recipe.ingredients[0].amount;
      
      recipe.scaleServings(8); // Double the servings
      
      expect(recipe.servings).toBe(8);
      expect(recipe.ingredients[0].amount).toBe(originalPastaAmount * 2);
    });

    test('should scale nutrition values when scaling servings', () => {
      const recipeWithNutrition = {
        ...sampleRecipeData,
        nutrition: {
          calories: 400,
          protein: 20,
          carbohydrates: 60,
          fat: 10
        }
      };
      
      const recipe = new Recipe(recipeWithNutrition);
      recipe.scaleServings(2); // Half the servings
      
      expect(recipe.nutrition.calories).toBe(200);
      expect(recipe.nutrition.protein).toBe(10);
      expect(recipe.nutrition.carbohydrates).toBe(30);
      expect(recipe.nutrition.fat).toBe(5);
    });

    test('should throw error for invalid servings', () => {
      const recipe = new Recipe(sampleRecipeData);
      
      expect(() => recipe.scaleServings(0)).toThrow('Servings must be greater than 0');
      expect(() => recipe.scaleServings(-1)).toThrow('Servings must be greater than 0');
    });
  });

  describe('Optimization', () => {
    test('should perform optimization with criteria', () => {
      const recipe = new Recipe(sampleRecipeData);
      const criteria = {
        nutrition: { targetCalories: 500 },
        time: { maxTotalTime: 30 }
      };
      
      const optimization = recipe.optimize(criteria);
      
      expect(optimization).toBeDefined();
      expect(optimization.timestamp).toBeInstanceOf(Date);
      expect(optimization.criteria).toEqual(criteria);
      expect(optimization.changes).toBeInstanceOf(Array);
      expect(recipe.analytics.lastOptimized).toBeInstanceOf(Date);
    });

    test('should record optimization in history', () => {
      const recipe = new Recipe(sampleRecipeData);
      const initialHistoryLength = recipe.analytics.optimizationHistory.length;
      
      recipe.optimize({ nutrition: { targetCalories: 400 } });
      
      expect(recipe.analytics.optimizationHistory).toHaveLength(initialHistoryLength + 1);
    });
  });

  describe('Automation Assessment', () => {
    test('should assess automation potential', () => {
      const recipe = new Recipe(sampleRecipeData);
      const automation = recipe.assessAutomation();
      
      expect(automation).toBeDefined();
      expect(automation.automatable).toBeDefined();
      expect(automation.complexity).toBeDefined();
      expect(automation.requiredSensors).toBeInstanceOf(Array);
      expect(automation.safetyChecks).toBeInstanceOf(Array);
      expect(automation.qualityMetrics).toBeInstanceOf(Array);
    });

    test('should identify required sensors based on instructions', () => {
      const recipeWithTemperature = {
        ...sampleRecipeData,
        instructions: [
          { step: 'Heat oil to 180°C', temperature: 180, action: 'heat' },
          { step: 'Mix ingredients', action: 'mix' }
        ]
      };
      
      const recipe = new Recipe(recipeWithTemperature);
      const automation = recipe.assessAutomation();
      
      expect(automation.requiredSensors).toContain('temperature');
      expect(automation.safetyChecks).toContain('temperature_monitoring');
    });

    test('should determine automation complexity', () => {
      const simpleRecipe = {
        ...sampleRecipeData,
        instructions: [{ step: 'Mix ingredients', action: 'mix' }]
      };
      
      const recipe = new Recipe(simpleRecipe);
      const automation = recipe.assessAutomation();
      
      expect(['manual', 'assisted', 'semi_automated', 'fully_automated'])
        .toContain(automation.complexity);
    });
  });

  describe('JSON Serialization', () => {
    test('should serialize to JSON correctly', () => {
      const recipe = new Recipe(sampleRecipeData);
      const json = recipe.toJSON();
      
      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'Test Recipe');
      expect(json).toHaveProperty('ingredients');
      expect(json).toHaveProperty('instructions');
      expect(json.createdAt).toBeInstanceOf(Date);
    });

    test('should deserialize from JSON correctly', () => {
      const originalRecipe = new Recipe(sampleRecipeData);
      const json = originalRecipe.toJSON();
      const deserializedRecipe = Recipe.fromJSON(json);
      
      expect(deserializedRecipe.name).toBe(originalRecipe.name);
      expect(deserializedRecipe.servings).toBe(originalRecipe.servings);
      expect(deserializedRecipe.ingredients).toEqual(originalRecipe.ingredients);
      expect(deserializedRecipe.instructions).toEqual(originalRecipe.instructions);
    });
  });

  describe('Edge Cases', () => {
    test('should handle recipe with no timing information', () => {
      const recipeWithoutTiming = {
        ...sampleRecipeData,
        prepTime: 0,
        cookTime: 0,
        instructions: [
          { step: 'Mix ingredients' },
          { step: 'Serve immediately' }
        ]
      };
      
      const recipe = new Recipe(recipeWithoutTiming);
      
      expect(recipe.totalTime).toBe(0);
      expect(recipe.validate().isValid).toBe(true);
    });

    test('should handle recipe with complex ingredient types', () => {
      const complexRecipe = {
        ...sampleRecipeData,
        ingredients: [
          { name: 'flour', amount: 2, unit: 'cups', type: 'grain', optional: false },
          { name: 'vanilla extract', amount: 1, unit: 'tsp', type: 'other', optional: true },
          { name: 'eggs', amount: 3, unit: 'large', type: 'protein', substitutes: ['egg substitute'] }
        ]
      };
      
      const recipe = new Recipe(complexRecipe);
      const validation = recipe.validate();
      
      expect(validation.isValid).toBe(true);
      expect(recipe.ingredients[1].optional).toBe(true);
      expect(recipe.ingredients[2].substitutes).toContain('egg substitute');
    });
  });
});
