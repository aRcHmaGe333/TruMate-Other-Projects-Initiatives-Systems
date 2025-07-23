const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

// In-memory analytics storage
const analyticsData = {
  recipeUsage: new Map(),
  cookingSessions: new Map(),
  systemMetrics: new Map(),
  userBehavior: new Map(),
  automationMetrics: new Map()
};

/**
 * Analytics Service
 * Handles data collection, processing, and reporting
 */
class AnalyticsService {
  static recordRecipeUsage(recipeId, recipeName, sessionData) {
    const key = recipeId;
    const existing = analyticsData.recipeUsage.get(key) || {
      recipeId,
      recipeName,
      totalUses: 0,
      totalCookingTime: 0,
      averageRating: 0,
      successRate: 0,
      completedSessions: 0,
      abortedSessions: 0,
      lastUsed: null,
      popularTimes: {},
      commonModifications: {},
      qualityMetrics: {}
    };

    existing.totalUses++;
    existing.lastUsed = new Date();
    
    if (sessionData.status === 'completed') {
      existing.completedSessions++;
      existing.totalCookingTime += sessionData.duration || 0;
    } else if (sessionData.status === 'aborted') {
      existing.abortedSessions++;
    }

    existing.successRate = existing.completedSessions / existing.totalUses;

    // Track popular cooking times
    const hour = new Date().getHours();
    existing.popularTimes[hour] = (existing.popularTimes[hour] || 0) + 1;

    analyticsData.recipeUsage.set(key, existing);
    
    logger.info(`Recorded recipe usage: ${recipeName} (${recipeId})`);
  }

  static recordSystemMetric(metric, value, metadata = {}) {
    const timestamp = new Date();
    const key = `${metric}_${timestamp.toISOString().split('T')[0]}`;
    
    const existing = analyticsData.systemMetrics.get(key) || {
      metric,
      date: timestamp.toISOString().split('T')[0],
      values: [],
      min: Infinity,
      max: -Infinity,
      average: 0,
      count: 0
    };

    existing.values.push({ value, timestamp, metadata });
    existing.count++;
    existing.min = Math.min(existing.min, value);
    existing.max = Math.max(existing.max, value);
    existing.average = existing.values.reduce((sum, v) => sum + v.value, 0) / existing.count;

    analyticsData.systemMetrics.set(key, existing);
  }

  static recordAutomationMetric(recipeId, automationLevel, sensorData, success) {
    const key = `${recipeId}_${automationLevel}`;
    const existing = analyticsData.automationMetrics.get(key) || {
      recipeId,
      automationLevel,
      totalAttempts: 0,
      successfulAttempts: 0,
      successRate: 0,
      averageSensorReadings: 0,
      commonIssues: {},
      performanceMetrics: {
        accuracy: 0,
        efficiency: 0,
        reliability: 0
      }
    };

    existing.totalAttempts++;
    if (success) {
      existing.successfulAttempts++;
    }
    existing.successRate = existing.successfulAttempts / existing.totalAttempts;
    
    if (sensorData && sensorData.length) {
      existing.averageSensorReadings = 
        (existing.averageSensorReadings + sensorData.length) / 2;
    }

    analyticsData.automationMetrics.set(key, existing);
  }

  static getRecipeAnalytics(recipeId) {
    return analyticsData.recipeUsage.get(recipeId);
  }

  static getTopRecipes(limit = 10) {
    return Array.from(analyticsData.recipeUsage.values())
      .sort((a, b) => b.totalUses - a.totalUses)
      .slice(0, limit);
  }

  static getSystemHealth() {
    const metrics = Array.from(analyticsData.systemMetrics.values());
    const recent = metrics.filter(m => {
      const metricDate = new Date(m.date);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return metricDate >= dayAgo;
    });

    return {
      totalMetrics: metrics.length,
      recentMetrics: recent.length,
      systemStatus: recent.length > 0 ? 'active' : 'inactive',
      lastUpdate: recent.length > 0 ? 
        Math.max(...recent.map(m => new Date(m.date))) : null
    };
  }

  static getAutomationInsights() {
    const automationData = Array.from(analyticsData.automationMetrics.values());
    
    const byLevel = automationData.reduce((acc, data) => {
      if (!acc[data.automationLevel]) {
        acc[data.automationLevel] = {
          totalAttempts: 0,
          successfulAttempts: 0,
          recipes: 0
        };
      }
      acc[data.automationLevel].totalAttempts += data.totalAttempts;
      acc[data.automationLevel].successfulAttempts += data.successfulAttempts;
      acc[data.automationLevel].recipes++;
      return acc;
    }, {});

    Object.keys(byLevel).forEach(level => {
      const data = byLevel[level];
      data.successRate = data.successfulAttempts / data.totalAttempts;
    });

    return {
      byAutomationLevel: byLevel,
      totalRecipesWithAutomation: automationData.length,
      overallSuccessRate: automationData.reduce((sum, d) => sum + d.successRate, 0) / automationData.length
    };
  }
}

// GET /api/analytics/dashboard - Main analytics dashboard
router.get('/dashboard', (req, res) => {
  try {
    const topRecipes = AnalyticsService.getTopRecipes(5);
    const systemHealth = AnalyticsService.getSystemHealth();
    const automationInsights = AnalyticsService.getAutomationInsights();

    const totalSessions = Array.from(analyticsData.recipeUsage.values())
      .reduce((sum, recipe) => sum + recipe.totalUses, 0);

    const averageSuccessRate = Array.from(analyticsData.recipeUsage.values())
      .reduce((sum, recipe) => sum + recipe.successRate, 0) / 
      analyticsData.recipeUsage.size;

    res.json({
      summary: {
        totalRecipes: analyticsData.recipeUsage.size,
        totalSessions,
        averageSuccessRate: averageSuccessRate || 0,
        systemStatus: systemHealth.systemStatus
      },
      topRecipes,
      systemHealth,
      automationInsights,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error generating analytics dashboard:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate analytics dashboard'
    });
  }
});

// GET /api/analytics/recipes - Recipe analytics
router.get('/recipes', (req, res) => {
  try {
    const { recipeId, limit = 20, sortBy = 'totalUses' } = req.query;

    if (recipeId) {
      const analytics = AnalyticsService.getRecipeAnalytics(recipeId);
      if (!analytics) {
        return res.status(404).json({
          error: 'Not Found',
          message: `Analytics for recipe ${recipeId} not found`
        });
      }
      return res.json(analytics);
    }

    const allRecipes = Array.from(analyticsData.recipeUsage.values())
      .sort((a, b) => b[sortBy] - a[sortBy])
      .slice(0, parseInt(limit));

    res.json({
      recipes: allRecipes,
      total: analyticsData.recipeUsage.size,
      sortBy,
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error retrieving recipe analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve recipe analytics'
    });
  }
});

// GET /api/analytics/system - System performance metrics
router.get('/system', (req, res) => {
  try {
    const { metric, days = 7 } = req.query;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let metrics = Array.from(analyticsData.systemMetrics.values())
      .filter(m => new Date(m.date) >= cutoffDate);

    if (metric) {
      metrics = metrics.filter(m => m.metric === metric);
    }

    const summary = {
      totalMetrics: metrics.length,
      dateRange: {
        from: cutoffDate.toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
      },
      metrics: metrics.sort((a, b) => new Date(b.date) - new Date(a.date))
    };

    res.json(summary);
  } catch (error) {
    logger.error('Error retrieving system metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve system metrics'
    });
  }
});

// GET /api/analytics/automation - Automation performance
router.get('/automation', (req, res) => {
  try {
    const insights = AnalyticsService.getAutomationInsights();
    const detailedMetrics = Array.from(analyticsData.automationMetrics.values());

    res.json({
      insights,
      detailedMetrics,
      recommendations: generateAutomationRecommendations(insights)
    });
  } catch (error) {
    logger.error('Error retrieving automation analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve automation analytics'
    });
  }
});

// POST /api/analytics/record - Record custom analytics event
router.post('/record', (req, res) => {
  try {
    const { type, data } = req.body;

    if (!type || !data) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Type and data are required'
      });
    }

    switch (type) {
      case 'recipe_usage':
        AnalyticsService.recordRecipeUsage(
          data.recipeId,
          data.recipeName,
          data.sessionData
        );
        break;
      
      case 'system_metric':
        AnalyticsService.recordSystemMetric(
          data.metric,
          data.value,
          data.metadata
        );
        break;
      
      case 'automation_metric':
        AnalyticsService.recordAutomationMetric(
          data.recipeId,
          data.automationLevel,
          data.sensorData,
          data.success
        );
        break;
      
      default:
        return res.status(400).json({
          error: 'Validation Error',
          message: `Unknown analytics type: ${type}`
        });
    }

    res.json({
      message: 'Analytics event recorded successfully',
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error recording analytics event:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record analytics event'
    });
  }
});

// GET /api/analytics/trends - Trend analysis
router.get('/trends', (req, res) => {
  try {
    const { period = 'week', metric = 'usage' } = req.query;
    
    const trends = analyzeTrends(period, metric);
    
    res.json({
      period,
      metric,
      trends,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error analyzing trends:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to analyze trends'
    });
  }
});

// Helper functions
function generateAutomationRecommendations(insights) {
  const recommendations = [];
  
  if (insights.overallSuccessRate < 0.8) {
    recommendations.push({
      type: 'improvement',
      priority: 'high',
      message: 'Overall automation success rate is below 80%. Consider reviewing sensor calibration and automation logic.'
    });
  }
  
  Object.entries(insights.byAutomationLevel).forEach(([level, data]) => {
    if (data.successRate < 0.7) {
      recommendations.push({
        type: 'level_specific',
        priority: 'medium',
        level,
        message: `${level} automation has low success rate (${(data.successRate * 100).toFixed(1)}%). Review recipes using this automation level.`
      });
    }
  });
  
  return recommendations;
}

function analyzeTrends(period, metric) {
  // Placeholder for trend analysis
  // In a real implementation, this would analyze historical data
  return {
    direction: 'increasing',
    change: 15.3,
    confidence: 0.85,
    dataPoints: []
  };
}

// Initialize with some sample data
AnalyticsService.recordRecipeUsage('recipe_1', 'Sample Recipe', {
  status: 'completed',
  duration: 1800000 // 30 minutes
});

AnalyticsService.recordSystemMetric('response_time', 150, { endpoint: '/api/recipes' });
AnalyticsService.recordAutomationMetric('recipe_1', 'semi_automated', [], true);

module.exports = router;
