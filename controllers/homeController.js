
const renderHome = async (req, res) => {
        res.render('home');
};
const renderDashboard= async (req, res) => {
    const user = req.session.user || req.user;
    if (!user) {
        return res.redirect('/login');
    }
    res.render('dashboard');
};
module.exports = { renderHome,renderDashboard};
