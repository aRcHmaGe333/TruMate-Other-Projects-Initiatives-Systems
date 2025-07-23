/**
 * Growing Module Model - Core data structure for autonomous growing chambers
 * Implements the AgroBotGrid modular growing system
 */

class GrowingModule {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.name = data.name || `Module-${this.id.slice(-8)}`;
    this.location = data.location || { lat: 0, lng: 0, altitude: 0 };
    this.moduleType = data.moduleType || 'vertical_hydroponic'; // vertical_hydroponic, greenhouse, aquaponic
    this.dimensions = data.dimensions || { length: 2, width: 2, height: 3 }; // meters
    this.capacity = data.capacity || 100; // number of plants
    this.status = data.status || 'initializing'; // initializing, active, maintenance, offline
    
    // Environmental control systems
    this.environmentalSystems = data.environmentalSystems || {
      lighting: {
        type: 'LED_full_spectrum',
        intensity: 100, // percentage
        schedule: '16h_on_8h_off',
        spectrum: { red: 660, blue: 450, white: 5000 } // wavelengths in nm
      },
      climate: {
        temperature: { target: 22, min: 18, max: 28 }, // Celsius
        humidity: { target: 65, min: 50, max: 80 }, // percentage
        co2: { target: 1000, min: 400, max: 1500 }, // ppm
        airflow: { rate: 0.5, direction: 'vertical' } // m/s
      },
      irrigation: {
        system: 'recirculating_hydroponic',
        ph: { target: 6.0, min: 5.5, max: 6.5 },
        ec: { target: 1.8, min: 1.2, max: 2.4 }, // electrical conductivity
        waterTemp: { target: 20, min: 18, max: 24 }, // Celsius
        flowRate: 2.0 // liters per minute
      }
    };
    
    // Current growing cycles
    this.activeCycles = data.activeCycles || [];
    this.maxConcurrentCycles = data.maxConcurrentCycles || 4;
    
    // Sensor data (latest readings)
    this.sensorData = data.sensorData || {
      environmental: {},
      plant_health: {},
      system_status: {},
      lastUpdated: null
    };
    
    // Robot assignments
    this.assignedRobots = data.assignedRobots || [];
    
    // Resource management
    this.resources = data.resources || {
      water: { capacity: 1000, current: 800, unit: 'liters' },
      nutrients: { 
        nitrogen: { current: 50, unit: 'kg' },
        phosphorus: { current: 20, unit: 'kg' },
        potassium: { current: 30, unit: 'kg' },
        micronutrients: { current: 10, unit: 'kg' }
      },
      energy: { 
        consumption: 0, // current kW
        dailyUsage: 0, // kWh
        efficiency: 0.85 // percentage
      }
    };
    
    // Performance metrics
    this.performance = data.performance || {
      totalYield: 0, // kg harvested
      yieldPerSquareMeter: 0,
      waterEfficiency: 0, // kg food per liter water
      energyEfficiency: 0, // kg food per kWh
      uptime: 100, // percentage
      cycleSuccessRate: 0 // percentage of successful harvests
    };
    
    // Maintenance and lifecycle
    this.maintenance = data.maintenance || {
      lastMaintenance: null,
      nextScheduledMaintenance: null,
      maintenanceHistory: [],
      componentLifespans: {
        led_lights: { installed: new Date(), expectedLife: 50000 }, // hours
        pumps: { installed: new Date(), expectedLife: 8760 }, // hours
        sensors: { installed: new Date(), expectedLife: 17520 } // hours
      }
    };
    
    // Integration interfaces
    this.integrations = data.integrations || {
      cookingSystem: { connected: false, lastSync: null },
      distributionSystem: { connected: false, lastSync: null },
      networkNodes: [] // connected growing modules
    };
    
    // Metadata
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.version = data.version || '1.0.0';
  }

  generateId() {
    return 'module_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Environmental control methods
  updateEnvironmentalSettings(settings) {
    this.environmentalSystems = { ...this.environmentalSystems, ...settings };
    this.updatedAt = new Date();
    
    // Log environmental change
    this.logEvent('environmental_update', {
      changes: settings,
      timestamp: new Date()
    });
  }

  // Sensor data management
  updateSensorData(sensorType, readings) {
    if (!this.sensorData[sensorType]) {
      this.sensorData[sensorType] = {};
    }
    
    this.sensorData[sensorType] = { ...this.sensorData[sensorType], ...readings };
    this.sensorData.lastUpdated = new Date();
    
    // Check for alerts based on sensor readings
    this.checkEnvironmentalAlerts(sensorType, readings);
  }

  checkEnvironmentalAlerts(sensorType, readings) {
    const alerts = [];
    
    if (sensorType === 'environmental') {
      const climate = this.environmentalSystems.climate;
      
      if (readings.temperature < climate.temperature.min || readings.temperature > climate.temperature.max) {
        alerts.push({
          type: 'temperature_alert',
          severity: 'high',
          message: `Temperature ${readings.temperature}°C outside optimal range`,
          timestamp: new Date()
        });
      }
      
      if (readings.humidity < climate.humidity.min || readings.humidity > climate.humidity.max) {
        alerts.push({
          type: 'humidity_alert',
          severity: 'medium',
          message: `Humidity ${readings.humidity}% outside optimal range`,
          timestamp: new Date()
        });
      }
    }
    
    if (sensorType === 'irrigation') {
      const irrigation = this.environmentalSystems.irrigation;
      
      if (readings.ph < irrigation.ph.min || readings.ph > irrigation.ph.max) {
        alerts.push({
          type: 'ph_alert',
          severity: 'high',
          message: `pH ${readings.ph} outside optimal range`,
          timestamp: new Date()
        });
      }
    }
    
    // Store alerts for monitoring system
    if (alerts.length > 0) {
      this.handleAlerts(alerts);
    }
  }

  handleAlerts(alerts) {
    // In a real system, this would trigger automated responses
    // For now, we log the alerts
    alerts.forEach(alert => {
      this.logEvent('alert', alert);
    });
  }

  // Growing cycle management
  startGrowingCycle(cycleData) {
    if (this.activeCycles.length >= this.maxConcurrentCycles) {
      throw new Error('Maximum concurrent growing cycles reached');
    }
    
    const cycle = {
      id: this.generateCycleId(),
      cropVariety: cycleData.cropVariety,
      plantedDate: new Date(),
      expectedHarvestDate: this.calculateHarvestDate(cycleData.cropVariety),
      plantCount: cycleData.plantCount || 25,
      section: cycleData.section || this.getAvailableSection(),
      status: 'planted',
      growthStage: 'seedling',
      parameters: this.getOptimalGrowthParameters(cycleData.cropVariety)
    };
    
    this.activeCycles.push(cycle);
    this.updatedAt = new Date();
    
    this.logEvent('cycle_started', {
      cycleId: cycle.id,
      cropVariety: cycle.cropVariety,
      plantCount: cycle.plantCount
    });
    
    return cycle;
  }

  generateCycleId() {
    return 'cycle_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  calculateHarvestDate(cropVariety) {
    // Growth periods in days for different crops
    const growthPeriods = {
      lettuce: 30,
      spinach: 25,
      kale: 35,
      tomato: 75,
      cucumber: 60,
      herbs: 21,
      microgreens: 14
    };
    
    const days = growthPeriods[cropVariety] || 45;
    const harvestDate = new Date();
    harvestDate.setDate(harvestDate.getDate() + days);
    return harvestDate;
  }

  getAvailableSection() {
    // Simple section allocation - in reality this would be more sophisticated
    const usedSections = this.activeCycles.map(cycle => cycle.section);
    for (let i = 1; i <= this.maxConcurrentCycles; i++) {
      if (!usedSections.includes(`section_${i}`)) {
        return `section_${i}`;
      }
    }
    return 'section_1'; // fallback
  }

  getOptimalGrowthParameters(cropVariety) {
    // Optimal parameters for different crop types
    const parameters = {
      lettuce: {
        lighting: { intensity: 80, photoperiod: 14 },
        temperature: { day: 20, night: 16 },
        humidity: 60,
        ph: 6.0,
        ec: 1.2
      },
      tomato: {
        lighting: { intensity: 100, photoperiod: 16 },
        temperature: { day: 24, night: 18 },
        humidity: 65,
        ph: 6.2,
        ec: 2.0
      },
      herbs: {
        lighting: { intensity: 70, photoperiod: 12 },
        temperature: { day: 22, night: 18 },
        humidity: 55,
        ph: 6.5,
        ec: 1.4
      }
    };
    
    return parameters[cropVariety] || parameters.lettuce;
  }

  // Harvest management
  harvestCycle(cycleId, harvestData) {
    const cycleIndex = this.activeCycles.findIndex(cycle => cycle.id === cycleId);
    if (cycleIndex === -1) {
      throw new Error(`Growing cycle ${cycleId} not found`);
    }
    
    const cycle = this.activeCycles[cycleIndex];
    cycle.status = 'harvested';
    cycle.actualHarvestDate = new Date();
    cycle.harvestData = {
      yieldAmount: harvestData.yieldAmount || 0,
      quality: harvestData.quality || 'good',
      notes: harvestData.notes || ''
    };
    
    // Update performance metrics
    this.updatePerformanceMetrics(cycle);
    
    // Remove from active cycles
    this.activeCycles.splice(cycleIndex, 1);
    
    // Log harvest
    this.logEvent('cycle_harvested', {
      cycleId: cycle.id,
      cropVariety: cycle.cropVariety,
      yieldAmount: cycle.harvestData.yieldAmount,
      quality: cycle.harvestData.quality
    });
    
    // Notify cooking system of new ingredients
    this.notifyCookingSystem(cycle);
    
    return cycle;
  }

  updatePerformanceMetrics(harvestedCycle) {
    const yieldAmount = harvestedCycle.harvestData.yieldAmount;
    this.performance.totalYield += yieldAmount;
    
    // Calculate yield per square meter
    const moduleArea = this.dimensions.length * this.dimensions.width;
    this.performance.yieldPerSquareMeter = this.performance.totalYield / moduleArea;
    
    // Update success rate
    const totalCycles = this.maintenance.maintenanceHistory.filter(h => h.type === 'cycle_completed').length + 1;
    this.performance.cycleSuccessRate = (this.performance.totalYield > 0 ? totalCycles : totalCycles - 1) / totalCycles * 100;
  }

  notifyCookingSystem(harvestedCycle) {
    if (this.integrations.cookingSystem.connected) {
      // In a real system, this would make an API call to the cooking system
      this.logEvent('cooking_system_notification', {
        ingredient: harvestedCycle.cropVariety,
        amount: harvestedCycle.harvestData.yieldAmount,
        quality: harvestedCycle.harvestData.quality,
        harvestDate: harvestedCycle.actualHarvestDate
      });
    }
  }

  // Robot management
  assignRobot(robotId, task) {
    const assignment = {
      robotId,
      task,
      assignedAt: new Date(),
      status: 'assigned'
    };
    
    this.assignedRobots.push(assignment);
    this.logEvent('robot_assigned', assignment);
    
    return assignment;
  }

  // Utility methods
  logEvent(eventType, data) {
    // In a real system, this would write to a logging system
    console.log(`[${this.id}] ${eventType}:`, data);
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      activeCycles: this.activeCycles.length,
      performance: this.performance,
      lastUpdated: this.updatedAt
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      location: this.location,
      moduleType: this.moduleType,
      dimensions: this.dimensions,
      capacity: this.capacity,
      status: this.status,
      environmentalSystems: this.environmentalSystems,
      activeCycles: this.activeCycles,
      sensorData: this.sensorData,
      assignedRobots: this.assignedRobots,
      resources: this.resources,
      performance: this.performance,
      maintenance: this.maintenance,
      integrations: this.integrations,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version
    };
  }

  static fromJSON(data) {
    return new GrowingModule(data);
  }
}

module.exports = GrowingModule;
