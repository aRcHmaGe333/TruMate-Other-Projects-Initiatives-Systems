const express = require('express');
const router = express.Router();
const { validateCookingSession } = require('../middleware/validation');
const { CookingProcessError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// In-memory storage for cooking sessions
const cookingSessions = new Map();
const recipes = require('./recipes'); // Import recipes from recipes route

/**
 * Cooking Session Class
 * Manages the state and progress of a cooking session
 */
class CookingSession {
  constructor(data) {
    this.id = this.generateSessionId();
    this.recipeId = data.recipeId;
    this.recipe = data.recipe;
    this.servings = data.servings || data.recipe.servings;
    this.modifications = data.modifications || {};
    this.automationLevel = data.automationLevel || 'manual';
    this.status = 'initialized';
    this.currentStep = 0;
    this.startTime = null;
    this.endTime = null;
    this.pausedTime = 0;
    this.stepTimings = [];
    this.sensorData = [];
    this.qualityMetrics = {};
    this.notes = data.notes || '';
    this.errors = [];
    this.warnings = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  start() {
    if (this.status !== 'initialized') {
      throw new CookingProcessError('Session already started or completed');
    }
    
    this.status = 'in_progress';
    this.startTime = new Date();
    this.updatedAt = new Date();
    
    logger.logCookingEvent('session_started', this.id, this.recipeId, {
      servings: this.servings,
      automationLevel: this.automationLevel
    });
  }

  pause() {
    if (this.status !== 'in_progress') {
      throw new CookingProcessError('Cannot pause session that is not in progress');
    }
    
    this.status = 'paused';
    this.pausedTime = Date.now();
    this.updatedAt = new Date();
    
    logger.logCookingEvent('session_paused', this.id, this.recipeId, {
      currentStep: this.currentStep
    });
  }

  resume() {
    if (this.status !== 'paused') {
      throw new CookingProcessError('Cannot resume session that is not paused');
    }
    
    this.status = 'in_progress';
    this.pausedTime = 0;
    this.updatedAt = new Date();
    
    logger.logCookingEvent('session_resumed', this.id, this.recipeId, {
      currentStep: this.currentStep
    });
  }

  nextStep() {
    if (this.status !== 'in_progress') {
      throw new CookingProcessError('Cannot advance step when session is not in progress');
    }
    
    const stepStartTime = Date.now();
    
    // Record timing for previous step
    if (this.currentStep > 0) {
      const previousStepIndex = this.currentStep - 1;
      const stepDuration = stepStartTime - (this.stepTimings[previousStepIndex]?.startTime || this.startTime);
      
      this.stepTimings[previousStepIndex] = {
        ...this.stepTimings[previousStepIndex],
        endTime: stepStartTime,
        actualDuration: stepDuration
      };
    }
    
    // Check if we've completed all steps
    if (this.currentStep >= this.recipe.instructions.length) {
      return this.complete();
    }
    
    // Start timing for current step
    this.stepTimings[this.currentStep] = {
      stepIndex: this.currentStep,
      startTime: stepStartTime,
      expectedDuration: this.recipe.instructions[this.currentStep].timing * 60000 || null // convert minutes to ms
    };
    
    this.currentStep++;
    this.updatedAt = new Date();
    
    logger.logCookingEvent('step_completed', this.id, this.recipeId, {
      stepIndex: this.currentStep - 1,
      totalSteps: this.recipe.instructions.length
    });
    
    return this.getCurrentStepInfo();
  }

  complete() {
    this.status = 'completed';
    this.endTime = new Date();
    this.updatedAt = new Date();
    
    // Calculate total cooking time
    const totalDuration = this.endTime - this.startTime;
    
    // Update recipe analytics
    this.updateRecipeAnalytics();
    
    logger.logCookingEvent('session_completed', this.id, this.recipeId, {
      totalDuration,
      stepsCompleted: this.currentStep,
      qualityMetrics: this.qualityMetrics
    });
    
    return {
      status: 'completed',
      totalDuration,
      stepTimings: this.stepTimings,
      qualityMetrics: this.qualityMetrics
    };
  }

  abort(reason = 'User cancelled') {
    this.status = 'aborted';
    this.endTime = new Date();
    this.updatedAt = new Date();
    this.errors.push({
      type: 'session_aborted',
      message: reason,
      timestamp: new Date()
    });
    
    logger.logCookingEvent('session_aborted', this.id, this.recipeId, {
      reason,
      stepsCompleted: this.currentStep,
      totalSteps: this.recipe.instructions.length
    });
  }

  getCurrentStepInfo() {
    if (this.currentStep === 0) {
      return {
        message: 'Session initialized. Ready to start cooking.',
        nextAction: 'start'
      };
    }
    
    if (this.currentStep > this.recipe.instructions.length) {
      return {
        message: 'All steps completed!',
        nextAction: 'complete'
      };
    }
    
    const currentInstruction = this.recipe.instructions[this.currentStep - 1];
    const nextInstruction = this.recipe.instructions[this.currentStep];
    
    return {
      currentStep: this.currentStep,
      totalSteps: this.recipe.instructions.length,
      currentInstruction,
      nextInstruction,
      progress: (this.currentStep / this.recipe.instructions.length) * 100,
      estimatedTimeRemaining: this.calculateRemainingTime()
    };
  }

  calculateRemainingTime() {
    let remainingTime = 0;
    
    for (let i = this.currentStep; i < this.recipe.instructions.length; i++) {
      const instruction = this.recipe.instructions[i];
      if (instruction.timing) {
        remainingTime += instruction.timing;
      }
    }
    
    return remainingTime; // in minutes
  }

  addSensorData(sensorType, value, timestamp = new Date()) {
    this.sensorData.push({
      sensorType,
      value,
      timestamp,
      stepIndex: this.currentStep
    });
    
    // Trigger automation if applicable
    if (this.automationLevel !== 'manual') {
      this.processAutomation(sensorType, value);
    }
  }

  processAutomation(sensorType, value) {
    // Placeholder for automation logic
    // This would integrate with hardware controllers
    
    logger.logAutomation('sensor_reading', this.recipeId, {
      [sensorType]: value
    }, []);
  }

  updateQualityMetric(metric, value) {
    this.qualityMetrics[metric] = {
      value,
      timestamp: new Date(),
      stepIndex: this.currentStep
    };
  }

  updateRecipeAnalytics() {
    // This would update the recipe's analytics in the database
    // For now, just log the completion
    logger.logRecipeAction('cooking_completed', this.recipeId, this.recipe.name, null, {
      sessionId: this.id,
      totalDuration: this.endTime - this.startTime,
      qualityMetrics: this.qualityMetrics
    });
  }
}

// GET /api/cooking/sessions - List all cooking sessions
router.get('/sessions', (req, res) => {
  const sessions = Array.from(cookingSessions.values()).map(session => ({
    id: session.id,
    recipeId: session.recipeId,
    recipeName: session.recipe.name,
    status: session.status,
    currentStep: session.currentStep,
    totalSteps: session.recipe.instructions.length,
    progress: (session.currentStep / session.recipe.instructions.length) * 100,
    startTime: session.startTime,
    createdAt: session.createdAt
  }));

  res.json({ sessions });
});

// POST /api/cooking/start - Start a new cooking session
router.post('/start', validateCookingSession, async (req, res) => {
  try {
    const { recipeId, servings, modifications, automationLevel, notes } = req.body;
    
    // Get recipe (in a real app, this would be from database)
    // For now, we'll create a mock recipe
    const recipe = {
      id: recipeId,
      name: 'Sample Recipe',
      instructions: [
        { step: 'Prepare ingredients', timing: 5 },
        { step: 'Cook ingredients', timing: 15 },
        { step: 'Serve', timing: 2 }
      ],
      servings: 4
    };

    const sessionData = {
      recipeId,
      recipe,
      servings,
      modifications,
      automationLevel,
      notes
    };

    const session = new CookingSession(sessionData);
    session.start();
    
    cookingSessions.set(session.id, session);

    res.status(201).json({
      sessionId: session.id,
      status: session.status,
      currentStep: session.getCurrentStepInfo(),
      message: 'Cooking session started successfully'
    });
  } catch (error) {
    logger.error('Error starting cooking session:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to start cooking session'
    });
  }
});

// GET /api/cooking/:sessionId - Get cooking session status
router.get('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = cookingSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Cooking session ${sessionId} not found`
      });
    }

    res.json({
      sessionId: session.id,
      recipeId: session.recipeId,
      recipeName: session.recipe.name,
      status: session.status,
      currentStep: session.getCurrentStepInfo(),
      startTime: session.startTime,
      endTime: session.endTime,
      stepTimings: session.stepTimings,
      qualityMetrics: session.qualityMetrics,
      sensorData: session.sensorData.slice(-10), // Last 10 sensor readings
      errors: session.errors,
      warnings: session.warnings
    });
  } catch (error) {
    logger.error('Error retrieving cooking session:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve cooking session'
    });
  }
});

// POST /api/cooking/:sessionId/next - Advance to next step
router.post('/:sessionId/next', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = cookingSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Cooking session ${sessionId} not found`
      });
    }

    const result = session.nextStep();
    
    res.json({
      sessionId: session.id,
      status: session.status,
      currentStep: session.getCurrentStepInfo(),
      result
    });
  } catch (error) {
    if (error instanceof CookingProcessError) {
      return res.status(409).json({
        error: 'Cooking Process Error',
        message: error.message
      });
    }
    
    logger.error('Error advancing cooking step:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to advance cooking step'
    });
  }
});

// POST /api/cooking/:sessionId/pause - Pause cooking session
router.post('/:sessionId/pause', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = cookingSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Cooking session ${sessionId} not found`
      });
    }

    session.pause();
    
    res.json({
      sessionId: session.id,
      status: session.status,
      message: 'Cooking session paused'
    });
  } catch (error) {
    if (error instanceof CookingProcessError) {
      return res.status(409).json({
        error: 'Cooking Process Error',
        message: error.message
      });
    }
    
    logger.error('Error pausing cooking session:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to pause cooking session'
    });
  }
});

// POST /api/cooking/:sessionId/resume - Resume cooking session
router.post('/:sessionId/resume', (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = cookingSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Cooking session ${sessionId} not found`
      });
    }

    session.resume();
    
    res.json({
      sessionId: session.id,
      status: session.status,
      currentStep: session.getCurrentStepInfo(),
      message: 'Cooking session resumed'
    });
  } catch (error) {
    if (error instanceof CookingProcessError) {
      return res.status(409).json({
        error: 'Cooking Process Error',
        message: error.message
      });
    }
    
    logger.error('Error resuming cooking session:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to resume cooking session'
    });
  }
});

// POST /api/cooking/:sessionId/abort - Abort cooking session
router.post('/:sessionId/abort', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;
    const session = cookingSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Cooking session ${sessionId} not found`
      });
    }

    session.abort(reason);
    
    res.json({
      sessionId: session.id,
      status: session.status,
      message: 'Cooking session aborted'
    });
  } catch (error) {
    logger.error('Error aborting cooking session:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to abort cooking session'
    });
  }
});

// POST /api/cooking/:sessionId/sensor - Add sensor data
router.post('/:sessionId/sensor', (req, res) => {
  try {
    const { sessionId } = req.params;
    const { sensorType, value } = req.body;
    const session = cookingSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Cooking session ${sessionId} not found`
      });
    }

    session.addSensorData(sensorType, value);
    
    res.json({
      sessionId: session.id,
      message: 'Sensor data recorded',
      sensorData: {
        sensorType,
        value,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Error recording sensor data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to record sensor data'
    });
  }
});

module.exports = router;
