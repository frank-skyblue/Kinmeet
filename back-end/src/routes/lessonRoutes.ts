import express from 'express';
import * as lessonController from '../controllers/lessonController';
import { authenticateJWT } from '../middleware/authMiddleware';

const router = express.Router();

// Get all lessons
router.get('/', authenticateJWT, lessonController.getAllLessons);

// Get a lesson by ID
router.get('/:id', authenticateJWT, lessonController.getLessonById);

// Create a new lesson
router.post('/', authenticateJWT, lessonController.createLesson);

// Update a lesson by ID
router.put('/:id', authenticateJWT, lessonController.updateLesson);

// Delete a lesson by ID
router.delete('/:id', authenticateJWT, lessonController.deleteLesson);

// Get all lessons for a student
router.get('/student/:studentId', authenticateJWT, lessonController.getLessonsForStudent);

// Get all lessons for a teacher
router.get('/teacher/:teacherId', authenticateJWT, lessonController.getLessonsForTeacher);

export default router; 