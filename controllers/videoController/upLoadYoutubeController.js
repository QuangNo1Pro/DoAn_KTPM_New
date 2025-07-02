const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { db } = require('../../models/connectDb');

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/youtube.force-ssl'
];

/**
 * Hàm lấy OAuth2Client có gắn access_token và refresh_token từ user
 */
function getOAuth2Client(req) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  const access_token = req.user?.googleAccessToken;
  const refresh_token = req.user?.googleRefreshToken;

  // Kiểm tra token hợp lệ
  if (!access_token || !refresh_token) {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: REQUIRED_SCOPES,
      prompt: 'consent' // bắt buộc xin lại quyền
    });

    throw new Error(`Bạn chưa đăng nhập Google hoặc chưa cấp đủ quyền. Truy cập để cấp lại quyền: ${authUrl}`);
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
    if (!url) {
      return res.status(400).json({ success: false, error: 'Thiếu đường dẫn video (url).' });
    }

    const filename = path.basename(url);
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

    const videoId = req.params.id;
    await db.query('UPDATE videos SET youtube_id = $1 WHERE id = $2', [response.data.id, videoId]);

    const youtubeUrl = `https://www.youtube.com/watch?v=${response.data.id}`;
    return res.json({ success: true, youtubeUrl });

  } catch (err) {
    console.error('Lỗi upload YouTube:', err);
    return res.status(500).json({ success: false, error: err.message || 'Lỗi khi upload YouTube.' });
  }
}

module.exports = {
  uploadYoutube,
  getOAuth2Client
};
