const knex = require('knex')
const bcrypt = require('bcryptjs') //to test passwords are hashed
const helpers = require('../test/test-helpers')
const app = require('../src/app')

describe('Users endpoints', function() {
  let db

  const { testUsers } = helpers.makeArticlesFixtures()
  const testUser = testUsers[0]

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconnect from db', () => db.destroy())

  before('cleanup', () => helpers.cleanTables(db))

  afterEach('cleanup', () => helpers.cleanTables(db))

  describe(`POST /api/users`, () => {
    context(`User Validation`, () => {
      beforeEach('insert users', () => 
        helpers.seedUsers(
          db,
          testUsers,
        )  
      )
      const requiredFields = ['user_name', 'password', 'full_name']

      requiredFields.forEach(field => {
        const registerAttemptBody = {
          user_name: 'test user_name',
          password: 'test password',
          full_name: 'test full_name',
          nickname: 'test nickname',
        }

        it(`responds with 400 required error when '${field} is missing`, () => {
          delete registerAttemptBody[field]

          return supertest(app)
            .post('/api/users')
            .send(registerAttemptBody)
            .expect(400, {
              error: `Missing ${field} in request body`,
            })
        })
      })

      it(`responds 400 'Password must be at least 8 characters when short password`, () => {
        const userShortPassword = { 
          user_name: 'test user_name',
          password: '1234567',
          full_name: 'test full_name',
        }

        return supertest(app)
          .post('/api/users')
          .send(userShortPassword)
          .expect(400, {
            error: `Password must be at least 8 characters`,
          })
      })

      it(`responds 400 'Password must be shorter than 73 characters when long password`, () => {
        const userLongPassword = {
          user_name: 'test user_name',
          full_name: 'test full_name', 
          password: '*'.repeat(73),
        }

        return supertest(app)
          .post('/api/users')
          .send(userLongPassword)
          .expect(400, {
            error: `Password must be less than 73 characters`,
          })
      })

      it(`responds 400 error when password starts with spaces`, () => {
        const userPasswordStartsSpaces = {
          user_name: 'test user_name', 
          full_name: 'test full_name', 
          password: ' 12345678',
        }

        return supertest(app)
          .post('/api/users')
          .send(userPasswordStartsSpaces)
          .expect(400, {
            error: `Password must not start or end with spaces`,
          })
      })

      it(`responds 400 error when password ends with spaces`, () => {
        const userPassEndsSpaces = {
          user_name: 'test user_name',
          password: '12345678 ',
          full_name: 'test full_name',
        }

        return supertest(app)
          .post('/api/users')
          .send(userPassEndsSpaces)
          .expect(400, {
            error: `Password must not start or end with spaces`, 
          })
      })


      it(`responds 400 error when password isn't complex enough`, () => {
        const userPasswordNotComplex = {
          user_name: 'test user_name',
          full_name: 'test full_name', 
          password: '11AAaabb'
        }

        return supertest(app)
          .post('/api/users')
          .send(userPasswordNotComplex)
          .expect(400, {
            error: `Password must contain 1 upper case, lower case, number and special character` 
          })
  
      })

      it(`responds 400 'User name already taken' when user_name isn't unique`, () => {
        const duplicateUser = {
          user_name: testUser.user_name,
          password: '11AAaa!!',
          full_name: 'test full_name',
        }

        return supertest(app)
          .post('/api/users')
          .send(duplicateUser)
          .expect(400, {
            error: `Username already taken` 
          })
      })

    })

    context(`Happy path`, () => {
      it(`responds 201, serialized user, storing bcrypted password`, () => {
        const newUser = {
          user_name: 'test user_name',
          password: '11AAaa!!',
          full_name: 'test full_name',
        }
        return supertest(app)
          .post('/api/users')
          .send(newUser)
          .expect(201)
          .expect(res => {
            expect(res.body).to.have.property('id')
            expect(res.body.user_name).to.eql(newUser.user_name)
            expect(res.body.full_name).to.eql(newUser.full_name)
            expect(res.body.nickname).to.eql('')
            expect(res.body).to.not.have.property('password')
            expect(res.headers.location).to.eql(`/api/users/${res.body.id}`)
            const expectedDate = new Date().toLocaleString('en', { timeZone: 'UTC' })
            const actualDate = new Date(res.body.date_created).toLocaleString()
            expect(actualDate).to.eql(expectedDate)
          })
          .expect(res =>
            db
              .from('blogful_users')
              .select('*')
              .where( { id: res.body.id })
              .first()
              .then(row => {
                expect(row.user_name).to.eql(newUser.user_name)
                expect(row.full_name).to.eql(newUser.full_name)
                expect(row.nickname).to.eql(null)
                const expectedDate = new Date().toLocaleString('en', { timeZone: 'UTC' })
                const actualDate = new Date(res.body.date_created).toLocaleString()
                expect(actualDate).to.eql(expectedDate)

                return bcrypt.compare(newUser.password, row.password)
              })
              .then(compareMatch => {
                expect(compareMatch).to.be.true
              })
          )
      })
    })

  })


})