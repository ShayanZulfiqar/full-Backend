import { v2 as cloudinary } from 'cloudinary';





// Configuration
cloudinary.config({
    cloud_name: porcess.env.CLOUDINARY_CLOUD_NAME,
    api_key: porcess.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadCloudinary = async (localFile) => {
    try {
        if (!localFile) return null
        const response = await cloudinary.uploader.upload
            (localFile, {
                resource_type: 'auto',
            })

        console.log("File uploaded successfully: ", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFile);
        return null;
    }

}

