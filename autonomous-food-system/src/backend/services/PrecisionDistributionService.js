/**
 * Precision Distribution Service - Zero-waste distribution through consumption tracking
 * Connects growing system → consumption patterns → cooking system
 * Eliminates supermarkets through precise portion delivery
 */

const ConsumptionProfile = require('../models/ConsumptionProfile');

class PrecisionDistributionService {
  constructor() {
    this.consumptionProfiles = new Map();
    this.distributionSchedule = new Map();
    this.reusableContainers = new Map();
    this.wasteReductionMetrics = {
      totalWasteReduced: 0,
      containersReused: 0,
      precisionAccuracy: 0,
      userSatisfaction: 0
    };
  }

  /**
   * Create consumption profile for new user
   */
  createConsumptionProfile(userId, initialData = {}) {
    const profile = new ConsumptionProfile({
      userId,
      ...initialData
    });
    
    this.consumptionProfiles.set(userId, profile);
    
    // Initialize with supermarket-like data if available
    if (initialData.supermarketData) {
      this.importSupermarketData(userId, initialData.supermarketData);
    }
    
    return profile;
  }

  /**
   * Import existing consumption data from supermarket loyalty programs
   * "Our supermarket companies already know what our favourite products are"
   */
  importSupermarketData(userId, supermarketData) {
    const profile = this.consumptionProfiles.get(userId);
    if (!profile) throw new Error(`Profile not found for user ${userId}`);

    // Import purchase history to establish baseline consumption
    if (supermarketData.purchaseHistory) {
      supermarketData.purchaseHistory.forEach(purchase => {
        // Convert purchase to consumption estimate
        const estimatedConsumption = this.convertPurchaseToConsumption(purchase);
        
        // Record as historical consumption
        profile.recordConsumption(
          estimatedConsumption.ingredient,
          estimatedConsumption.amount,
          estimatedConsumption.amount * 0.9, // Assume 10% waste initially
          new Date(purchase.date)
        );
      });
    }

    // Import preferences
    if (supermarketData.preferences) {
      profile.preferences = { ...profile.preferences, ...supermarketData.preferences };
    }

    // Import monthly consumption patterns
    if (supermarketData.monthlyPatterns) {
      Object.entries(supermarketData.monthlyPatterns).forEach(([ingredient, monthlyAmount]) => {
        const dailyAmount = monthlyAmount / 30;
        profile.currentPortions.set(ingredient, dailyAmount);
      });
    }

    profile.updatedAt = new Date();
    return profile;
  }

  /**
   * Convert supermarket purchase to consumption estimate
   */
  convertPurchaseToConsumption(purchase) {
    // Convert packaged products to ingredient equivalents
    const conversions = {
      'lettuce_bag_200g': { ingredient: 'lettuce', amount: 200, servings: 4 },
      'tomato_pack_500g': { ingredient: 'tomato', amount: 500, servings: 4 },
      'herb_pack_30g': { ingredient: 'herbs', amount: 30, servings: 10 },
      'spinach_bag_150g': { ingredient: 'spinach', amount: 150, servings: 3 }
    };

    const conversion = conversions[purchase.product] || {
      ingredient: purchase.product,
      amount: purchase.amount,
      servings: 1
    };

    return {
      ingredient: conversion.ingredient,
      amount: conversion.amount / conversion.servings, // Per serving amount
      totalAmount: conversion.amount
    };
  }

  /**
   * Record actual consumption and adjust portions automatically
   */
  recordConsumption(userId, ingredient, portionServed, portionConsumed, timestamp = new Date()) {
    const profile = this.consumptionProfiles.get(userId);
    if (!profile) throw new Error(`Profile not found for user ${userId}`);

    const consumptionRecord = profile.recordConsumption(
      ingredient, 
      portionServed, 
      portionConsumed, 
      timestamp
    );

    // Check if automatic adjustment is needed
    if (consumptionRecord.wastePercentage > profile.adjustmentSettings.adjustmentThreshold * 100) {
      this.handleAutomaticAdjustment(userId, ingredient, consumptionRecord);
    }

    // Update distribution schedule
    this.updateDistributionSchedule(userId);

    return consumptionRecord;
  }

  /**
   * Handle automatic portion adjustment with user consultation
   */
  async handleAutomaticAdjustment(userId, ingredient, consumptionRecord) {
    const profile = this.consumptionProfiles.get(userId);
    const adjustment = profile.suggestPortionAdjustment(ingredient, consumptionRecord.wastePercentage);

    if (profile.adjustmentSettings.consultationRequired) {
      // In real system, this would send notification to user
      const userResponse = await this.consultUser(userId, adjustment);
      
      if (userResponse.approved) {
        profile.applyPortionAdjustment(ingredient, adjustment.suggestedPortion, true);
        this.logDistributionEvent('portion_adjusted_with_approval', {
          userId,
          ingredient,
          adjustment,
          userResponse
        });
      } else {
        this.logDistributionEvent('portion_adjustment_declined', {
          userId,
          ingredient,
          adjustment,
          userResponse
        });
      }
    } else {
      // Apply adjustment automatically
      profile.applyPortionAdjustment(ingredient, adjustment.suggestedPortion, false);
      this.logDistributionEvent('portion_adjusted_automatically', {
        userId,
        ingredient,
        adjustment
      });
    }
  }

  /**
   * Consult user about portion adjustment
   * "after consulting the person, the user"
   */
  async consultUser(userId, adjustment) {
    // In real system, this would be a UI notification or message
    const consultation = {
      userId,
      ingredient: adjustment.ingredient,
      currentPortion: adjustment.currentPortion,
      suggestedPortion: adjustment.suggestedPortion,
      reason: adjustment.reason,
      reductionPercentage: adjustment.reductionPercentage,
      timestamp: new Date()
    };

    // Simulate user response (in real system, would wait for actual user input)
    const simulatedResponse = {
      approved: adjustment.reductionPercentage < 30, // Auto-approve small reductions
      feedback: adjustment.reductionPercentage < 30 ? 
        'Automatic approval for small adjustment' : 
        'User consultation required for large adjustment',
      timestamp: new Date()
    };

    this.logDistributionEvent('user_consultation', { consultation, response: simulatedResponse });
    return simulatedResponse;
  }

  /**
   * Generate precision distribution schedule
   * "Supplying precise portions would require no input, no effort and no time spent, by the user"
   */
  generateDistributionSchedule(userId, daysAhead = 7) {
    const profile = this.consumptionProfiles.get(userId);
    if (!profile) throw new Error(`Profile not found for user ${userId}`);

    const schedule = {
      userId,
      generatedAt: new Date(),
      daysAhead,
      dailyDistributions: [],
      totalIngredients: new Map(),
      containers: [],
      estimatedWaste: 0
    };

    // Generate daily distributions
    for (let day = 0; day < daysAhead; day++) {
      const distributionDate = new Date();
      distributionDate.setDate(distributionDate.getDate() + day);

      const dailyDistribution = this.generateDailyDistribution(userId, distributionDate);
      schedule.dailyDistributions.push(dailyDistribution);

      // Accumulate totals
      dailyDistribution.ingredients.forEach((amount, ingredient) => {
        const currentTotal = schedule.totalIngredients.get(ingredient) || 0;
        schedule.totalIngredients.set(ingredient, currentTotal + amount);
      });
    }

    // Plan container requirements
    schedule.containers = this.planContainerRequirements(schedule.totalIngredients);

    // Estimate waste reduction
    schedule.estimatedWaste = this.estimateWasteReduction(userId, schedule);

    // Store schedule
    this.distributionSchedule.set(userId, schedule);

    return schedule;
  }

  /**
   * Generate daily distribution for a user
   */
  generateDailyDistribution(userId, date) {
    const profile = this.consumptionProfiles.get(userId);
    const dayOfWeek = date.getDay();
    const season = profile.getSeason(date);

    const distribution = {
      date,
      dayOfWeek,
      season,
      ingredients: new Map(),
      totalWeight: 0,
      containers: [],
      deliveryTime: this.calculateOptimalDeliveryTime(userId, date),
      freshness: 'optimal'
    };

    // Get all ingredients user consumes
    const ingredientList = Array.from(profile.currentPortions.keys());
    
    ingredientList.forEach(ingredient => {
      const prediction = profile.predictDemand(ingredient, 1); // 1 day ahead
      const optimalPortion = profile.getOptimalPortion(ingredient);
      
      // Adjust for day of week patterns
      const dayAdjustment = this.getDayOfWeekAdjustment(userId, ingredient, dayOfWeek);
      const adjustedPortion = optimalPortion * dayAdjustment;

      if (adjustedPortion > 0) {
        distribution.ingredients.set(ingredient, Math.round(adjustedPortion));
        distribution.totalWeight += adjustedPortion;
      }
    });

    return distribution;
  }

  /**
   * Plan reusable container requirements
   */
  planContainerRequirements(totalIngredients) {
    const containers = [];
    const containerTypes = {
      small: { capacity: 50, suitable: ['herbs', 'garlic'] },
      medium: { capacity: 150, suitable: ['lettuce', 'spinach', 'tomato'] },
      large: { capacity: 300, suitable: ['cucumber', 'carrot'] }
    };

    totalIngredients.forEach((amount, ingredient) => {
      // Determine appropriate container size
      let containerType = 'medium'; // default
      
      if (amount <= 50) containerType = 'small';
      else if (amount > 200) containerType = 'large';

      containers.push({
        ingredient,
        amount,
        containerType,
        containerId: this.assignReusableContainer(containerType),
        estimatedReturns: 0.95 // 95% container return rate
      });
    });

    return containers;
  }

  /**
   * Assign reusable container from available pool
   */
  assignReusableContainer(containerType) {
    const containerId = `${containerType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    this.reusableContainers.set(containerId, {
      type: containerType,
      status: 'assigned',
      assignedAt: new Date(),
      returnExpected: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      timesReused: 0
    });

    return containerId;
  }

  /**
   * Process container return and cleaning
   */
  processContainerReturn(containerId, condition = 'good') {
    const container = this.reusableContainers.get(containerId);
    if (!container) throw new Error(`Container ${containerId} not found`);

    container.status = 'returned';
    container.returnedAt = new Date();
    container.condition = condition;
    container.timesReused += 1;

    // Schedule cleaning and reuse
    if (condition === 'good' && container.timesReused < 100) {
      container.status = 'cleaning';
      // In real system, would trigger cleaning process
      setTimeout(() => {
        container.status = 'available';
        container.cleanedAt = new Date();
      }, 1000); // Simulate cleaning time
    } else {
      container.status = 'retired';
    }

    this.wasteReductionMetrics.containersReused += 1;
    return container;
  }

  /**
   * Estimate waste reduction compared to traditional distribution
   */
  estimateWasteReduction(userId, schedule) {
    const profile = this.consumptionProfiles.get(userId);
    const currentWasteRate = profile.efficiency.overallWasteRate / 100;
    
    // Traditional supermarket waste rate (estimated)
    const traditionalWasteRate = 0.25; // 25% average food waste
    
    const totalFood = Array.from(schedule.totalIngredients.values())
      .reduce((sum, amount) => sum + amount, 0);
    
    const traditionalWaste = totalFood * traditionalWasteRate;
    const precisionWaste = totalFood * currentWasteRate;
    const wasteReduction = traditionalWaste - precisionWaste;

    return {
      traditionalWaste,
      precisionWaste,
      wasteReduction,
      wasteReductionPercentage: (wasteReduction / traditionalWaste) * 100,
      totalFood
    };
  }

  /**
   * Get consumption profile for user
   */
  getConsumptionProfile(userId) {
    return this.consumptionProfiles.get(userId);
  }

  /**
   * Get distribution schedule for user
   */
  getDistributionSchedule(userId) {
    return this.distributionSchedule.get(userId);
  }

  /**
   * Update distribution schedule based on consumption changes
   */
  updateDistributionSchedule(userId) {
    // Regenerate schedule when consumption patterns change
    this.generateDistributionSchedule(userId, 7);
  }

  /**
   * Calculate optimal delivery time based on consumption patterns
   */
  calculateOptimalDeliveryTime(userId, date) {
    const profile = this.consumptionProfiles.get(userId);
    
    // Analyze when user typically consumes fresh ingredients
    const consumptionTimes = profile.portionHistory
      .filter(record => record.timestamp.toDateString() === date.toDateString())
      .map(record => record.timestamp.getHours());

    if (consumptionTimes.length === 0) {
      return '08:00'; // Default morning delivery
    }

    // Deliver 2 hours before typical consumption time
    const averageConsumptionHour = consumptionTimes.reduce((sum, hour) => sum + hour, 0) / consumptionTimes.length;
    const deliveryHour = Math.max(6, Math.min(20, averageConsumptionHour - 2));
    
    return `${deliveryHour.toString().padStart(2, '0')}:00`;
  }

  /**
   * Get day-of-week consumption adjustment
   */
  getDayOfWeekAdjustment(userId, ingredient, dayOfWeek) {
    const profile = this.consumptionProfiles.get(userId);
    
    // Analyze historical consumption by day of week
    const dayConsumption = profile.portionHistory
      .filter(record => record.ingredient === ingredient && record.dayOfWeek === dayOfWeek)
      .map(record => record.portionConsumed);

    if (dayConsumption.length === 0) return 1.0;

    const averageDayConsumption = dayConsumption.reduce((sum, amount) => sum + amount, 0) / dayConsumption.length;
    const overallAverage = profile.getRecentAverageConsumption(ingredient, 30);

    return overallAverage > 0 ? averageDayConsumption / overallAverage : 1.0;
  }

  /**
   * Get system-wide distribution metrics
   */
  getDistributionMetrics() {
    const totalProfiles = this.consumptionProfiles.size;
    let totalWasteRate = 0;
    let totalAccuracy = 0;
    let totalSatisfaction = 0;

    this.consumptionProfiles.forEach(profile => {
      const metrics = profile.getEfficiencyMetrics();
      totalWasteRate += metrics.overallWasteRate;
      totalAccuracy += metrics.accuracyScore;
      totalSatisfaction += metrics.satisfactionScore;
    });

    return {
      totalUsers: totalProfiles,
      averageWasteRate: totalProfiles > 0 ? totalWasteRate / totalProfiles : 0,
      averageAccuracy: totalProfiles > 0 ? totalAccuracy / totalProfiles : 0,
      averageSatisfaction: totalProfiles > 0 ? totalSatisfaction / totalProfiles : 0,
      wasteReductionMetrics: this.wasteReductionMetrics,
      containersInCirculation: this.reusableContainers.size
    };
  }

  /**
   * Connect to growing system for harvest scheduling
   */
  scheduleHarvestForDistribution(userId, ingredient, requiredDate, amount) {
    // This would integrate with the growing system to schedule harvests
    // based on distribution requirements
    
    const harvestRequest = {
      userId,
      ingredient,
      amount,
      requiredDate,
      freshness: 'optimal',
      qualityRequirements: this.getQualityRequirements(userId, ingredient),
      requestedAt: new Date()
    };

    this.logDistributionEvent('harvest_scheduled', harvestRequest);
    return harvestRequest;
  }

  /**
   * Get quality requirements for user and ingredient
   */
  getQualityRequirements(userId, ingredient) {
    const profile = this.consumptionProfiles.get(userId);
    return profile.growingIntegration.qualityPreferences[ingredient] || {
      freshness: 'optimal',
      size: 'medium',
      ripeness: 'perfect'
    };
  }

  /**
   * Log distribution events
   */
  logDistributionEvent(eventType, data) {
    console.log(`[DISTRIBUTION] ${eventType}:`, {
      timestamp: new Date(),
      ...data
    });
  }
}

module.exports = PrecisionDistributionService;
