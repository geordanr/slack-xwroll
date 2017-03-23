var chai = require('chai'),
    expect = chai.expect,
    request = require('supertest'),
    app = require('../server');

describe('server', () => {
    describe('POST /roll', () => {
        it('rolls attack dice', (done) => {
            request(app)
                .post('/roll')
                .send('text=10 attack')
                .send('user_name=mochatest')
                .expect('Content-Type', /application\/json/)
                .expect((res) => {
                    expect(res.body).to.have.property('response_type', 'in_channel');
                    expect(res.body).to.have.property('text')
                        .that.match(/@mochatest/)
                        .and.match(/:red(crit|hit|focus|blank):/)
                        .and.not.match(/:green(evade|focus|blank):/);
                })
                .expect(200, done);
        });

        it('rolls defense dice', (done) => {
            request(app)
                .post('/roll')
                .send('text=10 defense')
                .send('user_name=mochatest')
                .expect('Content-Type', /application\/json/)
                .expect((res) => {
                    expect(res.body).to.have.property('response_type', 'in_channel');
                    expect(res.body).to.have.property('text')
                        .that.match(/@mochatest/)
                        .and.match(/:green(evade|focus|blank):/)
                        .and.not.match(/:red(crit|hit|focus|blank):/);
                })
                .expect(200, done);
        });

        it('complains when given invalid dice types', (done) => {
            request(app)
                .post('/roll')
                .send('text=10 nopes')
                .expect('Content-Type', /application\/json/)
                .expect((res) => {
                    expect(res.body).to.have.property('text')
                        .that.match(/Bad die type/);
                })
                .expect(200, done);
        });

        it('rolls no more than 10 dice', (done) => {
            request(app)
                .post('/roll')
                .send('text=100 defense')
                .send('user_name=mochatest')
                .expect('Content-Type', /application\/json/)
                .expect((res) => {
                    expect(res.body.text.match(/:green(evade|focus|blank):/g).length).to.equal(10);
                })
                .expect(200, done);
        });

        it('rolls at least one die', (done) => {
            request(app)
                .post('/roll')
                .send('text=-1 defense')
                .send('user_name=mochatest')
                .expect('Content-Type', /application\/json/)
                .expect((res) => {
                    expect(res.body.text.match(/:green(evade|focus|blank):/g).length).to.equal(1);
                })
                .expect(200, done);
        });
    });
});
