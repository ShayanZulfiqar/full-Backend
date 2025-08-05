import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import path from 'path'
import mongoose from "mongoose";
import { pipeline } from "stream";


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


    if (!name && !email) {
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

    await User.findByIdAndUpdate(
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

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, 'Unauthorized Request')
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh Token!")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired and used by user.");

        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await generateAccessRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refeshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access Token is Refreshed Successfully!"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || 'Invalid refresh Token');

    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);
    const isCorrectPassword = await user.isCorrectPassword(oldPassword);

    if (!isCorrectPassword) {
        throw new ApiError(400, "Invalid old password!");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password is changed successfully!"))
})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(200, req.user, "Current User fetched successfully!")
});


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All Fields are required!")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },

        { new: true }
    ).select("-password");
    return res.status(200)
        .json(new ApiResponse(200, user, "Account Details updated Successfully!"))
})

const userAvatarUpdate = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is missing!")
    };

    const avatar = await uploadCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading the avatar!")
    }

   const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    );

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Avatar is uploaded successfully!")
    )
})
const userCoverImgUpdate = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Avatar is missing!")
    };

    const coverImage = await uploadCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading the avatar!")
    }

   const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: coverImage.url
            }
        },
        {new: true}
    );

    return res.status(200)
    .json(
        new ApiResponse(200, user, "Cover Image is uploaded successfully!")
    )
})

const getUserChennelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params

    if (!username?.trim) {
        throw new ApiError(400, "Username is missing!")
        
    }

    const channel = await User.aggregate([
        {
            $match : {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscriber"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                    
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },

                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },

        {
            $project:{
                fullName: 1,
                name: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1


            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
        
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully!")
    )
})


const getWatchHistory = asyncHandler (async (req, res) => {
    const user = await aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },

        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",

                pipeline:[
                    {
                    $lookup:{
                        from: "users",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline:{
                            $project:{
                                fullName: 1,
                                name: 1,
                                avatar: 1
                            }
                        }
                    }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }


        }
    ])


    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            user[0].watchHistory,
            "Watch history fetched successfully!"
        )
    )
})

export { 
userRegister, 
userLogin, 
userLogOut, 
refreshAccessToken, 
changeCurrentPassword, 
getCurrentUser, 
updateAccountDetails, 
userAvatarUpdate, 
userCoverImgUpdate ,
getUserChennelProfile,
getWatchHistory
};
