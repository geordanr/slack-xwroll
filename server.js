var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var request = require('request');

const MAX_ROLLABLE_DICE = 10;

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
    res.set('Content-Type', 'application/json');
    var args, color, number, type;
    try {
        args = req.body.text.split(/\s+/);
        number = args[0];
        type = args[1];
    } catch (e) {
        return complain(res, 'Usage: `/roll N attack|defense`');
    }

    switch (type.toLowerCase()) {
        case 'attack':
        case 'att': // Jeff Wilder is lazy
        case 'atk':
        case 'red':
            color = 'red';
            break
        case 'defense':
        case 'def':
        case 'green':
            color = 'green';
            break
        default:
            return complain(res, `Bad die type ${type}`);
    }

    var n;
    try {
        n = Math.min(Math.max(1, parseInt(number)), MAX_ROLLABLE_DICE);
    } catch (e) {
        return complain(res, `Bad number of dice ${number}`);
    }

    var result;
    var results = [];
    var summary = {};
    var summary_counts = [];
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
        if (!(result in summary)) {
            summary[result] = 0;
        }
        summary[result]++;
    }

    for (var result of Object.keys(summary).sort()) {
        summary_counts.push(`${summary[result]} ${result}`);
    }

    res.send(JSON.stringify({
        'response_type': 'in_channel',
        'text': `@${req.body.user_name}: ${summary_counts.join(', ')} ${results.join(' ')}`,
    }));
});

// Shamelessly stolen from http://www.girliemac.com/blog/2016/10/24/slack-command-bot-nodejs/
app.get('/slack', (req, res) => {
    var data = {
        form: {
            client_id: process.env.SLACK_CLIENT_ID,
            client_secret: process.env.SLACK_CLIENT_SECRET,
            code: req.query.code
        }
    };
    request.post('https://slack.com/api/oauth.access', data, (error, response, body) => {
        if (!error && response.statusCode == 200) {
            let token = JSON.parse(body).access_token; // Auth token
            request.post('https://slack.com/api/team.info', {form: {token: token}}, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    console.log(JSON.parse(body));
                    let team = JSON.parse(body).team.domain;
                    res.redirect('http://' +team+ '.slack.com');
                }
            });
        }
    });
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
    return res.send(JSON.stringify({
        'text': msg
    }));
}

module.exports = app; // used by tests
