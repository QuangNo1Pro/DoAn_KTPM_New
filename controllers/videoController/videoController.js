require('dotenv').config();

const renderAdvancedVideoPage = (req, res) => {
  res.render('videoView/advancedVideo', {
    title: 'Tạo Video AI Nâng Cao',
    user: req.session.user
  });
};

const renderVideoEditorPage = (req, res) => {
  res.render('videoView/videoEditor', {
    title: 'Chỉnh Sửa Video',
    user: req.session.user
  });
};

module.exports = {
  renderAdvancedVideoPage,
  renderVideoEditorPage,
};
