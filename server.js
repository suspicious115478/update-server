const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const https = require("https");

// ===============================
// CONFIG — EDIT ONLY THESE VALUES
// ===============================

// 1. Your Google Drive DIRECT DOWNLOAD link
const APK_DOWNLOAD_URL = "https://drive.google.com/uc?export=download&id=1179NEhS3CBU_mEfFOUjfEQlFfqsHPaRx";

// 2. This version number (increase to push update)
const LATEST_VERSION = 1;

// 3. APK file name after downloaded by server
const LOCAL_APK_PATH = path.join(__dirname, "app.apk");


// ===============================
// DOWNLOAD APK FROM GOOGLE DRIVE
// ===============================
function downloadApk() {
    return new Promise((resolve, reject) => {
        console.log("Downloading APK from Google Drive...");

        const file = fs.createWriteStream(LOCAL_APK_PATH);

        https.get(APK_DOWNLOAD_URL, response => {
            response.pipe(file);

            file.on("finish", () => {
                file.close();
                console.log("APK downloaded successfully.");
                resolve();
            });
        }).on("error", err => {
            console.error("Failed to download APK:", err);
            reject(err);
        });
    });
}

// NOTE: Render re-runs this on every deploy.
// APK gets downloaded fresh each time.
downloadApk();


// ===============================
// UPDATE JSON ENDPOINT
// ===============================
app.get("/update.json", (req, res) => {
    res.json({
        version: LATEST_VERSION,
        url: "https://YOUR_RENDER_URL.onrender.com/app.apk"
    });
});


// ===============================
// SERVE APK TO CLIENTS
// ===============================
app.get("/app.apk", (req, res) => {
    res.sendFile(LOCAL_APK_PATH);
});


// ===============================
// START SERVER
// ===============================
app.listen(3000, () => {
    console.log("Update server is running on port 3000");
});
