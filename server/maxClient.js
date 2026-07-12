const fs = require('fs');
const path = require('path');
const tls = require('tls');
const { Agent, setGlobalDispatcher } = require('undici');
const { Bot } = require('@maxhub/max-bot-api');

// platform-api2.max.ru presents a TLS certificate issued by Russia's
// government "Russian Trusted CA" chain, which isn't in most systems'
// default trust store, so it has to be added explicitly alongside the
// normal public roots. This replaces the process-wide dispatcher (the
// @maxhub/max-bot-api library calls plain global fetch with no way to
// scope a custom CA to just its own requests), so NODE_EXTRA_CA_CERTS is
// folded in too — otherwise any other host that only validates because of
// that env var (e.g. a TLS-inspecting proxy in front of this process)
// would silently break for every other outbound request in the process.
const extraCa = process.env.NODE_EXTRA_CA_CERTS ? fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS) : null;
const RUSSIAN_CA_BUNDLE = fs.readFileSync(path.join(__dirname, '..', 'certs', 'russian_trusted_ca_bundle.pem'));
setGlobalDispatcher(new Agent({ connect: { ca: [...tls.rootCertificates, RUSSIAN_CA_BUNDLE, ...(extraCa ? [extraCa] : [])] } }));

const token = process.env.MAX_BOT_TOKEN;
if (!token) {
  throw new Error('MAX_BOT_TOKEN is not set. Copy .env.example to .env and fill it in.');
}

const bot = new Bot(token);

module.exports = { bot };
