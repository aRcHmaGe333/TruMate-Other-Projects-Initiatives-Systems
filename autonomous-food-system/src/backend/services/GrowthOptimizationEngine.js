/**
 * Growth Optimization Engine - AI-driven optimization for autonomous growing
 * Implements multi-objective optimization for yield, resource efficiency, and quality
 */

class GrowthOptimizationEngine {
  constructor() {
    this.optimizationHistory = new Map();
    this.learningData = new Map();
    this.globalBenchmarks = {
      yieldPerSquareMeter: { lettuce: 25, tomato: 40, herbs: 15 }, // kg/m²/year
      waterEfficiency: { lettuce: 20, tomato: 15, herbs: 25 }, // L water per kg yield
      energyEfficiency: { lettuce: 6, tomato: 8, herbs: 4 }, // kWh per kg yield
      growthRate: { lettuce: 0.8, tomato: 0.6, herbs: 1.2 } // relative growth speed
    };
  }

  /**
   * Optimize growing parameters for a specific module and crop
   */
  optimizeGrowingParameters(moduleId, cropVariety, currentConditions, performanceData) {
    const optimization = {
      moduleId,
      cropVariety,
      timestamp: new Date(),
      currentConditions,
      performanceData,
      recommendations: {},
      expectedImprovements: {},
      confidence: 0
    };

    // Multi-objective optimization
    const yieldOptimization = this.optimizeForYield(cropVariety, currentConditions, performanceData);
    const resourceOptimization = this.optimizeForResourceEfficiency(cropVariety, currentConditions);
    const qualityOptimization = this.optimizeForQuality(cropVariety, currentConditions);
    const speedOptimization = this.optimizeForGrowthSpeed(cropVariety, currentConditions);

    // Weighted combination of objectives
    const weights = {
      yield: 0.35,
      resource: 0.25,
      quality: 0.25,
      speed: 0.15
    };

    optimization.recommendations = this.combineOptimizations([
      { optimization: yieldOptimization, weight: weights.yield },
      { optimization: resourceOptimization, weight: weights.resource },
      { optimization: qualityOptimization, weight: weights.quality },
      { optimization: speedOptimization, weight: weights.speed }
    ]);

    // Calculate expected improvements
    optimization.expectedImprovements = this.calculateExpectedImprovements(
      cropVariety, 
      currentConditions, 
      optimization.recommendations
    );

    // Confidence based on historical data and similarity to known conditions
    optimization.confidence = this.calculateConfidence(moduleId, cropVariety, currentConditions);

    // Store optimization for learning
    this.storeOptimization(moduleId, optimization);

    return optimization;
  }

  /**
   * Optimize for maximum yield
   */
  optimizeForYield(cropVariety, currentConditions, performanceData) {
    const recommendations = {};
    
    // Lighting optimization
    const optimalLighting = this.getOptimalLighting(cropVariety);
    if (Math.abs(currentConditions.lighting.intensity - optimalLighting.intensity) > 5) {
      recommendations.lighting = {
        intensity: optimalLighting.intensity,
        photoperiod: optimalLighting.photoperiod,
        spectrum: optimalLighting.spectrum,
        reason: 'Optimize photosynthetic efficiency for maximum yield'
      };
    }

    // Temperature optimization
    const optimalTemp = this.getOptimalTemperature(cropVariety);
    if (Math.abs(currentConditions.temperature - optimalTemp.day) > 2) {
      recommendations.temperature = {
        day: optimalTemp.day,
        night: optimalTemp.night,
        reason: 'Optimize metabolic rate for maximum growth'
      };
    }

    // Nutrient optimization
    const optimalNutrients = this.getOptimalNutrients(cropVariety);
    recommendations.nutrients = {
      ec: optimalNutrients.ec,
      ph: optimalNutrients.ph,
      ratios: optimalNutrients.ratios,
      reason: 'Optimize nutrient uptake for maximum yield'
    };

    return recommendations;
  }

  /**
   * Optimize for resource efficiency (water, energy, nutrients)
   */
  optimizeForResourceEfficiency(cropVariety, currentConditions) {
    const recommendations = {};

    // Water efficiency optimization
    recommendations.irrigation = {
      frequency: this.calculateOptimalIrrigationFrequency(cropVariety),
      duration: this.calculateOptimalIrrigationDuration(cropVariety),
      timing: 'early_morning', // Reduce evaporation
      reason: 'Minimize water usage while maintaining growth'
    };

    // Energy efficiency optimization
    recommendations.lighting = {
      schedule: this.calculateEnergyEfficientLightingSchedule(cropVariety),
      intensity_modulation: true, // Vary intensity based on growth stage
      reason: 'Reduce energy consumption while maintaining photosynthesis'
    };

    // Nutrient efficiency
    recommendations.nutrients = {
      precision_dosing: true,
      recycling_rate: 0.95, // 95% nutrient solution recycling
      reason: 'Minimize nutrient waste through precision application'
    };

    return recommendations;
  }

  /**
   * Optimize for crop quality (nutrition, taste, shelf life)
   */
  optimizeForQuality(cropVariety, currentConditions) {
    const recommendations = {};

    // Stress optimization for quality enhancement
    if (cropVariety === 'lettuce' || cropVariety === 'herbs') {
      recommendations.controlled_stress = {
        water_stress: { level: 'mild', timing: 'pre_harvest' },
        temperature_stress: { night_reduction: 2 }, // Cooler nights
        reason: 'Controlled stress increases antioxidants and flavor compounds'
      };
    }

    // Light spectrum optimization for quality
    recommendations.lighting = {
      spectrum_adjustment: {
        red_ratio: this.getQualityOptimizedSpectrum(cropVariety).red,
        blue_ratio: this.getQualityOptimizedSpectrum(cropVariety).blue,
        uv_supplementation: cropVariety === 'herbs' ? 'low' : 'none'
      },
      reason: 'Optimize light spectrum for nutritional content and flavor'
    };

    return recommendations;
  }

  /**
   * Optimize for growth speed
   */
  optimizeForGrowthSpeed(cropVariety, currentConditions) {
    const recommendations = {};

    // Accelerated growth conditions
    recommendations.environment = {
      co2_enrichment: {
        level: 1200, // ppm
        timing: 'daylight_hours',
        reason: 'CO2 enrichment accelerates photosynthesis and growth'
      },
      temperature_boost: {
        increase: 1, // 1°C above optimal
        duration: 'vegetative_stage',
        reason: 'Slightly elevated temperature increases metabolic rate'
      }
    };

    // Nutrient boost for rapid growth
    recommendations.nutrients = {
      nitrogen_boost: {
        increase: 0.1, // 10% increase in nitrogen
        timing: 'early_growth',
        reason: 'Higher nitrogen promotes rapid vegetative growth'
      }
    };

    return recommendations;
  }

  /**
   * Combine multiple optimization objectives with weights
   */
  combineOptimizations(weightedOptimizations) {
    const combined = {};
    const categories = ['lighting', 'temperature', 'nutrients', 'irrigation', 'environment'];

    categories.forEach(category => {
      const categoryRecommendations = [];
      let totalWeight = 0;

      weightedOptimizations.forEach(({ optimization, weight }) => {
        if (optimization[category]) {
          categoryRecommendations.push({ recommendation: optimization[category], weight });
          totalWeight += weight;
        }
      });

      if (categoryRecommendations.length > 0) {
        combined[category] = this.weightedAverage(categoryRecommendations, totalWeight);
      }
    });

    return combined;
  }

  /**
   * Calculate weighted average of recommendations
   */
  weightedAverage(recommendations, totalWeight) {
    // For now, return the highest weighted recommendation
    // In a real system, this would intelligently combine numeric values
    const sorted = recommendations.sort((a, b) => b.weight - a.weight);
    return sorted[0].recommendation;
  }

  /**
   * Calculate expected improvements from optimization
   */
  calculateExpectedImprovements(cropVariety, currentConditions, recommendations) {
    const improvements = {
      yield_increase: 0,
      resource_savings: {
        water: 0,
        energy: 0,
        nutrients: 0
      },
      quality_improvement: 0,
      growth_acceleration: 0
    };

    // Estimate improvements based on optimization changes
    if (recommendations.lighting) {
      improvements.yield_increase += 0.15; // 15% yield increase from lighting optimization
      improvements.growth_acceleration += 0.10; // 10% faster growth
    }

    if (recommendations.nutrients) {
      improvements.yield_increase += 0.12; // 12% yield increase from nutrient optimization
      improvements.resource_savings.nutrients = 0.20; // 20% nutrient savings
    }

    if (recommendations.irrigation) {
      improvements.resource_savings.water = 0.25; // 25% water savings
    }

    if (recommendations.environment && recommendations.environment.co2_enrichment) {
      improvements.yield_increase += 0.20; // 20% yield increase from CO2 enrichment
      improvements.growth_acceleration += 0.15; // 15% faster growth
    }

    return improvements;
  }

  /**
   * Calculate confidence in optimization recommendations
   */
  calculateConfidence(moduleId, cropVariety, currentConditions) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on historical data
    const historicalData = this.learningData.get(`${moduleId}_${cropVariety}`);
    if (historicalData && historicalData.length > 0) {
      confidence += Math.min(0.3, historicalData.length * 0.05); // Up to 30% boost from history
    }

    // Increase confidence for well-known crops
    const knownCrops = ['lettuce', 'tomato', 'herbs', 'spinach'];
    if (knownCrops.includes(cropVariety)) {
      confidence += 0.2; // 20% boost for known crops
    }

    // Decrease confidence for extreme conditions
    if (this.hasExtremeConditions(currentConditions)) {
      confidence -= 0.2; // 20% penalty for extreme conditions
    }

    return Math.max(0.1, Math.min(0.95, confidence)); // Clamp between 10% and 95%
  }

  /**
   * Store optimization for machine learning
   */
  storeOptimization(moduleId, optimization) {
    const key = `${moduleId}_${optimization.cropVariety}`;
    
    if (!this.learningData.has(key)) {
      this.learningData.set(key, []);
    }
    
    this.learningData.get(key).push({
      timestamp: optimization.timestamp,
      conditions: optimization.currentConditions,
      recommendations: optimization.recommendations,
      expectedImprovements: optimization.expectedImprovements,
      confidence: optimization.confidence
    });

    // Keep only last 100 optimizations per module/crop combination
    const data = this.learningData.get(key);
    if (data.length > 100) {
      data.splice(0, data.length - 100);
    }
  }

  /**
   * Learn from actual results and update optimization algorithms
   */
  updateFromResults(moduleId, cropVariety, actualResults, previousOptimization) {
    const key = `${moduleId}_${cropVariety}`;
    const learningEntry = {
      timestamp: new Date(),
      optimization: previousOptimization,
      actualResults,
      accuracy: this.calculateAccuracy(previousOptimization.expectedImprovements, actualResults),
      lessons: this.extractLessons(previousOptimization, actualResults)
    };

    // Store learning data
    if (!this.optimizationHistory.has(key)) {
      this.optimizationHistory.set(key, []);
    }
    this.optimizationHistory.get(key).push(learningEntry);

    // Update optimization algorithms based on results
    this.updateAlgorithms(learningEntry);
  }

  /**
   * Get optimal lighting parameters for crop variety
   */
  getOptimalLighting(cropVariety) {
    const lightingParams = {
      lettuce: { intensity: 200, photoperiod: 14, spectrum: { red: 0.7, blue: 0.3 } },
      tomato: { intensity: 400, photoperiod: 16, spectrum: { red: 0.8, blue: 0.2 } },
      herbs: { intensity: 150, photoperiod: 12, spectrum: { red: 0.6, blue: 0.4 } },
      spinach: { intensity: 180, photoperiod: 14, spectrum: { red: 0.7, blue: 0.3 } }
    };
    return lightingParams[cropVariety] || lightingParams.lettuce;
  }

  /**
   * Get optimal temperature parameters for crop variety
   */
  getOptimalTemperature(cropVariety) {
    const tempParams = {
      lettuce: { day: 20, night: 16 },
      tomato: { day: 24, night: 18 },
      herbs: { day: 22, night: 18 },
      spinach: { day: 18, night: 14 }
    };
    return tempParams[cropVariety] || tempParams.lettuce;
  }

  /**
   * Get optimal nutrient parameters for crop variety
   */
  getOptimalNutrients(cropVariety) {
    const nutrientParams = {
      lettuce: { ec: 1.2, ph: 6.0, ratios: { n: 1.0, p: 0.5, k: 1.5 } },
      tomato: { ec: 2.0, ph: 6.2, ratios: { n: 1.0, p: 0.4, k: 1.8 } },
      herbs: { ec: 1.4, ph: 6.5, ratios: { n: 1.2, p: 0.3, k: 1.0 } },
      spinach: { ec: 1.8, ph: 6.0, ratios: { n: 1.5, p: 0.5, k: 1.2 } }
    };
    return nutrientParams[cropVariety] || nutrientParams.lettuce;
  }

  /**
   * Calculate optimal irrigation frequency based on crop and growth stage
   */
  calculateOptimalIrrigationFrequency(cropVariety) {
    const frequencies = {
      lettuce: 6, // times per day
      tomato: 4,
      herbs: 8,
      spinach: 5
    };
    return frequencies[cropVariety] || 6;
  }

  /**
   * Calculate optimal irrigation duration
   */
  calculateOptimalIrrigationDuration(cropVariety) {
    const durations = {
      lettuce: 15, // minutes
      tomato: 20,
      herbs: 10,
      spinach: 12
    };
    return durations[cropVariety] || 15;
  }

  /**
   * Calculate energy-efficient lighting schedule
   */
  calculateEnergyEfficientLightingSchedule(cropVariety) {
    // Optimize for off-peak energy hours while maintaining photoperiod
    return {
      on_time: '06:00',
      off_time: '20:00',
      intensity_curve: 'gradual_ramp', // Gradual increase/decrease
      peak_hours_reduction: 0.8 // 20% reduction during peak energy hours
    };
  }

  /**
   * Get quality-optimized light spectrum
   */
  getQualityOptimizedSpectrum(cropVariety) {
    const qualitySpectrums = {
      lettuce: { red: 0.6, blue: 0.4 }, // Higher blue for antioxidants
      tomato: { red: 0.85, blue: 0.15 }, // Higher red for fruit development
      herbs: { red: 0.5, blue: 0.5 } // Balanced for essential oils
    };
    return qualitySpectrums[cropVariety] || qualitySpectrums.lettuce;
  }

  /**
   * Check if conditions are extreme
   */
  hasExtremeConditions(conditions) {
    return (
      conditions.temperature < 10 || conditions.temperature > 35 ||
      conditions.humidity < 30 || conditions.humidity > 90 ||
      conditions.lighting?.intensity < 50 || conditions.lighting?.intensity > 500
    );
  }

  /**
   * Calculate accuracy of previous predictions
   */
  calculateAccuracy(expected, actual) {
    if (!expected || !actual) return 0;
    
    let totalAccuracy = 0;
    let count = 0;

    if (expected.yield_increase && actual.yield_increase) {
      const accuracy = 1 - Math.abs(expected.yield_increase - actual.yield_increase) / expected.yield_increase;
      totalAccuracy += Math.max(0, accuracy);
      count++;
    }

    return count > 0 ? totalAccuracy / count : 0;
  }

  /**
   * Extract lessons from optimization results
   */
  extractLessons(optimization, results) {
    const lessons = [];
    
    if (results.yield_increase > optimization.expectedImprovements.yield_increase * 1.2) {
      lessons.push('Optimization was more effective than expected - consider more aggressive parameters');
    } else if (results.yield_increase < optimization.expectedImprovements.yield_increase * 0.8) {
      lessons.push('Optimization was less effective than expected - review parameter calculations');
    }

    return lessons;
  }

  /**
   * Update optimization algorithms based on learning
   */
  updateAlgorithms(learningEntry) {
    // In a real system, this would update ML models
    // For now, we log the learning for future algorithm improvements
    console.log('Learning from optimization results:', {
      accuracy: learningEntry.accuracy,
      lessons: learningEntry.lessons
    });
  }

  /**
   * Get optimization recommendations for a module
   */
  getRecommendations(moduleId, cropVariety, currentConditions, performanceData) {
    return this.optimizeGrowingParameters(moduleId, cropVariety, currentConditions, performanceData);
  }

  /**
   * Get global performance benchmarks
   */
  getBenchmarks(cropVariety) {
    return {
      yieldPerSquareMeter: this.globalBenchmarks.yieldPerSquareMeter[cropVariety],
      waterEfficiency: this.globalBenchmarks.waterEfficiency[cropVariety],
      energyEfficiency: this.globalBenchmarks.energyEfficiency[cropVariety],
      growthRate: this.globalBenchmarks.growthRate[cropVariety]
    };
  }
}

module.exports = GrowthOptimizationEngine;
