require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  try {
    console.log("URI:", process.env.MONGO_URI);
    console.log("Attempting connection...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      family: 4 // Force IPv4 (sometimes helps with DNS issues)
    });

    console.log("Connected Successfully");
    process.exit(0);
  } catch (err) {
    console.error("Failed");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    console.error("Full Error:", err);
    console.error("\nTroubleshooting tips:");
    console.error("1. Check if your IP is whitelisted in MongoDB Atlas");
    console.error("2. Verify you have internet connectivity");
    console.error("3. Try: ipconfig /flushdns (Windows) to clear DNS cache");
    process.exit(1);
  }
})();
