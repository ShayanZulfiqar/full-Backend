import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import path from 'path'


// THis is the method to generate the tokens
const generateAccessRefreshTokens = async (userId) => {
    try {

        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken };



    } catch {
        throw new ApiError(500, 'Something went wrong!')
    }
}



const userRegister = asyncHandler(async (req, res) => {
    const { name, email, fullName, password } = req.body;


    console.log('Body:', req.body);

    if ([name, email, fullName, password].some(field => !field || field.trim() === '')) {
        throw new ApiError(400, 'All fields are required!');
    }

    const existedUser = await User.findOne({
        $or: [{ name }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, 'User already exists!');
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    console.log("Avatar Local Path:", avatarLocalPath);

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, 'Avatar is required');
    }

    const avatar = await uploadCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadCloudinary(coverImageLocalPath) : null;

    const newUser = await User.create({
        name: name.toLowerCase(),
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || ''
    });

    const createdUser = await User.findById(newUser._id).select(
        '-password -refreshToken'
    );

    if (!createdUser) {
        throw new ApiError(500, 'Something went wrong while creating user');
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, 'User created successfully')
    );
});

const userLogin = asyncHandler(async (req, res) => {
    //
    const { email, name, password } = req.body;


    if (!name || !email) {
        throw new ApiError(400, 'Username or Email is required!')
    }

    const user = await User.findOne({
        $or: [{ name }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exit")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Your password is not correct!")
    }
    const { accessToken, refreshToken } = await generateAccessRefreshTokens(user._id)

    const loggedInUser = await user.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .cookie('accessToken', accessToken, options)
        .cookie('refreshToken', refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                'User logged in successfully!'
            )
        )


})

const userLogOut = asyncHandler(async (req, res) => {

   await  User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },

        {
            new: true

        }
    )

      const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, {}, "User is loged Out"))



})

export { userRegister, userLogin, userLogOut };
