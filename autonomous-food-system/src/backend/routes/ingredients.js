const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// In-memory ingredient database
const ingredients = new Map();

/**
 * Ingredient Class
 * Represents a single ingredient with nutritional and usage data
 */
class Ingredient {
  constructor(data) {
    this.id = data.id || this.generateId();
    this.name = data.name;
    this.category = data.category || 'other';
    this.commonUnits = data.commonUnits || ['g', 'cup'];
    this.nutritionPer100g = data.nutritionPer100g || {};
    this.averageCost = data.averageCost || 0; // per 100g
    this.shelfLife = data.shelfLife || 7; // days
    this.storageConditions = data.storageConditions || 'room_temperature';
    this.allergens = data.allergens || [];
    this.substitutes = data.substitutes || [];
    this.seasonality = data.seasonality || [];
    this.sustainability = data.sustainability || {
      carbonFootprint: 0, // kg CO2 per kg
      waterUsage: 0, // liters per kg
      localAvailability: false
    };
    this.automationData = data.automationData || {
      prepComplexity: 'medium',
      requiredEquipment: [],
      processingTime: 0
    };
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  generateId() {
    return 'ingredient_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Calculate nutrition for specific amount and unit
  calculateNutrition(amount, unit) {
    const gramsAmount = this.convertToGrams(amount, unit);
    const factor = gramsAmount / 100;
    
    const nutrition = {};
    Object.keys(this.nutritionPer100g).forEach(key => {
      nutrition[key] = this.nutritionPer100g[key] * factor;
    });
    
    return nutrition;
  }

  // Convert various units to grams
  convertToGrams(amount, unit) {
    const conversions = {
      'g': 1,
      'kg': 1000,
      'ml': 1, // Approximate for most ingredients
      'l': 1000,
      'cup': 240, // Approximate
      'tbsp': 15,
      'tsp': 5,
      'oz': 28.35,
      'lb': 453.59,
      'piece': this.averagePieceWeight || 100,
      'large': this.averageLargeWeight || 150,
      'medium': this.averageMediumWeight || 100,
      'small': this.averageSmallWeight || 50
    };
    
    return amount * (conversions[unit] || 1);
  }

  // Find suitable substitutes
  findSubstitutes(criteria = {}) {
    return this.substitutes.filter(substitute => {
      if (criteria.allergenFree && substitute.allergens) {
        return !substitute.allergens.some(allergen => 
          criteria.allergenFree.includes(allergen)
        );
      }
      return true;
    });
  }

  // Calculate environmental impact
  calculateEnvironmentalImpact(amount, unit) {
    const gramsAmount = this.convertToGrams(amount, unit);
    const kgAmount = gramsAmount / 1000;
    
    return {
      carbonFootprint: this.sustainability.carbonFootprint * kgAmount,
      waterUsage: this.sustainability.waterUsage * kgAmount,
      localAvailability: this.sustainability.localAvailability
    };
  }
}

// Initialize sample ingredients
const initializeSampleIngredients = () => {
  const sampleIngredients = [
    {
      name: 'Tomato',
      category: 'vegetable',
      commonUnits: ['g', 'piece', 'cup'],
      nutritionPer100g: {
        calories: 18,
        protein: 0.9,
        carbohydrates: 3.9,
        fat: 0.2,
        fiber: 1.2,
        sugar: 2.6,
        sodium: 5,
        vitaminC: 13.7,
        potassium: 237
      },
      averageCost: 0.50,
      shelfLife: 7,
      storageConditions: 'room_temperature',
      allergens: [],
      substitutes: ['canned_tomato', 'tomato_paste'],
      seasonality: ['summer', 'fall'],
      sustainability: {
        carbonFootprint: 1.1,
        waterUsage: 214,
        localAvailability: true
      },
      automationData: {
        prepComplexity: 'easy',
        requiredEquipment: ['knife', 'cutting_board'],
        processingTime: 2
      },
      averagePieceWeight: 150
    },
    {
      name: 'Chicken Breast',
      category: 'protein',
      commonUnits: ['g', 'lb', 'piece'],
      nutritionPer100g: {
        calories: 165,
        protein: 31,
        carbohydrates: 0,
        fat: 3.6,
        fiber: 0,
        sugar: 0,
        sodium: 74,
        cholesterol: 85
      },
      averageCost: 2.50,
      shelfLife: 3,
      storageConditions: 'refrigerated',
      allergens: [],
      substitutes: ['chicken_thigh', 'turkey_breast', 'tofu'],
      seasonality: ['year_round'],
      sustainability: {
        carbonFootprint: 6.9,
        waterUsage: 4325,
        localAvailability: false
      },
      automationData: {
        prepComplexity: 'medium',
        requiredEquipment: ['knife', 'cutting_board', 'thermometer'],
        processingTime: 5
      },
      averagePieceWeight: 200
    },
    {
      name: 'Rice',
      category: 'grain',
      commonUnits: ['g', 'cup'],
      nutritionPer100g: {
        calories: 130,
        protein: 2.7,
        carbohydrates: 28,
        fat: 0.3,
        fiber: 0.4,
        sugar: 0.1,
        sodium: 1
      },
      averageCost: 0.15,
      shelfLife: 365,
      storageConditions: 'dry_pantry',
      allergens: [],
      substitutes: ['quinoa', 'cauliflower_rice', 'pasta'],
      seasonality: ['year_round'],
      sustainability: {
        carbonFootprint: 2.7,
        waterUsage: 2497,
        localAvailability: false
      },
      automationData: {
        prepComplexity: 'easy',
        requiredEquipment: ['pot', 'measuring_cup'],
        processingTime: 20
      }
    }
  ];

  sampleIngredients.forEach(ingredientData => {
    const ingredient = new Ingredient(ingredientData);
    ingredients.set(ingredient.id, ingredient);
    logger.info(`Initialized ingredient: ${ingredient.name}`);
  });
};

// GET /api/ingredients - List all ingredients
router.get('/', (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      search,
      allergenFree,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    let ingredientList = Array.from(ingredients.values());

    // Apply filters
    if (category) {
      ingredientList = ingredientList.filter(ingredient => 
        ingredient.category === category
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      ingredientList = ingredientList.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchLower)
      );
    }

    if (allergenFree) {
      const allergens = allergenFree.split(',');
      ingredientList = ingredientList.filter(ingredient =>
        !ingredient.allergens.some(allergen => allergens.includes(allergen))
      );
    }

    // Apply sorting
    ingredientList.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedIngredients = ingredientList.slice(startIndex, endIndex);

    res.json({
      ingredients: paginatedIngredients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ingredientList.length,
        pages: Math.ceil(ingredientList.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error retrieving ingredients:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve ingredients'
    });
  }
});

// GET /api/ingredients/:id - Get specific ingredient
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const ingredient = ingredients.get(id);

    if (!ingredient) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ingredient with id ${id} not found`
      });
    }

    res.json(ingredient);
  } catch (error) {
    logger.error('Error retrieving ingredient:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve ingredient'
    });
  }
});

// POST /api/ingredients/:id/nutrition - Calculate nutrition for amount
router.post('/:id/nutrition', (req, res) => {
  try {
    const { id } = req.params;
    const { amount, unit } = req.body;

    if (!amount || !unit) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount and unit are required'
      });
    }

    const ingredient = ingredients.get(id);
    if (!ingredient) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ingredient with id ${id} not found`
      });
    }

    const nutrition = ingredient.calculateNutrition(amount, unit);
    const environmentalImpact = ingredient.calculateEnvironmentalImpact(amount, unit);

    res.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name
      },
      amount,
      unit,
      nutrition,
      environmentalImpact
    });
  } catch (error) {
    logger.error('Error calculating nutrition:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to calculate nutrition'
    });
  }
});

// GET /api/ingredients/:id/substitutes - Get ingredient substitutes
router.get('/:id/substitutes', (req, res) => {
  try {
    const { id } = req.params;
    const { allergenFree } = req.query;

    const ingredient = ingredients.get(id);
    if (!ingredient) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Ingredient with id ${id} not found`
      });
    }

    const criteria = {};
    if (allergenFree) {
      criteria.allergenFree = allergenFree.split(',');
    }

    const substitutes = ingredient.findSubstitutes(criteria);

    res.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name
      },
      substitutes,
      criteria
    });
  } catch (error) {
    logger.error('Error finding substitutes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to find substitutes'
    });
  }
});

// GET /api/ingredients/categories - Get all ingredient categories
router.get('/meta/categories', (req, res) => {
  try {
    const categories = [...new Set(Array.from(ingredients.values()).map(i => i.category))];
    res.json({ categories });
  } catch (error) {
    logger.error('Error retrieving categories:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve categories'
    });
  }
});

// GET /api/ingredients/search - Advanced ingredient search
router.get('/search/advanced', (req, res) => {
  try {
    const {
      query,
      categories,
      maxCost,
      minShelfLife,
      allergenFree,
      seasonal,
      sustainable,
      automationFriendly
    } = req.query;

    let results = Array.from(ingredients.values());

    // Text search
    if (query) {
      const queryLower = query.toLowerCase();
      results = results.filter(ingredient =>
        ingredient.name.toLowerCase().includes(queryLower) ||
        ingredient.category.toLowerCase().includes(queryLower)
      );
    }

    // Category filter
    if (categories) {
      const categoryList = categories.split(',');
      results = results.filter(ingredient =>
        categoryList.includes(ingredient.category)
      );
    }

    // Cost filter
    if (maxCost) {
      results = results.filter(ingredient =>
        ingredient.averageCost <= parseFloat(maxCost)
      );
    }

    // Shelf life filter
    if (minShelfLife) {
      results = results.filter(ingredient =>
        ingredient.shelfLife >= parseInt(minShelfLife)
      );
    }

    // Allergen filter
    if (allergenFree) {
      const allergens = allergenFree.split(',');
      results = results.filter(ingredient =>
        !ingredient.allergens.some(allergen => allergens.includes(allergen))
      );
    }

    // Seasonal filter
    if (seasonal) {
      const currentSeason = seasonal;
      results = results.filter(ingredient =>
        ingredient.seasonality.includes(currentSeason) ||
        ingredient.seasonality.includes('year_round')
      );
    }

    // Sustainability filter
    if (sustainable === 'true') {
      results = results.filter(ingredient =>
        ingredient.sustainability.localAvailability ||
        ingredient.sustainability.carbonFootprint < 3
      );
    }

    // Automation friendly filter
    if (automationFriendly === 'true') {
      results = results.filter(ingredient =>
        ingredient.automationData.prepComplexity === 'easy'
      );
    }

    res.json({
      query: req.query,
      results,
      count: results.length
    });
  } catch (error) {
    logger.error('Error in advanced search:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to perform advanced search'
    });
  }
});

// Initialize sample data
initializeSampleIngredients();

module.exports = router;
