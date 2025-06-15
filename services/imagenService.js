const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

// Định nghĩa các mô hình AI tạo ảnh có sẵn
const AI_MODELS = {
  IMAGEN_ULTRA: "imagen-4.0-ultra-generate-preview-06-06",
  IMAGEN_STANDARD: "imagen-4.0-generate-preview-06-06",
  IMAGEN_FAST: "imagen-4.0-fast-generate-preview-06-06"
};

// Đường dẫn đến file credentials
const credentialsPath = path.join(__dirname, '..', 'gemini.json');

// Kiểm tra file credentials
if (!fs.existsSync(credentialsPath)) {
  console.error(`❌ Không tìm thấy file credentials tại đường dẫn: ${credentialsPath}`);
} else {
  console.log(`✓ Đã tìm thấy file credentials tại: ${credentialsPath}`);
}

// Đọc credentials từ file
let credentials;
try {
  credentials = JSON.parse(fs.readFileSync(credentialsPath));
  console.log(`✓ Đã đọc credentials cho project: ${credentials.project_id}`);
} catch (error) {
  console.error('❌ Lỗi khi đọc file credentials:', error.message);
}

// Hàm tạo ảnh bằng Imagen từ Google Cloud
const generateImageByImagen = async (prompt, options = {}) => {
  const {
    modelType = 'ultra',
    imageCount = 1,
    aspectRatio = '1:1'
  } = options;
  
  // Chọn model dựa trên modelType
  let model;
  switch(modelType) {
    case 'ultra':
      model = AI_MODELS.IMAGEN_ULTRA;
      break;
    case 'fast':
      model = AI_MODELS.IMAGEN_FAST;
      break;
    default:
      model = AI_MODELS.IMAGEN_STANDARD;
  }
  
  console.log(`🖼️ Đang tạo ảnh với Imagen (${modelType})...`);
  console.log(`📝 Prompt: ${prompt}`);
  console.log(`📌 Sử dụng model: ${model}`);

  try {
    // Đảm bảo prompt là chuỗi và không rỗng
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      console.log('❌ Prompt không hợp lệ hoặc rỗng');
      throw new Error("Prompt không được để trống.");
    }
    
    // Chuẩn bị auth
    if (!credentials) {
      throw new Error("Không tìm thấy credentials");
    }
    
    // Tạo auth client
    const auth = new GoogleAuth({
      keyFile: credentialsPath,
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform',
        'https://www.googleapis.com/auth/cloud-platform.read-only'
      ],
    });

    // Lấy token
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;

    // Chuẩn bị request body cho Imagen API
    const requestBody = {
      "instances": [
        {
          "prompt": prompt
        }
      ],
      "parameters": {
        "sampleCount": imageCount
      }
    };

    // Gọi API sử dụng Axios
    const response = await axios.post(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${credentials.project_id}/locations/us-central1/publishers/google/models/${model}:predict`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Xử lý kết quả
    console.log('✓ Đã nhận phản hồi từ Imagen API');
    
    if (response.data && response.data.predictions) {
      // Trích xuất các URL ảnh từ kết quả
      const images = response.data.predictions.map(prediction => {
        if (prediction.bytesBase64Encoded) {
          return {
            imageData: prediction.bytesBase64Encoded,
            type: 'base64'
          };
        } else if (prediction.imageUrl) {
          return {
            imageData: prediction.imageUrl,
            type: 'url'
          };
        }
        return null;
      }).filter(img => img !== null);
      
      console.log(`✅ Đã tạo thành công ${images.length} ảnh`);
      return images;
    } else {
      console.error('❌ Phản hồi không đúng định dạng từ API');
      throw new Error("Phản hồi không đúng định dạng từ API");
    }
  } catch (error) {
    console.error('❌ Lỗi khi gọi Imagen API:', error.message);
    throw new Error(`Không thể tạo ảnh với Imagen: ${error.message}`);
  }
};

module.exports = {
  generateImageByImagen
}; 