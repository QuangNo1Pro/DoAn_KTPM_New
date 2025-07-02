// services/firebaseService.js
const { Storage } = require('@google-cloud/storage');
const path = require('path');

const storage     = new Storage({
  keyFilename : path.join(__dirname, '../firebase-admin.json'), // tuỳ file của bạn
  projectId   : process.env.GCLOUD_PROJECT_ID
});
const bucketName = process.env.FIREBASE_BUCKET;

/**
 * Upload local file -> Firebase Storage, trả public URL
 * @param {string} localPath   Đường dẫn file trên ổ đĩa
 * @param {string} destPath    Đường dẫn lưu trong bucket (vd: videos/abc.mp4)
 * @param {object} [options]   { contentType: 'video/mp4', ... }
 * @returns {Promise<string>}  Public URL
 */
async function uploadFile(localPath, destPath, options = {}) {
  // chuẩn hoá metadata
  const metadata = options.contentType
    ? { contentType: options.contentType }
    : undefined;                     // Firebase tự suy đoán nếu không truyền

  // 1. upload
  await storage.bucket(bucketName).upload(localPath, {
    destination: destPath,
    metadata   : metadata && { metadata: metadata }   // chỉ truyền khi có
  });

  // 2. make public (hoặc dùng signedUrl tuỳ nhu cầu)
  const file = storage.bucket(bucketName).file(destPath);
  await file.makePublic();

  // 3. trả lại public URL
  return `https://storage.googleapis.com/${bucketName}/${destPath}`;
}

module.exports = { uploadFile };
