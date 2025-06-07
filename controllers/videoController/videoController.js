require('dotenv').config();
const axios = require('axios');

// Hàm tính thời lượng dựa vào độ dài text
function estimateDurationFromText(text) {
    const words = text.trim().split(/\s+/).length;
    const wordsPerSecond = 2.5;
    return Math.ceil(words / wordsPerSecond) + 1;
}

// ✅ Hàm phân tích script và tạo scenes (đã bổ sung background)
function parseScriptToScenes(script) {
    const lines = script.split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');

    const scenes = [];

    for (let line of lines) {
        // Bỏ qua mô tả (trong ngoặc đơn)
        if (!line || /^\(.*\)$/.test(line)) continue;

        // Tách các kiểu lời thoại khác nhau
        const match = line.match(/^([A-Za-zÀ-ỹĐđ\s]+):\s*(.+)$/);
        let speaker = null;
        let text = line;

        if (match) {
            speaker = match[1].trim();
            text = match[2].trim();
        } else if (line.startsWith('Voiceover:')) {
            speaker = 'Voiceover';
            text = line.replace('Voiceover:', '').trim();
        } else if (line.startsWith('Text on screen:')) {
            speaker = null; // chỉ hiển thị text
            text = line.replace('Text on screen:', '').trim();
        }

        const duration = estimateDurationFromText(text);

        // Thêm background mặc định cho mỗi scene
        const scene = {
            duration: duration + 1,
            elements: [
                {
                    type: "background",
                    color: "#000000"  // nền đen, bạn có thể đổi màu khác
                }
            ]
        };

        if (speaker !== null) {
            scene.elements.push({
                type: "voice",
                text,
                voice: "vi-VN-HoaiMyNeural",
                model: "azure"
            });
        }

        scene.elements.push({
            type: "text",
            text,
            style: "001",
            duration,
            settings: {
                "font-size": "40px"
            }
        });

        scenes.push(scene);
    }

    return scenes;
}

// API chính
const generateVideo = async (req, res) => {
    const { script } = req.body;

    if (!script || script.trim() === '') {
        return res.status(400).json({ success: false, error: 'Script không được để trống' });
    }

    try {
        const apiKey = process.env.JSON2VIDEO_API_KEY;
        if (!apiKey) throw new Error('API key chưa được cấu hình.');

        const scenes = parseScriptToScenes(script);

        const movieJSON = {
            resolution: "full-hd",
            scenes
        };

        // ✅ Debug: log nội dung gửi lên API
        console.log("Sending movieJSON to API:", JSON.stringify(movieJSON, null, 2));

        const response = await axios.post('https://api.json2video.com/v2/movies', movieJSON, {
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            }
        });

        const result = response.data;

        if (!result.success) {
            throw new Error(result.message || 'Lỗi khi render video.');
        }

        const projectId = result.project;
        const videoUrl = await pollVideoUrl(apiKey, projectId);
        return res.json({ success: true, videoUrl });

    } catch (error) {
        console.error('Lỗi khi tạo video:', error);
        return res.status(500).json({ success: false, error: error.message || 'Lỗi khi tạo video từ API' });
    }
};

// Hàm chờ video render xong
async function pollVideoUrl(apiKey, projectId, retries = 40, interval = 5000) {
    const url = `https://api.json2video.com/v2/movies?project=${projectId}`;
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                headers: { 'x-api-key': apiKey }
            });

            const movieData = response.data?.movie;
            if (movieData?.url) {
                return movieData.url;
            }
        } catch (err) {
            console.error('Lỗi khi kiểm tra video:', err.message);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Không lấy được URL video sau nhiều lần thử.');
}

module.exports = { generateVideo };
