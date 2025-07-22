import dotenv from "dotenv";
import connectToMongoDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config();

connectToMongoDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`✅ Server is running on port http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ Failed to connect to MongoDB:", err);
  });
