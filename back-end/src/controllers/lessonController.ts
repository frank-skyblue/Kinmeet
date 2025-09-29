import { Request, Response } from 'express';
import { lessonService } from '../services/lessonService';

export const getAllLessons = async (req: Request, res: Response) => {
    try {
        const lessons = await lessonService.getAllLessons();
        return res.status(200).json({ success: true, data: lessons });
    } catch (error) {
        console.error('Get all lessons error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getLessonById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const lesson = await lessonService.getLessonById(id);
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }
        return res.status(200).json({ success: true, data: lesson });
    } catch (error) {
        console.error('Get lesson by id error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const createLesson = async (req: Request, res: Response) => {
    try {
        const lesson = await lessonService.createLesson(req.body);
        return res.status(201).json({ success: true, data: lesson });
    } catch (error) {
        console.error('Create lesson error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const updateLesson = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const lesson = await lessonService.updateLesson(id, req.body);
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }
        return res.status(200).json({ success: true, data: lesson });
    } catch (error) {
        console.error('Update lesson error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const deleteLesson = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const lesson = await lessonService.deleteLesson(id);
        if (!lesson) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }
        return res.status(200).json({ success: true, message: 'Lesson deleted' });
    } catch (error) {
        console.error('Delete lesson error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getLessonsForStudent = async (req: Request, res: Response) => {
    try {
        const { studentId } = req.params;
        const lessons = await lessonService.getLessonsForStudent(studentId);
        return res.status(200).json({ success: true, data: lessons });
    } catch (error) {
        console.error('Get lessons for student error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

export const getLessonsForTeacher = async (req: Request, res: Response) => {
    try {
        const { teacherId } = req.params;
        const lessons = await lessonService.getLessonsForTeacher(teacherId);
        return res.status(200).json({ success: true, data: lessons });
    } catch (error) {
        console.error('Get lessons for teacher error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}; 