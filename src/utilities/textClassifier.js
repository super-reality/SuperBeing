import natural from 'natural';
import { rootDir } from './rootDir.js';
import fs from 'fs';
import { log } from './logger.js';

let classifier;
let profanityClassifier

export async function classifyText(input) {
    if (!classifier || classifier === undefined) {
        return '';
    }

    return await classifier.classify(input);
}
export async function classifyProfanityText(input) {
    if (!profanityClassifier || profanityClassifier === undefined) {
        return '';
    }

    return await profanityClassifier.classify(input);
}

export async function trainClassifier() {
    const lines = fs.readFileSync(rootDir + '/data/classifier/training_data.txt').toString().split('\n');
    for(let i = 0; i < lines.length; i++) {
        const data = lines[i].trim().split('|');
        if (data.length !== 2) {
            continue;
        }

        classifier.addDocument(data[0].trim(), data[1].trim());
    }

    classifier.train();
    classifier.save(rootDir + '/data/classifier/classifier.json', function (err, classifier) {
        if (err) {
            log(err);
            return;
        }

        log('saved classifier');
    });
}
export async function trainProfanityClassifier() {
    const lines = fs.readFileSync(rootDir + '/data/classifier/profanity_data.txt').toString().split('\n');
    for(let i = 0; i < lines.length; i++) {
        profanityClassifier.addDocument(lines[i], 'profane');
    }

    profanityClassifier.train();
    profanityClassifier.save(rootDir + '/data/classifier/profanity_classifier.json', function (err, classifier) {
        if (err) {
            log(err);
            return;
        }

        log('saved profanity classifier');
    });
}

export async function initClassifier() {
    if (fs.existsSync(rootDir + '/data/classifier/classifier.json')) {
        await natural.BayesClassifier.load(rootDir + '/data/classifier/classifier.json', null, async function (err, _classifier) {
            if (err) {
                log(err);
                classifier = new natural.BayesClassifier();
                await trainClassifier();
                return;
            }

            log('loaded classifier');
            classifier = _classifier;
        });
    } else {
        classifier = new natural.BayesClassifier();
        await trainClassifier();
    }
}
export async function initProfanityClassifier() {
    if (fs.existsSync(rootDir + '/data/classifier/profanity_classifier.json')) {
        await natural.BayesClassifier.load(rootDir + '/data/classifier/profanity_classifier.json', null, async function (err, _classifier) {
            if (err) {
                log(err);
                profanityClassifier = new natural.BayesClassifier();
                await trainProfanityClassifier();
                return;
            }

            log('loaded profanity classifier');
            profanityClassifier = _classifier;
        });
    } else {
        profanityClassifier = new natural.BayesClassifier();
        await trainProfanityClassifier();
    }
}