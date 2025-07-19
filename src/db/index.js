import mongoose from "mongoose";

import { DB_NAME } from "../constants.js";

const connnectToMongoDB = async () => {
    try{
        const connnectInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
        console.log(`\n MongoDB Connected !! DB HOST: ${connnectInstance.connection.host}`);
 

    }catch(error){
        console.error("Error connecting to MongoDB:", error);
        // process.exit(1)

    }
}

export default connnectToMongoDB;