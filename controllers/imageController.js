const { generateImageByImagen } = require('../services/imagenService');

const generateImage = async (req, res) => {
  const { prompt, modelType = 'ultra', imageCount = 1 } = req.body;
  
  console.log('Generate image request:', { prompt, modelType, imageCount });
  
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
    
    try {
      // Gọi service để tạo ảnh
      console.log(`🖼️ Đang gọi Imagen API (${actualModelType}) để tạo ${count} ảnh...`);
      
      const images = await generateImageByImagen(prompt, {
        modelType: actualModelType,
        imageCount: count,
        retryDelay: 5000, // 5 giây
        maxRetries: 5     // Thử tối đa 5 lần
      });
      
      console.log(`✅ Đã tạo thành công ${images.length} ảnh`);
      
      // Trả về kết quả
      return res.json({
        success: true,
        images: images,
        model: actualModelType
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