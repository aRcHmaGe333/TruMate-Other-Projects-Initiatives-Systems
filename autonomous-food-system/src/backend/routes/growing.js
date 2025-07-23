const express = require('express');
const router = express.Router();
const GrowingModule = require('../models/GrowingModule');
const logger = require('../utils/logger');

// In-memory storage for growing modules (will be replaced with database)
const growingModules = new Map();

/**
 * Initialize sample growing modules
 */
const initializeSampleModules = () => {
  const sampleModules = [
    {
      name: 'Greenhouse-Alpha',
      location: { lat: 40.7128, lng: -74.0060, altitude: 10 },
      moduleType: 'greenhouse',
      dimensions: { length: 10, width: 8, height: 4 },
      capacity: 500,
      status: 'active'
    },
    {
      name: 'Vertical-Beta',
      location: { lat: 40.7589, lng: -73.9851, altitude: 50 },
      moduleType: 'vertical_hydroponic',
      dimensions: { length: 4, width: 4, height: 6 },
      capacity: 200,
      status: 'active'
    },
    {
      name: 'Aquaponic-Gamma',
      location: { lat: 40.6782, lng: -73.9442, altitude: 5 },
      moduleType: 'aquaponic',
      dimensions: { length: 6, width: 6, height: 3 },
      capacity: 300,
      status: 'maintenance'
    }
  ];

  sampleModules.forEach(moduleData => {
    const module = new GrowingModule(moduleData);
    
    // Start some sample growing cycles
    if (module.status === 'active') {
      try {
        module.startGrowingCycle({
          cropVariety: 'lettuce',
          plantCount: 50,
          section: 'section_1'
        });
        
        module.startGrowingCycle({
          cropVariety: 'herbs',
          plantCount: 30,
          section: 'section_2'
        });
      } catch (error) {
        logger.error(`Error starting sample cycles for ${module.name}:`, error);
      }
    }
    
    growingModules.set(module.id, module);
    logger.info(`Initialized growing module: ${module.name} (${module.id})`);
  });
};

// GET /api/growing/modules - List all growing modules
router.get('/modules', (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      moduleType,
      location,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;

    let moduleList = Array.from(growingModules.values());

    // Apply filters
    if (status) {
      moduleList = moduleList.filter(module => module.status === status);
    }
    
    if (moduleType) {
      moduleList = moduleList.filter(module => module.moduleType === moduleType);
    }

    // Apply sorting
    moduleList.sort((a, b) => {
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
    const paginatedModules = moduleList.slice(startIndex, endIndex);

    res.json({
      modules: paginatedModules.map(module => module.getStatus()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: moduleList.length,
        pages: Math.ceil(moduleList.length / limit)
      }
    });

    logger.info(`Retrieved ${paginatedModules.length} growing modules`);
  } catch (error) {
    logger.error('Error retrieving growing modules:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve growing modules'
    });
  }
});

// GET /api/growing/modules/:id - Get specific growing module
router.get('/modules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const module = growingModules.get(id);

    if (!module) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Growing module with id ${id} not found`
      });
    }

    res.json(module.toJSON());
    logger.info(`Retrieved growing module: ${module.name}`);
  } catch (error) {
    logger.error('Error retrieving growing module:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve growing module'
    });
  }
});

// POST /api/growing/modules - Create new growing module
router.post('/modules', (req, res) => {
  try {
    const module = new GrowingModule(req.body);
    growingModules.set(module.id, module);

    logger.info(`Created new growing module: ${module.name} (${module.id})`);
    res.status(201).json(module.toJSON());
  } catch (error) {
    logger.error('Error creating growing module:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create growing module'
    });
  }
});

// PUT /api/growing/modules/:id - Update growing module
router.put('/modules/:id', (req, res) => {
  try {
    const { id } = req.params;
    const module = growingModules.get(id);

    if (!module) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Growing module with id ${id} not found`
      });
    }

    // Update module properties
    Object.keys(req.body).forEach(key => {
      if (key !== 'id' && module.hasOwnProperty(key)) {
        module[key] = req.body[key];
      }
    });
    
    module.updatedAt = new Date();
    growingModules.set(id, module);

    logger.info(`Updated growing module: ${module.name} (${id})`);
    res.json(module.toJSON());
  } catch (error) {
    logger.error('Error updating growing module:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update growing module'
    });
  }
});

// POST /api/growing/modules/:id/cycles - Start new growing cycle
router.post('/modules/:id/cycles', (req, res) => {
  try {
    const { id } = req.params;
    const module = growingModules.get(id);

    if (!module) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Growing module with id ${id} not found`
      });
    }

    const cycle = module.startGrowingCycle(req.body);
    growingModules.set(id, module);

    logger.info(`Started growing cycle: ${cycle.cropVariety} in ${module.name}`);
    res.status(201).json(cycle);
  } catch (error) {
    logger.error('Error starting growing cycle:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

// POST /api/growing/modules/:id/cycles/:cycleId/harvest - Harvest growing cycle
router.post('/modules/:id/cycles/:cycleId/harvest', (req, res) => {
  try {
    const { id, cycleId } = req.params;
    const module = growingModules.get(id);

    if (!module) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Growing module with id ${id} not found`
      });
    }

    const harvestedCycle = module.harvestCycle(cycleId, req.body);
    growingModules.set(id, module);

    logger.info(`Harvested cycle: ${harvestedCycle.cropVariety} from ${module.name}`);
    res.json(harvestedCycle);
  } catch (error) {
    logger.error('Error harvesting cycle:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: error.message
    });
  }
});

// POST /api/growing/modules/:id/environment - Update environmental settings
router.post('/modules/:id/environment', (req, res) => {
  try {
    const { id } = req.params;
    const module = growingModules.get(id);

    if (!module) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Growing module with id ${id} not found`
      });
    }

    module.updateEnvironmentalSettings(req.body);
    growingModules.set(id, module);

    logger.info(`Updated environmental settings for ${module.name}`);
    res.json({
      message: 'Environmental settings updated successfully',
      settings: module.environmentalSystems
    });
  } catch (error) {
    logger.error('Error updating environmental settings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update environmental settings'
    });
  }
});

// POST /api/growing/modules/:id/sensors - Update sensor data
router.post('/modules/:id/sensors', (req, res) => {
  try {
    const { id } = req.params;
    const { sensorType, readings } = req.body;
    const module = growingModules.get(id);

    if (!module) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Growing module with id ${id} not found`
      });
    }

    module.updateSensorData(sensorType, readings);
    growingModules.set(id, module);

    res.json({
      message: 'Sensor data updated successfully',
      sensorType,
      readings,
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Error updating sensor data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update sensor data'
    });
  }
});

// GET /api/growing/inventory - Get available ingredients for cooking system
router.get('/inventory', (req, res) => {
  try {
    const inventory = [];
    
    growingModules.forEach(module => {
      module.activeCycles.forEach(cycle => {
        // Check if cycle is ready for harvest (within 3 days)
        const daysUntilHarvest = Math.ceil((cycle.expectedHarvestDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilHarvest <= 3) {
          inventory.push({
            moduleId: module.id,
            moduleName: module.name,
            cycleId: cycle.id,
            ingredient: cycle.cropVariety,
            estimatedAmount: cycle.plantCount * 0.1, // rough estimate kg per plant
            quality: 'fresh',
            availableDate: cycle.expectedHarvestDate,
            daysUntilReady: Math.max(0, daysUntilHarvest)
          });
        }
      });
    });

    res.json({
      inventory,
      totalItems: inventory.length,
      generatedAt: new Date()
    });

    logger.info(`Generated inventory with ${inventory.length} available ingredients`);
  } catch (error) {
    logger.error('Error generating inventory:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate inventory'
    });
  }
});

// GET /api/growing/dashboard - Growing system dashboard data
router.get('/dashboard', (req, res) => {
  try {
    const modules = Array.from(growingModules.values());
    
    const dashboard = {
      summary: {
        totalModules: modules.length,
        activeModules: modules.filter(m => m.status === 'active').length,
        totalActiveCycles: modules.reduce((sum, m) => sum + m.activeCycles.length, 0),
        totalYield: modules.reduce((sum, m) => sum + m.performance.totalYield, 0),
        averageUptime: modules.reduce((sum, m) => sum + m.performance.uptime, 0) / modules.length
      },
      moduleStatus: modules.map(module => ({
        id: module.id,
        name: module.name,
        status: module.status,
        activeCycles: module.activeCycles.length,
        performance: module.performance
      })),
      upcomingHarvests: [],
      alerts: []
    };

    // Calculate upcoming harvests
    modules.forEach(module => {
      module.activeCycles.forEach(cycle => {
        const daysUntilHarvest = Math.ceil((cycle.expectedHarvestDate - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilHarvest <= 7) {
          dashboard.upcomingHarvests.push({
            moduleId: module.id,
            moduleName: module.name,
            cycleId: cycle.id,
            cropVariety: cycle.cropVariety,
            expectedDate: cycle.expectedHarvestDate,
            daysUntilHarvest
          });
        }
      });
    });

    res.json(dashboard);
    logger.info('Generated growing system dashboard');
  } catch (error) {
    logger.error('Error generating dashboard:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to generate dashboard'
    });
  }
});

// Initialize sample data
initializeSampleModules();

module.exports = router;
