import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 3005;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is listening on port number ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection error", err);
  });
