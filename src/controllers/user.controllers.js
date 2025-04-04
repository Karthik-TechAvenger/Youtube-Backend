import { asyncHandler } from "../utils/asynhandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        if(!user){
            throw new ApiError("400","User not found,try again!!")
        }
        const accesToken = user.generateAccessToken()
        consr refreshToken = user.generateAccessToken()
    
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accesToken,refreshToken}
    } catch (error) {
        throw new ApiError(400,"Something went wrong for token generating")

        
    }
}


const registerUser = asyncHandler(async(req,res)=>{
    const {fullname,email,username,password} = req.body



if([fullname,email,username,password].some((field) => 
    field?.trim() === "")){
        throw new ApiError(400,"All fields are required")
        }
const existedUser  = await User.findOne({
    $or:[{username},{email}]
}) 
if(existedUser){
    throw new ApiError(409,"User with email or username already exists")
}    

const avatarLocalPath = req.files?.avatar?.[0]?.path
const coverLocalPath = req.files?.coverImage?.[0]?.path
if(!avatarLocalPath){
    throw new ApiError(400,"Avatar file is missing.")
}

// const avatar = await uploadOnCloudinary(avatarLocalPath)
// let coverImage = ""
// if(coverLocalPath){

//     coverImage = await uploadOnCloudinary(coverImage)
// }

let avatar;
try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log("Upload avatar",avatar)
    
} catch (error) {
    console.log("Error uploading avatar",error)
    throw new ApiError(500,"Failed to upload avatar")
    
}

let coverImage;
try {
  avatar = await uploadOnCloudinary(coverLocalPath);
  console.log("Upload coverImage", coverImage);
} catch (error) {
  console.log("Error uploading coverImage", error);
  throw new ApiError(500, "Failed to upload coverImage");
}

try {
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering a user")
    }
    return res.status(201)
        .json(new ApiResponse(200,createdUser,"User registered successfully"))
} catch (error) {
    console.log("User creation failed")
    if(avatar){
        await deleteFromClodinary(avatar.public_id)
    }
    if(coverImage){
        await deleteFromClodinary(coverImage.public_id)
    }
    throw new ApiError(500, "Something went wrong while registering a user and images were deleted");
    
    
}
})

const loginUser = asyncHandler(async(req,res)=>{
    const {email,username,password} = req.body
    if(!email){
        throw new ApiError(400,"Email is required")
    }
    if(!username){
        throw new ApiError(400,"username is required")
    }
    if(!password){
        throw new ApiError(400,"password is required")
    }
    const user = await User.findOne({
    $or:[{username},{email}]
})
 if(!user){
    throw new ApiError(404,"User not found!!")
 } 
 const isPasswordValid = await user.isPasswordCorrect(password)
 if(!isPasswordValid){
    throw new ApiError(401,"Invalid Password")
 }
 const {accesToken,refreshToken} = await generateAccessAndRefreshToken(user._id)
 const loggedinUser = await User.findById(user.select("-password -refreshToken"))
 const options = {
    httpOnly:true,
    secure: process.env.NODE_ENV === "production"
 }
return res
.status(200)
.cookie("accessToken",accessToken,options)
.cookie("refreshToken",refreshToken,options)
.json(new ApiResponse(
    200,
    {
        user:loggedinUser,accessToken,refreshToken
    },
    "User logged in successfully"
))

})

const logoutuser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {new:true}
    )

    const options = {
        httpOnly:true,
        secure:process.env.NODE_ENV === "production"
    }
    return res.status(200).clearCookie("accessToken",options)
    .clearCookie("refreshToken".options)
    .json(new ApiResponse(200,{},"User logged out successfully"))

    
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Refresh token is required")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token.")
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Invalid Refresh Token")
        }
        const options = {
            httpOnly : true,
            secure: process.env.NODE_ENV === "production"
        }
        const {accesToken,refreshToken:newRefreshToken} = 
        await generateAccessAndRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken",accesToken,options)
        .cookie("refreshToken",newRefreshToken.options)
        .json(new ApiResponse(
            200,{accesToken,refreshToken:newRefreshToken},
            "Acces token refreshed successfully"
        ));
        
    } catch (error) {
        throw new ApiError(401,"Failed refreshing accesss token")

    }
})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldpassword,newpassword} = req.body
    const user = await User.findById(req.user?._id)
    const isPasswordValid = await user.isPasswordCorrect(oldpassword)
    if(!isPasswordValid){
        ApiError(401,"Password is invalid.")
    }
    user.password = newpassword
    await user.save({validateBeforeSave:false})
    return res.status(200).json(new ApiResponse(200,{},"Password changed successfull"))



    
});
const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"Current user details"))
})
const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email} = req.body
    if(!fullname){
        throw new ApiError(400,"Fullname is required")
    }
    if(!email){
        throw new ApiError(400,"Email is required")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {new:true}
    ).select("-password -refreshToken")
    return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"))
})
const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.files?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(500,"Failed to upload avatar")
    }   
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")
   res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))

});
const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverLocalPath = req.files?.path
    if(!coverLocalPath){
        throw new ApiError(400,"Cover Image file is missing")
    }
    const coverImage = await uploadOnCloudinary(coverLocalPath)
    if(!coverImage.url){
        throw new ApiError(500,"Failed to upload cover image")
    }
    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password -refreshToken")
    res.status(200).json(new ApiResponse(200,user,"Cover image updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {username} = req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is required")
    }
    const channel = await User.aggregate([
        {
            $match:{
                username:username.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount:{$size:"$subscribers"},
                subscribedToCount:{$size:"$subscribedTo"}
            }

        },
        {
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false
                }


        }
    
    },{
        $project:{
            fullname:1,
            username:1,
            avatar:1,
            coverImage:1,
            subscriberCount:1,
            subscribedToCount:1,
            isSubscribed:1,
            email:1
        }
    }
    
    ])
    if(!channel?.length){
        throw new ApiError(404,"Channel not found")
    }
    return res.status(200).json(new ApiResponse(200,channel[0],"Channel Profile success"))


})
const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory.video",
                foreignField:"_id",
                as:"watchHistory"
            }
        },
        {
            $project:{
                watchHistory:1
            }
        }
    ])
    if(!user?.length){
        throw new ApiError(404,"Watch history not found")
    }
    return res.status(200).json(new ApiResponse(200,user[0],"Watch history retrieved successfully"))    

})

export {
    registerUser,loginUser,refreshAccessToken,logoutuser,
    changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar, updateUserCoverImage,getUserChannelProfile,getWatchHistory
}
