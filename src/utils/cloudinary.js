import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";
//upload to cloudinary
// Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key:  process.env.CLOUDINARY_API_KEY, 
        api_secret:  process.env.CLOUDINARY_API_SECRET
    });

    const uploadOnCloudinary = async(localfilepath)=>{
        try {
            if(!localfilepath) return null
            const response = await cloudinary.uploader.upload(
                localfilepath,{
                    resource_type:"auto"
                }
            )
            console.log("File uploaded on cloudinary. File src:"+response.url)
            fs.unlinkSync(localfilepath)
            return response
        } catch (error) {
            fs.unlinkSync(localfilepath)
            return null
            
        }
    }

    const deleteFromClodinary = async(publicId)=>{
        try {
            const result = await cloudinary.uploader.destroy(publicId)
            console.log("Deleted from cloudinary.Public id")
            
        } catch (error) {
            console.log("Error deleting from cloudinary",error)
            return null;
            
        }
    }
    export {uploadOnCloudinary,deleteFromClodinary}