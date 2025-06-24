const { generateImageByImagen } = require('../services/imagenService');

const generateImage = async (req, res) => {
  const { prompt, modelType = 'ultra', imageCount = 1, aspectRatio = '1:1' } = req.body;
  
  console.log('Generate image request:', { prompt, modelType, imageCount, aspectRatio });
  
  try {
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Vui lòng nhập prompt để tạo ảnh.' 
      });
    }
    
    // Giới hạn số lượng ảnh từ 1-4
    const count = Math.min(Math.max(parseInt(imageCount) || 1, 1), 4);
    
    // Xác định model type
    let actualModelType = 'standard';
    if (['ultra', 'standard', 'fast'].includes(modelType)) {
      actualModelType = modelType;
    }
    
    // Xác thực tỷ lệ khung hình
    let validAspectRatio = '1:1'; // Giá trị mặc định
    if (['1:1', '3:4', '4:3', '16:9', '9:16'].includes(aspectRatio)) {
      validAspectRatio = aspectRatio;
    }
    
    try {
      // Gọi service để tạo ảnh
      console.log(`🖼️ Đang gọi Imagen API (${actualModelType}) để tạo ${count} ảnh với tỷ lệ ${validAspectRatio}...`);
      
      const images = await generateImageByImagen(prompt, {
        modelType: actualModelType,
        imageCount: count,
        aspectRatio: validAspectRatio,
        retryDelay: 5000, // 5 giây
        maxRetries: 5     // Thử tối đa 5 lần
      });
      
      console.log(`✅ Đã tạo thành công ${images.length} ảnh`);
      
      // Trả về kết quả
      return res.json({
        success: true,
        images: images,
        model: actualModelType,
        aspectRatio: validAspectRatio
      });
    } catch (error) {
      console.error('❌ Lỗi khi tạo ảnh:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Không thể tạo ảnh: ${error.message}` 
      });
    }
  } catch (error) {
    console.error('❌ Lỗi xử lý request:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Đã xảy ra lỗi khi xử lý yêu cầu.' 
    });
  }
};

module.exports = {
  generateImage
}; 