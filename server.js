const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs");
const https = require("https");

// ========== CONFIG ==========
const APK_DOWNLOAD_URL = "https://drive.google.com/uc?export=download&id=15CfNAaIhr-st0kuGRu62NPkYZ-VpKNRs"; // EDIT
const LATEST_VERSION = 2; // EDIT: increase above installed versionCode to push update
const LOCAL_APK_PATH = path.join(__dirname, "app.apk");
const TEMP_APK_PATH = path.join(__dirname, "app.apk.downloading");
// ============================

function downloadApkOnce() {
  return new Promise((resolve, reject) => {
    console.log("Downloading APK from:", APK_DOWNLOAD_URL);

    const file = fs.createWriteStream(TEMP_APK_PATH);
    https.get(APK_DOWNLOAD_URL, response => {
      console.log("HTTP status:", response.statusCode);
      const length = response.headers['content-length'];
      if (length) console.log("Content-Length header:", length);

      response.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          try {
            // move temp -> final
            fs.renameSync(TEMP_APK_PATH, LOCAL_APK_PATH);
            console.log("APK downloaded and saved to:", LOCAL_APK_PATH);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    }).on("error", err => {
      console.error("Download error:", err);
      // cleanup partial
      try { if (fs.existsSync(TEMP_APK_PATH)) fs.unlinkSync(TEMP_APK_PATH); } catch(_) {}
      reject(err);
    });
  });
}

async function ensureApkDownloaded() {
  // If APK already present, skip download
  if (fs.existsSync(LOCAL_APK_PATH)) {
    console.log("APK already exists locally:", LOCAL_APK_PATH);
    return;
  }

  // Try download, retry once on failure
  try {
    await downloadApkOnce();
  } catch (err) {
    console.warn("First download attempt failed, retrying once...");
    try {
      await downloadApkOnce();
    } catch (err2) {
      console.error("APK download failed after retry:", err2);
      // Continue — server will still run but /app.apk will return 404
    }
  }
}

app.get("/update.json", (req, res) => {
  res.json({
    version: LATEST_VERSION,
    url: "https://update-server-8pbc.onrender.com/app.apk" // ensure this matches your Render URL
  });
});

app.get("/app.apk", (req, res) => {
  if (!fs.existsSync(LOCAL_APK_PATH)) {
    return res.status(404).send("APK not available yet.");
  }
  res.sendFile(LOCAL_APK_PATH);
});

// health check
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    apkExists: fs.existsSync(LOCAL_APK_PATH)
  });
});

const PORT = process.env.PORT || 3000;

ensureApkDownloaded().then(() => {
  app.listen(PORT, () => {
    console.log(`Update server running on port ${PORT}`);
    console.log(`/update.json => version ${LATEST_VERSION}`);
    console.log(`/app.apk served from: ${LOCAL_APK_PATH}`);
  });
});
