const express = require('express')
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require('cors')
const helmet = require('helmet');
const PORT = process.env.PORT || 5000

async function searchWord(word) {
  const formattedWord = word.charAt(0).toUpperCase() + word.slice(1);
  const wordEncoded = encodeURIComponent(formattedWord);
  const searchUrl = "https://www.duden.de/suchen/dudenonline/" + wordEncoded;
  const { data } = await axios(searchUrl, { responseType: "text" }).catch(({ message }) => {
    error = { id: 0, type: 'Fetching Error', message };
    throw error;
  });
  try {
    $ = cheerio.load(data);
    const title = $(".vignette__label strong").contents().first().text();
    const description = $(".vignette__snippet").contents().first().text();
    const gender = description.split(", ")[1].split(" ")[0];
    const response = { title, gender, description: description.trim() };
    return response;
  } catch ({ message }) {
    error = { id: 1, type: 'Parsing Error', message };
    throw error;
  }
}

express()
  .use(helmet())
  .use(cors())
  .get("/search/:word", ({ params }, res) => {
    const word = params.word;
    console.log(`🔍🔍🔍 = ${word}`);
    searchWord(word).then((response) => {
      res.status(200).send(response);
    }).catch((error) => {
      console.log(error);
      res.status(500).send(error);
    });
  })
  .get('/', (req, res) => res.redirect('/search/buch'))
  .listen(PORT, () => console.log(`Listening on ${PORT}`))
