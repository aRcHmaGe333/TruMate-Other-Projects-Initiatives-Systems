/**
 * Recipe Model - Core data structure for recipe management
 * Implements the recipe schema from the TruMate specification
 */

class Recipe {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || '';
    this.description = data.description || '';
    this.category = data.category || 'general';
    this.cuisine = data.cuisine || 'international';
    this.difficulty = data.difficulty || 'medium'; // easy, medium, hard
    this.servings = data.servings !== undefined ? data.servings : 4;
    this.prepTime = data.prepTime || 0; // minutes
    this.cookTime = data.cookTime || 0; // minutes
    this.totalTime = data.totalTime || (this.prepTime + this.cookTime);
    
    // Ingredients with precise measurements
    this.ingredients = data.ingredients || [];
    
    // Detailed cooking instructions with timing and parameters
    this.instructions = data.instructions || [];
    
    // Equipment requirements
    this.equipment = data.equipment || [];
    
    // Nutritional information
    this.nutrition = data.nutrition || {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0
    };
    
    // Automation parameters
    this.automation = data.automation || {
      automatable: false,
      complexity: 'manual',
      requiredSensors: [],
      safetyChecks: [],
      qualityMetrics: []
    };
    
    // Learning and optimization data
    this.analytics = data.analytics || {
      successRate: 0,
      averageRating: 0,
      timesCooked: 0,
      lastOptimized: null,
      optimizationHistory: []
    };
    
    // Metadata
    this.tags = data.tags || [];
    this.source = data.source || 'user';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.version = data.version || '1.0.0';
  }

  generateId() {
    return 'recipe_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Validation methods
  validate() {
    const errors = [];
    
    if (!this.name || this.name.trim().length === 0) {
      errors.push('Recipe name is required');
    }
    
    if (!this.ingredients || this.ingredients.length === 0) {
      errors.push('At least one ingredient is required');
    }
    
    if (!this.instructions || this.instructions.length === 0) {
      errors.push('At least one instruction is required');
    }
    
    if (this.servings <= 0) {
      errors.push('Servings must be greater than 0');
    }
    
    // Validate ingredients
    this.ingredients.forEach((ingredient, index) => {
      if (!ingredient.name) {
        errors.push(`Ingredient ${index + 1} must have a name`);
      }
      if (!ingredient.amount || ingredient.amount <= 0) {
        errors.push(`Ingredient ${index + 1} must have a valid amount`);
      }
      if (!ingredient.unit) {
        errors.push(`Ingredient ${index + 1} must have a unit`);
      }
    });
    
    // Validate instructions
    this.instructions.forEach((instruction, index) => {
      if (!instruction.step) {
        errors.push(`Instruction ${index + 1} must have a step description`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Scaling methods
  scaleServings(newServings) {
    if (newServings <= 0) {
      throw new Error('Servings must be greater than 0');
    }
    
    const scaleFactor = newServings / this.servings;
    
    // Scale ingredients
    this.ingredients = this.ingredients.map(ingredient => ({
      ...ingredient,
      amount: ingredient.amount * scaleFactor
    }));
    
    // Scale nutrition
    Object.keys(this.nutrition).forEach(key => {
      this.nutrition[key] *= scaleFactor;
    });
    
    this.servings = newServings;
    this.updatedAt = new Date();
    
    return this;
  }

  // Optimization methods
  optimize(criteria = {}) {
    const optimization = {
      timestamp: new Date(),
      criteria,
      changes: []
    };
    
    // Nutritional optimization
    if (criteria.nutrition) {
      this.optimizeNutrition(criteria.nutrition, optimization);
    }
    
    // Cost optimization
    if (criteria.cost) {
      this.optimizeCost(criteria.cost, optimization);
    }
    
    // Time optimization
    if (criteria.time) {
      this.optimizeTime(criteria.time, optimization);
    }
    
    // Waste reduction
    if (criteria.wasteReduction) {
      this.optimizeWaste(criteria.wasteReduction, optimization);
    }
    
    this.analytics.optimizationHistory.push(optimization);
    this.analytics.lastOptimized = new Date();
    this.updatedAt = new Date();
    
    return optimization;
  }

  optimizeNutrition(targets, optimization) {
    // Placeholder for nutritional optimization logic
    // This would analyze ingredients and suggest substitutions
    optimization.changes.push({
      type: 'nutrition',
      description: 'Nutritional optimization applied',
      impact: 'Improved nutritional balance'
    });
  }

  optimizeCost(budget, optimization) {
    // Placeholder for cost optimization logic
    optimization.changes.push({
      type: 'cost',
      description: 'Cost optimization applied',
      impact: 'Reduced ingredient costs'
    });
  }

  optimizeTime(maxTime, optimization) {
    // Placeholder for time optimization logic
    optimization.changes.push({
      type: 'time',
      description: 'Time optimization applied',
      impact: 'Reduced cooking time'
    });
  }

  optimizeWaste(wasteTargets, optimization) {
    // Placeholder for waste reduction logic
    optimization.changes.push({
      type: 'waste',
      description: 'Waste reduction optimization applied',
      impact: 'Minimized food waste'
    });
  }

  // Automation assessment
  assessAutomation() {
    let automationScore = 0;
    let complexity = 'manual';
    let requiredSensors = [];
    let safetyChecks = [];
    
    // Analyze instructions for automation potential
    this.instructions.forEach(instruction => {
      if (instruction.temperature) {
        requiredSensors.push('temperature');
        safetyChecks.push('temperature_monitoring');
        automationScore += 10;
      }
      
      if (instruction.timing) {
        requiredSensors.push('timer');
        automationScore += 5;
      }
      
      if (instruction.action && ['mix', 'stir', 'blend'].includes(instruction.action.toLowerCase())) {
        requiredSensors.push('motion');
        automationScore += 15;
      }
    });
    
    // Determine complexity
    if (automationScore >= 50) {
      complexity = 'fully_automated';
    } else if (automationScore >= 25) {
      complexity = 'semi_automated';
    } else if (automationScore >= 10) {
      complexity = 'assisted';
    }
    
    this.automation = {
      automatable: automationScore > 0,
      complexity,
      automationScore,
      requiredSensors: [...new Set(requiredSensors)],
      safetyChecks: [...new Set(safetyChecks)],
      qualityMetrics: this.generateQualityMetrics()
    };
    
    return this.automation;
  }

  generateQualityMetrics() {
    // Generate quality metrics based on recipe type
    const metrics = ['completion_time', 'ingredient_usage'];
    
    if (this.category === 'baking') {
      metrics.push('texture', 'color', 'rise');
    } else if (this.category === 'grilling') {
      metrics.push('internal_temperature', 'char_level');
    } else if (this.category === 'soup') {
      metrics.push('consistency', 'temperature_distribution');
    }
    
    return metrics;
  }

  // Export methods
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      cuisine: this.cuisine,
      difficulty: this.difficulty,
      servings: this.servings,
      prepTime: this.prepTime,
      cookTime: this.cookTime,
      totalTime: this.totalTime,
      ingredients: this.ingredients,
      instructions: this.instructions,
      equipment: this.equipment,
      nutrition: this.nutrition,
      automation: this.automation,
      analytics: this.analytics,
      tags: this.tags,
      source: this.source,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version
    };
  }

  static fromJSON(data) {
    return new Recipe(data);
  }
}

module.exports = Recipe;
