import dotenv from "dotenv";
import connectToMongoDB from "./db/index.js";

dotenv.config(); // loads .env by default from root

connectToMongoDB();
