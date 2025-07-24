/**
 * Hardware Integration Service - Interface for sensors, actuators, and robotic systems
 * Provides abstraction layer for physical hardware components
 */

class HardwareIntegrationService {
  constructor() {
    this.connectedDevices = new Map();
    this.sensorReadings = new Map();
    this.actuatorStates = new Map();
    this.roboticSystems = new Map();
    this.simulationMode = process.env.ENABLE_SENSOR_SIMULATION === 'true';
    this.pollingInterval = parseInt(process.env.SENSOR_POLLING_INTERVAL) || 1000; // ms
    this.activePolling = new Map();
  }

  /**
   * Initialize hardware connections for a growing module
   */
  async initializeModule(moduleId, hardwareConfig) {
    try {
      const moduleHardware = {
        sensors: new Map(),
        actuators: new Map(),
        robots: new Map(),
        status: 'initializing',
        lastUpdate: new Date()
      };

      // Initialize sensors
      if (hardwareConfig.sensors) {
        for (const sensorConfig of hardwareConfig.sensors) {
          await this.initializeSensor(moduleId, sensorConfig);
        }
      }

      // Initialize actuators
      if (hardwareConfig.actuators) {
        for (const actuatorConfig of hardwareConfig.actuators) {
          await this.initializeActuator(moduleId, actuatorConfig);
        }
      }

      // Initialize robotic systems
      if (hardwareConfig.robots) {
        for (const robotConfig of hardwareConfig.robots) {
          await this.initializeRobot(moduleId, robotConfig);
        }
      }

      moduleHardware.status = 'active';
      this.connectedDevices.set(moduleId, moduleHardware);

      // Start sensor polling
      this.startSensorPolling(moduleId);

      return {
        success: true,
        moduleId,
        devicesInitialized: {
          sensors: hardwareConfig.sensors?.length || 0,
          actuators: hardwareConfig.actuators?.length || 0,
          robots: hardwareConfig.robots?.length || 0
        }
      };
    } catch (error) {
      throw new Error(`Failed to initialize hardware for module ${moduleId}: ${error.message}`);
    }
  }

  /**
   * Initialize individual sensor
   */
  async initializeSensor(moduleId, sensorConfig) {
    const sensor = {
      id: sensorConfig.id,
      type: sensorConfig.type, // temperature, humidity, ph, ec, light, co2, etc.
      location: sensorConfig.location,
      calibration: sensorConfig.calibration || {},
      status: 'initializing',
      lastReading: null,
      errorCount: 0
    };

    if (this.simulationMode) {
      sensor.status = 'simulated';
      sensor.simulator = this.createSensorSimulator(sensorConfig.type);
    } else {
      // Real hardware initialization would go here
      sensor.status = 'connected';
      sensor.connection = await this.connectToPhysicalSensor(sensorConfig);
    }

    if (!this.connectedDevices.has(moduleId)) {
      this.connectedDevices.set(moduleId, { sensors: new Map(), actuators: new Map(), robots: new Map() });
    }
    
    this.connectedDevices.get(moduleId).sensors.set(sensor.id, sensor);
    return sensor;
  }

  /**
   * Initialize individual actuator
   */
  async initializeActuator(moduleId, actuatorConfig) {
    const actuator = {
      id: actuatorConfig.id,
      type: actuatorConfig.type, // pump, valve, led, fan, heater, etc.
      location: actuatorConfig.location,
      capabilities: actuatorConfig.capabilities || {},
      status: 'initializing',
      currentState: actuatorConfig.defaultState || 'off',
      commandQueue: []
    };

    if (this.simulationMode) {
      actuator.status = 'simulated';
      actuator.simulator = this.createActuatorSimulator(actuatorConfig.type);
    } else {
      // Real hardware initialization would go here
      actuator.status = 'connected';
      actuator.connection = await this.connectToPhysicalActuator(actuatorConfig);
    }

    if (!this.connectedDevices.has(moduleId)) {
      this.connectedDevices.set(moduleId, { sensors: new Map(), actuators: new Map(), robots: new Map() });
    }
    
    this.connectedDevices.get(moduleId).actuators.set(actuator.id, actuator);
    return actuator;
  }

  /**
   * Initialize robotic system
   */
  async initializeRobot(moduleId, robotConfig) {
    const robot = {
      id: robotConfig.id,
      type: robotConfig.type, // seeder, harvester, maintenance, transport
      capabilities: robotConfig.capabilities || [],
      status: 'initializing',
      currentTask: null,
      position: robotConfig.homePosition || { x: 0, y: 0, z: 0 },
      battery: 100,
      taskQueue: []
    };

    if (this.simulationMode) {
      robot.status = 'simulated';
      robot.simulator = this.createRobotSimulator(robotConfig.type);
    } else {
      // Real hardware initialization would go here
      robot.status = 'connected';
      robot.connection = await this.connectToPhysicalRobot(robotConfig);
    }

    if (!this.connectedDevices.has(moduleId)) {
      this.connectedDevices.set(moduleId, { sensors: new Map(), actuators: new Map(), robots: new Map() });
    }
    
    this.connectedDevices.get(moduleId).robots.set(robot.id, robot);
    return robot;
  }

  /**
   * Start continuous sensor polling for a module
   */
  startSensorPolling(moduleId) {
    if (this.activePolling.has(moduleId)) {
      clearInterval(this.activePolling.get(moduleId));
    }

    const pollingSensor = setInterval(async () => {
      try {
        await this.pollAllSensors(moduleId);
      } catch (error) {
        console.error(`Sensor polling error for module ${moduleId}:`, error);
      }
    }, this.pollingInterval);

    this.activePolling.set(moduleId, pollingSensor);
  }

  /**
   * Poll all sensors for a module
   */
  async pollAllSensors(moduleId) {
    const moduleHardware = this.connectedDevices.get(moduleId);
    if (!moduleHardware || !moduleHardware.sensors) return;

    const readings = {};
    const timestamp = new Date();

    for (const [sensorId, sensor] of moduleHardware.sensors) {
      try {
        let reading;
        
        if (sensor.status === 'simulated') {
          reading = sensor.simulator.getReading();
        } else {
          reading = await this.readPhysicalSensor(sensor);
        }

        // Apply calibration
        reading = this.applySensorCalibration(sensor, reading);

        // Store reading
        sensor.lastReading = { value: reading, timestamp };
        readings[sensor.type] = reading;

        // Reset error count on successful reading
        sensor.errorCount = 0;

      } catch (error) {
        sensor.errorCount++;
        console.error(`Error reading sensor ${sensorId}:`, error);
        
        // Mark sensor as failed after 5 consecutive errors
        if (sensor.errorCount >= 5) {
          sensor.status = 'failed';
        }
      }
    }

    // Store module readings
    this.sensorReadings.set(moduleId, { readings, timestamp });

    return readings;
  }

  /**
   * Control actuator
   */
  async controlActuator(moduleId, actuatorId, command) {
    const moduleHardware = this.connectedDevices.get(moduleId);
    if (!moduleHardware || !moduleHardware.actuators.has(actuatorId)) {
      throw new Error(`Actuator ${actuatorId} not found in module ${moduleId}`);
    }

    const actuator = moduleHardware.actuators.get(actuatorId);
    
    try {
      if (actuator.status === 'simulated') {
        actuator.simulator.executeCommand(command);
      } else {
        await this.sendCommandToPhysicalActuator(actuator, command);
      }

      actuator.currentState = command.state || command.value;
      actuator.lastCommand = { command, timestamp: new Date() };

      return {
        success: true,
        actuatorId,
        command,
        newState: actuator.currentState
      };
    } catch (error) {
      throw new Error(`Failed to control actuator ${actuatorId}: ${error.message}`);
    }
  }

  /**
   * Assign task to robot
   */
  async assignRobotTask(moduleId, robotId, task) {
    const moduleHardware = this.connectedDevices.get(moduleId);
    if (!moduleHardware || !moduleHardware.robots.has(robotId)) {
      throw new Error(`Robot ${robotId} not found in module ${moduleId}`);
    }

    const robot = moduleHardware.robots.get(robotId);
    
    if (robot.currentTask && robot.currentTask.status === 'executing') {
      // Add to queue if robot is busy
      robot.taskQueue.push(task);
      return {
        success: true,
        robotId,
        status: 'queued',
        queuePosition: robot.taskQueue.length
      };
    }

    try {
      robot.currentTask = {
        ...task,
        id: this.generateTaskId(),
        assignedAt: new Date(),
        status: 'executing'
      };

      if (robot.status === 'simulated') {
        robot.simulator.executeTask(task);
      } else {
        await this.sendTaskToPhysicalRobot(robot, task);
      }

      return {
        success: true,
        robotId,
        taskId: robot.currentTask.id,
        status: 'executing'
      };
    } catch (error) {
      robot.currentTask = null;
      throw new Error(`Failed to assign task to robot ${robotId}: ${error.message}`);
    }
  }

  /**
   * Get current sensor readings for a module
   */
  getSensorReadings(moduleId) {
    return this.sensorReadings.get(moduleId) || { readings: {}, timestamp: null };
  }

  /**
   * Get actuator states for a module
   */
  getActuatorStates(moduleId) {
    const moduleHardware = this.connectedDevices.get(moduleId);
    if (!moduleHardware) return {};

    const states = {};
    for (const [actuatorId, actuator] of moduleHardware.actuators) {
      states[actuatorId] = {
        type: actuator.type,
        currentState: actuator.currentState,
        status: actuator.status,
        lastCommand: actuator.lastCommand
      };
    }
    return states;
  }

  /**
   * Get robot status for a module
   */
  getRobotStatus(moduleId) {
    const moduleHardware = this.connectedDevices.get(moduleId);
    if (!moduleHardware) return {};

    const status = {};
    for (const [robotId, robot] of moduleHardware.robots) {
      status[robotId] = {
        type: robot.type,
        status: robot.status,
        currentTask: robot.currentTask,
        position: robot.position,
        battery: robot.battery,
        queueLength: robot.taskQueue.length
      };
    }
    return status;
  }

  /**
   * Create sensor simulator for testing
   */
  createSensorSimulator(sensorType) {
    const simulators = {
      temperature: () => ({
        getReading: () => 20 + Math.random() * 10 + Math.sin(Date.now() / 60000) * 3
      }),
      humidity: () => ({
        getReading: () => 60 + Math.random() * 20 + Math.sin(Date.now() / 45000) * 5
      }),
      ph: () => ({
        getReading: () => 6.0 + Math.random() * 1.0 - 0.5
      }),
      ec: () => ({
        getReading: () => 1.5 + Math.random() * 1.0
      }),
      light: () => ({
        getReading: () => 200 + Math.random() * 100
      }),
      co2: () => ({
        getReading: () => 400 + Math.random() * 600
      })
    };

    return simulators[sensorType] ? simulators[sensorType]() : {
      getReading: () => Math.random() * 100
    };
  }

  /**
   * Create actuator simulator for testing
   */
  createActuatorSimulator(actuatorType) {
    return {
      executeCommand: (command) => {
        console.log(`[SIMULATION] ${actuatorType} actuator executing:`, command);
        return { success: true, simulatedDelay: Math.random() * 1000 };
      }
    };
  }

  /**
   * Create robot simulator for testing
   */
  createRobotSimulator(robotType) {
    return {
      executeTask: (task) => {
        console.log(`[SIMULATION] ${robotType} robot executing task:`, task);
        // Simulate task completion after delay
        setTimeout(() => {
          console.log(`[SIMULATION] ${robotType} robot completed task:`, task.type);
        }, Math.random() * 5000 + 2000);
        return { success: true, estimatedDuration: Math.random() * 5000 + 2000 };
      }
    };
  }

  /**
   * Apply sensor calibration to raw reading
   */
  applySensorCalibration(sensor, rawReading) {
    if (!sensor.calibration) return rawReading;

    let calibratedReading = rawReading;

    // Apply offset
    if (sensor.calibration.offset) {
      calibratedReading += sensor.calibration.offset;
    }

    // Apply scale factor
    if (sensor.calibration.scale) {
      calibratedReading *= sensor.calibration.scale;
    }

    // Apply polynomial correction if available
    if (sensor.calibration.polynomial) {
      const coeffs = sensor.calibration.polynomial;
      let corrected = 0;
      for (let i = 0; i < coeffs.length; i++) {
        corrected += coeffs[i] * Math.pow(calibratedReading, i);
      }
      calibratedReading = corrected;
    }

    return calibratedReading;
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  /**
   * Placeholder methods for real hardware integration
   */
  async connectToPhysicalSensor(sensorConfig) {
    // Real implementation would connect to actual sensor hardware
    throw new Error('Physical sensor connection not implemented');
  }

  async connectToPhysicalActuator(actuatorConfig) {
    // Real implementation would connect to actual actuator hardware
    throw new Error('Physical actuator connection not implemented');
  }

  async connectToPhysicalRobot(robotConfig) {
    // Real implementation would connect to actual robot hardware
    throw new Error('Physical robot connection not implemented');
  }

  async readPhysicalSensor(sensor) {
    // Real implementation would read from actual sensor
    throw new Error('Physical sensor reading not implemented');
  }

  async sendCommandToPhysicalActuator(actuator, command) {
    // Real implementation would send command to actual actuator
    throw new Error('Physical actuator control not implemented');
  }

  async sendTaskToPhysicalRobot(robot, task) {
    // Real implementation would send task to actual robot
    throw new Error('Physical robot task assignment not implemented');
  }

  /**
   * Shutdown hardware connections for a module
   */
  async shutdownModule(moduleId) {
    // Stop sensor polling
    if (this.activePolling.has(moduleId)) {
      clearInterval(this.activePolling.get(moduleId));
      this.activePolling.delete(moduleId);
    }

    // Disconnect hardware
    const moduleHardware = this.connectedDevices.get(moduleId);
    if (moduleHardware) {
      // In real implementation, would properly disconnect hardware
      this.connectedDevices.delete(moduleId);
      this.sensorReadings.delete(moduleId);
    }

    return { success: true, moduleId };
  }

  /**
   * Get hardware status for all modules
   */
  getHardwareStatus() {
    const status = {};
    
    for (const [moduleId, hardware] of this.connectedDevices) {
      status[moduleId] = {
        sensors: hardware.sensors.size,
        actuators: hardware.actuators.size,
        robots: hardware.robots.size,
        status: hardware.status,
        lastUpdate: hardware.lastUpdate
      };
    }

    return {
      modules: status,
      simulationMode: this.simulationMode,
      totalDevices: Array.from(this.connectedDevices.values()).reduce((sum, hw) => 
        sum + hw.sensors.size + hw.actuators.size + hw.robots.size, 0
      )
    };
  }
}

module.exports = HardwareIntegrationService;
