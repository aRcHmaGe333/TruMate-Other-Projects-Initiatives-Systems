/**
 * Consumption Profile Model - Tracks individual consumption patterns for precision distribution
 * Implements zero-waste distribution through consumption-based portion adjustment
 */

class ConsumptionProfile {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.userId = data.userId;
    this.householdId = data.householdId || null;
    
    // Consumption patterns (learned from actual usage)
    this.consumptionPatterns = data.consumptionPatterns || {
      daily: new Map(), // ingredient -> average daily consumption
      weekly: new Map(), // ingredient -> weekly patterns
      monthly: new Map(), // ingredient -> monthly trends
      seasonal: new Map() // ingredient -> seasonal variations
    };
    
    // Portion tracking
    this.portionHistory = data.portionHistory || [];
    this.currentPortions = data.currentPortions || new Map(); // ingredient -> current portion size
    this.wasteTracking = data.wasteTracking || new Map(); // ingredient -> waste percentage
    
    // Preferences and dietary requirements
    this.preferences = data.preferences || {
      dietaryRestrictions: [], // vegetarian, vegan, gluten-free, etc.
      allergies: [], // specific allergens to avoid
      dislikes: [], // ingredients user doesn't consume
      favorites: [], // preferred ingredients
      culturalPreferences: [], // cuisine types, preparation styles
      nutritionalGoals: {} // target calories, macros, etc.
    };
    
    // Consumption efficiency metrics
    this.efficiency = data.efficiency || {
      overallWasteRate: 0, // percentage of food wasted
      accuracyScore: 0, // how well predictions match actual consumption
      adjustmentFrequency: 0, // how often portions need adjustment
      satisfactionScore: 0 // user satisfaction with portions
    };
    
    // Automatic adjustment settings
    this.adjustmentSettings = data.adjustmentSettings || {
      autoAdjustEnabled: true,
      adjustmentThreshold: 0.15, // 15% waste triggers adjustment
      consultationRequired: true, // ask user before major changes
      maxAdjustmentPerCycle: 0.20, // max 20% change per adjustment
      learningRate: 0.1 // how quickly to adapt to new patterns
    };
    
    // Household sharing patterns (if applicable)
    this.sharingPatterns = data.sharingPatterns || {
      sharedMeals: [], // which meals are shared with household
      individualItems: [], // items consumed individually
      guestFrequency: 0, // how often guests are present
      specialOccasions: [] // events that change consumption patterns
    };
    
    // Predictive models
    this.predictionModels = data.predictionModels || {
      demandForecast: null, // trained model for demand prediction
      seasonalAdjustments: {}, // seasonal consumption multipliers
      trendAnalysis: {}, // long-term consumption trends
      anomalyDetection: {} // unusual consumption pattern detection
    };
    
    // Integration with growing system
    this.growingIntegration = data.growingIntegration || {
      preferredFreshness: 'optimal', // how fresh ingredients should be
      harvestTiming: 'just_in_time', // when to harvest for this user
      qualityPreferences: {}, // preferred quality metrics
      varietyRotation: true // whether to rotate crop varieties
    };
    
    // Metadata
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.lastConsumptionUpdate = data.lastConsumptionUpdate || null;
    this.version = data.version || '1.0.0';
  }

  generateId() {
    return 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Record actual consumption for portion adjustment
   */
  recordConsumption(ingredient, portionServed, portionConsumed, timestamp = new Date()) {
    const consumptionRecord = {
      ingredient,
      portionServed,
      portionConsumed,
      wasteAmount: portionServed - portionConsumed,
      wastePercentage: ((portionServed - portionConsumed) / portionServed) * 100,
      timestamp,
      dayOfWeek: timestamp.getDay(),
      timeOfDay: timestamp.getHours(),
      season: this.getSeason(timestamp)
    };

    // Add to history
    this.portionHistory.push(consumptionRecord);
    
    // Update consumption patterns
    this.updateConsumptionPatterns(consumptionRecord);
    
    // Update waste tracking
    this.updateWasteTracking(ingredient, consumptionRecord.wastePercentage);
    
    // Check if portion adjustment is needed
    this.checkForPortionAdjustment(ingredient);
    
    this.lastConsumptionUpdate = timestamp;
    this.updatedAt = timestamp;
    
    return consumptionRecord;
  }

  /**
   * Update consumption patterns based on new data
   */
  updateConsumptionPatterns(record) {
    const { ingredient, portionConsumed, timestamp } = record;
    
    // Update daily patterns
    const dailyKey = `${timestamp.getFullYear()}-${timestamp.getMonth()}-${timestamp.getDate()}`;
    if (!this.consumptionPatterns.daily.has(ingredient)) {
      this.consumptionPatterns.daily.set(ingredient, []);
    }
    this.consumptionPatterns.daily.get(ingredient).push({
      date: dailyKey,
      amount: portionConsumed,
      timestamp
    });
    
    // Update weekly patterns
    const weekKey = `${timestamp.getFullYear()}-W${this.getWeekNumber(timestamp)}`;
    if (!this.consumptionPatterns.weekly.has(ingredient)) {
      this.consumptionPatterns.weekly.set(ingredient, new Map());
    }
    const weeklyData = this.consumptionPatterns.weekly.get(ingredient);
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, []);
    }
    weeklyData.get(weekKey).push(portionConsumed);
    
    // Update seasonal patterns
    const season = this.getSeason(timestamp);
    if (!this.consumptionPatterns.seasonal.has(ingredient)) {
      this.consumptionPatterns.seasonal.set(ingredient, new Map());
    }
    const seasonalData = this.consumptionPatterns.seasonal.get(ingredient);
    if (!seasonalData.has(season)) {
      seasonalData.set(season, []);
    }
    seasonalData.get(season).push(portionConsumed);
  }

  /**
   * Update waste tracking for an ingredient
   */
  updateWasteTracking(ingredient, wastePercentage) {
    if (!this.wasteTracking.has(ingredient)) {
      this.wasteTracking.set(ingredient, []);
    }
    
    const wasteHistory = this.wasteTracking.get(ingredient);
    wasteHistory.push(wastePercentage);
    
    // Keep only last 30 records for rolling average
    if (wasteHistory.length > 30) {
      wasteHistory.shift();
    }
    
    // Update overall waste rate
    this.calculateOverallWasteRate();
  }

  /**
   * Check if portion adjustment is needed
   */
  checkForPortionAdjustment(ingredient) {
    const wasteHistory = this.wasteTracking.get(ingredient);
    if (!wasteHistory || wasteHistory.length < 5) return; // Need at least 5 data points
    
    // Calculate recent average waste
    const recentWaste = wasteHistory.slice(-5);
    const averageWaste = recentWaste.reduce((sum, waste) => sum + waste, 0) / recentWaste.length;
    
    // Check if adjustment is needed
    if (averageWaste > this.adjustmentSettings.adjustmentThreshold * 100) {
      this.suggestPortionAdjustment(ingredient, averageWaste);
    }
  }

  /**
   * Suggest portion adjustment based on waste patterns
   */
  suggestPortionAdjustment(ingredient, averageWaste) {
    const currentPortion = this.currentPortions.get(ingredient) || 100; // default 100g
    const wasteRatio = averageWaste / 100;
    
    // Calculate suggested new portion
    const adjustmentFactor = Math.min(
      1 - (wasteRatio * this.adjustmentSettings.learningRate),
      1 - this.adjustmentSettings.maxAdjustmentPerCycle
    );
    
    const suggestedPortion = Math.max(
      currentPortion * adjustmentFactor,
      currentPortion * 0.5 // Never reduce by more than 50%
    );
    
    const adjustment = {
      ingredient,
      currentPortion,
      suggestedPortion,
      reduction: currentPortion - suggestedPortion,
      reductionPercentage: ((currentPortion - suggestedPortion) / currentPortion) * 100,
      reason: `Average waste of ${averageWaste.toFixed(1)}% detected`,
      timestamp: new Date(),
      requiresConsultation: this.adjustmentSettings.consultationRequired
    };
    
    // Log adjustment suggestion
    this.logEvent('portion_adjustment_suggested', adjustment);
    
    return adjustment;
  }

  /**
   * Apply portion adjustment (after user consultation if required)
   */
  applyPortionAdjustment(ingredient, newPortion, userApproved = false) {
    const oldPortion = this.currentPortions.get(ingredient) || 100;
    
    if (this.adjustmentSettings.consultationRequired && !userApproved) {
      throw new Error('User consultation required for portion adjustment');
    }
    
    this.currentPortions.set(ingredient, newPortion);
    
    const adjustment = {
      ingredient,
      oldPortion,
      newPortion,
      change: newPortion - oldPortion,
      changePercentage: ((newPortion - oldPortion) / oldPortion) * 100,
      appliedAt: new Date(),
      userApproved
    };
    
    this.logEvent('portion_adjustment_applied', adjustment);
    this.updatedAt = new Date();
    
    return adjustment;
  }

  /**
   * Predict consumption demand for planning
   */
  predictDemand(ingredient, daysAhead = 7) {
    const historicalData = this.getHistoricalConsumption(ingredient, 30); // Last 30 days
    if (historicalData.length === 0) {
      return this.getDefaultPortion(ingredient) * daysAhead;
    }
    
    // Simple moving average prediction (can be enhanced with ML models)
    const averageDailyConsumption = historicalData.reduce((sum, record) => 
      sum + record.portionConsumed, 0) / historicalData.length;
    
    // Apply seasonal adjustments
    const currentSeason = this.getSeason(new Date());
    const seasonalMultiplier = this.getSeasonalMultiplier(ingredient, currentSeason);
    
    // Apply trend adjustments
    const trendMultiplier = this.getTrendMultiplier(ingredient);
    
    const predictedDemand = averageDailyConsumption * daysAhead * seasonalMultiplier * trendMultiplier;
    
    return {
      ingredient,
      daysAhead,
      predictedDailyConsumption: averageDailyConsumption * seasonalMultiplier * trendMultiplier,
      totalPredictedDemand: predictedDemand,
      confidence: this.calculatePredictionConfidence(ingredient, historicalData.length),
      factors: {
        historical: averageDailyConsumption,
        seasonal: seasonalMultiplier,
        trend: trendMultiplier
      }
    };
  }

  /**
   * Get optimal portion size for an ingredient
   */
  getOptimalPortion(ingredient) {
    const currentPortion = this.currentPortions.get(ingredient);
    if (currentPortion) return currentPortion;
    
    // Calculate based on consumption history
    const recentConsumption = this.getRecentAverageConsumption(ingredient, 14); // Last 2 weeks
    if (recentConsumption > 0) {
      return Math.round(recentConsumption * 1.05); // 5% buffer to avoid shortages
    }
    
    return this.getDefaultPortion(ingredient);
  }

  /**
   * Calculate overall waste rate across all ingredients
   */
  calculateOverallWasteRate() {
    let totalWaste = 0;
    let totalRecords = 0;
    
    for (const wasteHistory of this.wasteTracking.values()) {
      totalWaste += wasteHistory.reduce((sum, waste) => sum + waste, 0);
      totalRecords += wasteHistory.length;
    }
    
    this.efficiency.overallWasteRate = totalRecords > 0 ? totalWaste / totalRecords : 0;
    return this.efficiency.overallWasteRate;
  }

  /**
   * Get consumption efficiency metrics
   */
  getEfficiencyMetrics() {
    return {
      overallWasteRate: this.efficiency.overallWasteRate,
      accuracyScore: this.calculateAccuracyScore(),
      adjustmentFrequency: this.calculateAdjustmentFrequency(),
      satisfactionScore: this.efficiency.satisfactionScore,
      totalPortionsTracked: this.portionHistory.length,
      ingredientsTracked: this.wasteTracking.size,
      lastUpdate: this.lastConsumptionUpdate
    };
  }

  // Utility methods
  getSeason(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  getHistoricalConsumption(ingredient, days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.portionHistory.filter(record => 
      record.ingredient === ingredient && record.timestamp >= cutoffDate
    );
  }

  getRecentAverageConsumption(ingredient, days) {
    const recentData = this.getHistoricalConsumption(ingredient, days);
    if (recentData.length === 0) return 0;
    
    return recentData.reduce((sum, record) => sum + record.portionConsumed, 0) / recentData.length;
  }

  getDefaultPortion(ingredient) {
    // Default portions in grams
    const defaults = {
      lettuce: 80,
      tomato: 120,
      herbs: 15,
      spinach: 100,
      cucumber: 150,
      carrot: 100,
      onion: 80,
      garlic: 10
    };
    return defaults[ingredient] || 100;
  }

  getSeasonalMultiplier(ingredient, season) {
    const seasonalData = this.consumptionPatterns.seasonal.get(ingredient);
    if (!seasonalData || !seasonalData.has(season)) return 1.0;
    
    const seasonalConsumption = seasonalData.get(season);
    const averageConsumption = seasonalConsumption.reduce((sum, amount) => sum + amount, 0) / seasonalConsumption.length;
    
    // Compare to overall average
    const overallAverage = this.getRecentAverageConsumption(ingredient, 365);
    return overallAverage > 0 ? averageConsumption / overallAverage : 1.0;
  }

  getTrendMultiplier(ingredient) {
    // Simple trend analysis - compare recent vs older consumption
    const recentAverage = this.getRecentAverageConsumption(ingredient, 30);
    const olderAverage = this.getHistoricalConsumption(ingredient, 90)
      .slice(0, -30) // Exclude recent 30 days
      .reduce((sum, record, _, arr) => sum + record.portionConsumed / arr.length, 0);
    
    if (olderAverage === 0) return 1.0;
    return recentAverage / olderAverage;
  }

  calculatePredictionConfidence(ingredient, dataPoints) {
    let confidence = Math.min(dataPoints / 30, 1.0); // Max confidence with 30+ data points
    
    // Reduce confidence for high variability
    const recentData = this.getHistoricalConsumption(ingredient, 14);
    if (recentData.length > 1) {
      const variance = this.calculateVariance(recentData.map(r => r.portionConsumed));
      const mean = recentData.reduce((sum, r) => sum + r.portionConsumed, 0) / recentData.length;
      const coefficientOfVariation = Math.sqrt(variance) / mean;
      confidence *= Math.max(0.3, 1 - coefficientOfVariation);
    }
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  calculateAccuracyScore() {
    // Compare predicted vs actual consumption over time
    // This would be implemented with historical prediction data
    return 0.85; // Placeholder
  }

  calculateAdjustmentFrequency() {
    // Calculate how often portions are adjusted
    const adjustmentEvents = this.portionHistory.filter(record => 
      record.type === 'portion_adjustment_applied'
    );
    const totalDays = Math.max(1, (new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
    return adjustmentEvents.length / totalDays * 30; // Adjustments per month
  }

  logEvent(eventType, data) {
    console.log(`[${this.id}] ${eventType}:`, data);
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      householdId: this.householdId,
      consumptionPatterns: {
        daily: Object.fromEntries(this.consumptionPatterns.daily),
        weekly: Object.fromEntries(this.consumptionPatterns.weekly),
        monthly: Object.fromEntries(this.consumptionPatterns.monthly),
        seasonal: Object.fromEntries(this.consumptionPatterns.seasonal)
      },
      portionHistory: this.portionHistory,
      currentPortions: Object.fromEntries(this.currentPortions),
      wasteTracking: Object.fromEntries(this.wasteTracking),
      preferences: this.preferences,
      efficiency: this.efficiency,
      adjustmentSettings: this.adjustmentSettings,
      sharingPatterns: this.sharingPatterns,
      predictionModels: this.predictionModels,
      growingIntegration: this.growingIntegration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastConsumptionUpdate: this.lastConsumptionUpdate,
      version: this.version
    };
  }

  static fromJSON(data) {
    const profile = new ConsumptionProfile(data);
    
    // Restore Map objects
    if (data.consumptionPatterns) {
      profile.consumptionPatterns.daily = new Map(Object.entries(data.consumptionPatterns.daily || {}));
      profile.consumptionPatterns.weekly = new Map(Object.entries(data.consumptionPatterns.weekly || {}));
      profile.consumptionPatterns.monthly = new Map(Object.entries(data.consumptionPatterns.monthly || {}));
      profile.consumptionPatterns.seasonal = new Map(Object.entries(data.consumptionPatterns.seasonal || {}));
    }
    
    if (data.currentPortions) {
      profile.currentPortions = new Map(Object.entries(data.currentPortions));
    }
    
    if (data.wasteTracking) {
      profile.wasteTracking = new Map(Object.entries(data.wasteTracking));
    }
    
    return profile;
  }
}

module.exports = ConsumptionProfile;
