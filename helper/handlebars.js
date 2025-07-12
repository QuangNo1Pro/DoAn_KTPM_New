const moment = require('moment');

module.exports = {
  // Helper định dạng ngày hiện có
  formatDate: function (dateStr, options) {
    const format = options?.hash?.format || 'DD/MM/YYYY';
    return moment(dateStr).format(format);
  },

  // Helper để chọn giá trị mặc định trong dropdown
  selected: function(selected, options) {
    return selected === options ? 'selected' : '';
  },

  // Helper để kiểm tra và hiển thị input tùy chỉnh
  isCustom: function(filterPeriod) {
    return filterPeriod === 'custom' ? 'block' : 'none';
  }
};