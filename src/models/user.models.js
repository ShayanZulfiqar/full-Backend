import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        
    },
    fullName:{
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true
    },
    coverImage: {
        type: String,
        required: true
    },
    watchHistory: [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref: 'Video'
        }
    ],
    password:{
        type: String,
        required: [true, 'Password is required!']
    },
    refreshToken: {
        type: String,
        
    }

}, {timestamps: true})

const User = mongoose.model('User', userSchema)