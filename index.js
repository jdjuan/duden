const express = require('express')
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require('cors')
const helmet = require('helmet');
const NodeCache = require("node-cache");
const dictionaryCache = new NodeCache();
const defaultSearchUrl = 'https://www.duden.de'
const genderKeys = { der: 'substantiv, maskulin', die: 'substantiv, feminin', das: 'substantiv, neutrum' }
const PORT = process.env.PORT || 5000;
let $;

const hasSeveralDefinitions = () => {
  const results = [];
  const domNodes = $(".vignette__label strong");
  if (domNodes) {
    domNodes.each(function () {
      results.push($(this).text());
    });
    return results.includes(results[0], 1);
  }
  return false;
}

const findMultipleGenders = (title) => {
  const genders = { der: false, die: false, das: false };
  const domNodes = $(".vignette");
  if (domNodes) {
    domNodes.each(function () {
      const titleFound = removeHyphens($(this).find('strong').text());
      if (titleFound === title) {
        const genderFounds = findGendersInText($(this).find('p').text());
        genders.der = genderFounds.der || genders.der;
        genders.die = genderFounds.die || genders.die;
        genders.das = genderFounds.das || genders.das;
      }
    });
  }
  return genders;
}

const findGendersInText = (description) => {
  description = description.toLowerCase();
  const genders = { der: false, die: false, das: false };
  genders.der = description.includes(genderKeys.der);
  genders.die = description.includes(genderKeys.die);
  genders.das = description.includes(genderKeys.das);
  return genders;
}

const getDescription = () => {
  return $(".vignette__snippet").contents().first().text().trim();
}

const getDefinitionLink = () => {
  return defaultSearchUrl + $(".vignette__label").first().attr('href');
}

const getTitle = () => {
  return removeHyphens($(".vignette__label strong").contents().first().text());
}

const removeHyphens = (value) => {
  return value.replace(/[\u00AD\u002D\u2011]+/g, '');
}

const isNoun = () => {
  const description = $(".vignette__snippet").contents().first().text().trim();
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
    if (!isNoun()) {
      throw { id: 2, type: 'Search Error', message: 'The found word is not a noun' };
    } else {
      try {
        const res = {};
        res.title = getTitle();
        res.isHomonym = hasSeveralDefinitions();
        if (res.isHomonym) {
          res.responseType = 901; // Multiple definitions
          res.link = searchUrl;
          res.gender = findMultipleGenders(res.title);
        } else {
          res.responseType = 900; // Single definition
          res.link = getDefinitionLink();
          res.description = getDescription();
          res.gender = findGendersInText(res.description);
        }
        dictionaryCache.set(formattedWord, res);
        return res;
      } catch ({ message }) {
        throw { id: 1, type: 'Parsing Error', message };
      }
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
  .get('/', (req, res) => res.redirect('/search/see'))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))
