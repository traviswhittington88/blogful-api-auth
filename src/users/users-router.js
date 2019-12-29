const express = require('express')
const UsersService = require('../users/users-service')

const usersRouter = express.Router()
const jsonBodyParser = express.json()

usersRouter
  .post('/', jsonBodyParser, (req, res, next) => {
    const { user_name, password, full_name } = req.body
    const newUser = { user_name, password, full_name }

    for (const field of ['full_name', 'user_name', 'password'])
      if (!req.body[field]) 
        return res.status(400).json({
          error: `Missing ${field} in request body`,
        })
    
    const passwordError = UsersService.validatePassword(password)

    if (passwordError) {
      return res.status(400).json({
        error: passwordError
      })
    }

    UsersService.hasUserWithUserName(
      req.app.get('db'),
      user_name
    )
      .then(hasUserWithUserName => {
        if (hasUserWithUserName) {
          return res.status(400).json({
            error: `Username already taken`
          })
        }
        res.send('ok')
      })
      .catch(next)
    
    /*
    for (const[key, value] of Object.entries(newUser)) {
      if (value == null) {
         return res.status(400).json({
          error: `Missing '${key}' in request body`
        })
      }
    }
    */
  })

module.exports = usersRouter