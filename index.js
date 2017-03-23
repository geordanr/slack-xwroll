var app = require('./server');
var port = app.get('env') === 'development' ? 3000 : process.env.PORT;

app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});
