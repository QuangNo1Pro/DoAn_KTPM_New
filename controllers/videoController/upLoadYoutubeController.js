const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Hàm tạo OAuth2Client từ thông tin token trong req.user
 */
function getOAuth2Client(req) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );
  
    const access_token = req.user?.googleAccessToken;
    const refresh_token = req.user?.googleRefreshToken;
  
    if (!access_token && !refresh_token) {
      throw new Error('Bạn chưa đăng nhập Google hoặc chưa cấp quyền upload.');
    }
  
    oauth2Client.setCredentials({ access_token, refresh_token });
    return oauth2Client;
  }
/**
 * Hàm xử lý upload video lên YouTube
 */
async function uploadYoutube(req, res) {
    try {
       
    const { url, title, description } = req.body;
    console.log(url, title, description);
    if (!url) {
      return res.status(400).json({ success: false, error: 'Thiếu đường dẫn video (url).' });
    }

    const filename = path.basename(url);  // Ví dụ: "video_123.mp4"
    const localPath = path.join(__dirname, '../../public/videos', filename);

    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ success: false, error: 'File video không tồn tại trên server.' });
    }

    const oauth2Client = getOAuth2Client(req);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const response = await youtube.videos.insert({
      part: 'snippet,status',
      requestBody: {
        snippet: {
          title: title || 'Video AI từ hệ thống',
          description: description || 'Video được tạo tự động từ hệ thống.'
        },
        status: { privacyStatus: 'public' }
      },
      media: {
        body: fs.createReadStream(localPath)
      }
    });

    if (!response?.data?.id) {
      return res.status(500).json({ success: false, error: 'Không nhận được ID video từ YouTube.' });
    }

    const youtubeUrl = `https://www.youtube.com/watch?v=${response.data.id}`;
    return res.json({ success: true, youtubeUrl });

  } catch (err) {
    console.error('Lỗi upload YouTube:', err);
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi upload YouTube.' });
  }
}

// ✨ Export tách riêng
module.exports = {
  uploadYoutube,
  getOAuth2Client
};
