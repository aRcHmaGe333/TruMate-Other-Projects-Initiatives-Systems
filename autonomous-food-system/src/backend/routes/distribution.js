const express = require('express');
const router = express.Router();
const PrecisionDistributionService = require('../services/PrecisionDistributionService');
const logger = require('../utils/logger');

// Initialize distribution service
const distributionService = new PrecisionDistributionService();

// Initialize sample consumption profiles
const initializeSampleProfiles = () => {
  const sampleUsers = [
    {
      userId: 'user_001',
      supermarketData: {
        monthlyPatterns: {
          lettuce: 800, // 800g per month
          tomato: 1200,
          herbs: 90,
          spinach: 600
        },
        preferences: {
          dietaryRestrictions: ['vegetarian'],
          favorites: ['lettuce', 'herbs'],
          culturalPreferences: ['mediterranean']
        }
      }
    },
    {
      userId: 'user_002',
      supermarketData: {
        monthlyPatterns: {
          lettuce: 400,
          tomato: 2000,
          herbs: 120,
          spinach: 300,
          cucumber: 800
        },
        preferences: {
          dietaryRestrictions: [],
          favorites: ['tomato', 'cucumber'],
          culturalPreferences: ['italian']
        }
      }
    }
  ];

  sampleUsers.forEach(userData => {
    const profile = distributionService.createConsumptionProfile(userData.userId, userData);
    
    // Simulate some consumption history
    const ingredients = Object.keys(userData.supermarketData.monthlyPatterns);
    ingredients.forEach(ingredient => {
      const monthlyAmount = userData.supermarketData.monthlyPatterns[ingredient];
      const dailyAmount = monthlyAmount / 30;
      
      // Simulate 30 days of consumption with some variation
      for (let day = 0; day < 30; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        const variation = 0.8 + Math.random() * 0.4; // 80-120% variation
        const portionServed = dailyAmount * variation;
        const wasteRate = 0.05 + Math.random() * 0.15; // 5-20% waste
        const portionConsumed = portionServed * (1 - wasteRate);
        
        distributionService.recordConsumption(
          userData.userId,
          ingredient,
          portionServed,
          portionConsumed,
          date
        );
      }
    });
    
    logger.info(`Initialized consumption profile for ${userData.userId}`);
  });
};

// GET /api/distribution/profiles - List all consumption profiles
router.get('/profiles', (req, res) => {
  try {
    const profiles = [];
    distributionService.consumptionProfiles.forEach((profile, userId) => {
      profiles.push({
        userId: profile.userId,
        householdId: profile.householdId,
        efficiency: profile.getEfficiencyMetrics(),
        ingredientsTracked: profile.wasteTracking.size,
        lastUpdate: profile.lastConsumptionUpdate
      });
    });

    res.json({
      profiles,
      total: profiles.length
    });
  } catch (error) {
    logger.error('Error retrieving consumption profiles:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve consumption profiles'
    });
  }
});

// GET /api/distribution/profiles/:userId - Get specific consumption profile
router.get('/profiles/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const profile = distributionService.getConsumptionProfile(userId);

    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Consumption profile for user ${userId} not found`
      });
    }

    res.json(profile.toJSON());
  } catch (error) {
    logger.error('Error retrieving consumption profile:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve consumption profile'
    });
  }
});

// POST /api/distribution/profiles - Create new consumption profile
router.post('/profiles', (req, res) => {
  try {
    const { userId, supermarketData, ...profileData } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'userId is required'
      });
    }

    const profile = distributionService.createConsumptionProfile(userId, {
      supermarketData,
      ...profileData
    });

    logger.info(`Created consumption profile for user ${userId}`);
    res.status(201).json(profile.toJSON());
  } catch (error) {
    logger.error('Error creating consumption profile:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create consumption profile'
    });
  }
});

// POST /api/distribution/consumption - Record consumption data
router.post('/consumption', (req, res) => {
  try {
    const { userId, ingredient, portionServed, portionConsumed, timestamp } = req.body;

    if (!userId || !ingredient || portionServed === undefined || portionConsumed === undefined) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'userId, ingredient, portionServed, and portionConsumed are required'
      });
    }

    const consumptionRecord = distributionService.recordConsumption(
      userId,
      ingredient,
      portionServed,
      portionConsumed,
      timestamp ? new Date(timestamp) : new Date()
    );

    logger.info(`Recorded consumption for user ${userId}: ${ingredient}`);
    res.json(consumptionRecord);
  } catch (error) {
    logger.error('Error recording consumption:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

// GET /api/distribution/schedule/:userId - Get distribution schedule
router.get('/schedule/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 7 } = req.query;

    const schedule = distributionService.generateDistributionSchedule(userId, parseInt(days));

    logger.info(`Generated distribution schedule for user ${userId} (${days} days)`);
    res.json({
      ...schedule,
      totalIngredients: Object.fromEntries(schedule.totalIngredients)
    });
  } catch (error) {
    logger.error('Error generating distribution schedule:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

// POST /api/distribution/containers/:containerId/return - Process container return
router.post('/containers/:containerId/return', (req, res) => {
  try {
    const { containerId } = req.params;
    const { condition = 'good' } = req.body;

    const container = distributionService.processContainerReturn(containerId, condition);

    logger.info(`Processed container return: ${containerId} (${condition})`);
    res.json(container);
  } catch (error) {
    logger.error('Error processing container return:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

// GET /api/distribution/predictions/:userId/:ingredient - Get consumption prediction
router.get('/predictions/:userId/:ingredient', (req, res) => {
  try {
    const { userId, ingredient } = req.params;
    const { days = 7 } = req.query;

    const profile = distributionService.getConsumptionProfile(userId);
    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Consumption profile for user ${userId} not found`
      });
    }

    const prediction = profile.predictDemand(ingredient, parseInt(days));

    res.json(prediction);
  } catch (error) {
    logger.error('Error generating consumption prediction:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate consumption prediction'
    });
  }
});

// POST /api/distribution/portions/:userId/:ingredient/adjust - Adjust portion size
router.post('/portions/:userId/:ingredient/adjust', async (req, res) => {
  try {
    const { userId, ingredient } = req.params;
    const { newPortion, userApproved = false } = req.body;

    const profile = distributionService.getConsumptionProfile(userId);
    if (!profile) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Consumption profile for user ${userId} not found`
      });
    }

    const adjustment = profile.applyPortionAdjustment(ingredient, newPortion, userApproved);

    logger.info(`Adjusted portion for user ${userId}: ${ingredient} -> ${newPortion}g`);
    res.json(adjustment);
  } catch (error) {
    logger.error('Error adjusting portion:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

// GET /api/distribution/metrics - Get system-wide distribution metrics
router.get('/metrics', (req, res) => {
  try {
    const metrics = distributionService.getDistributionMetrics();

    res.json(metrics);
  } catch (error) {
    logger.error('Error retrieving distribution metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve distribution metrics'
    });
  }
});

// GET /api/distribution/waste-reduction/:userId - Get waste reduction analysis
router.get('/waste-reduction/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const schedule = distributionService.generateDistributionSchedule(userId, parseInt(days));
    const wasteReduction = distributionService.estimateWasteReduction(userId, schedule);

    res.json({
      userId,
      period: `${days} days`,
      wasteReduction,
      generatedAt: new Date()
    });
  } catch (error) {
    logger.error('Error calculating waste reduction:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

// POST /api/distribution/harvest-request - Request harvest for distribution
router.post('/harvest-request', (req, res) => {
  try {
    const { userId, ingredient, requiredDate, amount } = req.body;

    if (!userId || !ingredient || !requiredDate || !amount) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'userId, ingredient, requiredDate, and amount are required'
      });
    }

    const harvestRequest = distributionService.scheduleHarvestForDistribution(
      userId,
      ingredient,
      new Date(requiredDate),
      amount
    );

    logger.info(`Scheduled harvest request for user ${userId}: ${ingredient}`);
    res.json(harvestRequest);
  } catch (error) {
    logger.error('Error scheduling harvest request:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to schedule harvest request'
    });
  }
});

// GET /api/distribution/dashboard - Distribution system dashboard
router.get('/dashboard', (req, res) => {
  try {
    const metrics = distributionService.getDistributionMetrics();
    
    // Get recent consumption activity
    const recentActivity = [];
    distributionService.consumptionProfiles.forEach((profile, userId) => {
      if (profile.lastConsumptionUpdate) {
        const daysSinceUpdate = (new Date() - profile.lastConsumptionUpdate) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 7) {
          recentActivity.push({
            userId,
            lastUpdate: profile.lastConsumptionUpdate,
            efficiency: profile.getEfficiencyMetrics()
          });
        }
      }
    });

    // Get container status
    const containerStatus = {
      total: distributionService.reusableContainers.size,
      available: 0,
      assigned: 0,
      cleaning: 0,
      retired: 0
    };

    distributionService.reusableContainers.forEach(container => {
      containerStatus[container.status]++;
    });

    const dashboard = {
      summary: {
        totalUsers: metrics.totalUsers,
        averageWasteRate: metrics.averageWasteRate,
        averageAccuracy: metrics.averageAccuracy,
        containersInCirculation: metrics.containersInCirculation
      },
      recentActivity,
      containerStatus,
      wasteReduction: metrics.wasteReductionMetrics,
      generatedAt: new Date()
    };

    res.json(dashboard);
  } catch (error) {
    logger.error('Error generating distribution dashboard:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate distribution dashboard'
    });
  }
});

// Initialize sample data
initializeSampleProfiles();

module.exports = router;
