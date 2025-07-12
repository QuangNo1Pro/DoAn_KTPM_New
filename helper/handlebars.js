const moment = require('moment');

module.exports = {
  formatDate: function (dateStr, options) {
    const format = options?.hash?.format || 'DD/MM/YYYY';
    return moment(dateStr).format(format);
  }
};
