module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
      alert("You must be signed in first!")
      return res.redirect('/login')
    }
    next()
  }