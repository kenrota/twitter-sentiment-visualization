(function () {
    'use strict';

    let positiveCount = 0;
    let negativeCount = 0;
    let positivePercentage = 50;
    let negativePercentage = 50;
    let tweets = [];

    const SentiTypePosi = 'positive';
    const SentiTypeNega = 'negative';

    const IncCount = 'incrementCount';

    const cx = 100;
    const cy = 100;
    const r = 50;

    const pubnub = new PubNub({
        subscribe_key: 'sub-c-78806dd4-42a6-11e4-aed8-02ee2ddab7fe'
    });

    pubnub.addListener({
        message: tweetListener
    });

    pubnub.subscribe({
        channels: ['pubnub-twitter']
    });

    function tweetListener(message) {
        const tweet = extractTweetParams(message.message);
        const sentiTypes = measureSentiment(tweet.text);

        if (sentiTypes.length > 0) {
            sentiTypes.forEach(sentiType => {
                if (sentiType === SentiTypePosi) {
                    positiveCount = updateCount(positiveCount, IncCount);
                    viewCount(positiveCount, 'positive_count');
                }
                if (sentiType === SentiTypeNega) {
                    negativeCount = updateCount(negativeCount, IncCount);
                    viewCount(negativeCount, 'negative_count');
                }
            });

            const total = positiveCount + negativeCount;
            positivePercentage = Math.round(positiveCount / total * 100);
            negativePercentage = 100 - positivePercentage;
            const pieces = [
                { percentage: positivePercentage, color: 'springgreen' },
                { percentage: negativePercentage, color: 'cornflowerblue' }
            ];

            createPieChart('pie_chart', pieces, cx, cy, r);

            tweets = updateTweets(tweets, tweet);
            viewTweets(tweets);
        }
    }

    function extractTweetParams(message) {
        return {
            url: message.user.profile_image_url,
            name: message.user.screen_name,
            country: message.place == null ? '' : message.place.country_code,
            language: message.lang,
            text: message.text
        }
    }

    function measureSentiment(text) {
        // Copy words from https://github.com/pubnub/tweet-emotion/blob/gh-pages/js/app.js
        const positiveWords = [
            'excellent', 'amazing', 'beautiful', 'nice', 'marvelous', 'magnificent', 'fabulous', 'astonishing', 'fantastic', 'peaceful', 'fortunate',
            'brilliant', 'glorious', 'cheerful', 'gracious', 'grateful', 'splendid', 'superb', 'honorable', 'thankful', 'inspirational',
            'ecstatic', 'victorious', 'virtuous', 'proud', 'wonderful', 'lovely', 'delightful'
        ];
        const negativeWords = [
            'unhappy', 'bad', 'sorry', 'annoyed', 'dislike', 'anxious', 'ashamed', 'cranky', 'crap', 'crappy', 'envy',
            'awful', 'bored', 'boring', 'bothersome', 'bummed', 'burned', 'chaotic', 'defeated', 'devastated', 'stressed',
            'disconnected', 'discouraged', 'dishonest', 'doomed', 'dreadful', 'embarrassed', 'evicted', 'freaked out', 'frustrated', 'stupid',
            'guilty', 'hopeless', 'horrible', 'horrified', 'humiliated', 'ignorant', 'inhumane', 'cruel', 'insane', 'insecure',
            'nervous', 'offended', 'oppressed', 'overwhelmed', 'pathetic', 'powerless', 'poor', 'resentful', 'robbed', 'screwed'
        ];

        const includesPositiveWord = positiveWords.some(w => text.includes(w));
        const includesNegativeWord = negativeWords.some(w => text.includes(w));

        const sentiTypes = [];
        if (includesPositiveWord) {
            sentiTypes.push(SentiTypePosi);
        }
        if (includesNegativeWord) {
            sentiTypes.push(SentiTypeNega);
        }
        return sentiTypes;
    }

    function updateCount(count, msg) {
        switch (msg) {
            case IncCount: return incrementCount(count);
            default: return count;
        }
    }

    function incrementCount(count) {
        return count + 1;
    }

    function viewCount(count, id) {
        document.getElementById(id).textContent = count;
    }

    function updateTweets(tweets, tweet) {
        tweets.unshift(tweet);
        if (tweets.length > 10) {
            tweets.pop();
        }
        return tweets;
    }

    function viewTweets(tweets) {
        const lis = tweets.map(tweet => {
            const li = document.createElement('li');
            const div = document.createElement('div');
            [
                createImage(tweet.url),
                createLabel(tweet.name),
                createLabel(tweet.country),
                createLabel(tweet.language),
                createLabel(tweet.text)
            ].forEach(elem => div.appendChild(elem));
            li.appendChild(div);
            return li;
        });

        const tweetsUl = document.getElementById('tweets');
        removeAllChildElements(tweetsUl);
        lis.forEach(li => tweetsUl.appendChild(li));
    }

    function createImage(url) {
        const img = document.createElement('img');
        img.className = 'avatar';
        img.src = url;
        return img;
    }

    function createLabel(text) {
        const label = document.createElement('label');
        label.textContent = text;
        return label;
    }

    function removeAllChildElements(node) {
        node.textContent = null;
    }

    function createPieChart(id, pieces, cx, cy, r) {
        let degreeStart = 0;
        let degreeEnd = 0;

        const pieParts = pieces.map(piece => {
            const degree = 360 * piece.percentage / 100;
            degreeEnd = degreeStart + degree;
            const part = { start: degreeStart, end: degreeEnd, color: piece.color };
            degreeStart = degreeEnd;
            return part;
        });

        const svg = document.getElementById(id);
        svg.textContent = null;
        pieParts.forEach(part => {
            const path = createSector(cx, cy, r, part.start, part.end, part.color);
            svg.appendChild(path);
        });
    }

    function calculateCoordinate(cx, cy, r, degree) {
        const x = cx + r * Math.sin(degree / 180 * Math.PI);
        const y = cy - r * Math.cos(degree / 180 * Math.PI);
        return { x: x, y: y };
    }

    function createSector(cx, cy, r, degreeStart, degreeEnd, color) {
        const startCoordinate = calculateCoordinate(cx, cy, r, degreeStart);
        const finishCoordinate = calculateCoordinate(cx, cy, r, degreeEnd);
        const largeArcFlag = (degreeEnd - degreeStart <= 180) ? 0 : 1;

        const moveTo = `M${cx} ${cy} `;
        const lineTo = `L${startCoordinate.x} ${startCoordinate.y} `;
        const arcTo = `A${r} ${r} 0 ${largeArcFlag} 1 ${finishCoordinate.x} ${finishCoordinate.y} `;
        const closePath = 'Z';

        const NS = 'http://www.w3.org/2000/svg';
        const path = document.createElementNS(NS, 'path');
        path.setAttributeNS(null, 'd', moveTo + lineTo + arcTo + closePath);
        path.setAttributeNS(null, 'fill', color);
        path.setAttributeNS(null, 'stroke', 'black');

        return path;
    }
})();
