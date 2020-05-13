const express = require('express')
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require('cors')
const helmet = require('helmet');
const NodeCache = require("node-cache");
const dictionaryCache = new NodeCache();
const PORT = process.env.PORT || 5000

const isNoun = (description) => {
  return description.toLowerCase().startsWith('substantiv');
}

const isCached = (word) => {
  return dictionaryCache.get(word);
}

async function searchWord(word) {
  const formattedWord = word.charAt(0).toUpperCase() + word.slice(1);
  const cachedResult = isCached(formattedWord);
  if (cachedResult) {
    console.log('📚📚📚');
    return cachedResult;
  } else {
    const wordEncoded = encodeURIComponent(formattedWord);
    const searchUrl = "https://www.duden.de/suchen/dudenonline/" + wordEncoded;
    const { data } = await axios(searchUrl, { responseType: "text" }).catch(({ message }) => {
      throw { id: 0, type: 'Fetching Error', message };
    });
    $ = cheerio.load(data);
    const title = $(".vignette__label strong").contents().first().text();
    const description = $(".vignette__snippet").contents().first().text().trim();
    if (isNoun(description)) {
      try {
        const gender = description.split(", ")[1].split(" ")[0];
        const result = { title, gender, description };
        dictionaryCache.set(formattedWord, result);
        return result;
      } catch ({ message }) {
        throw { id: 1, type: 'Parsing Error', message };
      }
    } else {
      return { id: 2, type: 'Search Error', message: 'The found word is not a noun' };
    }
  }
}

express()
  .use(helmet())
  .use(cors())
  .get("/search/:word", ({ params }, res) => {
    const word = params.word;
    console.log(`\n🔍🔍🔍 = ${word}`);
    searchWord(word).then((response) => {
      console.log(`👉👉👉 ${JSON.stringify(response)}`);
      res.status(200).send(response);
    }).catch((error) => {
      console.log(`🔴🔴🔴 ${JSON.stringify(error)}`);
      res.status(500).send(error);
    });
  })
  .get("/dictionary", (req, res) => {
    res.status(200).send(dictionaryCache.keys());
  })
  .get('/', (req, res) => res.redirect('/search/buch'))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))
