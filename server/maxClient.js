const fs = require('fs');
const path = require('path');
const tls = require('tls');
const { Agent, setGlobalDispatcher } = require('undici');
const { Bot } = require('@maxhub/max-bot-api');

// platform-api2.max.ru presents a TLS certificate issued by Russia's
// government "Russian Trusted CA" chain, which isn't in most systems'
// default trust store, so it has to be added explicitly alongside the
// normal public roots.
const RUSSIAN_CA_BUNDLE = fs.readFileSync(path.join(__dirname, '..', 'certs', 'russian_trusted_ca_bundle.pem'));
setGlobalDispatcher(new Agent({ connect: { ca: [...tls.rootCertificates, RUSSIAN_CA_BUNDLE] } }));

const token = process.env.MAX_BOT_TOKEN;
if (!token) {
  throw new Error('MAX_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.');
}

const bot = new Bot(token);

module.exports = { bot };
