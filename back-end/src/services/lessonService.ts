import { Lesson } from '../models/Lesson';

export const lessonService = {
    getAllLessons: async () => {
        return await Lesson.find();
    },
    getLessonById: async (id: string) => {
        return await Lesson.findById(id);
    },
    createLesson: async (lessonData: any) => {
        const lesson = new Lesson(lessonData);
        await lesson.save();
        return lesson;
    },
    updateLesson: async (id: string, lessonData: any) => {
        return await Lesson.findByIdAndUpdate(id, lessonData, { new: true });
    },
    deleteLesson: async (id: string) => {
        return await Lesson.findByIdAndDelete(id);
    },
    getLessonsForStudent: async (studentId: string) => {
        return await Lesson.find({ studentIds: studentId });
    },
    getLessonsForTeacher: async (teacherId: string) => {
        return await Lesson.find({ teacherId });
    },
}; 