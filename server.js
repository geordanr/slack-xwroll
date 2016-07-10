var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');

var port = app.get('env') === 'development' ? 3000 : process.env.PORT;

app.use((req, res, next) => {
    console.log(`${new Date().toUTCString()} ${req.ip} ${req.method} ${req.path}`);
    next();
});

app.use(cors());

app.use(bodyParser.urlencoded({'extended': true}));

app.use((req, res, next) => {
    // Check POSTs against the Slack API token
    if (req.method === 'POST' && app.get('env') !== 'development' && req.body.token !== process.env.SLACK_API_TOKEN) {
        res.status(401).end('Invalid API token');
    }
    next();
});

app.post('/roll', (req, res) => {

    var args, color, number, type;
    try {
        args = req.body.text.split(/\s+/);
        number = args[0];
        type = args[1];
    } catch (e) {
        complain(res, 'Usage: `/roll N attack|defense`');
    }

    switch (type) {
        case 'attack':
            color = 'red';
            break
        case 'defense':
            color = 'green';
            break
        default:
            complain(res, `Bad die type ${type}`);
    }

    var n;
    try {
        n = Math.max(0, parseInt(number));
    } catch (e) {
        complain(res, `Bad number of dice ${number}`);
    }

    var result;
    var results = [];
    for (var i = 0; i < n; i++) {
        switch (color) {
            case 'red':
                result = rollAttackDie();
                break
            case 'green':
                result = rollDefenseDie();
                break
            default:
                res.status(500).end(`Impossible die color ${color}`);
        }
        results.push(`:${color}${result}:`);
    }

    res.send(JSON.stringify({
        'response_type': 'in_channel',
        'text': `@${req.body.user_name}: ${results.join(' ')}`,
    }));
});

app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});

function rollAttackDie() {
    var result = roll(8);
    if (result < 2) {
        return 'blank'
    } else if (result < 4) {
        return 'focus'
    } else if (result < 7) {
        return 'hit'
    } else {
        return 'crit'
    }
}

function rollDefenseDie() {
    var result = roll(8);
    if (result < 3) {
        return 'blank'
    } else if (result < 5) {
        return 'focus'
    } else {
        return 'evade'
    }
}

function roll(n) {
    return Math.floor(Math.random() * n);
}

function complain(res, msg) {
    res.send(JSON.stringify({
        'text': msg
    }));
}
