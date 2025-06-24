require('dotenv').config();
const axios = require('axios');

// Cấu hình giới hạn
const CONFIG = {
    MAX_TOTAL_DURATION: 60, // Giây
    MAX_SCENE_DURATION: 3,  // Giây
    MAX_SCENES: 20,
    IMAGE_SRC: "https://photo.znews.vn/w1920/Uploaded/mdf_eioxrd/2021_07_06/2.jpg",
    API_URL: 'https://api.json2video.com/v2/movies',
    POLL_RETRIES: 40,
    POLL_INTERVAL: 5000,
    VIDEO_RESOLUTION: { width: 640, height: 360 }
};

// Ước lượng thời lượng từ text
function estimateDurationFromText(text) {
    const words = text.trim().split(/\s+/).length;
    const wordsPerSecond = 5;
    return Math.min(CONFIG.MAX_SCENE_DURATION, Math.ceil(words / wordsPerSecond) + 1);
}

// Lấy tất cả lời thoại trong dấu "..." từ toàn bộ script
function extractQuotedLines(script) {
    const matches = script.match(/"([^"]+)"/g) || [];
    return matches.map(q => q.replace(/^"|"$/g, '').trim()).filter(Boolean);
}

// Chuyển lời thoại thành scenes
function parseScriptToScenes(script) {
    const dialogues = extractQuotedLines(script);

    const scenes = [];
    let totalDuration = 0;

    for (const text of dialogues) {
        const duration = estimateDurationFromText(text);
        if (totalDuration + duration > CONFIG.MAX_TOTAL_DURATION) {
            console.warn('⏱️ Cảnh bị cắt vì vượt giới hạn thời lượng tổng');
            break;
        }

        scenes.push({
            duration,
            elements: [
                { type: "image", src: CONFIG.IMAGE_SRC, layer: "background" },
                { type: "subtitles", text },
                { type: "voice", text, voice: "vi-VN-HoaiMyNeural", model: "azure" }
            ]
        });

        totalDuration += duration;

        if (scenes.length >= CONFIG.MAX_SCENES) {
            console.warn('⚠️ Đạt số lượng cảnh tối đa');
            break;
        }
    }

    console.log(`🎬 Tổng thời lượng: ${totalDuration}s, Số cảnh: ${scenes.length}`);
    return scenes;
}

// Chờ video render
async function pollVideoUrl(apiKey, projectId) {
    const url = `${CONFIG.API_URL}?project=${projectId}`;
    
    for (let i = 0; i < CONFIG.POLL_RETRIES; i++) {
        try {
            const response = await axios.get(url, {
                headers: { 'x-api-key': apiKey },
                timeout: 10000
            });

            const movieData = response.data?.movie;
            if (movieData?.url) {
                console.log(`✅ Video sẵn sàng: ${movieData.url}`);
                return movieData.url;
            }
        } catch (err) {
            console.error(`Lỗi lần ${i + 1}:`, err.message);
        }
        await new Promise(resolve => setTimeout(resolve, CONFIG.POLL_INTERVAL));
    }

    throw new Error(`Không lấy được URL video sau ${CONFIG.POLL_RETRIES} lần thử`);
}

// API tạo video
const generateVideo = async (req, res) => {
    const { script } = req.body;

    try {
        if (!script?.trim()) {
            return res.status(400).json({ success: false, error: 'Script không được để trống' });
        }

        const apiKey = process.env.JSON2VIDEO_API_KEY;
        if (!apiKey) throw new Error('API key chưa được cấu hình');

        const scenes = parseScriptToScenes(script);
        if (!scenes.length) {
            return res.status(400).json({ success: false, error: 'Không có lời thoại nào hợp lệ' });
        }

        const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
        if (totalDuration > CONFIG.MAX_TOTAL_DURATION) {
            return res.status(400).json({ success: false, error: `Tổng thời lượng ${totalDuration}s vượt giới hạn` });
        }

        const movieJSON = {
            resolution: "custom",
            width: CONFIG.VIDEO_RESOLUTION.width,
            height: CONFIG.VIDEO_RESOLUTION.height,
            scenes
        };

        const response = await axios.post(CONFIG.API_URL, movieJSON, {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        if (!response.data?.success) {
            throw new Error(response.data?.message || 'Lỗi khi render video');
        }

        const videoUrl = await pollVideoUrl(apiKey, response.data.project);

        return res.json({
            success: true,
            videoUrl,
            metadata: {
                totalDuration,
                sceneCount: scenes.length
            }
        });

    } catch (error) {
        console.error('🚨 Lỗi tạo video:', error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            error: error.message || 'Lỗi server'
        });
    }
};

module.exports = { generateVideo };
