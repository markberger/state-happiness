var async = require('async');
var fs = require('fs');
var events = require('events');

var stateHappiness = {};
var knownWords = {};

module.exports = {
    createParser : function() {
        module.exports._emitter = new events.EventEmitter();
        loadWords();
        loadStates();
        return module.exports._emitter;
    },
    parseTweet : function(tweet) {
        if (tweet['place'] != null) {
            if (tweet['place']['country_code'] === 'US') {
                parseLocation(tweet);
            }
        }
    },
    getStates : function() {
        return stateHappiness;
    }
};

var usStates = [
    { name: 'Alabama', abbreviation: 'AL'},
    { name: 'Alaska', abbreviation: 'AK'},
    { name: 'Arizona', abbreviation: 'AZ'},
    { name: 'Arkansas', abbreviation: 'AR'},
    { name: 'California', abbreviation: 'CA'},
    { name: 'Colorado', abbreviation: 'CO'},
    { name: 'Connecticut', abbreviation: 'CT'},
    { name: 'Delaware', abbreviation: 'DE'},
    { name: 'District of Columbia', abbreviation: 'DC'},
    { name: 'Florida', abbreviation: 'FL'},
    { name: 'Georgia', abbreviation: 'GA'},
    { name: 'Hawaii', abbreviation: 'HI'},
    { name: 'Idaho', abbreviation: 'ID'},
    { name: 'Illinois', abbreviation: 'IL'},
    { name: 'Indiana', abbreviation: 'IN'},
    { name: 'Iowa', abbreviation: 'IA'},
    { name: 'Kansas', abbreviation: 'KS'},
    { name: 'Kentucky', abbreviation: 'KY'},
    { name: 'Louisiana', abbreviation: 'LA'},
    { name: 'Maine', abbreviation: 'ME'},
    { name: 'Maryland', abbreviation: 'MD'},
    { name: 'Massachusetts', abbreviation: 'MA'},
    { name: 'Michigan', abbreviation: 'MI'},
    { name: 'Minnesota', abbreviation: 'MN'},
    { name: 'Mississippi', abbreviation: 'MS'},
    { name: 'Missouri', abbreviation: 'MO'},
    { name: 'Montana', abbreviation: 'MT'},
    { name: 'Nebraska', abbreviation: 'NE'},
    { name: 'Nevada', abbreviation: 'NV'},
    { name: 'New Hampshire', abbreviation: 'NH'},
    { name: 'New Jersey', abbreviation: 'NJ'},
    { name: 'New Mexico', abbreviation: 'NM'},
    { name: 'New York', abbreviation: 'NY'},
    { name: 'North Carolina', abbreviation: 'NC'},
    { name: 'North Dakota', abbreviation: 'ND'},
    { name: 'Ohio', abbreviation: 'OH'},
    { name: 'Oklahoma', abbreviation: 'OK'},
    { name: 'Oregon', abbreviation: 'OR'},
    { name: 'Pennsylvania', abbreviation: 'PA'},
    { name: 'Puerto Rico', abbreviation: 'PR'},
    { name: 'Rhode Island', abbreviation: 'RI'},
    { name: 'South Carolina', abbreviation: 'SC'},
    { name: 'South Dakota', abbreviation: 'SD'},
    { name: 'Tennessee', abbreviation: 'TN'},
    { name: 'Texas', abbreviation: 'TX'},
    { name: 'Utah', abbreviation: 'UT'},
    { name: 'Vermont', abbreviation: 'VT'},
    { name: 'Virginia', abbreviation: 'VA'},
    { name: 'Washington', abbreviation: 'WA'},
    { name: 'West Virginia', abbreviation: 'WV'},
    { name: 'Wisconsin', abbreviation: 'WI'},
    { name: 'Wyoming', abbreviation: 'WY' }
];

function loadWords() {
    fs.readFile('labMT.txt', function (err, fileData) {
        if (err) throw err;
        var text = fileData.toString();
        var lines = text.split('\n');
        lines.shift();
        lines.pop();
        async.each(lines, addWord);

        function addWord(line) {
        	var parts = line.split('\t');
        	var w = parts[0];
        	var happiness = parts[2];
        	if (happiness <= 4 || happiness >= 6) {
        	    knownWords[w] = parseFloat(happiness);
        	}
        }
    });
}

function loadStates() {
    for(var i = 0; i < usStates.length; i++) {
        abbr = usStates[i]['abbreviation'];
        var state = {};
        state['name'] = usStates[i]['name'];
        state['totalHappiness'] = 0;
        state['numMessages'] = 0;
        stateHappiness[abbr] = state;
    }
}

function parseLocation(tweet) {
    var full_name = tweet['place']['full_name'];
    var text = tweet['text']
    var parts = full_name.split(',');
    abbr = parts[1].replace(/\s+/g, '');
    if (abbr in stateHappiness) {
        calcHappiness(text, abbr);
    } else if (abbr === 'US') {
        async.each(usStates, function(state) {
            stateName = state['name'].toLowerCase();
            if(parts[0].toLowerCase() === stateName) {
                abbr = state['abbreviation'];
                calcHappiness(text, abbr);
            }
        });
    }
}

function calcHappiness(text, abbr) {
    var words = text.split(/[ \.]+/);
    var happiness = 0;
    var numWords = 0;

    function checkWord(word, callback) {
        word = word.toLowerCase().replace(/[^\w'#]/g, '');
        if(word in knownWords) {
            numWords++;
            happiness += knownWords[word];
        }
        callback();
    }

    function addHappiness() {
        happiness = happiness / numWords;
        if(!isNaN(happiness)) {
            state = stateHappiness[abbr];
            state['totalHappiness'] += happiness;
            state['numMessages']++;
            avgHappiness = state['totalHappiness']/state['numMessages'];
            //console.log('New average happiness for ' + abbr + ': ' + avgHappiness.toFixed(3));
            var update = {abbr: state};
            module.exports._emitter.emit('update', update);
        }
    }

    async.each(words, checkWord, addHappiness);
}
