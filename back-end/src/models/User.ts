import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

type LookingForType = 'Friendship' | 'Networking' | 'Support';

export interface IUser extends Document {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    about?: string;
    jobTitle?: string;
    company?: string;
    institution?: string;
    graduationYear?: number;
    homeCountry: string;
    currentProvince: string;
    currentCountry: string;
    languages: string[];
    interests: string[];
    lookingFor: LookingForType[];
    photo?: string;
    dateOfBirth?: Date;
    gender?: string;
    profileComplete: boolean;
    blockedUsers: Types.ObjectId[];
    _id: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    about: { type: String, maxlength: 500 },
    jobTitle: { type: String, trim: true },
    company: { type: String, trim: true },
    institution: { type: String, trim: true },
    graduationYear: { type: Number, min: 1950, max: 2100 },
    homeCountry: { type: String, required: true },
    currentProvince: { type: String, required: true },
    currentCountry: { type: String, required: true },
    languages: [{ type: String, required: true }],
    interests: [{ type: String }],
    lookingFor: [{ type: String, enum: ['Friendship', 'Networking', 'Support'] }],
    photo: { type: String },
    dateOfBirth: { type: Date },
    gender: {
        type: String,
        enum: ['female', 'male'],
    },
    profileComplete: { type: Boolean, default: false },
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, {
    timestamps: true
});

UserSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
    }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string) {
    return bcrypt.compare(candidatePassword, this.password);
};

export const User = mongoose.model<IUser>('User', UserSchema); 