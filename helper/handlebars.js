const moment = require('moment');

module.exports = {
  formatDate: function (dateStr) {
    return moment(dateStr).format('DD/MM/YYYY');
  }
};
